
import React, { useState, useEffect, useCallback } from 'react';
import { discoverAndAnalyzeStock } from './geminiService';
import { AnalysisReport } from './types';
import ArticleView from './components/ArticleView';

const App: React.FC = () => {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [activeReport, setActiveReport] = useState<AnalysisReport | null>(null);
  const [status, setStatus] = useState<string>("시스템 대기 중");
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // 1. 초기 데이터 로드 (DB 대용)
  useEffect(() => {
    const saved = localStorage.getItem('ai_blog_v2_reports');
    if (saved) setReports(JSON.parse(saved));
  }, []);

  // 2. 타이머 및 자동 실행 체크 로직
  useEffect(() => {
    const calculateNextRun = () => {
      const now = new Date();
      const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const interval = 3 * 60 * 60; // 3시간
      const nextRunSeconds = Math.ceil(currentSeconds / interval) * interval;
      setTimeLeft(nextRunSeconds - currentSeconds);
    };

    calculateNextRun();
    const timer = setInterval(calculateNextRun, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. 핵심 자동화 함수
  const executeAutoPost = useCallback(async (isManual = false) => {
    const now = new Date();
    const day = now.getDay(); // 0:일, 6:토
    const hour = now.getHours();

    // 주말 제외 로직 (토, 일요일은 자동 실행 안함)
    if (!isManual && (day === 0 || day === 6)) {
      setStatus("주말 휴장: 시스템 정지 상태");
      return;
    }

    setIsGenerating(true);
    setStatus("시장 데이터 분석 및 급등주 탐색 중...");

    try {
      // 시장 결정 로직 (KST 기준)
      // 09시 ~ 18시: 한국장, 그 외: 미국장
      const market: 'KR' | 'US' = (hour >= 9 && hour <= 18) ? 'KR' : 'US';
      
      // 최근 1주일(56개) 중복 배제 리스트 생성
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      const excluded = reports
        .filter(r => new Date(r.timestamp) > oneWeekAgo)
        .map(r => r.ticker);

      const newReport = await discoverAndAnalyzeStock(market, excluded);
      
      const updated = [newReport, ...reports].slice(0, 100);
      setReports(updated);
      localStorage.setItem('ai_blog_v2_reports', JSON.stringify(updated));
      setActiveReport(newReport);
      setStatus("발행 완료: 다음 3시간 뒤 업데이트 예정");
    } catch (err) {
      console.error(err);
      setStatus("오류 발생: API 연결 확인 필요");
    } finally {
      setIsGenerating(false);
    }
  }, [reports]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}시간 ${m}분 ${sec}초`;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveReport(null)}>
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-indigo-200 shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="font-black text-xl text-slate-900 tracking-tight">Finance<span className="text-indigo-600">Bot</span></span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status</span>
              <span className="text-xs font-bold text-indigo-600">{status}</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-100 hidden sm:block"></div>
            <button 
              onClick={() => executeAutoPost(true)}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${isGenerating ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
            >
              {isGenerating ? '작성 중...' : '테스트 발행'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {activeReport ? (
          <div>
            <button onClick={() => setActiveReport(null)} className="mb-6 flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              피드로 돌아가기
            </button>
            <ArticleView report={activeReport} />
          </div>
        ) : (
          <>
            <section className="mb-16">
              <div className="bg-indigo-600 rounded-[2.5rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
                <div className="relative z-10">
                  <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                    3시간마다 찾아오는<br/>가장 정확한 급등주 분석
                  </h1>
                  <p className="text-indigo-100 text-lg mb-10 max-w-2xl font-medium">
                    월~금요일, 한국과 미국 시장의 실시간 급등주를 SEO 최적화된 아티클로 자동 발행합니다. 중복 분석을 배제하여 매일 새로운 인사이트를 제공합니다.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
                      <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">다음 자동 업데이트</p>
                      <p className="text-xl font-mono font-black">{formatTime(timeLeft)}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
                      <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">누적 분석 종목</p>
                      <p className="text-xl font-mono font-black">{reports.length}개</p>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reports.map((report) => (
                <div 
                  key={report.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all cursor-pointer group flex flex-col"
                  onClick={() => setActiveReport(report)}
                >
                  <div className="p-8 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${report.market === 'KR' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                        {report.market === 'KR' ? 'KOSPI/KOSDAQ' : 'NASDAQ/NYSE'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300">
                        {new Date(report.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-4 leading-tight group-hover:text-indigo-600 transition-colors">
                      {report.title}
                    </h2>
                    <p className="text-sm text-slate-500 line-clamp-3 mb-8 flex-grow leading-relaxed">
                      {report.summary}
                    </p>
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Ticker</p>
                        <p className="font-black text-slate-900">{report.ticker}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">AI Score</p>
                        <p className={`font-black ${report.sentimentScore > 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {report.sentimentScore}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-20 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-sm font-medium">본 시스템은 Gemini 3 Pro 엔진을 통해 주중 3시간 간격으로 자동 운영됩니다.</p>
        <p className="text-slate-300 text-xs mt-2 italic">투자 책임은 본인에게 있으며, AI 리포트는 참고용으로만 활용하십시오.</p>
      </footer>
    </div>
  );
};

export default App;
