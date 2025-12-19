
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";
import { AnalysisReport, GroundingSource } from "./types";

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

export const discoverAndAnalyzeStock = async (market: 'KR' | 'US', excludedStocks: string[]): Promise<AnalysisReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const retries = 3;

  for (let i = 0; i < retries; i++) {
    try {
      const marketPrompt = market === 'KR' 
        ? '대한민국 증시에서 현재 거래량이 급증하거나 이슈가 있는 종목 1개를 선정하라.' 
        : '미국 증시에서 현재 기술적/실적 이슈로 주목받는 종목 1개를 선정하라.';
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${marketPrompt} 제외 종목: ${excludedStocks.join(', ')}. 반드시 지정된 JSON 구조로만 응답하라.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      let responseText = response.text;
      if (!responseText && response.candidates?.[0]?.content?.parts) {
        responseText = response.candidates[0].content.parts.find((p: any) => p.text)?.text;
      }

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
