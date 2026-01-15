
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  author?: string;
  ticker?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'FinanceAI Pro | 실시간 글로벌 증시 분석',
  description,
  keywords = [],
  image = 'https://financebot-omega.vercel.app/og-default.png',
  url = 'https://financebot-omega.vercel.app',
  type = 'website',
  publishedTime,
  author = 'FinanceAI Bot',
  ticker
}) => {
  const siteName = 'FinanceAI Pro';
  
  // --- 1. Title Optimization Logic ---
  let finalTitle = title;

  // 제목에 이미 사이트명이 포함되어 있지 않고, Ticker가 있으면 추가
  if (ticker && !title.includes(ticker)) {
    finalTitle = `${title} (${ticker})`;
  }

  // Google SERP 타이틀 길이 제한 (약 60자).
  // 제목이 너무 길면 브랜드명( | FinanceAI Pro)을 생략하여 핵심 키워드 보존
  if (!finalTitle.includes(siteName)) {
    if (finalTitle.length + siteName.length + 3 <= 60) {
      finalTitle = `${finalTitle} | ${siteName}`;
    }
  }

  // 그래도 60자를 넘어가면 강제로 자름 (Ellipsis)
  if (finalTitle.length > 60) {
    finalTitle = finalTitle.substring(0, 57) + '...';
  }

  // --- 2. Description Fallback Logic ---
  // description이 비어있으면 기본값 사용. <desc> 태그가 아닌 표준 meta description 사용.
  const finalDescription = description?.trim() 
    ? description 
    : 'AI가 분석하는 실시간 주식 전망 및 기술적 분석 리포트. 글로벌 시장의 핵심 종목을 초정밀 스캔하여 투자 정보를 제공합니다.';

  // --- 3. Keyword Logic ---
  const defaultKeywords = ['주식', '증시', '투자', 'AI 분석', '금융', '재테크', '기술적 분석', '해외주식', '국내주식'];
  if (ticker) defaultKeywords.unshift(ticker);
  const keywordString = [...new Set([...keywords, ...defaultKeywords])].join(', ');

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={keywordString} />
      <link rel="canonical" href={url} />
      <meta name="robots" content="index, follow" />
      <meta name="author" content={author} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="ko_KR" />
      
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {publishedTime && <meta property="article:author" content={author} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={image} />

      {/* Mobile & PWA */}
      <meta name="theme-color" content="#ffffff" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    </Helmet>
  );
};

export default SEOHead;
