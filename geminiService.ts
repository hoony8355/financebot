
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";
import { AnalysisReport } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const discoverAndAnalyzeStock = async (market: 'KR' | 'US', excludedStocks: string[]): Promise<AnalysisReport> => {
  try {
    const marketInfo = market === 'KR' 
      ? '한국 KOSPI/KOSDAQ 시장 (현재 시간 기준 활발히 거래 중)' 
      : '미국 NASDAQ/NYSE 시장 (현재 시간 기준 글로벌 이슈 주도)';
    
    const discoveryPrompt = `
      현재 ${marketInfo}에서 가장 핫한 급등주 1개를 선정하여 분석하라.
      [제외 목록 (최근 1주일간 분석됨)]: ${excludedStocks.length > 0 ? excludedStocks.join(', ') : '없음'}.
      위 제외 목록에 있는 종목은 절대 선택하지 말고, 새로운 유망주를 발굴하라.
      데이터는 구글 검색(googleSearch)을 통해 최신 뉴스와 주가를 반영하라.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // 실시간 검색 및 고도화된 추론을 위해 Pro 모델 사용
      contents: discoveryPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const jsonStr = response.text?.trim() || "{}";
    const reportData = JSON.parse(jsonStr);
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceLinks = sources.map((chunk: any) => chunk.web?.uri).filter(Boolean);

    return {
      ...reportData,
      market,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      fullContent: reportData.fullContent + (sourceLinks.length > 0 ? `\n\n### 실시간 분석 출처\n${Array.from(new Set(sourceLinks)).map((url: any) => `- [관련 뉴스 및 데이터 확인](${url})`).join('\n')}` : ''),
    };
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
