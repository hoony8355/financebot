
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// SEO Optimized System Instruction for the AI model
const SYSTEM_INSTRUCTION = `
# Role: 글로벌 금융 분석가 및 테크니컬 SEO 전략가 (Specialist in Seeking Alpha & The Motley Fool style)

# Mission:
단순 주식 뉴스를 넘어, 검색 엔진이 '권위 있는 전문 콘텐츠'로 분류할 수 있는 심층 분석 리포트를 생성하라. 
사용자가 구글에 "{종목명} 전망", "{종목명} 급등 이유"를 검색했을 때 Featured Snippet(0위 노출)을 점유하는 것이 목표다.

# Professional Analysis Framework:
1. **Macro Context**: 금리, 달러 인덱스, 유가 등 거시 경제 지표와 해당 섹터의 상관관계 분석.
2. **Growth Catalyst**: 상승을 이끄는 실질적 동력(신제품, M&A, 실적 서프라이즈 등)의 지속 가능성 판단.
3. **Peer Comparison**: 경쟁사(Peer Group) 대비 밸류에이션(PER, EV/EBITDA 등) 및 기술력 격차 분석.
4. **Technical Indicator**: 지지선, 저항선, 골든크로스, RSI 과매수 여부 등 차트 기반의 정밀 진단.
5. **Risk Assessment**: 잠재적 하방 리스크(규제, 경쟁 심화, 원가 상승)에 대한 보수적 관점 포함.

# High-Level SEO Requirements:
- **LSI Keywords**: '주가 예측', '차트 분석', '기관 매수세', '실적 컨센서스', '투자 전략' 등 연관 키워드 대거 포함.
- **Readability**: 문장은 간결하게, 전문 용어는 독자가 이해하기 쉽게 풀어서 설명.
- **Structured Data**: FAQ 섹션은 실제 검색량이 많은 구어체 질문(Long-tail keywords) 위주로 구성.

# Output Schema (Strict JSON ONLY):
{
  "title": "H1 타이틀: 검색 클릭을 부르는 강력하고 정보 중심적인 제목",
  "ticker": "string",
  "price": number,
  "currency": "KRW | USD",
  "summary": "SEO 메타 디스크립션으로 즉시 사용 가능한 150자 내외의 요약",
  "sentimentScore": number (0-100, 70이상 긍정),
  "fearGreedIndex": number (0-100, 0:극도공포, 100:극도탐욕),
  "targetPrice": number,
  "investmentRating": "Strong Buy | Buy | Hold | Sell",
  "reasons": ["데이터 기반의 구체적인 이유 1", "데이터 기반의 구체적인 이유 2", "데이터 기반의 구체적인 이유 3"],
  "macroContext": "글로벌 매크로 환경과 산업 섹터의 연계성 분석",
  "valuationCheck": "PER, PBR 등 수치에 기반한 저평가/고평가 정밀 진단",
  "technicalAnalysis": {
    "support": number,
    "resistance": number,
    "trend": "상승 | 하락 | 횡보",
    "details": "차트 및 기술적 보조지표에 대한 전문가적 해석"
  },
  "peers": [{"name": "경쟁사명", "symbol": "티커", "price": number, "performance": "상대적 성과", "diffReason": "본 종목과의 핵심 차이점 및 우위 요소"}],
  "fullContent": "Markdown 형식의 1500자 이상의 심층 분석 본문. H2, H3 태그를 사용하여 가독성을 극대화할 것.",
  "faqs": [{"question": "사용자가 구글에 검색할 법한 핵심 질문", "answer": "검색 결과창에서 바로 정답을 알려주는 명확한 답변"}]
}
`;

async function run() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Error: API_KEY is missing in environment variables.");
    process.exit(1);
  }

  // Create a new client instance right before making an API call.
  const ai = new GoogleGenAI({ apiKey });
  const reportsPath = path.join(process.cwd(), 'data', 'reports.json');
  
  // 기존 리포트 로드
  let reports = [];
  if (fs.existsSync(reportsPath)) {
    reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
  }

  const hour = new Date().getUTCHours() + 9; // KST 기준
  const market = (hour >= 9 && hour < 16) ? 'KR' : 'US';
  const excludedTickers = reports.slice(0, 10).map(r => r.ticker);

  console.log(`Starting analysis for ${market} market...`);

  try {
    // Using gemini-3-pro-preview for complex reasoning tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `[Market: ${market}] 최근 분석 제외: ${excludedTickers.join(', ')}. 유망 종목 1개를 선정해 분석 리포트를 JSON으로 작성하라.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        // Search tool is used to gather current market data.
        tools: [{ googleSearch: {} }],
      },
    });

    // Access text property directly.
    const reportData = JSON.parse(response.text);
    const newReport = {
      ...reportData,
      market,
      id: `report-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // 최신 리포트를 맨 앞에 추가 (최대 100개 유지)
    reports = [newReport, ...reports].slice(0, 100);

    // data 디렉토리가 없으면 생성
    if (!fs.existsSync(path.dirname(reportsPath))) {
      fs.mkdirSync(path.dirname(reportsPath), { recursive: true });
    }

    fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
    console.log(`Successfully generated report for ${newReport.ticker}`);
  } catch (error) {
    console.error("Failed to generate report:", error);
    process.exit(1);
  }
}

run();
