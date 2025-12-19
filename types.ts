
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: 'KR' | 'US';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AnalysisReport {
  id: string;
  title: string;
  ticker: string;
  market: 'KR' | 'US';
  price: number;
  currency: string;
  timestamp: string;
  summary: string;
  sentimentScore: number;
  fearGreedIndex: number;
  targetPrice: number;
  investmentRating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';
  macroContext: string;
  reasons: string[];
  valuationCheck: string;
  technicalAnalysis: {
    support: number;
    resistance: number;
    trend: '상승' | '하락' | '횡보';
    details: string;
  };
  peers: { 
    name: string; 
    symbol: string; 
    price: number; 
    performance: string;
    diffReason: string;
  }[];
  fullContent: string;
  faqs: { question: string; answer: string; }[];
  sources?: GroundingSource[]; // 실시간 검색 근거 추가
}

export interface BlogSettings {
  lastGeneratedStocks: string[];
  nextGenerationTime: string;
}
