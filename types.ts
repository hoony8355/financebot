
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: 'KR' | 'US';
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
  reasons: string[];
  valuationCheck: string;
  technicalAnalysis: {
    support: number;
    resistance: number;
    trend: '상승' | '하락' | '횡보';
    details: string;
  };
  peers: { name: string; symbol: string; price: number; performance: string; }[];
  fullContent: string;
  faqs: { question: string; answer: string; }[];
}

export interface BlogSettings {
  lastGeneratedStocks: string[]; // Duplicate prevention list
  nextGenerationTime: string;
}
