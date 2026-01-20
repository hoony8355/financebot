
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import process from 'node:process';

const YAHOO_API_KEY = "8a9f2e7a4fmshcd54a5b1fe0913ep159f2bjsn2648fd0a6ae1";
const YAHOO_HOST = "yh-finance.p.rapidapi.com";

const RESEARCH_INSTRUCTION = `
# Role: 전문 금융 데이터 분석가
# Task: 실시간 검색과 7일간의 주가 데이터를 통해 특정 종목을 분석하라.
# Output Schema (JSON ONLY):
{
  "ticker": "string",
  "price": number,
  "currency": "KRW | USD",
  "summary": "핵심 요약 (SEO용)",
  "sentimentScore": number,
  "fearGreedIndex": number,
  "targetPrice": number,
  "investmentRating": "Strong Buy | Buy | Hold | Sell",
  "technicalSignal": "Golden Cross | Oversold | Overbought | Dead Cross | Neutral",
  "riskLevel": "Low | Medium | High | Extreme",
  "reasons": ["근거1", "근거2", "근거3"],
  "scenarios": { "bull": "상승 시나리오", "bear": "하락 시나리오" },
  "technicalAnalysis": {
    "support": number,
    "resistance": number,
    "trend": "상승 | 하락 | 횡보",
    "details": "기술적 분석"
  },
  "peers": [{"name": "경쟁사", "symbol": "티커", "price": number, "performance": "성과", "diffReason": "차이점"}]
}
`;

const WRITING_INSTRUCTION = `
# Role: 수석 금융 에디터
# Task: 제공된 데이터를 바탕으로 2000자 이상의 초고도화 금융 리포트를 작성하라.
# Guidelines:
- **Do NOT use H1 (#) tags in the fullContent.** The article title is already rendered as H1.
- Start your section headers with H2 (##).
- Use bolding, lists, and tables to enhance readability.

# Output Schema (JSON ONLY):
{
  "title": "H1에 들어갈 전문적인 분석 제목 (본문에 포함하지 말 것)",
  "macroContext": "산업 및 매크로 컨텍스트",
  "valuationCheck": "밸류에이션 상세 분석",
  "fullContent": "Markdown 형식의 심층 분석 본문. H2(##) 태그부터 사용하여 구조화할 것.",
  "faqs": [{"question": "질문", "answer": "답변"}]
}
`;

function extractJson(text) {
  if (!text) throw new Error("응답 내용이 비어있습니다.");
  
  // 1단계: Markdown 코드 블록 제거 (```json ... ```)
  let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    // 2단계: 순수 텍스트에서 JSON 파싱 시도
    return JSON.parse(cleanText);
  } catch (e) {
    // 3단계: 파싱 실패 시, 중괄호({}) 구간만 강제로 추출하여 재시도
    try {
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonStr);
      }
    } catch (e2) {
      console.error("JSON Parsing Failed. Raw Text:", text);
      throw new Error("유효한 JSON 형식이 아닙니다.");
    }
    throw e;
  }
}

