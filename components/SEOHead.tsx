
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
  description = 'AI가 분석하는 실시간 주식 전망 및 기술적 분석 리포트. 글로벌 시장의 핵심 종목을 초정밀 스캔합니다.',
  keywords = [],
  image = 'https://financebot-omega.vercel.app/og-default.png', // 기본 이미지 설정 권장
  url = 'https://financebot-omega.vercel.app',
  type = 'website',
  publishedTime,
  author = 'FinanceAI Bot',
  ticker
}) => {
  const siteTitle = 'FinanceAI Pro';
  const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;
  
  // 기본 키워드와 전달받은 키워드 병합
  const defaultKeywords = ['주식', '증시', '투자', 'AI 분석', '금융', '재테크', '기술적 분석', '해외주식', '국내주식'];
  if (ticker) defaultKeywords.unshift(ticker);
  const keywordString = [...new Set([...keywords, ...defaultKeywords])].join(', ');

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywordString} />
      <link rel="canonical" href={url} />
      <meta name="robots" content="index, follow" />
      <meta name="author" content={author} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:locale" content="ko_KR" />
      
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {publishedTime && <meta property="article:author" content={author} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Mobile & PWA */}
      <meta name="theme-color" content="#ffffff" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    </Helmet>
  );
};

export default SEOHead;
