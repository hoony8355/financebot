
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

const SYSTEM_INSTRUCTION = `
# Role: 글로벌 금융 분석가
# Mission: 지정된 JSON 스키마에 맞춰 검색 결과 기반의 리포트를 작성하라.
# Note: 반드시 JSON 블록 { ... } 형식으로만 답변하라. 다른 텍스트는 포함하지 마라.
`;

function extractJson(text) {
  try {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonStr = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parsing Error Content:", text);
    throw new Error("응답에서 유효한 JSON을 찾을 수 없습니다.");
  }
}

async function generateWithRetry(ai, payload, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent(payload);
      return response;
    } catch (error) {
      const isRetryable = 
        error.message.includes('429') || 
        error.message.includes('503') || 
        error.message.includes('RESOURCE_EXHAUSTED') || 
        error.message.includes('UNAVAILABLE') || 
        error.message.includes('overloaded');

      if (isRetryable && i < retries - 1) {
        // 지수 백오프: 20초, 40초, 60초... 순으로 대기 시간 증가
        const wait = (i + 1) * 20000;
        console.log(`Model busy or rate limited (Attempt ${i + 1}/${retries}). Waiting ${wait/1000}s...`);
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
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let reports = [];
  if (fs.existsSync(reportsPath)) {
    try { reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8')); } catch (e) { reports = []; }
  }

  const hour = (new Date().getUTCHours() + 9) % 24;
  const market = (hour >= 9 && hour < 16) ? 'KR' : 'US';
  const excluded = reports.slice(0, 10).map(r => r.ticker);

  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: `Market: ${market}, Excluded: ${excluded.join(',')}. 최신 이슈를 검색하여 심층 분석 리포트를 JSON으로 작성하라.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    const reportData = extractJson(response.text);
    
    // 검색 출처 추출
    const sources = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach(chunk => {
        if (chunk.web?.uri) {
          sources.push({ title: chunk.web.title || "참고 자료", uri: chunk.web.uri });
        }
      });
    }

    const newReport = { 
      ...reportData, 
      market, 
      id: `report-${Date.now()}`, 
      timestamp: new Date().toISOString(),
      sources: sources.length > 0 ? sources : undefined
    };

    reports = [newReport, ...reports].slice(0, 500);
    fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
    console.log(`Successfully generated: ${newReport.ticker}`);
  } catch (error) {
    console.error("Execution failed after retries:", error);
    process.exit(1);
  }
}
run();
