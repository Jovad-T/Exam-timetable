import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-indigo-500 transition cursor-pointer"
      >
        <span>앱 설치</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-200 hover:bg-slate-700 transition cursor-pointer"
        >
          <span>iOS 앱 설치</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-xl">
              <h3 className="text-lg font-black text-yellow-300">iPhone / iPad 설치</h3>
              <p className="mt-2 text-sm text-slate-300">
                1. Safari 하단 <strong>공유</strong> 버튼을 누르세요.<br />
                2. 스크롤을 내려 <strong>홈 화면에 추가</strong>를 누르세요.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-slate-800 py-2 text-sm font-black text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
