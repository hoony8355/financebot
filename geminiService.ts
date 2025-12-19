
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";
import { AnalysisReport } from "./types";

export const discoverAndAnalyzeStock = async (market: 'KR' | 'US', excludedStocks: string[]): Promise<AnalysisReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  try {
    const marketPrompt = market === 'KR' 
      ? '대한민국 KOSPI/KOSDAQ 종목 중 현재 가장 뜨거운 종목 1개를 선정하라.' 
      : '미국 NASDAQ/NYSE 종목 중 현재 글로벌 트렌드를 주도하는 종목 1개를 선정하라.';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Flash 모델로 변경 (무료 티어 안정성)
      contents: `${marketPrompt} 제외 대상: ${excludedStocks.join(', ')}.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "{}";
    const reportData = JSON.parse(text);
    
    return {
      ...reportData,
      market,
      id: `report-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error(error);
    throw new Error(error.message || "분석 중 오류 발생");
  }
};
