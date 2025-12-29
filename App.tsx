
import { useState, useEffect, useCallback } from 'react';
import { discoverAndAnalyzeStock } from './geminiService.ts';
import { AnalysisReport } from './types.ts';
import ArticleView from './components/ArticleView.tsx';
import { HelmetProvider } from 'react-helmet-async';
import SEOHead from './components/SEOHead.tsx';

const App = () => {
  const [manifest, setManifest] = useState<any[]>([]);
  const [activeReport, setActiveReport] = useState<AnalysisReport | null>(null);
  const [status, setStatus] = useState<string>("시스템 대기 중");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const fetchFullReport = async (id: string) => {
    setIsLoadingArticle(true);
    try {
      const response = await fetch(`/data/articles/${id}.json?t=${Date.now()}`);
      if (!response.ok) throw new Error("아티클을 불러올 수 없습니다.");
      return await response.json() as AnalysisReport;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setIsLoadingArticle(false);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        const response = await fetch(`/data/reports-manifest.json?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          setManifest(Array.isArray(data) ? data : []);
          
          const path = window.location.pathname;
          let reportId = null;

          if (path.startsWith('/report/')) {
            reportId = path.split('/report/')[1];
          } else {
            const params = new URLSearchParams(window.location.search);
            reportId = params.get('id');
          }

          if (reportId) {
            const full = await fetchFullReport(reportId);
            if (full) {
              setActiveReport(full);
            }
          }
        }
      } catch (e) {
        console.warn("Manifest loading failed", e);
      }
    };
    initApp();
  }, []);

  const handleNavigate = async (item: any) => {
    const full = await fetchFullReport(item.id);
    if (full) {
      setActiveReport(full);
      window.history.pushState({}, '', `/report/${item.id}`);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setActiveReport(null);
    window.history.pushState({}, '', '/');
  };

  const executeLiveTest = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setStatus("AI 분석 중 (Gemini 2.5 Flash)...");
    try {
      const hour = new Date().getHours();
      const market = (hour >= 9 && hour < 16) ? 'KR' : 'US';
      const report = await discoverAndAnalyzeStock(market, manifest.slice(0, 5).map(m => m.ticker));
      setActiveReport(report);
      setStatus("발행 완료");
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setIsGenerating(false);
    }
  }, [manifest, isGenerating]);

  useEffect(() => {
    const timer = setInterval(() => {
      const interval = 3 * 3600;
      const current = (new Date().getUTCHours() * 3600 + new Date().getUTCMinutes() * 60) % interval;
      setTimeLeft(interval - current);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${Math.floor(s/3600)}h ${m}m ${sec}s`;
  };

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#f8fafc]">
        {/* activeReport가 없을 때만 홈 화면 SEO 적용 */}
        {!activeReport && (
          <SEOHead 
            title="FinanceAI Pro | 실시간 글로벌 증시 분석"
            description="AI가 분석하는 실시간 주식 전망 및 기술적 분석 리포트. 글로벌 시장의 핵심 종목을 초정밀 스캔합니다."
            url="https://financebot-omega.vercel.app"
          />
        )}

        <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleBack}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <span className="font-black text-xl text-slate-900">FinanceBot <span className="text-indigo-600">Pro</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-slate-400 uppercase">Next Sync</p>
              <p className="text-xs font-mono font-bold">{formatTime(timeLeft)}</p>
            </div>
            <button onClick={executeLiveTest} disabled={isGenerating} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-indigo-600 transition-all shadow-lg">
              {isGenerating ? 'ANALYZING...' : 'LIVE TEST'}
            </button>
          </div>
        </nav>

        {isLoadingArticle && (
          <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[60] flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"/>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-6 py-12">
          {activeReport ? (
            <div>
              <button onClick={handleBack} className="mb-8 text-slate-500 font-bold hover:text-indigo-600 flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                목록으로 돌아가기
              </button>
              <ArticleView report={activeReport} />
            </div>
          ) : (
            <>
              <header className="mb-16 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">AI Stock Research</h1>
                <p className="text-slate-500 font-medium">실시간 검색 기반 Gemini 2.5 Flash 모델이 작성한<br/>기관급 투자 분석 리포트를 매일 무료로 제공합니다.</p>
                {status !== "시스템 대기 중" && <div className="mt-6 px-4 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-black rounded-full inline-block border border-indigo-100">{status}</div>}
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {manifest.map((item) => (
                  <div key={item.id} onClick={() => handleNavigate(item)} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                    <div className="flex justify-between items-center mb-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${item.market === 'KR' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>{item.market}</span>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-4 leading-tight group-hover:text-indigo-600 line-clamp-2">{item.title}</h2>
                    <p className="text-sm text-slate-500 line-clamp-3 mb-6 font-medium leading-relaxed">{item.summary}</p>
                    <div className="pt-6 border-t flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Ticker</p>
                        <p className="font-black text-slate-900">{item.ticker}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Score</p>
                        <p className="font-black text-indigo-600">{item.sentimentScore}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </HelmetProvider>
  );
};

export default App;
