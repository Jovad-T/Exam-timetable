import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Edit3, CheckCircle2, Megaphone, Check, X, Sparkles } from 'lucide-react';

interface NoticeBannerProps {
  notice: string;
  bottomNotice?: string;
  onEditTopNotice?: (newNotice: string) => void;
  onEditBottomNotice?: (newNotice: string) => void;
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({
  notice,
  bottomNotice = '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※',
  onEditTopNotice,
  onEditBottomNotice,
}) => {
  const [isEditingBottom, setIsEditingBottom] = useState(false);
  const [tempBottom, setTempBottom] = useState(bottomNotice);

  const [isEditingTop, setIsEditingTop] = useState(false);
  const [tempTop, setTempTop] = useState(notice);

  const presets = [
    '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※',
    '※ OMR 카드 마킹 시 컴퓨터용 수성 사인펜만 사용 가능 ※',
    '※ 휴대폰 및 스마트기기는 전원을 끄고 가방에 넣어 제출하세요 ※',
    '※ 부정행위 적발 시 0점 처리 및 학칙에 따라 징계 처분됩니다 ※',
    '※ 종료령이 울리면 즉시 필기도구를 내려놓고 손을 무릎에 올리세요 ※',
  ];

  return (
    <div className="space-y-3">
      {/* 1. 상단 유의사항 배너 */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                  시험 유의사항 (고정 멘트)
                </span>
                <span className="text-xs text-amber-700 font-medium hidden sm:inline">
                  전자칠판 우측 상단 표시
                </span>
              </div>

              {isEditingTop ? (
                <div className="flex items-center gap-2 mt-1.5 w-full">
                  <input
                    type="text"
                    value={tempTop}
                    onChange={(e) => setTempTop(e.target.value)}
                    className="flex-1 bg-white border-2 border-amber-400 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-800 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      onEditTopNotice?.(tempTop);
                      setIsEditingTop(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold shrink-0"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setTempTop(notice);
                      setIsEditingTop(false);
                    }}
                    className="bg-slate-300 hover:bg-slate-400 text-slate-700 px-2 py-1 rounded-lg text-xs font-bold shrink-0"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-amber-950 font-bold text-base md:text-lg tracking-tight">
                    {notice}
                  </p>
                  {onEditTopNotice && (
                    <button
                      onClick={() => setIsEditingTop(true)}
                      className="text-amber-700 hover:text-amber-900 p-1 rounded hover:bg-amber-100 transition cursor-pointer"
                      title="상단 유의사항 수정"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-100/80 px-3 py-2 rounded-xl border border-amber-200 shrink-0">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 서랍 비우기
            </span>
            <span className="text-amber-300">•</span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> 수정테이프 불가
            </span>
          </div>
        </div>
      </div>

      {/* 2. 두 번째 사진의 멘트 (전자칠판 하단 입실/안내 멘트) 관리 */}
      <div className="bg-emerald-50/90 border-2 border-emerald-300/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full">
                  하단 안내 멘트 (2번째 사진 멘트)
                </span>
                <span className="text-xs text-emerald-700 font-medium hidden sm:inline">
                  전자칠판 하단 중앙 대형 전광판 표시
                </span>
              </div>

              {isEditingBottom ? (
                <div className="mt-1.5 space-y-2">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={tempBottom}
                      onChange={(e) => setTempBottom(e.target.value)}
                      placeholder="하단 안내 멘트 입력"
                      className="flex-1 bg-white border-2 border-emerald-400 rounded-lg px-3 py-1.5 text-sm font-black text-slate-800 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        onEditBottomNotice?.(tempBottom);
                        setIsEditingBottom(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-black shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>저장</span>
                    </button>
                    <button
                      onClick={() => {
                        setTempBottom(bottomNotice);
                        setIsEditingBottom(false);
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                    >
                      취소
                    </button>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
                    <span className="text-slate-500 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" /> 추천:
                    </span>
                    {presets.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setTempBottom(p)}
                        className="bg-white hover:bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-medium transition cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-emerald-950 font-black text-base md:text-lg tracking-wide">
                    {bottomNotice}
                  </p>
                  <button
                    onClick={() => setIsEditingBottom(true)}
                    className="text-emerald-700 hover:text-emerald-900 px-2.5 py-1 rounded-lg hover:bg-emerald-100 border border-emerald-300/80 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="2번째 사진 멘트 수정"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>멘트 수정</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
