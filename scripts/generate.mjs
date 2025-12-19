
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

const SYSTEM_INSTRUCTION = `
# Role: 글로벌 금융 분석가 및 SEO 전략가
# Mission: 검색 결과 0위에 노출될 수 있는 정밀한 주식 분석 리포트 작성.
# Output Schema (JSON ONLY):
{
  "title": "H1 타이틀",
  "ticker": "string",
  "price": number,
  "currency": "KRW | USD",
  "summary": "150자 내외 요약",
  "sentimentScore": number,
  "fearGreedIndex": number,
  "targetPrice": number,
  "investmentRating": "Strong Buy | Buy | Hold | Sell",
  "reasons": ["근거1", "근거2", "근거3"],
  "macroContext": "매크로 분석",
  "valuationCheck": "밸류에이션",
  "technicalAnalysis": {
    "support": number,
    "resistance": number,
    "trend": "상승 | 하락 | 횡보",
    "details": "해석"
  },
  "peers": [{"name": "경쟁사", "symbol": "티커", "price": number, "performance": "성과", "diffReason": "차이점"}],
  "fullContent": "Markdown 형식 본문",
  "faqs": [{"question": "질문", "answer": "답변"}]
}
`;

async function generateWithRetry(ai, payload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent(payload);
      return response;
    } catch (error) {
      if ((error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) && i < retries - 1) {
        const wait = (i + 1) * 15000;
        console.log(`Quota limit. Waiting ${wait/1000}s...`);
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
  const reportsPath = path.join(process.cwd(), 'data', 'reports.json');
  
  if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
  }

  let reports = [];
  if (fs.existsSync(reportsPath)) {
    try { reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8')); } catch (e) { reports = []; }
  }

  const hour = (new Date().getUTCHours() + 9) % 24;
  const market = (hour >= 9 && hour < 16) ? 'KR' : 'US';
  const excluded = reports.slice(0, 5).map(r => r.ticker);

  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-flash-latest', // 가장 안정적인 무료 모델로 변경
      contents: `Market: ${market}, Excluded: ${excluded.join(',')}. 실시간 이슈 종목 1개를 선정해 JSON 리포트를 작성하라.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const reportData = JSON.parse(response.text);
    const newReport = { ...reportData, market, id: `report-${Date.now()}`, timestamp: new Date().toISOString() };
    reports = [newReport, ...reports].slice(0, 500);
    fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
    console.log(`Saved: ${newReport.ticker}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
run();
