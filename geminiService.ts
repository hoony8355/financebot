
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";
import { AnalysisReport, GroundingSource, ChartPoint } from "./types";

const YAHOO_API_KEY = "8a9f2e7a4fmshcd54a5b1fe0913ep159f2bjsn2648fd0a6ae1";
const YAHOO_HOST = "yh-finance.p.rapidapi.com";

const extractJson = (text: string | undefined) => {
  if (!text) throw new Error("분석 데이터가 생성되지 않았습니다.");
  try {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonStr = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON 파싱 실패:", text);
    throw new Error("모델 응답의 형식이 올바르지 않습니다.");
  }
};

/**
 * Yahoo Finance에서 실제 차트 데이터를 가져옵니다 (최근 5일, 60분 간격)
 */
const fetchChartHistory = async (symbol: string, market: 'KR' | 'US'): Promise<ChartPoint[]> => {
  try {
    const ticker = market === 'KR' ? (symbol.length === 6 ? `${symbol}.KS` : symbol) : symbol;
    const url = `https://${YAHOO_HOST}/stock/v3/get-chart?interval=60m&symbol=${ticker}&range=5d&region=${market === 'KR' ? 'KR' : 'US'}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'X-RapidAPI-Key': YAHOO_API_KEY, 'X-RapidAPI-Host': YAHOO_HOST }
    });

    if (!response.ok) return [];
    const result = await response.json();
    const timestamps = result.chart?.result?.[0]?.timestamp || [];
    const quotes = result.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];

    return timestamps.map((ts: number, i: number) => ({
      time: new Date(ts * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(quotes[i]?.toFixed(2)) || 0
    })).filter((p: any) => p.price > 0);
  } catch (e) {
    console.error("Chart Fetch Failed:", e);
    return [];
  }
};

const fetchRealTimeStockData = async (symbol: string, market: 'KR' | 'US') => {
  try {
    const ticker = market === 'KR' ? (symbol.length === 6 ? `${symbol}.KS` : symbol) : symbol;
    const url = `https://${YAHOO_HOST}/stock/v2/get-summary?symbol=${ticker}&region=${market === 'KR' ? 'KR' : 'US'}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'X-RapidAPI-Key': YAHOO_API_KEY, 'X-RapidAPI-Host': YAHOO_HOST }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      price: data.price?.regularMarketPrice?.raw,
      currency: data.price?.currency,
      change: data.price?.regularMarketChangePercent?.raw * 100,
      marketCap: data.price?.marketCap?.fmt,
    };
  } catch (e) {
    return null;
  }
};

export const discoverAndAnalyzeStock = async (market: 'KR' | 'US', excludedStocks: string[]): Promise<AnalysisReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  // 1. 이슈 종목 검색
  const discoveryResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${market} 증시에서 현재 거래량이 급증하거나 이슈가 있는 종목 1개를 선정하여 티커(Ticker)만 알려달라. 제외 종목: ${excludedStocks.join(', ')}`,
    config: { tools: [{ googleSearch: {} }] },
  });
  
  const tickerMatch = discoveryResponse.text.match(/[A-Z0-9.]{2,10}/);
  const symbol = tickerMatch ? tickerMatch[0] : (market === 'US' ? 'NVDA' : '005930');

  // 2. 실시간 데이터 및 차트 히스토리 병렬 요청
  const [realData, chartData] = await Promise.all([
    fetchRealTimeStockData(symbol, market),
    fetchChartHistory(symbol, market)
  ]);

  // 3. 심층 분석 생성
  const analysisPrompt = `
    종목: ${symbol} (${market})
    실시간 데이터: ${JSON.stringify(realData || "검색 데이터 활용")}
    차트 추세(최근): ${JSON.stringify(chartData.slice(-5))}
    위 데이터를 반드시 반영하여, 검색 엔진 최적화된 심층 분석 리포트를 지정된 JSON 구조로 생성하라.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: analysisPrompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
    },
  });

  const reportData = extractJson(response.text);
  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web && chunk.web.uri) sources.push({ title: chunk.web.title || "참고 자료", uri: chunk.web.uri });
    });
  }
  
  if (realData && realData.price) {
    reportData.price = realData.price;
    reportData.currency = realData.currency || reportData.currency;
  }

  return {
    ...reportData,
    market,
    chartData, // 실제 차트 데이터 포함
    id: `report-${Date.now()}`,
    timestamp: new Date().toISOString(),
    sources: sources.length > 0 ? sources : undefined
  };
};
