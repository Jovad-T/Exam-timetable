import React from 'react';
import { Calendar, Plus, Layers, Filter } from 'lucide-react';
import { ScheduleData } from '../types/schedule';

interface DateTabsProps {
  scheduleData: ScheduleData;
  activeTab: string; // "ALL" or day id (e.g. "day-1013")
  setActiveTab: (tab: string) => void;
  selectedGrade: string; // "ALL" | "1학년" | "2학년" | "3학년"
  setSelectedGrade: (grade: string) => void;
  onAddDay: () => void;
}

export const DateTabs: React.FC<DateTabsProps> = ({
  scheduleData,
  activeTab,
  setActiveTab,
  selectedGrade,
  setSelectedGrade,
  onAddDay,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-[65px] z-20 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Day Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
            
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>전체 일정 보기</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === 'ALL' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {scheduleData.length}일
              </span>
            </button>

            {scheduleData.map((day) => {
              const isSelected = activeTab === day.id;
              const totalSubjects = day.schedule.reduce(
                (acc, p) => acc + p.subjects.length,
                0
              );

              return (
                <button
                  key={day.id || day.date}
                  onClick={() => setActiveTab(day.id || day.date)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`} />
                  <span className="text-sm font-black">{day.date}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                      isSelected
                        ? 'bg-indigo-700 text-indigo-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {totalSubjects}과목
                  </span>
                </button>
              );
            })}

            {/* In-row Add Day Button */}
            <button
              onClick={onAddDay}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-2 border-dashed border-indigo-300 hover:border-indigo-500 transition shrink-0 cursor-pointer shadow-2xs"
              title="새 시험 일자 추가"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>+ 날짜 추가</span>
            </button>

          </div>

          {/* Right Action Group: Grade Filter & Prominent Add Day Action */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto flex-wrap">
            {/* Prominent Always-Visible Add Day Button (사용자 요청: 2번째 사진에 날짜 추가가 보이질 않아) */}
            <button
              onClick={onAddDay}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-black shadow-sm shadow-indigo-200 transition cursor-pointer shrink-0"
              title="새로운 시험 날짜 시간표 추가"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>새 시험 일자 추가</span>
            </button>

            {/* Grade Filter (1학년, 2학년, 3학년) */}
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600 pl-2 pr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-indigo-600" /> 대상 학년:
              </span>
              {['1학년', '2학년', '3학년'].map((grade) => {
                const isGradeActive = selectedGrade === grade;
                return (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      isGradeActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
