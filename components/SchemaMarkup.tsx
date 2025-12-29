
import React from 'react';
import { AnalysisReport } from '../types';
import { Helmet } from 'react-helmet-async';

interface SchemaMarkupProps {
  report: AnalysisReport;
}

const SchemaMarkup: React.FC<SchemaMarkupProps> = ({ report }) => {
  const baseUrl = 'https://financebot-omega.vercel.app';
  const articleUrl = `${baseUrl}/report/${report.id}`;
  
  // 1. 금융 자산 정보 (FinancialQuote)
  // 구글은 FinancialQuote를 직접적으로 지원하지 않지만, 금융 관련 구조화 데이터로 유효함
  const financialQuoteSchema = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct", 
    "name": report.title,
    "identifier": report.ticker,
    "description": `${report.ticker} (${report.market}) 주식 분석 리포트`,
    "brand": {
      "@type": "Brand",
      "name": report.ticker
    }
  };

  // 2. 뉴스/분석 기사 (NewsArticle) - 가장 중요
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": report.title,
    "description": report.summary,
    "image": [
       // 실제 이미지가 있다면 추가, 없다면 기본 로고
       `${baseUrl}/og-default.png`
    ],
    "datePublished": report.timestamp,
    "dateModified": report.timestamp,
    "author": [{
      "@type": "Person",
      "name": "FinanceAI Bot",
      "url": baseUrl
    }],
    "publisher": {
      "@type": "Organization",
      "name": "FinanceAI Pro",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logo.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleUrl
    },
    "keywords": [report.ticker, report.market === 'KR' ? '국내주식' : '해외주식', '주가전망', '투자분석'].join(", ")
  };

  // 3. FAQ (FAQPage) - 검색 결과 점유율 확보용
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": report.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  // 4. Breadcrumb (이동 경로)
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": baseUrl
    },{
      "@type": "ListItem",
      "position": 2,
      "name": "Report",
      "item": `${baseUrl}/report`
    },{
      "@type": "ListItem",
      "position": 3,
      "name": report.ticker
    }]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(financialQuoteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(articleSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
    </Helmet>
  );
};

export default SchemaMarkup;
