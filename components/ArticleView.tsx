
import React from 'react';
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

  return (
    <article className="max-w-4xl mx-auto py-10 px-4">
      <SchemaMarkup report={report} />
      
      <header className="mb-10 text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mb-4 uppercase tracking-widest">
          Daily Analysis • {report.ticker}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
          {report.title}
        </h1>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
          <span>작성일: {new Date(report.timestamp).toLocaleString()}</span>
          <span>•</span>
          <span>분석 도구: Gemini 3 Flash</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase mb-2">Sentiment Score</p>
          <div className={`text-3xl font-black py-2 rounded-xl ${getScoreColor(report.sentimentScore)}`}>
            {report.sentimentScore}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase mb-2">Target Price</p>
          <div className="text-3xl font-black text-slate-900 py-2">
            {report.targetPrice.toLocaleString()} <span className="text-lg font-medium">{report.currency}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase mb-2">Fear & Greed Index</p>
          <div className={`text-3xl font-black py-2 rounded-xl ${getScoreColor(report.fearGreedIndex)}`}>
            {report.fearGreedIndex}
          </div>
        </div>
      </div>

      <div className="mb-12">
        <StockChart basePrice={report.price} trend={report.technicalAnalysis.trend} />
      </div>

      <div className="prose prose-slate max-w-none mb-16">
        <section className="bg-slate-50 p-8 rounded-3xl mb-12">
          <h2 className="mt-0 border-none">Quick Summary</h2>
          <p className="text-lg font-medium text-slate-700 italic">"{report.summary}"</p>
          <ul className="mt-4">
            {report.reasons.map((reason, i) => (
              <li key={i} className="text-slate-600">{reason}</li>
            ))}
          </ul>
        </section>

        <h2>왜 올랐는가? (핵심 이슈 분석)</h2>
        <div dangerouslySetInnerHTML={{ __html: report.fullContent.replace(/\n/g, '<br/>') }} />

        <h2>재무 상태 및 밸류에이션 체크</h2>
        <p>{report.valuationCheck}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-10">
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <h3 className="text-indigo-900 font-bold mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              기술적 지표
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-indigo-200/50 pb-2">
                <span className="text-indigo-600/70">주요 지지선</span>
                <span className="font-bold">{report.technicalAnalysis.support.toLocaleString()} {report.currency}</span>
              </div>
              <div className="flex justify-between border-b border-indigo-200/50 pb-2">
                <span className="text-indigo-600/70">주요 저항선</span>
                <span className="font-bold">{report.technicalAnalysis.resistance.toLocaleString()} {report.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-600/70">현재 추세</span>
                <span className={`font-bold ${report.technicalAnalysis.trend === '상승' ? 'text-rose-500' : 'text-blue-500'}`}>
                  {report.technicalAnalysis.trend}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-slate-900 font-bold mb-4">분석 디테일</h3>
            <p className="text-sm text-slate-600">{report.technicalAnalysis.details}</p>
          </div>
        </div>

        <h2>함께 보면 좋은 관련주 (Peer Analysis)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">종목</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">현재가</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">성과</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {report.peers.map((peer, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{peer.name} ({peer.symbol})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{peer.price.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium">{peer.performance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-20 border-t-4 border-indigo-600 pt-10">
          <h2 className="text-indigo-900 mb-8">People Also Ask (자주 묻는 질문)</h2>
          <div className="space-y-6">
            {report.faqs.map((faq, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-lg font-bold text-slate-900 mb-3">Q: {faq.question}</h4>
                <p className="text-slate-600 leading-relaxed">A: {faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      
      <footer className="mt-20 py-10 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-sm">
          본 자료는 투자 참고용이며, 투자에 대한 모든 책임은 투자자 본인에게 있습니다.<br/>
          &copy; 2024 FinanceAI Pro. All rights reserved.
        </p>
      </footer>
    </article>
  );
};

export default ArticleView;
