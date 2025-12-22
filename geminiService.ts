
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
 * Yahoo Finance에서 실제 7일 데이터를 가져옵니다 (최근 7일, 60분 간격)
 */
const fetchChartHistory = async (symbol: string, market: 'KR' | 'US'): Promise<ChartPoint[]> => {
  try {
    const ticker = market === 'KR' ? (symbol.length === 6 ? `${symbol}.KS` : symbol) : symbol;
    // range를 7d로 변경하여 더 긴 호흡의 데이터 확보
    const url = `https://${YAHOO_HOST}/stock/v3/get-chart?interval=60m&symbol=${ticker}&range=7d&region=${market === 'KR' ? 'KR' : 'US'}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'X-RapidAPI-Key': YAHOO_API_KEY, 'X-RapidAPI-Host': YAHOO_HOST }
    });

    if (!response.ok) return [];
    const result = await response.json();
    const timestamps = result.chart?.result?.[0]?.timestamp || [];
    const quotes = result.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];

    return timestamps.map((ts: number, i: number) => ({
      time: new Date(ts * 1000).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit' }),
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
      volume: data.summaryDetail?.volume?.fmt,
      avgVolume: data.summaryDetail?.averageVolume?.fmt
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
    contents: `${market} 증시에서 현재 거래량이 급증하거나 강력한 테마를 형성하고 있는 핵심 종목 1개를 선정하여 티커(Ticker)만 알려달라. 제외 종목: ${excludedStocks.join(', ')}`,
    config: { tools: [{ googleSearch: {} }] },
  });
  
  const tickerMatch = discoveryResponse.text.match(/[A-Z0-9.]{2,10}/);
  const symbol = tickerMatch ? tickerMatch[0] : (market === 'US' ? 'TSLA' : '005930');

  // 2. 실시간 데이터 및 7일 차트 히스토리 병렬 요청
  const [realData, chartData] = await Promise.all([
    fetchRealTimeStockData(symbol, market),
    fetchChartHistory(symbol, market)
  ]);

  // 3. 심층 분석 생성
  const analysisPrompt = `
    종목: ${symbol} (${market})
    실시간 마켓 데이터: ${JSON.stringify(realData || "검색 데이터 활용")}
    최근 7일 실제 주가 히스토리: ${JSON.stringify(chartData)}
    
    위의 실제 가격 데이터를 분석하여, 전문적인 리포트를 작성하라.
    특히 7일간의 가격 흐름에서 포착되는 기술적 신호(RSI, 지지/저항)를 반드시 포함하라.
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
    chartData,
    id: `report-${Date.now()}`,
    timestamp: new Date().toISOString(),
    sources: sources.length > 0 ? sources : undefined
  };
};
