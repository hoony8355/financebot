
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

export interface ChartPoint {
  time: string;
  price: number;
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
  sources?: GroundingSource[];
  chartData?: ChartPoint[]; // 실제 주가 히스토리 데이터
}

export interface BlogSettings {
  lastGeneratedStocks: string[];
  nextGenerationTime: string;
}
