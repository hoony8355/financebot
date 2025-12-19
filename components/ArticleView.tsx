
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

  // 마크다운을 HTML로 변환 (메모이제이션으로 성능 최적화)
  const renderedContent = useMemo(() => {
    // marked는 동기적으로 작동하며 HTML 문자열을 반환합니다.
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
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">AI</div>
            <span>FinanceBot Pro Analysis</span>
          </div>
          <span>•</span>
          <time>{new Date(report.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
        </div>
      </header>

      {/* Hero Stats */}
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

      {/* Summary Box (SEO TL;DR) */}
      <section className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg className="w-24 h-24 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16L9.01702 16C7.91245 16 7.01702 16.8954 7.01702 18L7.01702 21L4.01702 21L4.01702 11L14.017 11L14.017 21ZM16.017 21L20.017 21L20.017 11L16.017 11L16.017 21ZM20.017 9L4.01702 9L4.01702 5C4.01702 3.89543 4.91245 3 6.01702 3L18.017 3C19.1216 3 20.017 3.89543 20.017 5L20.017 9Z"></path></svg>
        </div>
        <h2 className="text-indigo-900 text-lg font-black mb-4 flex items-center gap-2">
          <span className="bg-indigo-600 text-white p-1 rounded-md text-[10px] uppercase">Executive Summary</span>
          한 눈에 보는 핵심 분석
        </h2>
        <p className="text-slate-700 font-bold mb-6 leading-relaxed">"{report.summary}"</p>
        <div className="space-y-3">
          {report.reasons.map((reason, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-indigo-600 font-black">0{i+1}.</span>
              <p className="text-slate-600 text-sm font-medium">{reason}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-16">
        <StockChart basePrice={report.price} trend={report.technicalAnalysis.trend} />
      </div>

      {/* Article Content - Rendered with Marked and Typography plugin */}
      <div className="prose prose-slate max-w-none mb-20 px-2 md:px-8">
        <div className="mb-12">
          <h2 className="text-2xl font-black text-slate-900 mb-6 border-none p-0">시장 컨텍스트 및 매크로 분석</h2>
          <p className="text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100">{report.macroContext}</p>
        </div>

        {/* 본문 마크다운 영역 */}
        <div 
          className="markdown-body" 
          dangerouslySetInnerHTML={{ __html: renderedContent }} 
        />

        <div className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden my-12">
          <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 m-0 border-none">밸류에이션 및 기술적 리포트</h2>
          </div>
          <div className="p-8">
             <p className="text-slate-600 mb-8">{report.valuationCheck}</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <h3 className="text-sm font-black text-indigo-900 uppercase mb-4 tracking-widest mt-0">Chart Levels</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-indigo-600/70 text-xs font-bold uppercase">Strong Support</span>
                      <span className="font-black text-indigo-900">{report.technicalAnalysis.support.toLocaleString()} {report.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-600/70 text-xs font-bold uppercase">Main Resistance</span>
                      <span className="font-black text-indigo-900">{report.technicalAnalysis.resistance.toLocaleString()} {report.currency}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <h3 className="text-sm font-black text-emerald-900 uppercase mb-4 tracking-widest mt-0">Technical Outlook</h3>
                  <p className="text-emerald-800 text-sm font-medium m-0">{report.technicalAnalysis.details}</p>
                </div>
             </div>
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-8 border-none p-0">관련 섹터 및 경쟁사 비교 (Peer Analysis)</h2>
        <div className="overflow-x-auto mb-12">
          <table className="min-w-full divide-y divide-slate-200 border border-slate-100 rounded-2xl overflow-hidden not-prose">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticker / Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Analysis vs {report.ticker}</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {report.peers.map((peer, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-black text-slate-900">{peer.name}</div>
                    <div className="text-[10px] font-bold text-slate-400">{peer.symbol}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-xs text-slate-600 font-medium">{peer.diffReason}</div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{peer.performance}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* People Also Ask Section (Rich Snippets Focus) */}
        <section className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white mt-20 relative overflow-hidden not-prose">
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-12 text-center text-white border-none p-0">People Also Ask <span className="text-indigo-400">자주 묻는 질문</span></h2>
            <div className="grid gap-6">
              {report.faqs.map((faq, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
                  <h4 className="text-lg font-black text-indigo-300 mb-4">Q: {faq.question}</h4>
                  <p className="text-slate-300 leading-relaxed font-medium">A: {faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
        </section>
      </div>
      
      <footer className="mt-20 py-12 border-t border-slate-100">
        <div className="bg-slate-50 p-6 rounded-2xl text-center">
          <p className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-tighter italic">Investment Disclosure</p>
          <p className="text-slate-500 text-xs leading-relaxed max-w-2xl mx-auto">
            본 리포트는 AI 모델을 통한 실시간 시장 분석 데이터로 작성되었습니다. 특정 종목의 매수 또는 매도를 권유하지 않으며, 투자로 인한 손익에 대한 책임은 투자자 본인에게 있습니다. 분석된 데이터는 시장 상황에 따라 실시간으로 변동될 수 있습니다.
          </p>
        </div>
      </footer>
    </article>
  );
};

export default ArticleView;