async function fetchChartHistory(symbol, market) {
  try {
    const ticker = market === 'KR' ? (symbol.length === 6 ? `${symbol}.KS` : symbol) : symbol;
    const url = `https://${YAHOO_HOST}/stock/v3/get-chart?interval=60m&symbol=${ticker}&range=7d&region=${market === 'KR' ? 'KR' : 'US'}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'X-RapidAPI-Key': YAHOO_API_KEY, 'X-RapidAPI-Host': YAHOO_HOST }
    });
    if (!response.ok) return [];
    const result = await response.json();
    const timestamps = result.chart?.result?.[0]?.timestamp || [];
    const quotes = result.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    return timestamps.map((ts, i) => ({
      time: new Date(ts * 1000).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit' }),
      price: parseFloat(quotes[i]?.toFixed(2)) || 0
    })).filter(p => p.price > 0);
  } catch (e) { return []; }
}

async function generateWithRetry(ai, payload, retries = 5) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent(payload);
      if (response && typeof response.text === 'string') {
        return response;
      } else {
        throw new Error("Empty or invalid response from AI");
      }
    } catch (error) {
      console.log(`Retry ${i + 1}/${retries} failed: ${error.message}`);
      lastError = error;
      const wait = (i + 1) * 10000;
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastError || new Error("Failed to generate content after multiple retries.");
}

// --- Static HTML Generation for SEO ---
// 메인 index.html 템플릿을 읽어서, 리포트별 메타태그를 주입한 정적 파일을 생성합니다.
function generateStaticHtml(report, templateHtml, outputDir) {
  let html = templateHtml;
  
  // Title Truncation Logic
  const siteName = 'FinanceAI Pro';
  let finalTitle = report.title;
  if (report.ticker && !finalTitle.includes(report.ticker)) {
    finalTitle = `${finalTitle} (${report.ticker})`;
  }
  if (!finalTitle.includes(siteName)) {
    if (finalTitle.length + siteName.length + 3 <= 60) {
      finalTitle = `${finalTitle} | ${siteName}`;
    }
  }
  if (finalTitle.length > 60) {
    finalTitle = finalTitle.substring(0, 57) + '...';
  }

  const description = report.summary.replace(/"/g, '&quot;');
  const url = `https://financebot-omega.vercel.app/report/${report.id}`;
  
  // 1. SEO 메타태그 주입
  const seoTags = `
    <title>${finalTitle}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${finalTitle}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:title" content="${finalTitle}" />
    <meta name="twitter:description" content="${description}" />
  `;

  // 기존 Title 제거 및 Head 닫기 직전에 SEO 태그 삽입
  html = html.replace(/<title>.*?<\/title>/, '');
  html = html.replace('</head>', `${seoTags}</head>`);

  // 2. [중요] 개발용 스크립트(.tsx) 제거 및 프로덕션용 스크립트(.js/.css) 주입
  // 유연한 정규식 사용: 태그 속성 순서나 공백에 상관없이 매칭
  // 예: <script type="module" src="/index.tsx"></script> 또는 <script src="/index.tsx" type="module"> 등
  html = html.replace(/<script[^>]+src="\/index\.tsx"[^>]*><\/script>/g, '');
  
  // 안전장치: 혹시라도 정규식이 실패할 경우를 대비해 정확한 문자열로 한 번 더 시도
  html = html.replace('<script type="module" src="/index.tsx"></script>', '');

  const productionAssets = `
    <link rel="stylesheet" href="/assets/index.css">
    <script type="module" src="/assets/index.js"></script>
  `;
  
  // body 태그 닫기 직전에 실제 에셋 주입
  html = html.replace('</body>', `${productionAssets}</body>`);

  const filePath = path.join(outputDir, `${report.id}.html`);
  fs.writeFileSync(filePath, html);
  // console.log(`Generated Static HTML: ${filePath}`);
}

async function run() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Error: API_KEY is missing.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const articlesDir = path.join(dataDir, 'articles');
  const reportsHtmlDir = path.join(process.cwd(), 'public', 'report'); // 정적 HTML 저장소
  const manifestPath = path.join(dataDir, 'reports-manifest.json');
  const indexHtmlPath = path.join(process.cwd(), 'index.html');
  
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });
  if (!fs.existsSync(reportsHtmlDir)) fs.mkdirSync(reportsHtmlDir, { recursive: true });

  let manifest = [];
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) {}

  const krHour = (new Date().getUTCHours() + 9) % 24;
  const market = (krHour >= 9 && krHour < 16) ? 'KR' : 'US';
  const excluded = manifest.slice(0, 10).map(r => r.ticker);

  // 템플릿 HTML 읽기
  let templateHtml = "";
  try {
    templateHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  } catch (e) {
    console.error("Warning: Could not read index.html template");
  }

  try {
    console.log(`Starting analysis for market: ${market} using gemini-2.5-flash...`);
    
    // 1단계: 종목 선정
    const researchResponse = await generateWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: `${market} 증시의 핵심 이슈 종목 1개 선정 (변동성 혹은 거래량 상위). 제외: ${excluded.join(',')}`,
      config: { systemInstruction: RESEARCH_INSTRUCTION, tools: [{ googleSearch: {} }] },
    });

    const researchData = extractJson(researchResponse.text);
    console.log(`Selected Ticker: ${researchData.ticker}`);

    // 2단계: 차트 데이터 확보
    const chartData = await fetchChartHistory(researchData.ticker, market);

    // 3단계: 리포트 작성
    const writingResponse = await generateWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: `분석 데이터: ${JSON.stringify(researchData)}, 차트 데이터: ${JSON.stringify(chartData)}`,
      config: { systemInstruction: WRITING_INSTRUCTION },
    });

    const writingData = extractJson(writingResponse.text);
    const reportId = `report-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const fullArticle = { ...researchData, ...writingData, chartData, market, id: reportId, timestamp };
    
    // JSON 저장
    fs.writeFileSync(path.join(articlesDir, `${reportId}.json`), JSON.stringify(fullArticle, null, 2));

    // 정적 HTML 생성 (SEO용) - 신규 리포트
    if (templateHtml) {
      generateStaticHtml(fullArticle, templateHtml, reportsHtmlDir);
    }

    const updatedManifest = [{
      id: reportId, title: fullArticle.title, ticker: fullArticle.ticker,
      market, timestamp, summary: fullArticle.summary,
      sentimentScore: fullArticle.sentimentScore, investmentRating: fullArticle.investmentRating
    }, ...manifest].slice(0, 100);
    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2));
    
    // [중요] 기존의 모든 게시글에 대해서도 정적 HTML 일괄 재생성
    // 이 로직이 있어야 이전에 생성된 '흰 화면' HTML 파일들이 모두 수정됩니다.
    if (templateHtml) {
        console.log("Regenerating ALL static HTML files to apply fixes...");
        const allFiles = fs.readdirSync(articlesDir).filter(f => f.endsWith('.json'));
        
        let successCount = 0;
        for (const file of allFiles) {
            try {
                // 방금 생성한 파일은 건너뜀
                if (file === `${reportId}.json`) continue;

                const itemPath = path.join(articlesDir, file);
                const itemData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
                // id가 없는 데이터 보호
                if (!itemData.id) continue;

                generateStaticHtml(itemData, templateHtml, reportsHtmlDir);
                successCount++;
            } catch (e) {
                console.warn(`Failed to regenerate HTML for ${file}`, e);
            }
        }
        console.log(`Successfully regenerated ${successCount} existing HTML files.`);
    }

    // --- Sitemap.xml 자동 생성 ---
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    const baseUrl = "https://financebot-omega.vercel.app";
    
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${updatedManifest.map(item => `
  <url>
    <loc>${baseUrl}/report/${item.id}</loc>
    <lastmod>${item.timestamp || new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

    fs.writeFileSync(sitemapPath, sitemapContent);
    console.log(`Success: ${reportId}`);
  } catch (error) {
    console.error("Critical Error during generation:", error);
    process.exit(1);
  }
}

run();
