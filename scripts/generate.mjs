
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// 프론트엔드의 constants.tsx와 동일한 스키마를 강제합니다.
const SYSTEM_INSTRUCTION = `
# Role: 글로벌 금융 분석가 및 테크니컬 SEO 전략가
# Mission: 지정된 JSON 구조에 맞춰서만 응답하라.

# Output Schema (Strict JSON ONLY):
{
  "title": "H1 타이틀: 검색 클릭을 부르는 강력하고 정보 중심적인 제목",
  "ticker": "string",
  "price": number,
  "currency": "KRW | USD",
  "summary": "SEO 메타 디스크립션으로 즉시 사용 가능한 150자 내외의 요약",
  "sentimentScore": number,
  "fearGreedIndex": number,
  "targetPrice": number,
  "investmentRating": "Strong Buy | Buy | Hold | Sell",
  "reasons": ["이유 1", "이유 2", "이유 3"],
  "macroContext": "글로벌 매크로 환경 분석",
  "valuationCheck": "밸류에이션 진단",
  "technicalAnalysis": {
    "support": number,
    "resistance": number,
    "trend": "상승 | 하락 | 횡보",
    "details": "기술적 해석"
  },
  "peers": [{"name": "경쟁사", "symbol": "티커", "price": number, "performance": "성과", "diffReason": "차이점"}],
  "fullContent": "Markdown 형식의 1500자 이상의 심층 분석 본문. H2, H3 태그 필수 사용.",
  "faqs": [{"question": "질문", "answer": "답변"}]
}
# Note: 반드시 JSON 블록 { ... } 형식으로만 답변하라. 다른 서술형 텍스트는 절대 포함하지 마라.
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
      if (i < retries - 1) {
        const wait = (i + 1) * 15000;
        console.log(`재시도 중... (${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw error;
    }
  }
}

async function run() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) process.exit(1);

  const ai = new GoogleGenAI({ apiKey });
  const reportsDir = path.join(process.cwd(), 'data');
  const reportsPath = path.join(reportsDir, 'reports.json');
  
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  let reports = [];
  if (fs.existsSync(reportsPath)) {
    try { reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8')); } catch (e) { reports = []; }
  }

  // 한국 시간(UTC+9) 기준으로 시장 결정
  const now = new Date();
  const krHour = (now.getUTCHours() + 9) % 24;
  const market = (krHour >= 9 && krHour < 16) ? 'KR' : 'US';
  const excluded = reports.slice(0, 10).map(r => r.ticker).filter(Boolean);

  console.log(`Target Market: ${market}, Excluded: ${excluded.join(', ')}`);

  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-3-flash-preview', // 최신 모델 사용
      contents: `${market} 증시에서 가장 핫한 종목 1개를 골라라. 제외 종목: ${excluded.join(',')}. 실시간 구글 검색을 통해 심층 분석 리포트를 JSON으로 작성하라.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    let responseText = response.text;
    if (!responseText && response.candidates?.[0]?.content?.parts) {
      responseText = response.candidates[0].content.parts.find(p => p.text)?.text;
    }

    const reportData = extractJson(responseText);
    
    const sources = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach(chunk => {
        if (chunk.web?.uri) {
          sources.push({ title: chunk.web.title || "참고 자료", uri: chunk.web.uri });
        }
      });
    }

    // 필수 필드 보정 및 ID 생성
    const newReport = { 
      ...reportData, 
      market, 
      id: `report-${Date.now()}`, 
      timestamp: new Date().toISOString(),
      sources: sources.length > 0 ? sources : undefined
    };

    // 기존 데이터와 병합 (ID 중복 제거)
    const updatedReports = [newReport, ...reports].slice(0, 500);
    fs.writeFileSync(reportsPath, JSON.stringify(updatedReports, null, 2));
    console.log(`Successfully generated and saved: ${newReport.ticker || newReport.title}`);
  } catch (error) {
    console.error("Execution failed:", error);
    process.exit(1);
  }
}
run();
