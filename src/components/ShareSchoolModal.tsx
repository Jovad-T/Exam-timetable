import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Monitor,
  Settings,
  School,
  X,
  MessageSquare,
  Sparkles,
  Globe,
} from 'lucide-react';
import { getSchoolUrl, formatSchoolShareMessage, getBaseUrl } from '../utils/urlUtils';

interface ShareSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
  schoolSlug: string;
  schoolLogo?: string | null;
}

export const ShareSchoolModal: React.FC<ShareSchoolModalProps> = ({
  isOpen,
  onClose,
  schoolName,
  schoolSlug,
  schoolLogo,
}) => {
  const [copiedRole, setCopiedRole] = useState<'classroom' | 'admin' | 'full' | null>(null);

  if (!isOpen) return null;

  const classroomUrl = getSchoolUrl(schoolSlug, 'classroom');
  const adminUrl = getSchoolUrl(schoolSlug, 'admin');
  const baseUrl = getBaseUrl();
  const displayName = schoolName.trim() || '우리 학교';

  const handleCopy = (text: string, role: 'classroom' | 'admin' | 'full') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedRole(role);
        setTimeout(() => setCopiedRole(null), 2500);
      });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `[${displayName}] 시험 시간표 & 교실 전자칠판`,
          text: formatSchoolShareMessage(displayName, schoolSlug),
          url: classroomUrl,
        });
      } catch (err) {
        // user cancelled or share failed, fallback to copy
        handleCopy(formatSchoolShareMessage(displayName, schoolSlug), 'full');
      }
    } else {
      handleCopy(formatSchoolShareMessage(displayName, schoolSlug), 'full');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border-2 border-indigo-100 space-y-6 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            {schoolLogo ? (
              <img src={schoolLogo} alt={displayName} className="w-full h-full object-contain p-1" />
            ) : (
              <School className="w-6 h-6 text-indigo-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                학교 고유 주소 공유
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">
                #{schoolSlug}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {displayName} 링크 공유하기
            </h3>
          </div>
        </div>

        {/* Domain Environment Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium">
            <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>기준 배포 도메인:</span>
            <code className="text-slate-900 font-mono font-bold">{baseUrl || '자동 감지'}</code>
          </span>
          <span className="text-[10px] text-emerald-700 bg-emerald-100/70 border border-emerald-300 font-bold px-2 py-0.5 rounded-full">
            절대 경로 생성 완료
          </span>
        </div>

        {/* Link Cards Grid */}
        <div className="space-y-3.5">
          {/* 1. Classroom Link Card */}
          <div className="p-4 rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/40 space-y-2.5 transition hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-emerald-600" />
                <span>교실 전자칠판 모드 주소</span>
              </span>
              <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                교실 디스플레이 전용
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 font-medium">
              각 교실 전자칠판 브라우저 시작페이지나 바로가기로 등록하면 관리자 메뉴 없이 전자칠판이 자동 실행됩니다.
            </p>
            <div className="bg-white border border-emerald-200 rounded-xl p-2.5 font-mono text-xs text-emerald-950 break-all select-all font-bold shadow-xs">
              {classroomUrl}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopy(classroomUrl, 'classroom')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
              >
                {copiedRole === 'classroom' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>전자칠판 주소 복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>전자칠판 주소 복사</span>
                  </>
                )}
              </button>
              <a
                href={classroomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 py-2 px-3 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                title="새 탭에서 열기"
              >
                <span>열기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 2. Admin Link Card */}
          <div className="p-4 rounded-2xl border-2 border-indigo-200/90 bg-indigo-50/40 space-y-2.5 transition hover:border-indigo-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-indigo-600" />
                <span>관리자 편집 모드 주소</span>
              </span>
              <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                교사용/관리자 전용
              </span>
            </div>
            <p className="text-[11px] text-indigo-800 font-medium">
              교무실에서 시험 시간표를 등록하거나 공지사항을 수정할 때 접속하는 관리자용 주소입니다.
            </p>
            <div className="bg-white border border-indigo-200 rounded-xl p-2.5 font-mono text-xs text-indigo-950 break-all select-all font-bold shadow-xs">
              {adminUrl}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopy(adminUrl, 'admin')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
              >
                {copiedRole === 'admin' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>관리자 주소 복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>관리자 주소 복사</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Full Messenger Share Button & Quick Actions */}
        <div className="border-t border-slate-100 pt-4 space-y-2.5">
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md transition active:scale-98 cursor-pointer"
          >
            {copiedRole === 'full' ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>선생님용 전체 안내문 복사 완료!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>학교 메신저용 전체 안내문 복사 / 공유하기</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            쿨메신저, 카카오톡 등에 붙여넣기하면 학교명과 두 모드의 바로가기 링크가 깔끔하게 전달됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};
