
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import process from 'node:process';

// 단계 1: 데이터 조사 및 핵심 지표 추출을 위한 지침
const RESEARCH_INSTRUCTION = `
# Role: 전문 금융 데이터 분석가
# Task: 실시간 검색을 통해 특정 종목의 핵심 금융 데이터와 최근 이슈를 조사하라.
# Output Schema (JSON ONLY):
{
  "ticker": "string",
  "price": number,
  "currency": "KRW | USD",
  "summary": "핵심 이슈 3줄 요약",
  "sentimentScore": number,
  "fearGreedIndex": number,
  "targetPrice": number,
  "investmentRating": "Strong Buy | Buy | Hold | Sell",
  "reasons": ["근거1", "근거2", "근거3"],
  "technicalAnalysis": {
    "support": number,
    "resistance": number,
    "trend": "상승 | 하락 | 횡보",
    "details": "기술적 분석 요약"
  },
  "peers": [{"name": "경쟁사", "symbol": "티커", "price": number, "performance": "성과", "diffReason": "차이점"}]
}
`;

// 단계 2: 조사된 데이터를 바탕으로 고품질 블로그 아티클을 작성하기 위한 지침
const WRITING_INSTRUCTION = `
# Role: 테크니컬 SEO 금융 작가
# Task: 제공된 데이터를 바탕으로 검색 엔진에 최적화된 1500자 이상의 심층 분석 리포트를 작성하라.
# Output Schema (JSON ONLY):
{
  "title": "H1 타이틀: 강력한 정보 중심적 제목",
  "macroContext": "글로벌 매크로 환경 분석 본문",
  "valuationCheck": "밸류에이션 상세 진단 본문",
  "fullContent": "Markdown 형식의 심층 분석 본문. H2, H3 태그 필수 사용.",
  "faqs": [{"question": "질문", "answer": "답변"}]
}
`;

function extractJson(text) {
  if (!text) throw new Error("응답이 없습니다.");
  try {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonStr = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON 파싱 에러:", text);
    throw new Error("유효한 JSON 형식이 아닙니다.");
  }
}

async function generateWithRetry(ai, payload, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent(payload);
      return response;
    } catch (error) {
      const isQuotaError = error.message?.includes('429') || error.message?.includes('quota');
      if (i < retries - 1) {
        // 지수 백오프 적용: 429 발생 시 더 길게 대기
        const wait = isQuotaError ? (i + 1) * 60000 : (i + 1) * 15000;
        console.log(`[Retry ${i + 1}/${retries}] Waiting ${wait / 1000}s due to ${isQuotaError ? 'Quota' : 'Error'}...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw error;
    }
  }
}

async function run() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const reportsDir = path.join(process.cwd(), 'data');
  const reportsPath = path.join(reportsDir, 'reports.json');
  
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  let reports = [];
  if (fs.existsSync(reportsPath)) {
    try { reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8')); } catch (e) { reports = []; }
  }

  const now = new Date();
  const krHour = (now.getUTCHours() + 9) % 24;
  const market = (krHour >= 9 && krHour < 16) ? 'KR' : 'US';
  const excluded = reports.slice(0, 5).map(r => r.ticker).filter(Boolean);

  console.log(`Step 1: Researching market data for ${market}...`);

  try {
    // [1단계] 실시간 검색 및 데이터 수집
    const researchResponse = await generateWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `${market} 증시에서 현재 가장 주목받는 핫종목 1개를 선정하여 데이터를 추출하라. 제외 종목: ${excluded.join(',')}`,
      config: {
        systemInstruction: RESEARCH_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    const researchData = extractJson(researchResponse.text);
    console.log(`Research complete: ${researchData.ticker}. Waiting 20s for next step...`);

    // 429 에러 방지를 위한 단계 사이 대기 시간
    await new Promise(r => setTimeout(r, 20000));

    // [2단계] 수집된 데이터를 바탕으로 본문 집필
    console.log(`Step 2: Writing full article for ${researchData.ticker}...`);
    const writingResponse = await generateWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `다음 데이터를 바탕으로 고품질 금융 리포트를 작성하라: ${JSON.stringify(researchData)}`,
      config: {
        systemInstruction: WRITING_INSTRUCTION,
      },
    });

    const writingData = extractJson(writingResponse.text);

    // 검색 소스 추출
    const sources = [];
    const chunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach(chunk => {
        if (chunk.web?.uri) {
          sources.push({ title: chunk.web.title || "참고 자료", uri: chunk.web.uri });
        }
      });
    }

    // 데이터 병합
    const newReport = { 
      ...researchData,
      ...writingData,
      market, 
      id: `report-${Date.now()}`, 
      timestamp: new Date().toISOString(),
      sources: sources.length > 0 ? sources : undefined
    };

    if (!newReport.title) throw new Error("Title missing in generated content.");

    const updatedReports = [newReport, ...reports].slice(0, 500);
    fs.writeFileSync(reportsPath, JSON.stringify(updatedReports, null, 2));
    console.log(`Success: Saved ${newReport.ticker} - ${newReport.title}`);
  } catch (error) {
    console.error("Critical Failure:", error.message);
    process.exit(1);
  }
}

run();
