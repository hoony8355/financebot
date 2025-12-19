
import React from 'react';
import { AnalysisReport } from '../types';

interface SchemaMarkupProps {
  report: AnalysisReport;
}

const SchemaMarkup: React.FC<SchemaMarkupProps> = ({ report }) => {
  const financialQuoteSchema = {
    "@context": "https://schema.org",
    "@type": "FinancialQuote",
    "name": report.title,
    "tickerSymbol": report.ticker,
    "exchange": report.ticker.length === 6 ? "KRX" : "NASDAQ",
    "price": report.price,
    "priceCurrency": report.currency,
    "quoteTime": report.timestamp
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "AnalysisNewsArticle",
    "headline": report.title,
    "description": report.summary,
    "datePublished": report.timestamp,
    "author": {
      "@type": "Person",
      "name": "FinanceAI Bot"
    }
  };

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

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(financialQuoteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(articleSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
    </>
  );
};

export default SchemaMarkup;
