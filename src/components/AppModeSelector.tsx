import React, { useState, useEffect } from 'react';
import { Sparkles, School, ArrowRight, BookOpen, Award, Settings, Maximize2, Minimize2, Monitor, Move, X, Minus } from 'lucide-react';
import { ElectronWindowState } from './ElectronUpdateBanner';

interface AppModeSelectorProps {
  onSelectClassroomMode: (examType: 'regular' | 'mock') => void;
  onSelectAdminMode?: () => void;
}

export const AppModeSelector: React.FC<AppModeSelectorProps> = ({
  onSelectClassroomMode,
  onSelectAdminMode,
}) => {
  const [viewport, setViewport] = useState<{ width: number; height: number; dpr: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  });
  const [winState, setWinState] = useState<ElectronWindowState | null>(null);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(
    typeof document !== 'undefined' ? !!document.fullscreenElement : false
  );
  const [monitorToast, setMonitorToast] = useState<string | null>(null);

  const isElectron = typeof window !== 'undefined' && !!window.electronUpdater?.isElectron;
  const isEffectiveFullscreen = isElectron ? (winState?.isFullscreen ?? true) : isBrowserFullscreen;

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
      });
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    window.addEventListener('resize', updateViewport);
    document.addEventListener('fullscreenchange', updateViewport);

    const api = window.electronUpdater;
    let unsub: (() => void) | undefined;
    if (api?.getWindowState) {
      api.getWindowState().then((st) => {
        if (st) setWinState(st);
      }).catch(() => {});
    }
    if (api?.onWindowStateChange) {
      unsub = api.onWindowStateChange((st) => {
        setWinState(st);
      });
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      document.removeEventListener('fullscreenchange', updateViewport);
      if (unsub) unsub();
    };
  }, []);

  const handleToggleWindowFullscreen = async () => {
    if (isElectron && window.electronUpdater?.toggleFullscreen) {
      const next = await window.electronUpdater.toggleFullscreen();
      setWinState(next);
      if (!next.isFullscreen) {
        setMonitorToast('창 모드로 전환되었습니다. 상단 바를 마우스로 잡고 다른 모니터(전자칠판)로 드래그하세요!');
        setTimeout(() => setMonitorToast(null), 5000);
      }
      return;
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsBrowserFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsBrowserFullscreen(false);
      setMonitorToast('창 모드로 전환되었습니다. 브라우저 창을 다른 모니터로 드래그한 뒤 [전체화면]을 눌러주세요.');
      setTimeout(() => setMonitorToast(null), 5000);
    }
  };

  const handleMoveToNextMonitor = async () => {
    if (isElectron && window.electronUpdater?.moveToNextDisplay) {
      const res = await window.electronUpdater.moveToNextDisplay();
      if (res?.state) setWinState(res.state);
      if (res?.singleDisplay) {
        setMonitorToast('연결된 추가 모니터가 감지되지 않아 드래그 가능한 [창 모드]로 전환했습니다. 마우스로 드래그해 이동하세요.');
      } else {
        setMonitorToast(`모니터 ${res?.state?.currentDisplayIndex || 2}번 화면으로 이동 완료!`);
      }
      setTimeout(() => setMonitorToast(null), 4000);
      return;
    }
    // 웹 브라우저인 경우 전체화면을 해제하여 드래그 가능하게 안내
    if (document.fullscreenElement) {
      await document.exitFullscreen?.().catch(() => {});
      setIsBrowserFullscreen(false);
    }
    setMonitorToast('창 상단 탭을 마우스로 잡고 다른 모니터(전자칠판)로 드래그한 뒤 [전체화면] 버튼을 누르세요!');
    setTimeout(() => setMonitorToast(null), 5000);
  };

  // 컴퓨터 해상도 자동 감지 및 최적 배율 계산 (기준 1280x800 대비 현재 뷰포트 비율)
  const optimalScale = Math.min(
    1.35,
    Math.max(0.78, Math.min((viewport.width - 48) / 1080, (viewport.height - 96) / 680))
  );
  const displayResText = winState
    ? `${winState.physicalWidth}×${winState.physicalHeight}`
    : `${Math.round(viewport.width * viewport.dpr)}×${Math.round(viewport.height * viewport.dpr)}`;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between select-none">
      {/* 상단 드래그 & 모니터/전체화면 제어 바 (창 모드에서 마우스로 잡고 다른 모니터로 드래그 가능) */}
      <div
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        onDoubleClick={handleToggleWindowFullscreen}
        className={`w-full px-4 py-2 flex items-center justify-between gap-3 border-b transition-colors z-30 ${
          !isEffectiveFullscreen
            ? 'bg-indigo-950/95 border-indigo-400/60 shadow-lg cursor-move'
            : 'bg-slate-950/70 border-slate-800/80 backdrop-blur-md'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-black text-indigo-200 bg-indigo-500/20 border border-indigo-400/40 px-2.5 py-1 rounded-lg">
            <Move className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
            <span className="truncate">
              {!isEffectiveFullscreen
                ? '마우스로 이 상단 바를 잡고 다른 모니터(전자칠판)로 드래그하세요 (더블클릭: 전체화면)'
                : '다른 모니터로 옮기려면 우측 [창 모드(드래그)] 또는 [모니터 전환]을 누르세요'}
            </span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-lg">
            <Monitor className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              자동 감지 해상도: {displayResText} · 최적 배율 {Math.round(optimalScale * 100)}%
              {winState && winState.displayCount > 1 ? ` (모니터 ${winState.currentDisplayIndex}/${winState.displayCount})` : ''}
            </span>
          </span>
        </div>

        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-2 shrink-0"
        >
          <button
            type="button"
            onClick={handleMoveToNextMonitor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black border border-cyan-400/60 shadow-md transition cursor-pointer"
            title="연결된 다른 모니터(전자칠판)로 즉시 이동하거나 드래그 모드로 전환합니다"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>
              {winState && winState.displayCount > 1
                ? `다른 모니터로 즉시 이동 (${winState.currentDisplayIndex}/${winState.displayCount})`
                : '다른 모니터로 드래그 이동'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleWindowFullscreen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-md transition cursor-pointer ${
              isEffectiveFullscreen
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-yellow-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 animate-pulse'
            }`}
            title="전체화면과 창 모드(마우스 드래그 이동 가능)를 전환합니다 (단축키: F11)"
          >
            {isEffectiveFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>창 모드 (드래그 이동)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>전체화면으로 고정 (F11)</span>
              </>
            )}
          </button>

          {isElectron && (
            <>
              <button
                type="button"
                onClick={() => window.electronUpdater?.minimizeWindow?.()}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                title="창 최소화"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => window.electronUpdater?.exitApp?.()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-black border border-rose-500 transition cursor-pointer"
                title="프로그램 종료"
              >
                <X className="w-3.5 h-3.5" />
                <span>종료</span>
              </button>
            </>
          )}
        </div>
      </div>

      {monitorToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-slate-950 font-black text-xs sm:text-sm px-5 py-2.5 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
          <Move className="w-4 h-4 text-slate-950 shrink-0" />
          <span>{monitorToast}</span>
        </div>
      )}

      {/* Main Content Scaled to Optimal Resolution Ratio */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div
          style={{
            transform: `scale(${optimalScale})`,
            transformOrigin: 'center center',
            width: '920px',
          }}
          className="max-w-4xl w-full mx-auto space-y-8 transition-transform duration-200"
        >
          {/* Header Branding */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-4 py-1.5 rounded-full text-indigo-300 text-xs font-bold tracking-wider uppercase backdrop-blur-md break-keep">
              <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>고등학교 스마트 시험 시간표 & 전자칠판 통합 시스템</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md break-keep">
              시작할 시험 종류를 선택해 주세요
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto break-keep leading-relaxed">
              교실 전자칠판에 실행할 <strong className="text-emerald-400">정기고사</strong> 또는{' '}
              <strong className="text-purple-400">전국연합학력평가(모의고사 타종)</strong> 모드 중 하나를 선택하세요.
            </p>
          </div>

          {/* Mode Cards Grid (2 Cards: 정기고사, 모의고사) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* 1. Regular Exam Classroom Mode */}
            <div
              onClick={() => onSelectClassroomMode('regular')}
              className="group relative bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-2 border-emerald-500/30 hover:border-emerald-400 rounded-3xl p-7 shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/25 transition-all"></div>

              <div className="space-y-4 relative z-10">
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full break-keep">
                      교실 배포용
                    </span>
                    <span className="text-xs text-emerald-400 font-bold break-keep">중간/기말고사</span>
                  </div>
                  <h2 className="text-2xl font-black text-white group-hover:text-emerald-300 transition-colors break-keep">
                    정기고사 전자칠판
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-keep">
                  1~5일간 치러지는 중간/기말고사에 맞추어 과목별 과목코드, 입실시간, 자습, 이동수업 및 고사실이 표기되는 정기고사 모드입니다.
                </p>
              </div>

              <div className="pt-5 mt-6 border-t border-slate-800/80 flex items-center justify-between relative z-10">
                <span className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1.5 break-keep">
                  <School className="w-4 h-4" />
                  <span>정기고사 실행</span>
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black group-hover:translate-x-1 transition-transform shadow-md">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 2. Mock Exam Mode (전국연합학력평가 상시 모의고사 타종 시간표) */}
            <div
              onClick={() => onSelectClassroomMode('mock')}
              className="group relative bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-2 border-purple-500/30 hover:border-purple-400 rounded-3xl p-7 shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/25 transition-all"></div>

              <div className="space-y-4 relative z-10">
                <div className="w-13 h-13 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-purple-500 text-white px-2 py-0.5 rounded-full break-keep">
                      상시 운용 · 날짜 자율
                    </span>
                    <span className="text-xs text-purple-300 font-bold break-keep">전국연합학력평가</span>
                  </div>
                  <h2 className="text-2xl font-black text-white group-hover:text-purple-300 transition-colors break-keep">
                    모의고사 타종 모드
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-keep">
                  날짜 지정 없이 언제든 상시 실행 가능하며, 1교시 국어 영역부터 각 교시별 <strong>예비령 / 준비령 / 본령</strong> 타종 흐름을 깔끔하게 확인할 수 있습니다.
                </p>
              </div>

              <div className="pt-5 mt-6 border-t border-slate-800/80 flex items-center justify-between relative z-10">
                <span className="text-xs sm:text-sm font-bold text-purple-400 flex items-center gap-1.5 break-keep">
                  <Award className="w-4 h-4" />
                  <span>모의고사 모드 실행</span>
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black group-hover:translate-x-1 transition-transform shadow-md">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1 text-center">
            <div className="text-xs sm:text-sm text-slate-400 break-keep">
              ※ 선택하신 시험 종류로 교실 전자칠판이 실행됩니다. (시간표 관리 및 설정은{' '}
              <button
                type="button"
                onClick={onSelectAdminMode}
                className="text-indigo-300 hover:text-white font-mono font-bold underline underline-offset-4 cursor-pointer transition"
              >
                /admin
              </button>{' '}
              주소로 접속하세요)
            </div>
            {onSelectAdminMode && (
              <button
                type="button"
                onClick={onSelectAdminMode}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 hover:border-indigo-400 text-xs font-black transition cursor-pointer shadow-sm shrink-0"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>관리자 모드 (/admin) 열기</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


