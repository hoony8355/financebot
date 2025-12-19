
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";
import { AnalysisReport, GroundingSource } from "./types";

const extractJson = (text: string) => {
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
    throw new Error("모델 응답 형식이 올바르지 않습니다.");
  }
};

export const discoverAndAnalyzeStock = async (market: 'KR' | 'US', excludedStocks: string[]): Promise<AnalysisReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  try {
    const marketPrompt = market === 'KR' 
      ? '대한민국 KOSPI/KOSDAQ 종목 중 현재 가장 뜨거운 종목 1개를 선정하라.' 
      : '미국 NASDAQ/NYSE 종목 중 현재 글로벌 트렌드를 주도하는 종목 1개를 선정하라.';
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // 무료 티어에 최적화된 모델
      contents: `${marketPrompt} 제외 대상: ${excludedStocks.join(', ')}. 반드시 지정된 JSON 형식으로만 응답하라.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    const reportData = extractJson(response.text || "{}");
    
    // 검색 출처 추출
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          sources.push({ title: chunk.web.title || "참고 자료", uri: chunk.web.uri });
        }
      });
    }
    
    return {
      ...reportData,
      market,
      id: `report-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error: any) {
    console.error(error);
    throw new Error(error.message || "분석 중 오류 발생");
  }
};
