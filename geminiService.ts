
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";
import { AnalysisReport } from "./types";

// API Key는 환경변수에서 직접 가져오며, 항상 최신 상태를 유지하기 위해 호출 시마다 인스턴스 생성을 고려할 수 있으나
// 여기서는 기본적인 싱글톤 방식을 유지하되 정의에 충실함
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const discoverAndAnalyzeStock = async (market: 'KR' | 'US', excludedStocks: string[]): Promise<AnalysisReport> => {
  try {
    const marketPrompt = market === 'KR' 
      ? '대한민국 KOSPI 및 KOSDAQ 시장에서 현재 거래량이 급증하거나 테마를 주도하는 핵심 종목 1개를 선정하라.' 
      : '미국 NASDAQ 및 NYSE 시장에서 글로벌 투자자들의 이목이 집중된 주요 변동성 종목 1개를 선정하라.';
    
    const discoveryPrompt = `
      ${marketPrompt}
      
      [최근 분석 완료된 종목 (제외 대상)]: ${excludedStocks.length > 0 ? excludedStocks.join(', ') : '없음'}.
      위 목록에 포함된 종목은 절대 중복 분석하지 마라.
      
      반드시 구글 검색(googleSearch) 기능을 활성화하여 다음을 수행하라:
      1. 해당 종목의 현재 실시간 주가와 전일 대비 등락률을 확인.
      2. 최근 24시간 내 발행된 가장 영향력 있는 뉴스 기사 3개 이상 분석.
      3. 애널리스트들의 최신 목표 주가 컨센서스 수집.
      
      이후 제공된 시스템 인스트럭션에 따라 최고 수준의 SEO 최적화 리포트를 JSON으로 작성하라.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // 복잡한 분석과 실시간 검색을 위해 Pro 모델 사용
      contents: discoveryPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "{}";
    const reportData = JSON.parse(text);
    
    // Google Search Grounding 출처 추출 및 본문에 추가
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceLinks = Array.from(new Set(
      groundingChunks
        .map((chunk: any) => chunk.web?.uri)
        .filter(Boolean)
    ));

    const sourceSection = sourceLinks.length > 0 
      ? `\n\n---\n### 🔍 실시간 데이터 및 뉴스 출처\n${sourceLinks.map(url => `- [${new URL(url as string).hostname}](${url})`).join('\n')}`
      : "";

    return {
      ...reportData,
      market,
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      fullContent: reportData.fullContent + sourceSection,
    };
  } catch (error) {
    console.error("AI Stock Analysis Failed:", error);
    throw error;
  }
};
