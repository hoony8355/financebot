
import React, { useState, useEffect, useCallback } from 'react';
import { discoverAndAnalyzeStock } from './geminiService.ts';
import { AnalysisReport } from './types.ts';
import ArticleView from './components/ArticleView.tsx';

const App: React.FC = () => {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [activeReport, setActiveReport] = useState<AnalysisReport | null>(null);
  const [status, setStatus] = useState<string>("시스템 대기 중");
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // 1. URL 파라미터 확인 및 데이터 로드
  useEffect(() => {
    const initApp = async () => {
      let fetchedReports: AnalysisReport[] = [];
      try {
        const response = await fetch('./data/reports.json');
        if (response.ok) {
          fetchedReports = await response.json();
        }
      } catch (e) {
        console.warn("데이터 로드 실패, 로컬 스토리지 확인");
      }

      const saved = localStorage.getItem('ai_blog_v2_reports');
      if (saved) {
        try {
          const localParsed = JSON.parse(saved);
          fetchedReports = Array.from(new Map([...fetchedReports, ...localParsed].map(item => [item.id, item])).values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (e) {}
      }

      setReports(fetchedReports);

      // URL 파라미터(?id=...)가 있으면 해당 리포트 즉시 노출 (SEO용)
      const params = new URLSearchParams(window.location.search);
      const reportId = params.get('id');
      if (reportId) {
        const found = fetchedReports.find(r => r.id === reportId);
        if (found) {
          setActiveReport(found);
          updateMetaTags(found);
        }
      }
    };
    initApp();
  }, []);

  // SEO를 위한 메타 태그 업데이트 함수
  const updateMetaTags = (report: AnalysisReport) => {
    document.title = `${report.title} | FinanceAI Pro 분석`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', report.summary);
  };

  const handleNavigateToReport = (report: AnalysisReport) => {
    setActiveReport(report);
    updateMetaTags(report);
    // URL 변경 (새로고침 없이 파라미터 추가)
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?id=${report.id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    window.scrollTo(0, 0);
  };

  const handleBackToFeed = () => {
    setActiveReport(null);
    document.title = "FinanceAI Pro | 실시간 글로벌 증시 분석";
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const executeAutoPost = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setStatus("AI가 정밀 분석 리포트를 작성 중입니다...");

    try {
      const now = new Date();
      const hour = now.getHours();
      const market: 'KR' | 'US' = (hour >= 9 && hour < 16) ? 'KR' : 'US';
      const excludedTickers = reports.slice(0, 5).map(r => r.ticker);

      const newReport = await discoverAndAnalyzeStock(market, excludedTickers);
      
      const updatedReports = [newReport, ...reports].slice(0, 100);
      setReports(updatedReports);
      localStorage.setItem('ai_blog_v2_reports', JSON.stringify(updatedReports));
      handleNavigateToReport(newReport);
      setStatus(`발행 완료: ${newReport.ticker}`);
    } catch (err: any) {
      console.error(err);
      setStatus("분석 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }, [reports, isGenerating]);

  // 카운트다운 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const interval = 3 * 3600;
      const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const nextRun = Math.ceil((currentSeconds + 1) / interval) * interval;
      setTimeLeft(nextRun - currentSeconds);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleBackToFeed}>
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-indigo-100 shadow-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="font-black text-2xl text-slate-900 tracking-tight hidden sm:block">FinanceBot <span className="text-indigo-600">Pro</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Auto Analysis</span>
              <span className="text-sm font-mono font-black text-slate-900">{formatTime(timeLeft)}</span>
            </div>
            <button 
              onClick={() => executeAutoPost()}
              disabled={isGenerating}
              className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-200'}`}
            >
              {isGenerating ? 'ANALYZING...' : 'LIVE TEST'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {activeReport ? (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <button onClick={handleBackToFeed} className="mb-8 flex items-center gap-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors group text-sm">
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
              전체 리포트 피드로 돌아가기
            </button>
            <ArticleView report={activeReport} />
          </div>
        ) : (
          <>
            <header className="mb-16 text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight tracking-tight">
                AI Autonomous <span className="text-indigo-600">Stock</span> Research.
              </h1>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                매 3시간마다 GitHub Actions가 자동으로 글로벌 시장을 스캔하고<br/> 
                SEO에 최적화된 심층 분석 리포트를 영구 발행합니다.
              </p>
              {status !== "시스템 대기 중" && (
                <div className="mt-8 px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-full inline-block animate-pulse border border-indigo-100">
                  {status}
                </div>
              )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {reports.map((report, index) => (
                <div 
                  key={report.id}
                  className="bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group flex flex-col h-[480px] overflow-hidden"
                  onClick={() => handleNavigateToReport(report)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-10 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-10">
                      <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${report.market === 'KR' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                        {report.market === 'KR' ? 'K-MARKET' : 'U.S. MARKET'}
                      </div>
                      <span className="text-[10px] font-black text-slate-300 uppercase">
                        {new Date(report.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-6 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {report.title}
                    </h2>
                    <p className="text-sm text-slate-500 line-clamp-4 mb-8 flex-grow leading-relaxed font-medium">
                      {report.summary}
                    </p>
                    <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ticker</p>
                        <p className="font-black text-slate-900 text-xl">{report.ticker}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">AI Score</p>
                        <p className={`font-black text-lg ${report.sentimentScore >= 70 ? 'text-emerald-600' : 'text-slate-900'}`}>{report.sentimentScore}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      
      <footer className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-200 mt-20 text-center text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">
        © 2025 FinanceBot Pro • Autonomous AI Engine • SEO Optimized Content
      </footer>
    </div>
  );
};

export default App;
