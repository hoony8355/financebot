
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

  // 1. 초기 데이터 로드 (서버에서 생성된 JSON + 로컬 스토리지)
  useEffect(() => {
    const initData = async () => {
      let finalReports: AnalysisReport[] = [];

      // 먼저 서버에 저장된 reports.json 시도
      try {
        const response = await fetch('./data/reports.json');
        if (response.ok) {
          finalReports = await response.json();
        }
      } catch (e) {
        console.warn("Server reports not found, falling back to local storage.");
      }

      // 로컬 스토리지 데이터 합치기 (중복 제거)
      const saved = localStorage.getItem('ai_blog_v2_reports');
      if (saved) {
        try {
          const localParsed = JSON.parse(saved);
          const combined = [...finalReports, ...localParsed];
          // ID 기준으로 중복 제거
          finalReports = Array.from(new Map(combined.map(item => [item.id, item])).values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (e) {
          console.error("Local storage parse error");
        }
      }

      setReports(finalReports.slice(0, 100));
    };

    initData();
  }, []);

  const executeAutoPost = useCallback(async () => {
    if (isGenerating) return;
    
    // API Key handling is external to the application as per security guidelines.
    // The application must not ask the user for it.
    setIsGenerating(true);
    setStatus("AI가 실시간 데이터를 분석 중입니다...");

    try {
      const now = new Date();
      const hour = now.getHours();
      const market: 'KR' | 'US' = (hour >= 9 && hour < 16) ? 'KR' : 'US';
      const excludedTickers = reports.slice(0, 10).map(r => r.ticker);

      const newReport = await discoverAndAnalyzeStock(market, excludedTickers);
      
      const updatedReports = [newReport, ...reports].slice(0, 100);
      setReports(updatedReports);
      localStorage.setItem('ai_blog_v2_reports', JSON.stringify(updatedReports));
      setActiveReport(newReport);
      setStatus(`발행 완료: ${newReport.ticker}`);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "분석 실패");
    } finally {
      setIsGenerating(false);
    }
  }, [reports, isGenerating]);

  // 타이머 로직 및 렌더링 부분
  useEffect(() => {
    const calculateNextRun = () => {
      const now = new Date();
      const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const interval = 3 * 60 * 60;
      const nextRunSeconds = Math.ceil((currentSeconds + 1) / interval) * interval;
      setTimeLeft(nextRunSeconds - currentSeconds);
    };
    calculateNextRun();
    const timer = setInterval(calculateNextRun, 1000);
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
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveReport(null)}>
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-indigo-100 shadow-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="font-black text-2xl text-slate-900 tracking-tight hidden sm:block">FinanceBot <span className="text-indigo-600">Pro</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Autonomous Cycle</span>
              <span className="text-sm font-mono font-black text-slate-900">{formatTime(timeLeft)}</span>
            </div>
            <button 
              onClick={() => executeAutoPost()}
              disabled={isGenerating}
              className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-indigo-600 active:scale-95 shadow-xl shadow-slate-200'}`}
            >
              {isGenerating ? 'ANALYZING...' : 'LIVE TEST'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {activeReport ? (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <button onClick={() => setActiveReport(null)} className="mb-8 flex items-center gap-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors group text-sm">
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
              BACK TO FEED
            </button>
            <ArticleView report={activeReport} />
          </div>
        ) : (
          <>
            <header className="mb-16 text-center max-w-3xl mx-auto">
              <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6">
                Autonomous Analysis System
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight tracking-tight">
                AI Driven <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Financial</span> Intelligence.
              </h1>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                GitHub Actions가 3시간마다 자동으로 생성하는 최신 리포트.<br/>
                Gemini 3 Pro의 초정밀 시장 스캔 데이터를 확인하세요.
              </p>
              {status !== "시스템 대기 중" && (
                <div className="mt-8 px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-full inline-block animate-pulse">
                  {status}
                </div>
              )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {reports.map((report, index) => (
                <div 
                  key={report.id}
                  className="bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group flex flex-col h-[480px] overflow-hidden"
                  onClick={() => setActiveReport(report)}
                  style={{ animationDelay: `${index * 100}ms` }}
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
      
      <footer className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-200 mt-20 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
        © 2025 FinanceBot Pro • Managed by GitHub Actions • Powered by Gemini AI
      </footer>
    </div>
  );
};

export default App;
