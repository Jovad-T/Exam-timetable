import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Clock,
  Sparkles,
  Zap,
  Hash,
  BookOpen,
  Users,
  Calculator,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { SubjectItem } from '../types/schedule';
import { getSuggestedTime, addMinutesToTime } from '../utils/timeHelper';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: SubjectItem) => void;
  initialSubject?: SubjectItem | null;
  periodName: string;
  prevPeriodEndTime?: string | null;
  selectedGrade?: string;
  isMockMode?: boolean;
}

// Helper to convert 'HH:mm' to minutes from midnight
const timeToMinutes = (t: string): number => {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Helper to convert minutes from midnight to 'HH:mm'
const minutesToTime = (mins: number): string => {
  const normalized = Math.max(0, mins % (24 * 60));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Generate time options list (08:00 ~ 17:30 in 5 min steps)
const generateTimeOptions = (startHour = 8, endHour = 17) => {
  const options: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === endHour && m > 30) break;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions(8, 17);

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSubject,
  periodName,
  prevPeriodEndTime,
  selectedGrade = '2학년',
  isMockMode = false,
}) => {
  const [name, setName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [grade, setGrade] = useState(selectedGrade);
  const [entryTime, setEntryTime] = useState('09:10');
  const [prepTimeRange, setPrepTimeRange] = useState('08:35');
  const [startTime, setStartTime] = useState('09:20');
  const [endTime, setEndTime] = useState('10:20');
  const [time, setTime] = useState('09:20~10:20');
  const [duration, setDuration] = useState<number>(60);
  const [targetClass, setTargetClass] = useState('행정학급');

  // Initialize form state
  useEffect(() => {
    if (initialSubject) {
      let rawName = initialSubject.name || '';
      let code = initialSubject.subjectCode || '';

      // Auto-extract code if name is like "기하(03)"
      const codeMatch = rawName.match(/^(.*?)\((\d+)\)$/);
      if (codeMatch) {
        rawName = codeMatch[1];
        if (!code) code = codeMatch[2];
      }

      setName(rawName);
      setSubjectCode(code);
      setEntryTime(initialSubject.preliminaryBell || initialSubject.entryTime || (isMockMode ? '08:25' : '09:10'));
      setPrepTimeRange(
        initialSubject.prepTimeRange
          ? initialSubject.prepTimeRange.replace(/\s+/g, '')
          : isMockMode
          ? '08:35'
          : ''
      );
      
      const rawTime = initialSubject.time || (isMockMode ? '08:40 ~ 10:00' : '09:20~10:20');
      setTime(rawTime);

      // Parse start and end time from time string
      const parts = rawTime.split(/[~～-]/);
      const parsedStart = parts[0]?.trim() || '09:20';
      const parsedEnd = parts[1]?.trim() || '10:20';
      setStartTime(parsedStart);
      setEndTime(parsedEnd);

      const dur = initialSubject.duration || 60;
      setDuration(dur);
      setTargetClass(initialSubject.targetClass || (isMockMode ? '전체' : '행정학급'));

      if (initialSubject.targetClass?.includes('1학년')) setGrade('1학년');
      else if (initialSubject.targetClass?.includes('2학년')) setGrade('2학년');
      else if (initialSubject.targetClass?.includes('3학년')) setGrade('3학년');
    } else {
      // Auto-suggestions based on previous period or period name
      const suggestion = getSuggestedTime(periodName, prevPeriodEndTime, isMockMode ? 70 : 60);
      setName('');
      setSubjectCode('');
      setGrade(selectedGrade);
      setEntryTime(isMockMode ? '08:25' : suggestion.suggestedEntryTime);
      setPrepTimeRange(isMockMode ? '08:35' : '');
      
      const parts = suggestion.suggestedTimeRange.split(/[~～-]/);
      const parsedStart = parts[0]?.trim() || '09:20';
      const parsedEnd = parts[1]?.trim() || '10:20';
      setStartTime(parsedStart);
      setEndTime(parsedEnd);
      setTime(suggestion.suggestedTimeRange);
      setDuration(suggestion.suggestedDuration);
      setTargetClass(isMockMode ? '전체' : '행정학급');
    }
  }, [initialSubject, isOpen, periodName, prevPeriodEndTime, selectedGrade, isMockMode]);

  if (!isOpen) return null;

  // Handle Start Time Change -> Auto calculate duration based on end time, or shift end time
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const startM = timeToMinutes(newStart);
    const endM = timeToMinutes(endTime);

    if (endM > startM) {
      // Auto calculate duration from difference
      const newDur = endM - startM;
      setDuration(newDur);
      setTime(isMockMode ? `${newStart} ~ ${endTime}` : `${newStart}~${endTime}`);
    } else {
      // If end time is before or equal to start time, push end time by current duration
      const newEndM = startM + (duration || 60);
      const newEnd = minutesToTime(newEndM);
      setEndTime(newEnd);
      setTime(isMockMode ? `${newStart} ~ ${newEnd}` : `${newStart}~${newEnd}`);
    }
  };

  // Handle End Time Change -> Auto calculate duration and update time string
  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    const startM = timeToMinutes(startTime);
    const endM = timeToMinutes(newEnd);

    if (endM > startM) {
      const calculatedDuration = endM - startM;
      setDuration(calculatedDuration);
      setTime(isMockMode ? `${startTime} ~ ${newEnd}` : `${startTime}~${newEnd}`);
    } else {
      setTime(isMockMode ? `${startTime} ~ ${newEnd}` : `${startTime}~${newEnd}`);
    }
  };

  // Handle Duration Change (user typing or preset button) -> Auto calculate end time
  const handleDurationChange = (newDur: number) => {
    setDuration(newDur);
    const startM = timeToMinutes(startTime);
    if (startM > 0 && newDur > 0) {
      const newEndM = startM + newDur;
      const newEnd = minutesToTime(newEndM);
      setEndTime(newEnd);
      setTime(isMockMode ? `${startTime} ~ ${newEnd}` : `${startTime}~${newEnd}`);
    }
  };

  // Preset button handler
  const applyPreset = (
    presetEntry: string,
    presetStart: string,
    presetEnd: string,
    presetDur: number,
    presetPrep?: string,
    presetName?: string
  ) => {
    setEntryTime(presetEntry);
    if (presetPrep !== undefined) setPrepTimeRange(presetPrep);
    if (presetName && !name.trim()) setName(presetName);
    setStartTime(presetStart);
    setEndTime(presetEnd);
    setTime(isMockMode ? `${presetStart} ~ ${presetEnd}` : `${presetStart}~${presetEnd}`);
    setDuration(presetDur);
  };

  // Helper to set entry time to 10 minutes before start time
  const handleSetEntry10MinBefore = () => {
    const startM = timeToMinutes(startTime);
    if (startM >= 15 && isMockMode) {
      setEntryTime(minutesToTime(startM - 15));
      setPrepTimeRange(minutesToTime(startM - 5));
    } else if (startM >= 10) {
      setEntryTime(minutesToTime(startM - 10));
    }
  };

  const targetClassPresets = [
    '전체',
    '행정학급',
    '1~3반',
    '4~8반',
    'A206',
    '지정반',
    '1학년 전체',
    '2학년 전체',
    '3학년 전체',
    '본인 학급',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedName = name.trim();
    const trimmedCode = subjectCode.trim();

    // Construct full display name (e.g. 기하(03))
    const formattedName =
      !isMockMode && trimmedCode && !trimmedName.includes('(')
        ? `${trimmedName}(${trimmedCode})`
        : trimmedName;

    // Final formatted time range
    const finalTime = isMockMode ? `${startTime} ~ ${endTime}` : `${startTime}~${endTime}`;

    const savedSubject: SubjectItem = {
      ...initialSubject,
      id: initialSubject?.id || `sub-${Date.now()}`,
      name: formattedName,
      subjectCode: trimmedCode,
      entryTime: entryTime.trim(),
      time: finalTime,
      duration: Number(duration) || 60,
      targetClass: targetClass.trim(),
    };

    if (isMockMode || prepTimeRange.trim() || initialSubject?.preliminaryBell) {
      savedSubject.preliminaryBell = entryTime.trim();
      savedSubject.prepTimeRange = prepTimeRange.trim() || minutesToTime(Math.max(0, timeToMinutes(startTime) - 5));
      savedSubject.endBell = endTime.trim();
    }

    onSave(savedSubject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden relative animate-in fade-in zoom-in duration-150 my-6">
        {/* Header */}
        <div className={`${isMockMode ? 'bg-purple-950' : 'bg-slate-900'} text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800`}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              {isMockMode
                ? initialSubject
                  ? `모의고사 영역/타종 수정 (${periodName})`
                  : `모의고사 새 영역 추가 (${periodName})`
                : initialSubject
                ? `정기고사 과목 수정 (${grade} ${periodName})`
                : `정기고사 새 과목 추가 (${grade} ${periodName})`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-medium text-slate-700">
          {/* Grade Selector */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>대상 학년 선택:</span>
            </span>
            <div className="grid grid-cols-4 gap-2">
              {['1학년', '2학년', '3학년', '전체'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer border ${
                    grade === g
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Auto-Suggestion Banner */}
          {prevPeriodEndTime && !initialSubject && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-amber-900 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                이전 교시 종료 시간(<strong>{prevPeriodEndTime}</strong>) 기준 10분 입실/휴식시간 포함 <strong>자동 추천</strong>되었습니다.
              </span>
            </div>
          )}

          {/* Subject Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8">
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>과목명 (예: 기하, 미적분1, 자습)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="과목명 입력 (예: 기하)"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-900"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                <span>과목코드 (선택)</span>
              </label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="예: 03, 02"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-900 text-center"
              />
            </div>
          </div>

          {/* Quick Presets Chips */}
          <div>
            <span className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />{' '}
              {isMockMode ? '전국연합학력평가(모의고사) 표준 타종 1-Click 선택:' : '표준 시험시간 빠른 1-Click 선택:'}
            </span>
            {isMockMode ? (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('08:25', '08:40', '10:00', 80, '08:35', '국어 영역')}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 text-[11px] font-bold transition cursor-pointer"
                >
                  1교시 국어 (08:40~10:00, 80분)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('10:20', '10:30', '12:10', 100, '10:25', '수학 영역')}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 text-[11px] font-bold transition cursor-pointer"
                >
                  2교시 수학 (10:30~12:10, 100분)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('12:55', '13:10', '14:20', 70, '13:00', '영어 영역')}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 text-[11px] font-bold transition cursor-pointer"
                >
                  3교시 영어 (13:10~14:20, 70분)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('14:40', '14:50', '15:20', 30, '14:45', '한국사')}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 text-[11px] font-bold transition cursor-pointer"
                >
                  4교시 한국사 (14:50~15:20, 30분)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('15:25', '15:35', '16:15', 40, '15:30', '통합사회 (탐구 1)')}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 text-[11px] font-bold transition cursor-pointer"
                >
                  4교시 탐구1 (15:35~16:15, 40분)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('16:20', '16:30', '17:10', 40, '16:25', '통합과학 (탐구 2)')}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 text-[11px] font-bold transition cursor-pointer"
                >
                  4교시 탐구2 (16:30~17:10, 40분)
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('08:30', '08:30', '09:00', 30)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg border border-slate-200 text-[11px] font-bold transition cursor-pointer"
                >
                  자습 (08:30~09:00, 30분)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('09:10', '09:20', '10:20', 60)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg border border-slate-200 text-[11px] font-bold transition cursor-pointer"
                >
                  1교시 60분 (09:20~10:20)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('09:20', '09:30', '10:20', 50)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg border border-slate-200 text-[11px] font-bold transition cursor-pointer"
                >
                  1교시 50분 (09:30~10:20)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('10:50', '11:00', '12:00', 60)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg border border-slate-200 text-[11px] font-bold transition cursor-pointer"
                >
                  2교시 60분 (11:00~12:00)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('11:00', '11:10', '12:00', 50)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg border border-slate-200 text-[11px] font-bold transition cursor-pointer"
                >
                  2교시 50분 (11:10~12:00)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('11:10', '11:20', '12:00', 40)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg border border-slate-200 text-[11px] font-bold transition cursor-pointer"
                >
                  2교시 40분 (11:20~12:00)
                </button>
              </div>
            )}
          </div>

          {/* Time & Duration Section (사용자 요청: 입실 시간/시험 시간 드롭다운 & 시험시간 자동 계산) */}
          <div className={`${isMockMode ? 'bg-purple-50/60 border-purple-200' : 'bg-indigo-50/60 border-indigo-200'} p-4 rounded-2xl border-2 space-y-3.5`}>
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <span className="font-black text-indigo-950 text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>{isMockMode ? '모의고사 타종 시간 (예비령·준비령·본령) 설정' : '시간 드롭다운 선택 & 시험시간 자동 계산'}</span>
              </span>
              <span className={`text-[11px] ${isMockMode ? 'bg-purple-600' : 'bg-indigo-600'} text-white font-extrabold px-2 py-0.5 rounded-full`}>
                자동 계산 활성화
              </span>
            </div>

            {/* 1. 입실 시간(예비령) 및 모의고사 준비령 드롭다운 */}
            <div className={isMockMode ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : ''}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <span>{isMockMode ? '🔔 예비령 (입실 시각)' : '입실 시간 (entryTime)'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSetEntry10MinBefore}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    {isMockMode ? '자동 맞춤' : '시작 10분 전으로 맞추기'}
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 appearance-none pr-8 cursor-pointer"
                  >
                    {!TIME_OPTIONS.includes(entryTime) && (
                      <option value={entryTime}>{entryTime} (현재 설정값)</option>
                    )}
                    {TIME_OPTIONS.map((t) => (
                      <option key={`entry-${t}`} value={t}>
                        {t} {isMockMode ? '(예비령/입실)' : '(입실)'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-indigo-600 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {isMockMode && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800 flex items-center gap-1">
                      <span>🔔 준비령 (문제지 배부)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const startM = timeToMinutes(startTime);
                        if (startM >= 5) setPrepTimeRange(minutesToTime(startM - 5));
                      }}
                      className="text-[11px] text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer"
                    >
                      본령 5분 전
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      value={prepTimeRange}
                      onChange={(e) => setPrepTimeRange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-purple-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-black text-slate-900 appearance-none pr-8 cursor-pointer"
                    >
                      {!TIME_OPTIONS.includes(prepTimeRange) && prepTimeRange && (
                        <option value={prepTimeRange}>{prepTimeRange} (현재 설정값)</option>
                      )}
                      {TIME_OPTIONS.map((t) => (
                        <option key={`prep-${t}`} value={t}>
                          {t} (준비령)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-purple-600 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* 2. 시험 시작 시간 ~ 시험 종료 시간 드롭다운 */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                시험 시간 (time): 시작 시간 ~ 종료 시간 선택
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 시작 시간 드롭다운 */}
                <div className="relative">
                  <span className="text-[10px] font-extrabold text-indigo-700 block mb-0.5">
                    시험 시작 시간
                  </span>
                  <select
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 appearance-none pr-8 cursor-pointer"
                  >
                    {!TIME_OPTIONS.includes(startTime) && (
                      <option value={startTime}>{startTime}</option>
                    )}
                    {TIME_OPTIONS.map((t) => (
                      <option key={`start-${t}`} value={t}>
                        {t} 시작
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-indigo-600 absolute right-3 top-7 pointer-events-none" />
                </div>

                {/* 종료 시간 드롭다운 */}
                <div className="relative">
                  <span className="text-[10px] font-extrabold text-indigo-700 block mb-0.5">
                    시험 종료 시간
                  </span>
                  <select
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 appearance-none pr-8 cursor-pointer"
                  >
                    {!TIME_OPTIONS.includes(endTime) && (
                      <option value={endTime}>{endTime}</option>
                    )}
                    {TIME_OPTIONS.map((t) => (
                      <option key={`end-${t}`} value={t}>
                        {t} 종료
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-indigo-600 absolute right-3 top-7 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 3. 자동 계산된 시험 시간(분) & 실시간 연동 */}
            <div className="bg-white p-3 rounded-xl border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-black text-slate-900 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>시험 시간(분) (duration)</span>
                </label>
                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ⚡ {startTime} ~ {endTime} 기준 자동 계산됨
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  min={10}
                  max={240}
                  step={5}
                  required
                  className="w-28 px-3 py-2 rounded-xl border-2 border-emerald-400 bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-black text-base text-slate-900 text-center"
                />
                <span className="font-extrabold text-slate-800 text-sm">분 동안 진행</span>

                {/* Quick duration presets */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[30, 40, 45, 50, 60, 70, 80].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => handleDurationChange(dur)}
                      className={`px-2 py-1 rounded-md text-[11px] font-extrabold transition cursor-pointer border ${
                        duration === dur
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {dur}분
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>
                  최종 적용: 입실 <strong>{entryTime}</strong> | 시험 시간 <strong>{startTime} ~ {endTime}</strong> ({duration}분)
                </span>
              </div>
            </div>
          </div>

          {/* Target Class / Room */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>대상 반/장소 수동 입력 (targetClass)</span>
              </label>
              <span className="text-[11px] text-slate-500">직접 입력 또는 프리셋 클릭</span>
            </div>

            <input
              type="text"
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              placeholder="예: 전체, 1~3반, A206, 지정반, 행정학급 등 자유 입력"
              required
              className="w-full px-3 py-2 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-black text-slate-900 bg-white"
            />

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-slate-500">추천 프리셋:</span>
              {targetClassPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTargetClass(preset)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold transition cursor-pointer border ${
                    targetClass === preset
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
            >
              취소
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold shadow-sm transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>과목 시간표 저장</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
