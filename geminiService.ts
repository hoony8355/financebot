
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";
import { AnalysisReport, GroundingSource } from "./types";

const YAHOO_API_KEY = "8a9f2e7a4fmshcd54a5b1fe0913ep159f2bjsn2648fd0a6ae1"; // User provided key
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
 * Yahoo Finance API를 통해 실시간 수치 데이터를 가져옵니다.
 */
const fetchRealTimeStockData = async (symbol: string, market: 'KR' | 'US') => {
  try {
    // 한국 종목의 경우 야후 파이낸스 티커 형식으로 변환 (.KS or .KQ)
    const ticker = market === 'KR' 
      ? (symbol.length === 6 ? `${symbol}.KS` : symbol)
      : symbol;

    const url = `https://${YAHOO_HOST}/stock/v2/get-summary?symbol=${ticker}&region=${market === 'KR' ? 'KR' : 'US'}`;
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': YAHOO_API_KEY,
        'X-RapidAPI-Host': YAHOO_HOST
      }
    };

    const response = await fetch(url, options);
    if (!response.ok) return null;
    const data = await response.json();
    
    return {
      price: data.price?.regularMarketPrice?.raw,
      currency: data.price?.currency,
      change: data.price?.regularMarketChangePercent?.raw * 100,
      marketCap: data.price?.marketCap?.fmt,
      fiftyTwoWeekHigh: data.summaryDetail?.fiftyTwoWeekHigh?.raw,
      fiftyTwoWeekLow: data.summaryDetail?.fiftyTwoWeekLow?.raw,
    };
  } catch (e) {
    console.warn("Yahoo Finance Fetch Failed:", e);
    return null;
  }
};

export const discoverAndAnalyzeStock = async (market: 'KR' | 'US', excludedStocks: string[]): Promise<AnalysisReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const retries = 3;

  for (let i = 0; i < retries; i++) {
    try {
      // 1. 먼저 현재 이슈 종목을 검색하여 티커를 특정합니다.
      const discoveryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${market} 증시에서 현재 거래량이 급증하거나 이슈가 있는 종목 1개를 선정하여 티커(Ticker)만 알려달라. 제외 종목: ${excludedStocks.join(', ')}`,
        config: { tools: [{ googleSearch: {} }] },
      });
      
      const tickerMatch = discoveryResponse.text.match(/[A-Z0-9.]{2,10}/);
      const symbol = tickerMatch ? tickerMatch[0] : (market === 'US' ? 'NVDA' : '005930');

      // 2. 야후 파이낸스에서 실시간 수치를 가져옵니다.
      const realData = await fetchRealTimeStockData(symbol, market);

      // 3. 실시간 수치를 바탕으로 Gemini가 심층 분석 리포트를 작성합니다.
      const analysisPrompt = `
        종목: ${symbol} (${market})
        실시간 데이터: ${JSON.stringify(realData || "검색 데이터 활용")}
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

      const responseText = response.text;
      const reportData = extractJson(responseText);
      
      const sources: GroundingSource[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web && chunk.web.uri) {
            sources.push({ title: chunk.web.title || "참고 자료", uri: chunk.web.uri });
          }
        });
      }
      
      // 야후 파이낸스 데이터가 있다면 리포트 수치를 보정합니다.
      if (realData && realData.price) {
        reportData.price = realData.price;
        reportData.currency = realData.currency || reportData.currency;
      }

      return {
        ...reportData,
        market,
        id: `report-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sources: sources.length > 0 ? sources : undefined
      };
    } catch (error: any) {
      const isRetryable = error.message?.includes('503') || error.message?.includes('overloaded') || error.message?.includes('429');
      if (isRetryable && i < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      console.error(error);
      throw new Error(error.message || "분석 프로세스 도중 오류 발생");
    }
  }
  throw new Error("서버 응답 지연으로 분석을 완료하지 못했습니다.");
};
