import React, { useState } from 'react';
import { Calendar, Upload, Copy, Check, FileJson, Printer, Sparkles, GraduationCap, Link as LinkIcon, Home, Share2 } from 'lucide-react';
import { getSchoolUrl } from '../utils/urlUtils';

interface HeaderProps {
  onOpenUpload: () => void;
  onCopyCode: () => void;
  copied: boolean;
  onExportJson: () => void;
  onPrint: () => void;
  totalDays: number;
  totalSubjects: number;
  schoolName: string;
  schoolSlug: string;
  onSwitchToSelector: () => void;
  onOpenSchoolSettings?: () => void;
  onOpenShareModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onCopyCode,
  copied,
  onExportJson,
  onPrint,
  totalDays,
  totalSubjects,
  schoolName,
  schoolSlug,
  onSwitchToSelector,
  onOpenSchoolSettings,
  onOpenShareModal,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyUniqueLink = () => {
    if (typeof window !== 'undefined') {
      const url = getSchoolUrl(schoolSlug, 'admin');
      navigator.clipboard.writeText(url).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Title & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onSwitchToSelector}
              className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0 hover:scale-105 transition cursor-pointer"
              title="모드 선택 홈으로 이동"
            >
              <Home className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {schoolName || '고등학교'} 시험 시간표 관리
                </h1>
                <button
                  type="button"
                  onClick={onOpenSchoolSettings}
                  className="bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition cursor-pointer"
                  title="학교명 및 고유 링크 주소 설정 바로가기"
                >
                  <span>🏫 #{schoolSlug}</span>
                  <span className="text-[10px] text-emerald-300 bg-emerald-500/30 px-1 py-0.2 rounded font-semibold ml-0.5">설정</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 flex-wrap">
                <span>학교 전용 고유 주소</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span>· ☁️ Firebase 클라우드 전 교실 실시간 동기화 중</span>
                </span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            
            {onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                title="학교 고유 링크 전체 공유 및 메신저용 복사"
              >
                <Share2 className="w-4 h-4" />
                <span>공유하기</span>
              </button>
            )}

            <button
              onClick={handleCopyUniqueLink}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-2 rounded-lg transition active:scale-95 cursor-pointer shadow-xs"
              title="이 학교의 고유 접속 주소 복사하기"
            >
              {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
              <span>{linkCopied ? '고유 주소 복사됨!' : '학교 고유 주소 복사'}</span>
            </button>

            <div className="hidden md:flex items-center gap-2.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs text-slate-300">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span><strong className="text-white">{totalDays}일</strong></span>
              </div>
              <span className="text-slate-600">|</span>
              <div>
                <span><strong className="text-indigo-300">{totalSubjects}과목</strong></span>
              </div>
            </div>

            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>AI 시간표 업로드</span>
            </button>

            <button
              onClick={onCopyCode}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition active:scale-95 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '복사됨' : '코드 복사'}</span>
            </button>

            <button
              onClick={onExportJson}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-2.5 py-2 rounded-lg transition active:scale-95 cursor-pointer"
              title="JSON 파일 다운로드"
            >
              <FileJson className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-2.5 py-2 rounded-lg transition active:scale-95 cursor-pointer"
              title="시간표 인쇄 / PDF 저장"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">인쇄</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
