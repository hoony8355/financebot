
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import process from 'node:process';

const YAHOO_API_KEY = "8a9f2e7a4fmshcd54a5b1fe0913ep159f2bjsn2648fd0a6ae1";
const YAHOO_HOST = "yh-finance.p.rapidapi.com";

const RESEARCH_INSTRUCTION = `
# Role: 전문 금융 데이터 분석가
# Task: 실시간 검색과 7일간의 주가 데이터를 통해 특정 종목을 분석하라.
# Output Schema (JSON ONLY):
{
  "ticker": "string",
  "price": number,
  "currency": "KRW | USD",
  "summary": "핵심 요약 (SEO용)",
  "sentimentScore": number,
  "fearGreedIndex": number,
  "targetPrice": number,
  "investmentRating": "Strong Buy | Buy | Hold | Sell",
  "technicalSignal": "Golden Cross | Oversold | Overbought | Dead Cross | Neutral",
  "riskLevel": "Low | Medium | High | Extreme",
  "reasons": ["근거1", "근거2", "근거3"],
  "scenarios": { "bull": "상승 시나리오", "bear": "하락 시나리오" },
  "technicalAnalysis": {
    "support": number,
    "resistance": number,
    "trend": "상승 | 하락 | 횡보",
    "details": "기술적 분석"
  },
  "peers": [{"name": "경쟁사", "symbol": "티커", "price": number, "performance": "성과", "diffReason": "차이점"}]
}
`;

const WRITING_INSTRUCTION = `
# Role: 수석 금융 에디터
# Task: 제공된 데이터를 바탕으로 2000자 이상의 초고도화 금융 리포트를 작성하라.
# Output Schema (JSON ONLY):
{
  "title": "H1: 전문적인 분석 제목",
  "macroContext": "산업 및 매크로 컨텍스트",
  "valuationCheck": "밸류에이션 상세 분석",
  "fullContent": "Markdown 형식의 심층 분석 본문. 데이터 지표와 전문 용어를 적극적으로 사용할 것.",
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

async function fetchChartHistory(symbol, market) {
  try {
    const ticker = market === 'KR' ? (symbol.length === 6 ? `${symbol}.KS` : symbol) : symbol;
    const url = `https://${YAHOO_HOST}/stock/v3/get-chart?interval=60m&symbol=${ticker}&range=7d&region=${market === 'KR' ? 'KR' : 'US'}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'X-RapidAPI-Key': YAHOO_API_KEY, 'X-RapidAPI-Host': YAHOO_HOST }
    });
    if (!response.ok) return [];
    const result = await response.json();
    const timestamps = result.chart?.result?.[0]?.timestamp || [];
    const quotes = result.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    return timestamps.map((ts, i) => ({
      time: new Date(ts * 1000).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit' }),
      price: parseFloat(quotes[i]?.toFixed(2)) || 0
    })).filter(p => p.price > 0);
  } catch (e) { return []; }
}

async function generateWithRetry(ai, payload, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(payload);
    } catch (error) {
      const wait = (i + 1) * 20000;
      console.log(`Retry ${i + 1}...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

async function run() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) process.exit(1);

  const ai = new GoogleGenAI({ apiKey });
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const articlesDir = path.join(dataDir, 'articles');
  const manifestPath = path.join(dataDir, 'reports-manifest.json');
  
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });

  let manifest = [];
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) {}

  const krHour = (new Date().getUTCHours() + 9) % 24;
  const market = (krHour >= 9 && krHour < 16) ? 'KR' : 'US';
  const excluded = manifest.slice(0, 10).map(r => r.ticker);

  try {
    const researchResponse = await generateWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: `${market} 증시의 핵심 이슈 종목 1개 선정 (변동성 혹은 거래량 상위). 제외: ${excluded.join(',')}`,
      config: { systemInstruction: RESEARCH_INSTRUCTION, tools: [{ googleSearch: {} }] },
    });

    const researchData = extractJson(researchResponse.text);
    const chartData = await fetchChartHistory(researchData.ticker, market);

    const writingResponse = await generateWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: `분석 데이터: ${JSON.stringify(researchData)}, 차트 데이터: ${JSON.stringify(chartData)}`,
      config: { systemInstruction: WRITING_INSTRUCTION },
    });

    const writingData = extractJson(writingResponse.text);
    const reportId = `report-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const fullArticle = { ...researchData, ...writingData, chartData, market, id: reportId, timestamp };
    fs.writeFileSync(path.join(articlesDir, `${reportId}.json`), JSON.stringify(fullArticle, null, 2));

    const updatedManifest = [{
      id: reportId, title: fullArticle.title, ticker: fullArticle.ticker,
      market, timestamp, summary: fullArticle.summary,
      sentimentScore: fullArticle.sentimentScore, investmentRating: fullArticle.investmentRating
    }, ...manifest].slice(0, 100);
    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2));
    console.log(`Success: ${reportId}`);
  } catch (error) {
    process.exit(1);
  }
}

run();
