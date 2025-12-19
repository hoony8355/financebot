
import React, { useMemo } from 'react';
import { marked } from 'marked';
import { AnalysisReport } from '../types';
import StockChart from './StockChart';
import SchemaMarkup from './SchemaMarkup';

interface ArticleViewProps {
  report: AnalysisReport;
}

const ArticleView: React.FC<ArticleViewProps> = ({ report }) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50';
    if (score <= 30) return 'text-rose-600 bg-rose-50';
    return 'text-amber-600 bg-amber-50';
  };

  const getRatingBadge = (rating: string) => {
    const styles: Record<string, string> = {
      'Strong Buy': 'bg-emerald-600 text-white',
      'Buy': 'bg-emerald-100 text-emerald-700',
      'Hold': 'bg-slate-100 text-slate-600',
      'Sell': 'bg-rose-100 text-rose-700'
    };
    return styles[rating] || styles['Hold'];
  };

  const renderedContent = useMemo(() => {
    return marked.parse(report.fullContent || "") as string;
  }, [report.fullContent]);

  return (
    <article className="max-w-4xl mx-auto py-12 px-6 bg-white shadow-sm border border-slate-100 rounded-[2.5rem] mb-20">
      <SchemaMarkup report={report} />
      
      <header className="mb-12 text-center">
        <div className="flex justify-center gap-2 mb-6">
          <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
            {report.market === 'KR' ? 'K-Stock Report' : 'Wall Street Pulse'}
          </span>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getRatingBadge(report.investmentRating)}`}>
            AI RATING: {report.investmentRating}
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-8">
          {report.title}
        </h1>
        <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-400">
          <span>AI Research Bot</span>
          <span>•</span>
          <time>{new Date(report.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
        </div>
      </header>

      {/* [광고] 상단 광고 영역 */}
      <div className="ads-placeholder">
        AD SLOT: ARTICLE TOP
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Target Price</p>
          <p className="text-xl font-black text-slate-900">{report.targetPrice.toLocaleString()} <span className="text-sm font-medium">{report.currency}</span></p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Sentiment</p>
          <p className={`text-xl font-black ${getScoreColor(report.sentimentScore)} inline-block px-2 rounded-lg`}>{report.sentimentScore}%</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Fear & Greed</p>
          <p className={`text-xl font-black ${getScoreColor(report.fearGreedIndex)} inline-block px-2 rounded-lg`}>{report.fearGreedIndex}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Ticker</p>
          <p className="text-xl font-black text-slate-900">{report.ticker}</p>
        </div>
      </div>

      <section className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 mb-12">
        <h2 className="text-indigo-900 text-lg font-black mb-4 uppercase tracking-tighter">TL;DR Summary</h2>
        <p className="text-slate-700 font-bold mb-6 leading-relaxed">"{report.summary}"</p>
        <div className="space-y-3">
          {report.reasons.map((reason, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-indigo-600 font-black">✓</span>
              <p className="text-slate-600 text-sm font-medium">{reason}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-16">
        <StockChart basePrice={report.price} trend={report.technicalAnalysis.trend} />
      </div>

      {/* [광고] 중간 광고 영역 */}
      <div className="ads-placeholder">
        AD SLOT: MID-CONTENT
      </div>

      <div className="prose prose-slate max-w-none mb-20 px-2 md:px-8">
        <div className="mb-12">
          <h2 className="text-2xl font-black text-slate-900 mb-6">Macro context & Sector Outlook</h2>
          <p className="text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100">{report.macroContext}</p>
        </div>

        <div 
          className="markdown-body" 
          dangerouslySetInnerHTML={{ __html: renderedContent }} 
        />

        <div className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden my-12 p-8">
           <h2 className="text-xl font-black text-slate-900 mb-6 mt-0">Valuation & Technical Outlook</h2>
           <p className="text-slate-600 mb-8">{report.valuationCheck}</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                <h3 className="text-sm font-black text-indigo-900 uppercase mb-4 tracking-widest mt-0">Support & Resistance</h3>
                <div className="space-y-4">
                  <div className="flex justify-between font-black text-indigo-900">
                    <span className="text-indigo-600/70 text-xs font-bold">SUPPORT</span>
                    <span>{report.technicalAnalysis.support.toLocaleString()} {report.currency}</span>
                  </div>
                  <div className="flex justify-between font-black text-indigo-900">
                    <span className="text-indigo-600/70 text-xs font-bold">RESISTANCE</span>
                    <span>{report.technicalAnalysis.resistance.toLocaleString()} {report.currency}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                <h3 className="text-sm font-black text-emerald-900 uppercase mb-4 tracking-widest mt-0">Signal Status</h3>
                <p className="text-emerald-800 text-sm font-medium m-0">{report.technicalAnalysis.details}</p>
              </div>
           </div>
        </div>

        {/* [광고] 하단 광고 영역 */}
        <div className="ads-placeholder">
          AD SLOT: BOTTOM-CONTENT
        </div>

        <section className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white mt-20 relative overflow-hidden not-prose">
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-12 text-center text-white border-none p-0">People Also Ask (FAQ)</h2>
            <div className="grid gap-6">
              {report.faqs.map((faq, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-3xl">
                  <h4 className="text-lg font-black text-indigo-300 mb-4">Q: {faq.question}</h4>
                  <p className="text-slate-300 leading-relaxed font-medium">A: {faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      
      <footer className="mt-20 py-12 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Investment Disclosure</p>
        <p className="text-slate-500 text-[11px] leading-relaxed max-w-2xl mx-auto">
          본 콘텐츠는 AI 엔진에 의해 자동 생성된 리포트입니다. 모든 투자의 책임은 본인에게 있으며, 본 사이트의 내용은 참고용으로만 활용하시기 바랍니다.
        </p>
      </footer>
    </article>
  );
};

export default ArticleView;
