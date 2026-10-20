import React, { useEffect, useState } from 'react';
import { DownloadCloud, RefreshCw, CheckCircle2, AlertTriangle, Server, Github, Sparkles, X } from 'lucide-react';

export interface UpdaterState {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version: string;
  latestVersion: string | null;
  progress: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
  releaseNotes?: string | null;
  error: string | null;
  feedUrl: string | null;
  isPackaged?: boolean;
  config?: {
    feedUrl?: string;
    githubOwner?: string;
    githubRepo?: string;
  };
}

declare global {
  interface Window {
    electronUpdater?: {
      isElectron: boolean;
      getStatus: () => Promise<UpdaterState>;
      checkForUpdates: () => Promise<{ ok: boolean; error?: string; state?: UpdaterState }>;
      installNow: () => Promise<{ ok: boolean; error?: string }>;
      setConfig: (config: {
        feedUrl?: string;
        githubOwner?: string;
        githubRepo?: string;
      }) => Promise<{ ok: boolean; error?: string; state?: UpdaterState }>;
      onStatusChange: (cb: (state: UpdaterState) => void) => () => void;
      exitApp: () => void;
    };
  }
}

export const ElectronUpdateBanner: React.FC = () => {
  const [state, setState] = useState<UpdaterState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const api = window.electronUpdater;
    if (!api) return;

    api.getStatus().then((initial) => {
      if (initial) setState(initial);
    });

    const unsubscribe = api.onStatusChange((nextState) => {
      setState((prev) => ({ ...(prev || {}), ...nextState }));
      if (nextState.status === 'available' || nextState.status === 'downloaded') {
        setDismissed(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!state || dismissed) return null;
  if (state.status !== 'available' && state.status !== 'downloading' && state.status !== 'downloaded') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-4 shadow-2xl text-white animate-fadeIn">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
            <DownloadCloud className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <span>
                {state.status === 'downloaded'
                  ? '새 버전 업데이트 준비 완료'
                  : '새 버전 자동 다운로드 중...'}
              </span>
              {state.latestVersion && (
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                  v{state.latestVersion}
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {state.status === 'downloaded'
                ? '지금 재시작하거나 앱 종료 시 자동으로 최신 버전이 설치됩니다.'
                : `백그라운드에서 최신 버전을 다운로드하고 있습니다 (${state.progress || 0}%)`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {state.status === 'downloading' && (
        <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(5, state.progress || 0))}%` }}
          />
        </div>
      )}

      {state.status === 'downloaded' && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition"
          >
            나중에 (종료 시 자동 설치)
          </button>
          <button
            type="button"
            onClick={() => window.electronUpdater?.installNow()}
            className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md cursor-pointer transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>지금 재시작 및 업데이트</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const ElectronUpdateCard: React.FC = () => {
  const [state, setState] = useState<UpdaterState>({
    status: 'idle',
    version: '1.0.0',
    latestVersion: null,
    progress: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0,
    error: null,
    feedUrl: null,
  });
  const [providerMode, setProviderMode] = useState<'github' | 'generic'>('github');
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [staticFeedUrl, setStaticFeedUrl] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  const isElectron = typeof window !== 'undefined' && Boolean(window.electronUpdater?.isElectron);

  useEffect(() => {
    const api = window.electronUpdater;
    if (!api) return;

    api.getStatus().then((initial) => {
      if (!initial) return;
      setState(initial);
      if (initial.config?.feedUrl) {
        setProviderMode('generic');
        setStaticFeedUrl(initial.config.feedUrl);
      } else if (initial.config?.githubOwner || initial.config?.githubRepo) {
        setProviderMode('github');
        setGithubOwner(initial.config.githubOwner || '');
        setGithubRepo(initial.config.githubRepo || '');
      }
    });

    const unsub = api.onStatusChange((next) => {
      setState((prev) => ({ ...prev, ...next }));
    });
    return () => unsub();
  }, []);

  const handleSaveAndCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronUpdater) return;

    const payload =
      providerMode === 'generic'
        ? { feedUrl: staticFeedUrl.trim(), githubOwner: '', githubRepo: '' }
        : { feedUrl: '', githubOwner: githubOwner.trim(), githubRepo: githubRepo.trim() };

    await window.electronUpdater.setConfig(payload);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-xs">
            <DownloadCloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900">
                Windows(.exe) 자동 업데이트 설정 (electron-updater)
              </h3>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                현재 버전 v{state.version}
              </span>
              {isElectron ? (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  데스크톱(.exe) 실행 중
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  웹 브라우저 미리보기 모드
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              앱 실행 시마다 GitHub Releases 또는 정적 웹서버(latest.yml)를 확인하여 최신 .exe 버전을 자동으로 다운로드·설치합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {state.status === 'downloaded' ? (
            <button
              type="button"
              onClick={() => window.electronUpdater?.installNow()}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>지금 재시작하여 v{state.latestVersion} 설치</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.electronUpdater?.checkForUpdates()}
              disabled={!isElectron || state.status === 'checking' || state.status === 'downloading'}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${state.status === 'checking' ? 'animate-spin' : ''}`} />
              <span>{state.status === 'checking' ? '업데이트 확인 중...' : '지금 업데이트 확인'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Indicator Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          {state.status === 'checking' && (
            <>
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
              <span>최신 릴리스 서버에서 업데이트를 확인하고 있습니다...</span>
            </>
          )}
          {state.status === 'available' && (
            <>
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-800">
                새 버전(v{state.latestVersion})이 발견되어 자동 다운로드를 시작합니다.
              </span>
            </>
          )}
          {state.status === 'downloading' && (
            <>
              <DownloadCloud className="w-4 h-4 text-blue-600 animate-bounce" />
              <span className="text-blue-800">
                업데이트 파일 다운로드 중... ({state.progress}%)
              </span>
            </>
          )}
          {state.status === 'downloaded' && (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-800">
                v{state.latestVersion} 다운로드 완료! 앱 종료 시 자동 설치되거나 우측 상단 버튼으로 즉시 적용할 수 있습니다.
              </span>
            </>
          )}
          {(state.status === 'not-available' || state.status === 'idle') && (
            <>
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
              <span>
                {isElectron
                  ? '현재 최신 버전의 전자칠판 앱을 사용 중입니다. (앱 시작 시 및 2시간 주기로 자동 확인)'
                  : 'package.json 및 electron-main.js에 자동 업데이트 로직이 구성되어 있습니다.'}
              </span>
            </>
          )}
          {state.status === 'error' && (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-800">
                업데이트 서버 응답 대기 중 ({state.error}) — 배포 서버 설정 후 정상 작동합니다.
              </span>
            </>
          )}
        </div>
        {state.feedUrl && (
          <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            소스: {state.feedUrl}
          </span>
        )}
      </div>

      {/* Feed Configuration (GitHub Release vs Generic Static Server) */}
      <form onSubmit={handleSaveAndCheck} className="space-y-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProviderMode('github')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border cursor-pointer transition ${
              providerMode === 'github'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>방식 1: GitHub Releases 배포</span>
          </button>
          <button
            type="button"
            onClick={() => setProviderMode('generic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border cursor-pointer transition ${
              providerMode === 'generic'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>방식 2: 정적 웹서버 (Vercel / 사내 서버 URL)</span>
          </button>
        </div>

        {providerMode === 'github' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">GitHub 계정명 (owner)</label>
              <input
                type="text"
                value={githubOwner}
                onChange={(e) => setGithubOwner(e.target.value)}
                placeholder="예: my-school-dev"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">저장소 이름 (repo)</label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="예: exam-timetable"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={!isElectron}
                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-black transition cursor-pointer"
              >
                {savedToast ? '저장 및 확인 완료!' : 'GitHub 저장소 적용'}
              </button>
            </div>
            <div className="sm:col-span-3 text-[11px] text-slate-500 leading-relaxed">
              💡 <strong>배포 방법:</strong> <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-slate-800">package.json</code>의 <code className="font-mono">version</code>을 올린 뒤 GitHub Release에 빌드 결과물(<code className="font-mono">latest.yml</code>, <code className="font-mono">Exam-Timetable Setup x.x.x.exe</code>, <code className="font-mono">.blockmap</code>)을 업로드하거나 <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-slate-800">npm run publish:win</code>을 실행하면 모든 교실 PC가 다음 실행 시 자동 업데이트됩니다.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                정적 업데이트 서버 URL (latest.yml 및 .exe가 위치한 폴더 주소)
              </label>
              <input
                type="url"
                value={staticFeedUrl}
                onChange={(e) => setStaticFeedUrl(e.target.value)}
                placeholder="예: https://your-school-domain.com/releases"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={!isElectron}
                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-black transition cursor-pointer"
              >
                {savedToast ? '저장 및 확인 완료!' : '정적 서버 주소 적용'}
              </button>
            </div>
            <div className="sm:col-span-3 text-[11px] text-slate-500 leading-relaxed">
              💡 <strong>정적 서버 배포 방법:</strong> <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-slate-800">release/</code> 폴더에 생성된 <code className="font-mono">latest.yml</code>과 <code className="font-mono">Exam-Timetable Setup x.x.x.exe</code> 두 파일을 정적 웹서버 경로에 올려두면 앱이 실행될 때마다 버전을 비교해 자동 설치합니다.
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
