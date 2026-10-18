import React from 'react';
import { Monitor, Settings, Sparkles, School, ShieldAlert, ArrowRight, BookOpen, GraduationCap } from 'lucide-react';

interface AppModeSelectorProps {
  onSelectClassroomMode: (examType: 'regular' | 'suneung') => void;
  onSelectAdminMode: () => void;
}

export const AppModeSelector: React.FC<AppModeSelectorProps> = ({
  onSelectClassroomMode,
  onSelectAdminMode,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-center p-4 sm:p-8 lg:p-12">
      <div className="max-w-6xl w-full mx-auto space-y-10">
        
        {/* Header Branding */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-4 py-1.5 rounded-full text-indigo-300 text-xs font-bold tracking-wider uppercase backdrop-blur-md break-keep">
            <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>고등학교 스마트 시험 시간표 & 전자칠판 통합 시스템</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md break-keep">
            시작할 모드 및 시험 종류를 선택해 주세요
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto break-keep leading-relaxed">
            교실에 배포하는 <strong className="text-emerald-400">정기고사 전자칠판 모드</strong>, <strong className="text-cyan-400">수능/모의고사 전자칠판 모드</strong>, 그리고 시간표 편집을 위한 <strong className="text-indigo-400">관리자 모드</strong> 중 선택하세요.
          </p>
        </div>

        {/* Mode Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* 1. Regular Exam Classroom Mode */}
          <div 
            onClick={() => onSelectClassroomMode('regular')}
            className="group relative bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-2 border-emerald-500/30 hover:border-emerald-400 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/25 transition-all"></div>
            
            <div className="space-y-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7" />
              </div>
              
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full break-keep">
                    교실 배포용
                  </span>
                  <span className="text-xs text-emerald-400 font-bold break-keep">중간/기말고사</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors break-keep">
                  정기고사 전자칠판
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-keep">
                중간고사 및 기말고사 기간에 맞추어 과목별 과목코드, 입실시간, 자습, 이동수업 및 고사실이 표기되는 정기고사 전자칠판 모드입니다.
              </p>
            </div>

            <div className="pt-5 mt-6 border-t border-slate-800/80 flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 break-keep">
                <School className="w-3.5 h-3.5" />
                <span>정기고사 실행</span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black group-hover:translate-x-1 transition-transform shadow-md">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 2. Suneung / Mock Exam Classroom Mode */}
          <div 
            onClick={() => onSelectClassroomMode('suneung')}
            className="group relative bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-2 border-cyan-500/30 hover:border-cyan-400 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/25 transition-all"></div>
            
            <div className="space-y-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <GraduationCap className="w-7 h-7" />
              </div>
              
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-cyan-500 text-slate-950 px-2 py-0.5 rounded-full break-keep">
                    수능 · 모의고사용
                  </span>
                  <span className="text-xs text-cyan-400 font-bold break-keep">고1·2·3 수능 표준</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-cyan-300 transition-colors break-keep">
                  수능 / 모의고사
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-keep">
                대학수학능력시험 및 전국연합학력평가 표준 시간에 맞추어 국어, 수학, 영어, 탐구 영역 예비령 및 본령 알림이 연동되는 수능 전용 모드입니다.
              </p>
            </div>

            <div className="pt-5 mt-6 border-t border-slate-800/80 flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 break-keep">
                <Monitor className="w-3.5 h-3.5" />
                <span>수능 시간표 실행</span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-black group-hover:translate-x-1 transition-transform shadow-md">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 3. Admin / Teacher Mode Card */}
          <div 
            onClick={onSelectAdminMode}
            className="group relative bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-2 border-indigo-500/30 hover:border-indigo-400 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/25 transition-all"></div>
            
            <div className="space-y-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Settings className="w-7 h-7" />
              </div>
              
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white px-2 py-0.5 rounded-full break-keep">
                    교사 및 관리자용
                  </span>
                  <span className="text-xs text-indigo-300 font-bold break-keep">시간표 편집 & AI 추출</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-indigo-300 transition-colors break-keep">
                  관리자 대시보드
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-keep">
                시간표 데이터를 수동 편집하거나 AI 시험 시간표 이미지 추출, 공지사항 관리, 알림 설정, 소스 코드 내보내기를 수행하는 관리자 모드입니다.
              </p>
            </div>

            <div className="pt-5 mt-6 border-t border-slate-800/80 flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 break-keep">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>관리자 대시보드 열기</span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black group-hover:translate-x-1 transition-transform shadow-md">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

        </div>

        <div className="text-center text-xs sm:text-sm text-slate-400 pt-2 break-keep">
          ※ 선택하신 모드는 브라우저에 저장되며, 언제든지 상단 메뉴에서 모드를 변경하거나 전환할 수 있습니다.
        </div>

      </div>
    </div>
  );
};
