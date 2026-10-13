import React from 'react';
import { Upload, Sparkles, Monitor, ArrowUpRight } from 'lucide-react';

interface ScheduleUploadCardProps {
  onOpenUpload: () => void;
  onSwitchToBoard: () => void;
}

export const ScheduleUploadCard: React.FC<ScheduleUploadCardProps> = ({ onOpenUpload, onSwitchToBoard }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border-2 border-indigo-500/40 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-indigo-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                시험 시간표 PDF 및 이미지 AI 자동 파싱 & 전자칠판 모드
              </h3>
              <span className="bg-indigo-400/20 text-indigo-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                관리자 컨트롤 센터
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              시간표 파일을 업로드하여 AI 분석을 수행하거나, 즉시 교실 전자칠판 모드로 전환하여 수업 및 시험을 진행하세요.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onSwitchToBoard}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 cursor-pointer text-xs sm:text-sm shrink-0"
            title="교실 전자칠판 화면으로 즉시 전환"
          >
            <Monitor className="w-4 h-4" />
            <span>교실 전자칠판 모드 진입</span>
          </button>

          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white font-black px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 cursor-pointer text-xs sm:text-sm shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>시간표 파일 업로드</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-indigo-200">
        <div className="bg-indigo-950/80 border border-indigo-800/60 p-3 rounded-2xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold shrink-0">
            PDF
          </div>
          <div>
            <p className="font-extrabold text-white">PDF 문서 파싱</p>
            <p className="text-[11px] text-slate-400">pdf.js 표 텍스트 추출 지원</p>
          </div>
        </div>

        <div className="bg-indigo-950/80 border border-indigo-800/60 p-3 rounded-2xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold shrink-0">
            IMG
          </div>
          <div>
            <p className="font-extrabold text-white">이미지 OCR 비전</p>
            <p className="text-[11px] text-slate-400">PNG, JPG, WEBP 지원</p>
          </div>
        </div>

        <div className="bg-indigo-950/80 border border-indigo-800/60 p-3 rounded-2xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold shrink-0">
            AUTO
          </div>
          <div>
            <p className="font-extrabold text-white">자습·입실시간 자동화</p>
            <p className="text-[11px] text-slate-400">1교시 자습 및 과목코드 완벽 추출</p>
          </div>
        </div>
      </div>
    </div>
  );
};
