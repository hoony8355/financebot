
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

  const getRiskColor = (level: string) => {
    const colors: Record<string, string> = {
      'Low': 'text-emerald-600 bg-emerald-50',
      'Medium': 'text-amber-600 bg-amber-50',
      'High': 'text-orange-600 bg-orange-50',
      'Extreme': 'text-rose-600 bg-rose-50'
    };
    return colors[level] || colors['Medium'];
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
        <div className="flex justify-center flex-wrap gap-2 mb-6">
          <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
            {report.market === 'KR' ? 'K-Stock Elite' : 'Wall Street Pro'}
          </span>
          <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
            Real-Time Verified
          </span>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getRatingBadge(report.investmentRating)}`}>
            AI RATING: {report.investmentRating}
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-8">
          {report.title}
        </h1>
        <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-400">
          <span>AI Lead Analyst x Yahoo Finance</span>
          <span>•</span>
          <time>{new Date(report.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Technical Signal</p>
          <p className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg inline-block uppercase tracking-tighter">
            {(report as any).technicalSignal || 'Neutral'}
          </p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Sentiment</p>
          <p className={`text-xl font-black ${getScoreColor(report.sentimentScore)} inline-block px-2 rounded-lg`}>{report.sentimentScore}%</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Risk Meter</p>
          <p className={`text-xl font-black ${getRiskColor((report as any).riskLevel || 'Medium')} inline-block px-2 rounded-lg`}>
            {(report as any).riskLevel || 'Medium'}
          </p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Ticker</p>
          <p className="text-xl font-black text-slate-900">{report.ticker}</p>
        </div>
      </div>

      <section className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 mb-12 text-white">
        <h2 className="text-indigo-400 text-lg font-black mb-4 uppercase tracking-tighter">Executive Summary (TL;DR)</h2>
        <p className="text-slate-200 font-bold mb-6 leading-relaxed">"{report.summary}"</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {report.reasons.map((reason, i) => (
            <div key={i} className="flex gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-indigo-400 font-black">0{i+1}</span>
              <p className="text-slate-300 text-xs font-bold leading-relaxed">{reason}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-16">
        <StockChart 
          basePrice={report.price} 
          trend={report.technicalAnalysis.trend} 
          data={report.chartData} 
        />
      </div>

      {(report as any).scenarios && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100">
            <h3 className="text-emerald-800 font-black mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Bull Case (상승 시나리오)
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">{(report as any).scenarios.bull}</p>
          </div>
          <div className="bg-rose-50/50 p-8 rounded-[2rem] border border-rose-100">
            <h3 className="text-rose-800 font-black mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
              Bear Case (하락 시나리오)
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">{(report as any).scenarios.bear}</p>
          </div>
        </div>
      )}

      <div className="prose prose-slate max-w-none mb-20 px-2 md:px-8">
        <div className="mb-12">
          <h2 className="text-2xl font-black text-slate-900 mb-6">Valuation Deep-Dive & Sector Context</h2>
          <p className="text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 italic">
            "{report.macroContext}"
          </p>
        </div>

        <div 
          className="markdown-body" 
          dangerouslySetInnerHTML={{ __html: renderedContent }} 
        />

        {report.sources && report.sources.length > 0 && (
          <div className="mt-16 p-8 bg-slate-50 rounded-3xl border border-slate-100 not-prose">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Research Grounding (AI Sources)</h3>
            <div className="flex flex-wrap gap-3">
              {report.sources.map((src, i) => (
                <a 
                  key={i} 
                  href={src.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  {src.title || "Reference Source"}
                </a>
              ))}
            </div>
          </div>
        )}

        <section className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white mt-20 relative overflow-hidden not-prose">
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-12 text-center text-white border-none p-0 tracking-tighter">Investor FAQ</h2>
            <div className="grid gap-6">
              {report.faqs.map((faq, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-3xl">
                  <h4 className="text-lg font-black text-indigo-300 mb-4 tracking-tight">Q: {faq.question}</h4>
                  <p className="text-slate-300 leading-relaxed font-medium">A: {faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      
      <footer className="mt-20 py-12 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">AI Research Bot Disclaimer</p>
        <p className="text-slate-500 text-[11px] leading-relaxed max-w-2xl mx-auto font-medium">
          본 리포트는 Yahoo Finance 7-Day 실제 데이터와 Gemini 2.5 AI 분석을 바탕으로 작성되었습니다. 모든 투자의 책임은 사용자 본인에게 있으며, 본 분석 결과가 수익을 보장하지 않습니다.
        </p>
      </footer>
    </article>
  );
};

export default ArticleView;
