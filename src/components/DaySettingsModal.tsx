import React, { useState, useEffect } from 'react';
import { X, Calendar, Edit3, Plus, Check, Sparkles, FileText, BellRing, Info } from 'lucide-react';
import { DayExamSchedule } from '../types/schedule';
import { cleanNoticeText } from '../data/scheduleData';

interface DaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  dayIndex?: number;
  initialDay?: DayExamSchedule | null;
  onSave: (
    date: string,
    fullTitle: string,
    bottomNotice?: string,
    notice?: string,
    dayIndex?: number
  ) => void;
}

export const DaySettingsModal: React.FC<DaySettingsModalProps> = ({
  isOpen,
  onClose,
  mode,
  dayIndex,
  initialDay,
  onSave,
}) => {
  const [date, setDate] = useState('');
  const [fullTitle, setFullTitle] = useState('');
  const [bottomNotice, setBottomNotice] = useState('');
  const [topNotice, setTopNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialDay) {
        setDate(initialDay.date || '');
        setFullTitle(
          initialDay.fullTitle || `2026학년도 2학기 1차 고사 시간표(${initialDay.date})`
        );
        setBottomNotice(
          initialDay.bottomNotice || '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※'
        );
        setTopNotice(
          cleanNoticeText(initialDay.notice)
        );
      } else {
        // Default suggestions for new date
        const defaultDate = '10/17';
        setDate(defaultDate);
        setFullTitle(`2026학년도 2학기 1차 고사 시간표(${defaultDate})`);
        setBottomNotice('※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※');
        setTopNotice('최선을 다하기! 부정행위 금지! 책상 서랍 비우기! 수정테이프 불가!');
      }
    }
  }, [isOpen, mode, initialDay]);

  if (!isOpen) return null;

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    // If title is default format, sync title date automatically
    if (!fullTitle || fullTitle.includes('시간표(')) {
      setFullTitle(`2026학년도 2학기 1차 고사 시간표(${newDate})`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date.trim()) return;

    const trimmedDate = date.trim();
    const finalTitle =
      fullTitle.trim() || `2026학년도 2학기 1차 고사 시간표(${trimmedDate})`;
    const finalBottom =
      bottomNotice.trim() || '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※';
    const finalTop =
      topNotice.trim() || '최선을 다하기! 부정행위 금지! 책상 서랍 비우기! 수정테이프 불가!';

    onSave(trimmedDate, finalTitle, finalBottom, finalTop, dayIndex);
    onClose();
  };

  const quickDates = ['10/12', '10/13', '10/14', '10/15', '10/16', '10/17', '10/18', '10/19'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150 my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              {mode === 'add' ? <Plus className="w-5 h-5 stroke-[2.5]" /> : <Edit3 className="w-4.5 h-4.5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {mode === 'add' ? '새 시험 일자 추가' : '시험 일자 및 제목/안내 설정'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {mode === 'add'
                  ? '새로운 날짜의 시험 시간표를 등록합니다'
                  : '등록된 시험 날짜, 전체 제목 및 칠판 안내 멘트를 변경합니다'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-medium text-slate-700">
          {/* Date Input */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>시험 날짜 (월/일)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">예: 10/12, 10/17</span>
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              placeholder="예: 10/17"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black text-base text-slate-900 tracking-wide"
            />
            {/* Quick date chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-slate-500 font-bold">빠른 날짜 선택:</span>
              {quickDates.map((qd) => (
                <button
                  key={qd}
                  type="button"
                  onClick={() => handleDateChange(qd)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer border ${
                    date === qd
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {qd}
                </button>
              ))}
            </div>
          </div>

          {/* Full Title Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>시간표 전체 제목</span>
              </label>
              <button
                type="button"
                onClick={() => setFullTitle(`2026학년도 2학기 1차 고사 시간표(${date || '10/12'})`)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>기본 타이틀 형식 생성</span>
              </button>
            </div>
            <input
              type="text"
              value={fullTitle}
              onChange={(e) => setFullTitle(e.target.value)}
              placeholder="예: 2026학년도 2학기 1차 고사 시간표(10/17)"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xs text-slate-900"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              전자칠판 상단 타이틀과 PDF 출력 시 헤더로 표시됩니다.
            </p>
          </div>

          {/* Bottom Notice (하단 입실 안내 멘트) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 text-xs flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              <span>전자칠판 하단 안내 멘트</span>
            </label>
            <input
              type="text"
              value={bottomNotice}
              onChange={(e) => setBottomNotice(e.target.value)}
              placeholder="예: ※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-900"
            />
          </div>

          {/* Top Notice (상단 고정 유의사항) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              <span>상단 고정 시험 유의사항</span>
            </label>
            <input
              type="text"
              value={topNotice}
              onChange={(e) => setTopNotice(e.target.value)}
              placeholder="최선을 다하기! 부정행위 금지! 책상 서랍 비우기! 수정테이프 불가!"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-900"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-200 transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{mode === 'add' ? '새 날짜 시간표 추가' : '설정 저장 완료'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
