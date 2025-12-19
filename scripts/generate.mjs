
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// SEO Optimized System Instruction
const SYSTEM_INSTRUCTION = `
# Role: 글로벌 금융 분석가 및 SEO 전략가
# Mission: 검색 결과 0위에 노출될 수 있는 정밀한 주식 분석 리포트 작성.
# Style: 신뢰성 있는 수치 데이터와 전문적인 용어(LSI Keywords)를 사용.
# Output Schema (JSON ONLY):
{
  "title": "H1 타이틀: 검색 유입을 극대화하는 매력적인 제목",
  "ticker": "string",
  "price": number,
  "currency": "KRW | USD",
  "summary": "150자 내외의 요약 (Meta Description용)",
  "sentimentScore": number (0-100),
  "fearGreedIndex": number (0-100),
  "targetPrice": number,
  "investmentRating": "Strong Buy | Buy | Hold | Sell",
  "reasons": ["구체적 근거 1", "구체적 근거 2", "구체적 근거 3"],
  "macroContext": "글로벌 거시 경제와 섹터의 연계 분석",
  "valuationCheck": "밸류에이션 정밀 진단",
  "technicalAnalysis": {
    "support": number,
    "resistance": number,
    "trend": "상승 | 하락 | 횡보",
    "details": "차트 지표 해석"
  },
  "peers": [{"name": "경쟁사", "symbol": "티커", "price": number, "performance": "상대 성과", "diffReason": "차별점"}],
  "fullContent": "Markdown 형식의 2000자 이상 심층 본문. H2, H3 태그 사용.",
  "faqs": [{"question": "예상 질문", "answer": "명확한 답변"}]
}
`;

/**
 * 지수 백오프를 이용한 재시도 함수
 */
async function generateWithRetry(ai, payload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i + 1}: Generating content with ${payload.model}...`);
      const response = await ai.models.generateContent(payload);
      return response;
    } catch (error) {
      const isQuotaError = error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED');
      if (isQuotaError && i < retries - 1) {
        const waitTime = (i + 1) * 10000; // 10초, 20초... 점진적 대기
        console.warn(`Quota exceeded. Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}

async function run() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Error: API_KEY is missing in GitHub Secrets.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const reportsDir = path.join(process.cwd(), 'data');
  const reportsPath = path.join(reportsDir, 'reports.json');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let reports = [];
  if (fs.existsSync(reportsPath)) {
    try {
      const content = fs.readFileSync(reportsPath, 'utf8');
      reports = content.trim() ? JSON.parse(content) : [];
    } catch (e) {
      console.error("Failed to parse existing reports.json, starting fresh.");
      reports = [];
    }
  }

  const hour = (new Date().getUTCHours() + 9) % 24; // KST 변환
  const market = (hour >= 9 && hour < 16) ? 'KR' : 'US';
  const excludedTickers = reports.slice(0, 10).map(r => r.ticker);

  console.log(`Market Mode: ${market} | KST Hour: ${hour}`);

  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-3-flash-preview', // 무료 티어에서 가장 안정적인 Flash 모델 사용
      contents: `[Market: ${market}] 최근 분석 제외 종목: ${excludedTickers.join(', ')}. 현재 시장에서 주목해야 할 핵심 종목 1개를 선정하여 SEO 최적화된 심층 분석 리포트를 JSON으로 작성하라.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const reportData = JSON.parse(response.text);
    const newReport = {
      ...reportData,
      market,
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString()
    };

    // 최신 리포트를 맨 앞에 추가 (최대 500개 유지)
    reports = [newReport, ...reports].slice(0, 500);

    fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
    console.log(`Successfully generated and saved report for: ${newReport.ticker}`);
  } catch (error) {
    console.error("Automation failed after all retries:", error);
    process.exit(1);
  }
}

run();
