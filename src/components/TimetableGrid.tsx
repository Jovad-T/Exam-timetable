import React, { useState } from 'react';
import {
  Clock,
  Users,
  BookOpen,
  Edit2,
  Trash2,
  Plus,
  CheckCircle2,
  Table,
  LayoutGrid,
  Calendar,
  Hash,
  AlertTriangle,
  X,
  Coffee,
  Sun,
  GraduationCap,
  Award,
} from 'lucide-react';
import { DayExamSchedule, SubjectItem } from '../types/schedule';
import { DaySettingsModal } from './DaySettingsModal';
import { cleanNoticeText, isSuneungOrMockSchedule, isMockSchedule, isSuneungSchedule } from '../data/scheduleData';

interface TimetableGridProps {
  daySchedules: DayExamSchedule[];
  selectedGrade: string;
  setSelectedGrade?: (grade: string) => void;
  onEditSubject: (
    dayIndex: number,
    periodIndex: number,
    subjectIndex: number,
    subject: SubjectItem
  ) => void;
  onDeleteSubject: (
    dayIndex: number,
    periodIndex: number,
    subjectIndex: number
  ) => void;
  onAddSubject: (dayIndex: number, periodIndex: number) => void;
  onAddPeriod: (dayIndex: number) => void;
  onDeleteDay: (dayIndex: number) => void;
  onEditDay?: (dayIndex: number, newDate: string, newTitle: string) => void;
  onEditDayBottomNotice?: (dayIndex: number, newBottomNotice: string) => void;
  onEditDayTopNotice?: (dayIndex: number, newTopNotice: string) => void;
  onQuickEditTargetClass?: (
    dayIndex: number,
    periodIndex: number,
    subjectIndex: number,
    newTargetClass: string
  ) => void;
  onAddDay?: () => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  daySchedules,
  selectedGrade,
  setSelectedGrade,
  onEditSubject,
  onDeleteSubject,
  onAddSubject,
  onAddPeriod,
  onDeleteDay,
  onEditDay,
  onEditDayBottomNotice,
  onEditDayTopNotice,
  onAddDay,
}) => {
  const [viewLayout, setViewLayout] = useState<'table' | 'cards'>('table');
  
  // State for DaySettingsModal (날짜/제목 수정 모달)
  const [editingDayState, setEditingDayState] = useState<{
    dayIdx: number;
    day: DayExamSchedule;
  } | null>(null);

  // State for Delete confirmation modal
  const [deletingDayState, setDeletingDayState] = useState<{
    dayIdx: number;
    date: string;
  } | null>(null);

  // 모의고사 모드에서 교시 표시 (기본값: 'all' -> 1~4교시 전체 동시 표시)
  const [selectedMockPeriodId, setSelectedMockPeriodId] = useState<string>('all');

  if (daySchedules.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">등록된 시험 시간표가 없습니다.</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          '새 시험 일자 추가' 버튼을 눌러 시험 시간표를 새로 작성하거나 AI 시간표 분석기를 이용하세요.
        </p>
        {onAddDay && (
          <div className="mt-5">
            <button
              onClick={onAddDay}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>새 시험 일자 추가하기</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Grade color helper
  const getGradeBadgeStyle = (targetClass: string) => {
    if (targetClass.includes('1학년') || targetClass.includes('1~')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (
      targetClass.includes('2학년') ||
      targetClass.includes('4~') ||
      targetClass.includes('5~')
    ) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (targetClass.includes('3학년') || targetClass.includes('지정반')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const handleSaveDaySettings = (
    newDate: string,
    newTitle: string,
    newBottomNotice?: string,
    newTopNotice?: string,
    dayIdx?: number
  ) => {
    if (dayIdx !== undefined) {
      onEditDay?.(dayIdx, newDate, newTitle);
      if (newBottomNotice && onEditDayBottomNotice) {
        onEditDayBottomNotice(dayIdx, newBottomNotice);
      }
      if (newTopNotice && onEditDayTopNotice) {
        onEditDayTopNotice(dayIdx, newTopNotice);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner with Add Day Shortcut */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <span className="text-sm font-black text-slate-800">
            총 {daySchedules.length}개의 시험 일정 관리 중
          </span>
        </div>
        {onAddDay && (
          <button
            onClick={onAddDay}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>새 시험 일자 추가</span>
          </button>
        )}
      </div>

      {/* Grade Selector Toolbar (사용자 요청: 이 화면에서 학년을 선택할 수 있게) */}
      <div className="bg-indigo-900 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 border border-indigo-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-800 border border-indigo-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">조회 및 관리 대상 학년 선택</h4>
            <p className="text-xs text-indigo-200">학년별로 시간표와 과목 대상 반이 필터링됩니다.</p>
          </div>
        </div>

        {setSelectedGrade && (
          <div className="flex items-center gap-1.5 bg-indigo-950/80 p-1.5 rounded-xl border border-indigo-700/80">
            {['1학년', '2학년', '3학년'].map((grade) => {
              const isSelected = selectedGrade === grade;
              return (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                    isSelected
                      ? 'bg-white text-indigo-950 shadow-md scale-105'
                      : 'text-indigo-200 hover:text-white hover:bg-indigo-800/60'
                  }`}
                >
                  {grade}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {daySchedules.map((day, dayIdx) => {
        return (
          <div
            key={day.id || day.date || dayIdx}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition"
          >
            {/* Day Header (Admin controls) */}
            <div className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="bg-indigo-600 text-white text-base sm:text-lg font-black px-4 py-1.5 rounded-xl shadow-sm tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{isMockSchedule(day) ? '모의고사' : day.date}</span>
                </span>

                <span className="text-xs sm:text-sm text-slate-300 font-bold">
                  {isMockSchedule(day) ? '전국연합학력평가' : (day.fullTitle || `2026학년도 2학기 1차 고사 시간표(${day.date})`)}
                </span>

                {/* 날짜/제목 수정 버튼 (클릭 시 전용 모달 오픈, window.prompt 완전 대체) */}
                <button
                  type="button"
                  onClick={() => setEditingDayState({ dayIdx, day })}
                  className="text-xs text-indigo-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 font-black transition cursor-pointer shadow-2xs"
                  title="시험 날짜 및 전체 제목 수정"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>날짜/제목 수정</span>
                </button>
              </div>

              {/* View Layout & Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                {/* View Layout Toggle */}
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setViewLayout('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      viewLayout === 'table'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="관리자 일괄 테이블 뷰"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>상세 테이블</span>
                  </button>
                  <button
                    onClick={() => setViewLayout('cards')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      viewLayout === 'cards'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="카드 그리드 뷰"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>카드 뷰</span>
                  </button>
                </div>

                <button
                  onClick={() => onAddPeriod(dayIdx)}
                  className="flex items-center gap-1 text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>교시 추가</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingDayState({ dayIdx, date: day.date })}
                  className="flex items-center gap-1 text-xs font-black bg-rose-950/60 hover:bg-rose-900 text-rose-300 px-3 py-2 rounded-xl border border-rose-800/80 transition cursor-pointer"
                  title="이 날짜 시간표 전체 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>날짜 삭제</span>
                </button>
              </div>
            </div>

            {/* Notice Bar */}
            <div className="bg-amber-50/90 border-b border-amber-200 px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-bold text-amber-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>[상단 고정 유의사항] {cleanNoticeText(day.notice)}</span>
                <button
                  type="button"
                  onClick={() => setEditingDayState({ dayIdx, day })}
                  className="text-amber-800 hover:text-black underline ml-1 cursor-pointer font-black"
                >
                  수정
                </button>
              </div>

              {/* 하단 안내 멘트 */}
              <div className="flex items-center gap-2 bg-emerald-100/90 text-emerald-950 px-3 py-1 rounded-lg border border-emerald-300">
                <span>
                  [하단 입실 안내 멘트]{' '}
                  {day.bottomNotice || '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingDayState({ dayIdx, day })}
                  className="text-emerald-900 hover:text-black underline ml-1 font-black cursor-pointer"
                >
                  수정
                </button>
              </div>
            </div>

            {/* Schedule Content */}
            <div className="p-6 space-y-6">
              {/* 모의고사 모드: '전체' 고정 모드로 동작하도록 버튼 제거 */}
              {isMockSchedule(day) && (
                <div className="hidden"></div>
              )}

              {(isMockSchedule(day)
                ? (selectedMockPeriodId === 'all'
                    ? day.schedule
                    : day.schedule.filter((p) => p.id === selectedMockPeriodId))
                : day.schedule
              ).map((period, periodIdx) => {
                const filteredSubjects = isSuneungOrMockSchedule(day)
                  ? period.subjects
                  : period.subjects.filter((sub) => {
                      if (sub.targetClass.includes(selectedGrade)) return true;
                      if (sub.targetClass.includes('전체') || sub.targetClass.includes('공통')) return true;
                      const otherGrades = ['1학년', '2학년', '3학년'].filter((g) => g !== selectedGrade);
                      const mentionsOtherGrade = otherGrades.some((g) => sub.targetClass.includes(g));
                      if (!mentionsOtherGrade) return true;
                      return false;
                    });

                const isBreak = period.period.includes('휴식') || period.period.includes('쉬는');
                const isLunch = period.period.includes('점심') || period.period.includes('중식');
                const isMorningAssembly = period.period.includes('입실') || period.period.includes('조례');
                const isCleanup = period.period.includes('채점') || period.period.includes('청소');
                const isEnglish = period.period.includes('3교시') && (isSuneungOrMockSchedule(day) || period.subjects.some((s) => s.name.includes('영어')));

                if (isMorningAssembly || isCleanup) {
                  const sub0 = period.subjects[0];
                  return (
                    <div
                      key={period.id || period.period || periodIdx}
                      className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                        isMorningAssembly
                          ? 'bg-indigo-50/90 border-indigo-200'
                          : 'bg-purple-50/90 border-purple-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center font-black shadow-xs shrink-0 ${
                          isMorningAssembly ? 'bg-indigo-600' : 'bg-purple-600'
                        }`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-black text-white px-2.5 py-0.5 rounded-full ${
                              isMorningAssembly ? 'bg-indigo-600' : 'bg-purple-600'
                            }`}>
                              {period.period} ({sub0?.duration || 10}분)
                            </span>
                            <span className="text-xs sm:text-sm font-black text-slate-900">
                              {sub0?.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 font-bold mt-1 flex items-center gap-3 flex-wrap">
                            {sub0?.proceedGuide && (
                              <span>진행요령: <strong className="text-indigo-900">{sub0.proceedGuide}</strong></span>
                            )}
                            {sub0?.supervisorInfo && (
                              <span>감독교사: <strong className="text-purple-900">{sub0.supervisorInfo}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-xs font-mono font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-300">
                          {sub0?.time}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (isBreak) {
                  return (
                    <div
                      key={period.id || period.period || periodIdx}
                      className="bg-emerald-50/80 rounded-2xl border border-emerald-200/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                          <Coffee className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                              ☕ 휴식시간 ({period.subjects[0]?.duration || 20}분)
                            </span>
                            <span className="text-xs font-bold text-emerald-800">
                              {period.subjects[0]?.name}
                            </span>
                          </div>
                          <div className="text-xs text-emerald-950 font-medium mt-0.5">
                            다음 교시 준비령/입실: <strong className="font-bold text-indigo-900">{period.subjects[0]?.entryTime || '10:20'}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-xs font-mono font-black text-emerald-900 bg-white px-3 py-1 rounded-lg border border-emerald-300">
                          {period.subjects[0]?.time}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddSubject(dayIdx, periodIdx)}
                          className="px-2.5 py-1 text-xs font-black text-emerald-700 bg-white hover:bg-emerald-100 rounded-lg border border-emerald-300 cursor-pointer"
                        >
                          수정
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isLunch) {
                  return (
                    <div
                      key={period.id || period.period || periodIdx}
                      className="bg-amber-50/80 rounded-2xl border border-amber-200/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
                          <Sun className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                              🍱 점심시간 ({period.subjects[0]?.duration || 50}분)
                            </span>
                            <span className="text-xs font-bold text-amber-900">
                              {period.subjects[0]?.name}
                            </span>
                          </div>
                          <div className="text-xs text-amber-950 font-medium mt-0.5">
                            🚨 3교시 영어 준비령/입실 완료: <strong className="font-bold text-rose-700">13:00 정각</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-xs font-mono font-black text-amber-950 bg-white px-3 py-1 rounded-lg border border-amber-300">
                          {period.subjects[0]?.time}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddSubject(dayIdx, periodIdx)}
                          className="px-2.5 py-1 text-xs font-black text-amber-800 bg-white hover:bg-amber-100 rounded-lg border border-amber-300 cursor-pointer"
                        >
                          수정
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={period.id || period.period || periodIdx}
                    className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4"
                  >
                    {/* 3교시 영어 영역 타종 금지 안내 배너 */}
                    {isEnglish && (
                      <div className="bg-rose-50 border border-rose-300 text-rose-950 p-2.5 rounded-xl text-xs font-black flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🚫</span>
                          <span>3교시 영어 영역 특수 지침: 13:10 정각 본령(타종) 절대 금지 및 교내 정숙 (듣기평가 방송 송출)</span>
                        </div>
                        <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-black shrink-0">
                          무타종 원칙
                        </span>
                      </div>
                    )}

                    {/* Period Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
                          {period.period.replace(/[^0-9]/g, '') || periodIdx + 1}
                        </span>
                        <h4 className="text-base font-black text-slate-900">{period.period}</h4>
                        <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                          {isMockSchedule(day) ? '모의고사 타종 모드' : `${period.subjects.length}개 항목 등록됨`}
                        </span>
                      </div>

                      <button
                        onClick={() => onAddSubject(dayIdx, periodIdx)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black border border-indigo-200 transition cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>과목 추가</span>
                      </button>
                    </div>

                    {/* Table View */}
                    {viewLayout === 'table' ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            {isMockSchedule(day) ? (
                              <tr>
                                <th className="py-2.5 px-3">과목 / 영역</th>
                                <th className="py-2.5 px-3">예비령 (입실)</th>
                                <th className="py-2.5 px-3">준비령 (문답지 배부)</th>
                                <th className="py-2.5 px-3">본령 (시험시간)</th>
                                <th className="py-2.5 px-3">소요 시간</th>
                                <th className="py-2.5 px-3 text-right">관리</th>
                              </tr>
                            ) : (
                              <tr>
                                <th className="py-2.5 px-3">과목명 / 단계</th>
                                <th className="py-2.5 px-3">과목코드</th>
                                <th className="py-2.5 px-3">준비령 / 입실</th>
                                <th className="py-2.5 px-3">본령 / 시험시간</th>
                                <th className="py-2.5 px-3">소요 시간</th>
                                <th className="py-2.5 px-3">진행요령 / 감독교사 / 대상반</th>
                                <th className="py-2.5 px-3 text-right">관리</th>
                              </tr>
                            )}
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredSubjects.length === 0 ? (
                              <tr>
                                <td colSpan={isMockSchedule(day) ? 6 : 7} className="py-6 text-center text-slate-400 font-medium">
                                  선택된 학년({selectedGrade})에 해당하는 과목이 없습니다.
                                </td>
                              </tr>
                            ) : (
                              filteredSubjects.map((sub) => {
                                const actualSubIdx = period.subjects.findIndex(
                                  (s) => s.name === sub.name && s.time === sub.time
                                );

                                if (isMockSchedule(day)) {
                                  return (
                                    <tr
                                      key={sub.id || `${sub.name}-${sub.time}`}
                                      className="hover:bg-purple-50/40 transition"
                                    >
                                      <td className="py-3 px-3 font-black text-slate-900 text-sm">
                                        {sub.name}
                                      </td>
                                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                                        {sub.preliminaryBell || sub.entryTime || '08:25'}
                                      </td>
                                      <td className="py-3 px-3 font-mono font-bold text-amber-700">
                                        {sub.prepTimeRange ? sub.prepTimeRange.replace(/\s+/g, '') : '08:35'}
                                      </td>
                                      <td className="py-3 px-3 font-extrabold text-slate-900 font-mono">
                                        {sub.time}
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                                          {sub.duration}분
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            onClick={() =>
                                              onEditSubject(dayIdx, periodIdx, actualSubIdx, sub)
                                            }
                                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                            title="과목 수정"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              onDeleteSubject(dayIdx, periodIdx, actualSubIdx)
                                            }
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                            title="과목 삭제"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr
                                    key={sub.id || `${sub.name}-${sub.time}`}
                                    className="hover:bg-indigo-50/40 transition"
                                  >
                                    <td className="py-3 px-3 font-black text-slate-900 text-sm">
                                      {sub.name}
                                    </td>
                                    <td className="py-3 px-3">
                                      {sub.subjectCode ? (
                                        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                                          ({sub.subjectCode})
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-mono">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 font-bold text-slate-600 leading-tight">
                                      {sub.prepTimeRange ? (
                                        <div className="flex flex-col">
                                          <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded w-fit border border-indigo-200">
                                            준비령
                                          </span>
                                          <span className="font-mono font-black text-slate-900 mt-0.5">{sub.prepTimeRange}</span>
                                        </div>
                                      ) : sub.entryTime ? (
                                        <div className="flex flex-col">
                                          <span className="font-mono font-black text-slate-900">{sub.entryTime.replace('입실', '').trim()}</span>
                                          <span className="text-[11px] text-slate-500 font-normal">입실/시작</span>
                                        </div>
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                    <td className="py-3 px-3 font-extrabold text-slate-900 font-mono">
                                      {sub.time}
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                                        {sub.duration}분
                                      </span>
                                    </td>
                                    <td className="py-3 px-3">
                                      <button
                                        type="button"
                                        onClick={() => onEditSubject(dayIdx, periodIdx, actualSubIdx, sub)}
                                        className={`group/tc inline-flex flex-col items-start gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-black transition cursor-pointer hover:shadow-2xs hover:border-indigo-400 text-left ${getGradeBadgeStyle(
                                          sub.targetClass
                                        )}`}
                                        title="클릭하여 과목 및 대상 반 상세 수정"
                                      >
                                        {sub.proceedGuide || sub.supervisorInfo ? (
                                          <>
                                            {sub.proceedGuide && (
                                              <span className="text-slate-900 font-bold">{sub.proceedGuide}</span>
                                            )}
                                            {sub.supervisorInfo && (
                                              <span className="text-indigo-800 bg-white/80 px-1.5 py-0.5 rounded border border-indigo-200 text-[11px]">
                                                감독: {sub.supervisorInfo}
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          <span className="inline-flex items-center gap-1.5">
                                            <span>{sub.targetClass}</span>
                                            <Edit2 className="w-3 h-3 opacity-40 group-hover/tc:opacity-100 transition text-slate-700" />
                                          </span>
                                        )}
                                      </button>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() =>
                                            onEditSubject(dayIdx, periodIdx, actualSubIdx, sub)
                                          }
                                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                          title="과목 수정 (입실/시험시간/대상반)"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            onDeleteSubject(dayIdx, periodIdx, actualSubIdx)
                                          }
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                          title="과목 삭제"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Card Grid View */
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredSubjects.map((subject) => {
                          const actualSubIdx = period.subjects.findIndex(
                            (s) => s.name === subject.name && s.time === subject.time
                          );
                          const isEngSub = subject.name.includes('영어');

                          if (isMockSchedule(day)) {
                            return (
                              <div
                                key={subject.id || `${subject.name}-${subject.time}`}
                                className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-sm hover:border-purple-300 transition flex flex-col justify-between space-y-3"
                              >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <h5 className="font-black text-base text-slate-900">
                                    {subject.name}
                                  </h5>
                                  <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-xs border border-indigo-200">
                                    {subject.duration}분
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
                                  <div className="bg-blue-50 border border-blue-200 p-2 rounded-xl">
                                    <span className="text-[10px] text-blue-700 block font-black">🔔 예비령</span>
                                    <strong className="text-blue-950 font-mono text-sm">{subject.preliminaryBell || subject.entryTime || '08:25'}</strong>
                                  </div>
                                  <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl">
                                    <span className="text-[10px] text-amber-700 block font-black">🔔 준비령</span>
                                    <strong className="text-amber-950 font-mono text-sm">{subject.prepTimeRange ? subject.prepTimeRange.replace(/\s+/g, '') : '08:35'}</strong>
                                  </div>
                                  <div className="bg-rose-50 border border-rose-200 p-2 rounded-xl col-span-2">
                                    <span className="text-[10px] text-rose-700 block font-black">
                                      {isEngSub ? '📻 본령 (무타종 듣기평가)' : '🔔 본령 (시험 시작)'}
                                    </span>
                                    <strong className="text-rose-950 font-mono text-sm">{subject.time}</strong>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
                                  <button
                                    onClick={() => onEditSubject(dayIdx, periodIdx, actualSubIdx, subject)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                    title="수정"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteSubject(dayIdx, periodIdx, actualSubIdx)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={subject.id || `${subject.name}-${subject.time}`}
                              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-indigo-300 transition flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-black text-sm text-slate-900">
                                    {subject.name}
                                  </h5>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        onEditSubject(dayIdx, periodIdx, actualSubIdx, subject)
                                      }
                                      className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                      title="수정"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        onDeleteSubject(dayIdx, periodIdx, actualSubIdx)
                                      }
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                      title="삭제"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onEditSubject(dayIdx, periodIdx, actualSubIdx, subject)
                                    }
                                    className={`group/tc inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-md border transition cursor-pointer hover:border-indigo-400 ${getGradeBadgeStyle(
                                      subject.targetClass
                                    )}`}
                                    title="클릭하여 상세 수정"
                                  >
                                    <Users className="w-3 h-3 inline" />
                                    <span>{subject.targetClass}</span>
                                    <Edit2 className="w-2.5 h-2.5 opacity-40 group-hover/tc:opacity-100 transition" />
                                  </button>
                                  {subject.entryTime && (
                                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md inline-flex flex-col items-center leading-tight">
                                      <span>{subject.entryTime.replace('입실', '').trim()}</span>
                                      <span className="text-[10px] text-slate-500">입실</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1 font-bold text-slate-700">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {subject.time}
                                </span>
                                <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[11px]">
                                  {subject.duration}분
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Bottom Add Day Action */}
      {onAddDay && (
        <div className="text-center pt-2">
          <button
            onClick={onAddDay}
            className="px-6 py-3 bg-white hover:bg-indigo-50 border-2 border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-700 rounded-2xl text-xs font-black transition cursor-pointer inline-flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ 새로운 시험 날짜 시간표 추가하기</span>
          </button>
        </div>
      )}

      {/* Dedicated Day Settings Modal (날짜/제목 수정 모달) */}
      <DaySettingsModal
        isOpen={editingDayState !== null}
        onClose={() => setEditingDayState(null)}
        mode="edit"
        dayIndex={editingDayState?.dayIdx}
        initialDay={editingDayState?.day}
        onSave={handleSaveDaySettings}
      />

      {/* Delete Confirmation Modal (window.confirm 완전 대체) */}
      {deletingDayState !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">시험 일자 시간표 삭제</h4>
                <p className="text-xs text-slate-500">
                  '{deletingDayState.date}' 시간표 전체를 삭제하시겠습니까?
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-rose-50/60 p-3 rounded-xl border border-rose-100">
              해당 날짜에 등록된 모든 교시와 과목 정보가 영구적으로 제거됩니다.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDayState(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDay(deletingDayState.dayIdx);
                  setDeletingDayState(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
