
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { discoverAndAnalyzeStock } from './geminiService';
import { AnalysisReport } from './types';
import ArticleView from './components/ArticleView';

// Removed conflicting window.aistudio declaration. 
// The environment provides the AIStudio interface for window.aistudio.

const App: React.FC = () => {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [activeReport, setActiveReport] = useState<AnalysisReport | null>(null);
  const [status, setStatus] = useState<string>("시스템 대기 중");
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  // AI Studio API Key 체크
  useEffect(() => {
    const checkApiKey = async () => {
      // @ts-ignore: aistudio is globally provided by the environment
      if (window.aistudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setNeedsApiKey(!hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore: aistudio is globally provided by the environment
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setNeedsApiKey(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('ai_blog_v2_reports');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setReports(parsed);
      } catch (e) {
        console.error("Failed to load local reports:", e);
      }
    }
  }, []);

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

  const executeAutoPost = useCallback(async (isManual = false) => {
    if (isGenerating) return;
    
    // AI Studio에서 키가 필요한 경우 다이얼로그 먼저 띄움
    // @ts-ignore
    if (needsApiKey && window.aistudio) {
      await handleSelectKey();
    }

    setIsGenerating(true);
    setStatus("AI가 글로벌 시장 데이터를 스캐닝하는 중...");

    try {
      const now = new Date();
      const hour = now.getHours();
      const market: 'KR' | 'US' = (hour >= 9 && hour < 16) ? 'KR' : 'US';
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      
      const excludedTickers = reports
        .filter(r => new Date(r.timestamp) > oneWeekAgo)
        .map(r => r.ticker);

      const newReport = await discoverAndAnalyzeStock(market, excludedTickers);
      
      const updatedReports = [newReport, ...reports].slice(0, 100);
      setReports(updatedReports);
      localStorage.setItem('ai_blog_v2_reports', JSON.stringify(updatedReports));
      setActiveReport(newReport);
      setStatus(`발행 완료: ${newReport.ticker} (${new Date().toLocaleTimeString()})`);
    } catch (err: any) {
      console.error("Generation failed:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setNeedsApiKey(true);
        setStatus("API 키를 다시 선택해주세요.");
      } else {
        setStatus("분석 실패: API 할당량 또는 네트워크를 확인하세요.");
      }
    } finally {
      setIsGenerating(false);
    }
  }, [reports, isGenerating, needsApiKey]);

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
            {needsApiKey && (
              <button 
                onClick={handleSelectKey}
                className="px-4 py-2 bg-amber-100 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 hover:bg-amber-200 transition-colors"
              >
                API 키 설정 필요
              </button>
            )}
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Auto Cycle</span>
              <span className="text-sm font-mono font-black text-slate-900">{formatTime(timeLeft)}</span>
            </div>
            <button 
              onClick={() => executeAutoPost(true)}
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
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight tracking-tight">
                AI Driven <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Financial</span> Intelligence.
              </h1>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                3시간마다 업데이트되는 실시간 시장 스캔 시스템. <br/>
                Gemini 3 Pro의 고도화된 추론으로 도출된 전문 리서치 데이터를 확인하세요.
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
            
            {reports.length === 0 && (
              <div className="text-center py-40 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 text-slate-300">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">데이터가 비어있습니다</h3>
                <p className="text-slate-400 font-bold mb-10 max-w-sm">상단의 LIVE TEST 버튼을 눌러 첫 번째 AI 리서치 리포트를 생성하세요.</p>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-200 mt-20 text-center">
        <p className="text-slate-900 font-black text-2xl mb-4 tracking-tighter">FinanceBot <span className="text-indigo-600">Pro</span></p>
        <div className="flex justify-center gap-6 mb-8 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
          <span>Autonomous AI Analysis</span>
          <span>•</span>
          <span>Real-time Market Data</span>
          <span>•</span>
          <span>SEO Engine v2.5</span>
        </div>
        <div className="bg-slate-100/50 p-6 rounded-3xl max-w-2xl mx-auto border border-slate-200">
          <p className="text-slate-500 text-[11px] leading-relaxed font-bold italic">
            Disclaimer: 본 리포트의 모든 내용은 AI에 의해 자동 생성되며, 실제 시장 데이터와 다를 수 있습니다. 
            모든 투자의 최종 결정과 책임은 투자자 본인에게 있습니다.
          </p>
          <p className="mt-4 text-[9px] text-slate-400 font-medium">
            최적화된 경험을 위해 Google Chrome 브라우저 사용을 권장합니다.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
