import React, { useState, useEffect, useRef } from 'react';
import { DayExamSchedule, ClassAttendance, ExamAlertSettings } from '../types/schedule';
import {
  Maximize2,
  Minimize2,
  Clock,
  Calendar,
  Edit3,
  Check,
  Pencil,
  ChevronDown,
  Timer,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Flame,
  Bell,
  Volume2,
  VolumeX,
  Layers,
  Palette,
  DoorOpen,
  MapPin,
  Target,
  X,
  Settings,
  BookOpen,
  Mic,
  Sun,
  SunMedium,
  SunDim,
  Coffee,
  Award,
  GraduationCap,
} from 'lucide-react';
import { ChalkCanvas } from './ChalkCanvas';
import { audioAlert } from '../utils/audioAlert';
import { SubjectItem } from '../types/schedule';
import { DEFAULT_ANNOUNCEMENT_TEMPLATES } from './AlertSettingsCard';
import { getKoreaDate, isTodayScheduleDay } from '../utils/dateUtils';
import { cleanNoticeText, isSuneungOrMockSchedule, isMockSchedule, isSuneungSchedule, isRegularSchedule } from '../data/scheduleData';

export const DAILY_ENCOURAGEMENT_QUOTES = [
  "오늘 흘린 땀방울은 내일의 찬란한 꿈을 이루는 가장 확실한 증거입니다. 힘내세요!",
  "긴장하지 말고 지금까지 준비한 만큼만 차분하게 실력을 발휘해봐요. 할 수 있습니다!",
  "틀린 문제는 내가 한 단계 더 성장할 수 있는 멋진 기회입니다. 미소 짓고 파이팅!",
  "결과보다 중요한 것은 최선을 다한 당신의 아름다운 노력입니다. 응원합니다!",
  "실수는 성공으로 가는 예행연습일 뿐! 당당하게 밀고 나가세요!",
  "오늘 하루도 반짝반짝 빛날 당신을 믿습니다. 수고 많았어요!",
  "마지막까지 집중력을 잃지 않고 최선을 다하는 당신이 진정한 챔피언입니다!",
  "지금 하는 모든 노력은 미래의 단단한 밑거름이 됩니다. 오늘도 화이팅!",
];

export type BoardTheme = 'obsidian' | 'emerald' | 'midnight';

export const THEME_CONFIGS: Record<
  BoardTheme,
  {
    id: BoardTheme;
    name: string;
    label: string;
    desc: string;
    tag: string;
    fullscreenBg: string;
    frameBg: string;
    frameBorder: string;
    frameCorner: string;
    canvasBg: string;
    canvasBorder: string;
    headerBorder: string;
    topNoticeBg: string;
    topNoticeBorder: string;
    schedulePanelBg: string;
    schedulePanelBorder: string;
    scheduleHeaderBorder: string;
    bottomNoticeWrapper: string;
    bottomNoticeBg: string;
    bottomNoticeBorder: string;
    bottomNoticeText: string;
    activePeriodRing: string;
  }
> = {
  obsidian: {
    id: 'obsidian',
    name: '고급 다크 흑연 (Obsidian Slate)',
    label: '흑연 다크',
    desc: '세련된 현대식 흑연 다크 슬레이트 텍스처',
    tag: '기본 다크 텍스처',
    fullscreenBg: 'bg-[#080c13]',
    frameBg: 'bg-gradient-to-b from-[#1c2432] via-[#121722] to-[#0a0d14]',
    frameBorder: 'border-[#283446]',
    frameCorner: 'border-amber-400/50',
    canvasBg: 'bg-gradient-to-b from-[#111925] via-[#0c121c] to-[#070b12]',
    canvasBorder: 'border-[#1e2838]',
    headerBorder: 'border-slate-700/80',
    topNoticeBg: 'bg-[#070c14]/95',
    topNoticeBorder: 'border-amber-400/80',
    schedulePanelBg: 'bg-gradient-to-b from-[#0e1623]/95 to-[#070c14]/98',
    schedulePanelBorder: 'border-slate-700/80',
    scheduleHeaderBorder: 'border-slate-700/80',
    bottomNoticeWrapper: 'border-slate-700/80',
    bottomNoticeBg: 'bg-[#070c14]/90',
    bottomNoticeBorder: 'border-amber-400/70',
    bottomNoticeText: 'text-yellow-300',
    activePeriodRing: 'ring-amber-400 bg-amber-400/10',
  },
  emerald: {
    id: 'emerald',
    name: '프리미엄 딥 에메랄드 (Deep Emerald)',
    label: '딥 에메랄드',
    desc: '차분하고 정통적인 딥 다크 에메랄드 칠판 텍스처',
    tag: '정통 칠판 텍스처',
    fullscreenBg: 'bg-[#05110c]',
    frameBg: 'bg-gradient-to-b from-[#1a271e] via-[#101b15] to-[#070d0a]',
    frameBorder: 'border-[#21382a]',
    frameCorner: 'border-emerald-400/50',
    canvasBg: 'bg-gradient-to-b from-[#0e251b] via-[#091a13] to-[#050f0b]',
    canvasBorder: 'border-[#153425]',
    headerBorder: 'border-emerald-800/80',
    topNoticeBg: 'bg-[#071911]/95',
    topNoticeBorder: 'border-emerald-500/80',
    schedulePanelBg: 'bg-gradient-to-b from-[#0a1e16]/95 to-[#04100b]/98',
    schedulePanelBorder: 'border-emerald-700/70',
    scheduleHeaderBorder: 'border-emerald-700/80',
    bottomNoticeWrapper: 'border-emerald-800/80',
    bottomNoticeBg: 'bg-[#05160e]/90',
    bottomNoticeBorder: 'border-emerald-500/70',
    bottomNoticeText: 'text-yellow-300',
    activePeriodRing: 'ring-yellow-400 bg-amber-400/10',
  },
  midnight: {
    id: 'midnight',
    name: '미드나잇 사파이어 (Midnight Sapphire)',
    label: '미드나잇 네이비',
    desc: '깊은 몰입감의 다크 네이비 사파이어 슬레이트 텍스처',
    tag: '차분한 블루 슬레이트',
    fullscreenBg: 'bg-[#060a15]',
    frameBg: 'bg-gradient-to-b from-[#1a243a] via-[#0f1726] to-[#070c15]',
    frameBorder: 'border-[#253554]',
    frameCorner: 'border-indigo-400/50',
    canvasBg: 'bg-gradient-to-b from-[#0e182c] via-[#091020] to-[#050a14]',
    canvasBorder: 'border-[#182745]',
    headerBorder: 'border-indigo-800/80',
    topNoticeBg: 'bg-[#060e1d]/95',
    topNoticeBorder: 'border-indigo-400/80',
    schedulePanelBg: 'bg-gradient-to-b from-[#091326]/95 to-[#040814]/98',
    schedulePanelBorder: 'border-indigo-700/70',
    scheduleHeaderBorder: 'border-indigo-700/80',
    bottomNoticeWrapper: 'border-indigo-800/80',
    bottomNoticeBg: 'bg-[#050c19]/90',
    bottomNoticeBorder: 'border-indigo-400/70',
    bottomNoticeText: 'text-yellow-300',
    activePeriodRing: 'ring-cyan-400 bg-cyan-400/10',
  },
};

interface ElectronicBoardProps {
  daySchedule: DayExamSchedule;
  allDays: DayExamSchedule[];
  onSelectDay: (dayId: string) => void;
  onOpenUploadModal: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onUpdateBottomNotice?: (newNotice: string) => void;
  onUpdateTopNotice?: (newNotice: string) => void;
  onUpdateTargetClass?: (periodIdx: number, subjectIdx: number, newTargetClass: string) => void;
  alertSettings?: ExamAlertSettings;
  onChangeAlertSettings?: (newSettings: ExamAlertSettings) => void;
  selectedGrade?: string;
  onSelectGrade?: (grade: string) => void;
  schoolLogo?: string | null;
  onUpdateSchoolLogo?: (logo: string | null) => void;
  boardTheme?: BoardTheme;
  onUpdateBoardTheme?: (theme: BoardTheme) => void;
  onSwitchToAdmin?: () => void;
  onSwitchToSelector?: () => void;
  maxClasses?: number;
  classTotals?: Record<string, string>;
  schoolSlug?: string;
  schoolName?: string;
  examMode?: 'regular' | 'mock';
  onChangeExamMode?: (mode: 'regular' | 'mock') => void;
}

// Interface for current active exam progress
interface CurrentExamState {
  statusType: 'ongoing' | 'preparing' | 'break' | 'before_all' | 'after_all';
  periodName: string;
  subjectNames: string;
  startTime: string;
  endTime: string;
  entryTime?: string;
  elapsedSeconds: number;
  totalSeconds: number;
  remainingSeconds: number;
  remainingFormatted: string;
  percent: number;
  isEndingSoon: boolean; // 10 minutes or less
  isStartingSoon: boolean; // 10 minutes or less before start
  activePeriodIndex: number | null;
  nextPeriodIndex: number | null;
  statusTitle: string;
  statusSubtitle: string;
}

export const ElectronicBoard: React.FC<ElectronicBoardProps> = ({
  daySchedule,
  allDays = [],
  onSelectDay,
  onOpenUploadModal: _onOpenUploadModal,
  isFullscreen: externalIsFullscreen,
  onToggleFullscreen: externalToggleFullscreen,
  onUpdateBottomNotice,
  onUpdateTargetClass,
  alertSettings,
  onChangeAlertSettings,
  selectedGrade,
  onSelectGrade,
  schoolLogo,
  onUpdateSchoolLogo: _onUpdateSchoolLogo,
  boardTheme: externalBoardTheme,
  onUpdateBoardTheme: externalUpdateBoardTheme,
  onSwitchToAdmin,
  onSwitchToSelector,
  maxClasses = 15,
  classTotals = {},
  schoolSlug = 'korea-high',
  schoolName,
  examMode,
  onChangeExamMode,
}) => {
  const [internalIsFullscreen, setInternalIsFullscreen] = useState(false);
  const isFullscreen = externalIsFullscreen !== undefined ? externalIsFullscreen : internalIsFullscreen;
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentFullDate, setCurrentFullDate] = useState<string>('');
  const [isDrawingActive, setIsDrawingActive] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('전체');
  const [isBroadcastingTemplate, setIsBroadcastingTemplate] = useState(false);

  // Center Floating Notification State
  const [activeCenterNotification, setActiveCenterNotification] = useState<{
    type: 'start' | 'ending_soon' | 'ended' | 'warning';
    title: string;
    message: string;
    periodName: string;
    subjectNames: string;
  } | null>(null);
  const lastCenterNotificationKeyRef = useRef<string | null>(null);

  // Auto-dismiss center notification modal after 10 seconds so it never blocks the board indefinitely
  useEffect(() => {
    if (!activeCenterNotification) return;
    const timer = setTimeout(() => {
      setActiveCenterNotification(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [activeCenterNotification]);

  // Today's Encouragement Quotes (매일 다르게 자동 출력 및 랜덤 변경 지원)
  const DAILY_ENCOURAGEMENT_QUOTES = [
    "오늘 흘린 땀방울은 내일의 찬란한 꿈을 이루는 가장 확실한 증거입니다. 힘내세요!",
    "긴장하지 말고 지금까지 준비한 만큼만 차분하게 실력을 발휘해봐요. 할 수 있습니다!",
    "틀린 문제는 내가 한 단계 더 성장할 수 있는 멋진 기회입니다. 미소 짓고 파이팅!",
    "결과보다 중요한 것은 최선을 다한 당신의 아름다운 노력입니다. 응원합니다!",
    "실수는 성공으로 가는 예행연습일 뿐! 당당하게 밀고 나가세요!",
    "오늘 하루도 반짝반짝 빛날 당신을 믿습니다. 수고 많았어요!",
    "마지막까지 집중력을 잃지 않고 최선을 다하는 당신이 진정한 챔피언입니다!",
    "지금 하는 모든 노력은 미래의 단단한 밑거름이 됩니다. 오늘도 화이팅!",
  ];

  const [todayQuoteIndex, setTodayQuoteIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const today = new Date();
      return (today.getFullYear() * 1000 + today.getMonth() * 100 + today.getDate()) % DAILY_ENCOURAGEMENT_QUOTES.length;
    }
    return 0;
  });

  const currentEncouragementQuote = DAILY_ENCOURAGEMENT_QUOTES[todayQuoteIndex];

  const renderEncouragementBanner = () => (
    <div className="relative z-10 mb-1 bg-gradient-to-r from-indigo-950/95 via-purple-950/95 to-slate-950/95 border-2 border-indigo-500/60 rounded-xl py-2 px-3.5 flex items-center justify-between gap-3 shadow-md text-xs sm:text-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="bg-yellow-400 text-slate-950 font-black px-2.5 py-1 rounded-lg text-xs shrink-0 shadow-xs flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-800" />
          <span>오늘의 격려 문구</span>
        </span>
        <p className="text-yellow-200 font-black truncate tracking-wide drop-shadow-xs">
          "{currentEncouragementQuote}"
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            setTodayQuoteIndex((prev) => (prev + 1) % DAILY_ENCOURAGEMENT_QUOTES.length);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-xs"
          title="매일 다르게 자동 출력되거나 클릭하여 다른 격려 문구로 변경"
        >
          <RotateCcw className="w-3 h-3" />
          <span>다른 문구 뽑기</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (onUpdateBottomNotice) {
              onUpdateBottomNotice(`※ ${currentEncouragementQuote} ※`);
            }
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer shadow-xs"
          title="이 격려 문구를 하단 공지사항에 바로 적용"
        >
          하단 공지에 적용
        </button>
      </div>
    </div>
  );

  const handleBroadcastTemplate = (text: string) => {
    setIsBroadcastingTemplate(true);
    const soundEnabled = alertSettings?.soundEnabled ?? true;
    const soundType = alertSettings?.soundType || 'chime';
    const volume = alertSettings?.volume || 0.7;
    const ttsSpeed = alertSettings?.ttsVoiceSpeed || 1.0;
    const ttsStyle = alertSettings?.ttsVoiceStyle || 'announcer';

    if (soundEnabled) {
      audioAlert.playAlertSound(soundType, volume);
    }

    setTimeout(() => {
      audioAlert.speakTTS(text, {
        volume: volume,
        rate: ttsSpeed,
        voiceStyle: ttsStyle,
        onEnd: () => setIsBroadcastingTemplate(false),
      });
    }, soundEnabled ? 1800 : 100);
  };

  // Chalkboard Texture Theme State
  // 사용자 요청: "전자칠판 모드의 기본 배경색을 좀 더 고급스러운 다크 모드 텍스처로 변경하고"
  // 기본값: 'obsidian' (고급 흑연 다크 슬레이트 텍스처)
  const [internalBoardTheme, setInternalBoardTheme] = useState<BoardTheme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('electronic_board_theme') as BoardTheme;
        if (saved === 'obsidian' || saved === 'emerald' || saved === 'midnight') {
          return saved;
        }
      } catch {}
    }
    return 'obsidian';
  });

  const boardTheme: BoardTheme = externalBoardTheme || internalBoardTheme;
  const currentTheme = THEME_CONFIGS[boardTheme] || THEME_CONFIGS.obsidian;

  const handleUpdateBoardTheme = React.useCallback((theme: BoardTheme) => {
    setInternalBoardTheme(theme);
    externalUpdateBoardTheme?.(theme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('electronic_board_theme', theme);
      } catch {}
    }
  }, [externalUpdateBoardTheme]);

  // Screen brightness control (아이들 눈부심 방지를 위한 화면 밝기 조절: 30% ~ 100%)
  const [brightness, setBrightness] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('electronic_board_brightness');
        if (saved) {
          const num = Number(saved);
          if (!isNaN(num) && num >= 30 && num <= 100) return num;
        }
      } catch {}
    }
    return 100;
  });

  const handleUpdateBrightness = (newVal: number) => {
    const clamped = Math.min(100, Math.max(30, newVal));
    setBrightness(clamped);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('electronic_board_brightness', String(clamped));
      } catch {}
    }
  };

  // School emblem background display mode ('white' | 'transparent')
  const [emblemBgMode, setEmblemBgMode] = useState<'white' | 'transparent'>(() => {
    if (typeof window !== 'undefined') {
      try {
        return (localStorage.getItem('school_emblem_bg_mode') as 'white' | 'transparent') || 'white';
      } catch {
        return 'white';
      }
    }
    return 'white';
  });

  useEffect(() => {
    const checkBgMode = () => {
      try {
        const mode = (localStorage.getItem('school_emblem_bg_mode') as 'white' | 'transparent') || 'white';
        setEmblemBgMode(mode);
      } catch {}
    };
    window.addEventListener('storage', checkBgMode);
    return () => window.removeEventListener('storage', checkBgMode);
  }, []);

  // Render Brightness Slider Control Component (전자칠판 화면 눈부심 방지 스크롤바)
  const renderBrightnessController = (size: 'compact' | 'normal' | 'board' = 'normal') => {
    const isDimmed = brightness < 100;
    return (
      <div
        className={`flex items-center gap-1.5 sm:gap-2 rounded-xl shadow-xs shrink-0 select-none ${
          size === 'board'
            ? 'px-2.5 py-1 bg-black/60 border border-amber-400/40 backdrop-blur-xs'
            : size === 'compact'
            ? 'px-2 py-0.5 bg-slate-950/90 border border-slate-700/80'
            : 'px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-950/90 border border-slate-700/80'
        }`}
        title={`화면 밝기 조절 (현재 ${brightness}%) - 아이들 눈부심 방지 스크롤바`}
      >
        <button
          type="button"
          onClick={() => handleUpdateBrightness(brightness <= 60 ? 100 : 60)}
          className="text-amber-400 hover:text-amber-300 transition cursor-pointer shrink-0 flex items-center justify-center p-0.5 rounded-md hover:bg-slate-800"
          title={isDimmed ? `눈부심 방지 모드 적용 중 (${brightness}%) - 클릭 시 100% 복원` : '클릭 시 눈부심 방지 60% 모드로 전환'}
        >
          {brightness >= 80 ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : brightness >= 50 ? (
            <SunMedium className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <SunDim className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        <span className={`text-[11px] font-bold shrink-0 ${size === 'board' ? 'text-amber-200' : 'text-slate-300'} hidden sm:inline`}>
          밝기
        </span>

        <div className="flex items-center gap-1.5">
          <input
            type="range"
            min="30"
            max="100"
            step="5"
            value={brightness}
            onChange={(e) => handleUpdateBrightness(Number(e.target.value))}
            className="w-16 sm:w-20 md:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
            title={`전자칠판 화면 밝기 조절: ${brightness}%`}
          />
          <span className="text-[11px] font-mono font-black text-amber-300 w-7 sm:w-8 text-right shrink-0">
            {brightness}%
          </span>
        </div>

        {/* Quick presets */}
        {size !== 'compact' && (
          <div className="hidden lg:flex items-center gap-1 pl-1 border-l border-slate-700/80 text-[10px]">
            {[100, 80, 60].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleUpdateBrightness(val)}
                className={`px-1.5 py-0.5 rounded font-black transition cursor-pointer ${
                  brightness === val
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={`밝기 ${val}%로 즉시 설정`}
              >
                {val === 100 ? '기본' : `${val}%`}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Fullscreen hover controls for resolution pill
  // 사용자 요청: "감지 해상도 부분은 안 보이게 해주고 마우스가 가면 나타나게 해줄래?"
  const [isHoveringTop, setIsHoveringTop] = useState<boolean>(false);
  const [isInteractingTopBar, setIsInteractingTopBar] = useState<boolean>(false);

  // Alert settings helpers
  const isSoundEnabled = alertSettings?.soundEnabled ?? true;
  const alertMinutes = alertSettings?.alertMinutes ?? 10;
  const alertThresholdSec = alertMinutes * 60;
  const lastPlayedAlertKeyRef = useRef<string | null>(null);
  const lastPlayedStartAlertKeyRef = useRef<string | null>(null);
  const lastPlayedPrepAlertKeyRef = useRef<string | null>(null);

  // Fullscreen Aspect Ratio Mode: 'photo' (첨부 사진 황금비율 ~1.63:1) vs 'wide' (가로 전체 채우기)
  // 사용자 요청: "나는 전체화면이 항상 첨부한 비율이 좋을거 같고" -> 'photo' 비율을 기본값으로 고정
  const [fullscreenAspectMode, setFullscreenAspectMode] = useState<'photo' | 'wide'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fullscreen_aspect_mode');
        if (saved === 'wide' || saved === 'photo') return saved;
      } catch {}
    }
    return 'wide';
  });

  const handleUpdateFullscreenAspectMode = (mode: 'photo' | 'wide') => {
    setFullscreenAspectMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fullscreen_aspect_mode', mode);
      } catch {}
    }
  };

  // Class-matched Timetable Filter: 우리 반 맞춤 시간표 (기본값: true) vs 전체 시간표 보기
  // 사용자 요청: "두번째 사진에서 학년 반을 셋팅하면 각 반에 맞는 시간표가 뜨면 좋을거 같아"
  const [filterMyClassOnly, setFilterMyClassOnly] = useState<boolean>(true);

  // Screen resolution detection for auto-fitting chalkboard to single screen
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });
  const [scaleMode, setScaleMode] = useState<'auto' | 'custom'>('auto');
  const [customScale, setCustomScale] = useState<number>(1);

  // Simulation mode for testing during off-school hours or demonstration
  const [simMode, setSimMode] = useState<'realtime' | 'break' | 'p1' | 'p2' | 'warningAlert'>('realtime');

  // Screen Display Mode (사용자 요청: 쉬는 시간에는 첫번째 화면, 2번째 시간에는 응시현황과 그 과목명/입실시간/시험시간/장소만 크게)
  // 'auto': 쉬는 시간엔 첫번째 화면 (전체 시간표), 시험 시간엔 2번째 화면 (응시현황 + 과목명/입실시간/시험시간/장소 대형 화면) 자동 전환
  // 'break_view': 첫번째 화면 (쉬는 시간 모드: 전체 시간표 고정)
  // 'exam_view': 2번째 화면 (시험 시간 모드: 응시현황과 과목명/입실시간/시험시간/장소 대형 화면 고정)
  const [screenMode, setScreenMode] = useState<'auto' | 'break_view' | 'exam_view'>('auto');

  // Which period to focus on for 2nd screen (defaults to 1 for 2교시 if available, or active period)
  const [focusedPeriodIdx, setFocusedPeriodIdx] = useState<number>(() => {
    return daySchedule.schedule && daySchedule.schedule.length > 1 ? 1 : 0;
  });

  // Target class/location editing modal (window.prompt 완전 대체)
  const [targetClassModal, setTargetClassModal] = useState<{
    isOpen: boolean;
    periodIdx: number;
    subjectIdx: number;
    subName: string;
    initialValue: string;
  } | null>(null);
  const [tempTargetClassValue, setTempTargetClassValue] = useState<string>('');

  // Bottom Notice (2번째 사진 멘트) editing state
  const [isEditingBottomNotice, setIsEditingBottomNotice] = useState(false);
  const [tempBottomNotice, setTempBottomNotice] = useState(
    daySchedule.bottomNotice || '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※'
  );

  // 모의고사 모드에서 교시 표시 (기본값: 'all' -> 1~4교시 전체 한줄 구성으로 동시 표시)
  const [selectedMockPeriodId, setSelectedMockPeriodId] = useState<string>('all');
  const [selectedG4SubIdx, setSelectedG4SubIdx] = useState<number>(0);

  useEffect(() => {
    setTempBottomNotice(
      daySchedule.bottomNotice || '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※'
    );
  }, [daySchedule.bottomNotice]);

  // Window resize listener (ignore tiny 1px subpixel/scrollbar fluctuations and lock body scroll in fullscreen)
  useEffect(() => {
    const handleResize = () => {
      setWindowSize((prev) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (Math.abs(w - prev.width) <= 1 && Math.abs(h - prev.height) <= 1) {
          return prev;
        }
        return { width: w, height: h };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);

  // Class attendance state - initialized with pre-configured class total count if set in admin settings
  // 학년/반 셋팅을 로컬 스토리지에 유지하여 새로고침 시에도 유지
  const getPresetTotalCount = (g: string, c: string) => {
    const cleanG = g.replace('학년', '').trim() || '2';
    const cleanC = c.replace('반', '').trim() || '3';
    return (
      classTotals?.[`${cleanG}-${cleanC}`] ||
      classTotals?.[`default-${cleanG}`] ||
      classTotals?.['default'] ||
      ''
    );
  };

  const [attendance, setAttendance] = useState<ClassAttendance>(() => {
    const initialGrade = selectedGrade ? selectedGrade.replace('학년', '') : '2';
    if (typeof window !== 'undefined') {
      try {
        const slugSaved = localStorage.getItem(`class_attendance_settings_${schoolSlug}`);
        const saved = slugSaved || localStorage.getItem('class_attendance_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          const g = parsed.grade || initialGrade;
          const c = parsed.classNum || '3';
          const presetTotal = getPresetTotalCount(g, c);
          return {
            grade: g,
            classNum: c,
            totalCount: parsed.totalCount || presetTotal || '',
            presentCount: parsed.presentCount || '',
            absentNotes: parsed.absentNotes || '',
            lastNum: parsed.lastNum || '',
          };
        }
      } catch (e) {
        console.error('Error parsing attendance settings:', e);
        try { localStorage.removeItem('class_attendance_settings'); } catch {}
      }
    }
    const presetTotal = getPresetTotalCount(initialGrade, '3');
    return {
      grade: initialGrade,
      classNum: '3',
      totalCount: presetTotal,
      presentCount: '',
      absentNotes: '',
      lastNum: '',
    };
  });

  // 관리자가 설정한 학급별 총원(classTotals)이 변경되거나 학년/반이 바뀔 때 자동으로 총원에 반영
  useEffect(() => {
    const presetTotal = getPresetTotalCount(attendance.grade, attendance.classNum);
    if (presetTotal && attendance.totalCount !== presetTotal) {
      setAttendance((prev) => {
        const next = { ...prev, totalCount: presetTotal };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('class_attendance_settings', JSON.stringify(next));
            if (schoolSlug) {
              localStorage.setItem(`class_attendance_settings_${schoolSlug}`, JSON.stringify(next));
            }
          } catch {}
        }
        return next;
      });
    }
  }, [classTotals, attendance.grade, attendance.classNum, schoolSlug]);

  const handleUpdateAttendance = (updated: ClassAttendance) => {
    const isClassChanged = updated.grade !== attendance.grade || updated.classNum !== attendance.classNum;
    const presetTotal = getPresetTotalCount(updated.grade, updated.classNum);
    const finalUpdated: ClassAttendance = isClassChanged
      ? {
          ...updated,
          totalCount: presetTotal || updated.totalCount,
        }
      : updated;

    setAttendance(finalUpdated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('class_attendance_settings', JSON.stringify(finalUpdated));
        if (schoolSlug) {
          localStorage.setItem(`class_attendance_settings_${schoolSlug}`, JSON.stringify(finalUpdated));
        }
      } catch {}
    }
    if (finalUpdated.grade && onSelectGrade) {
      onSelectGrade(`${finalUpdated.grade}학년`);
    }
  };

  const [isEditingAttendance, setIsEditingAttendance] = useState(false);

  // Helpers to format attendance strings:
  // 숫자가 입력되면 뒤에 '명'/'번'을 붙여주고, 비어있으면 아무것도 표시하지 않음 (판서용 빈칸)
  const formatCountDisplay = (val?: string) => {
    if (!val || !val.trim()) return '';
    const trimmed = val.trim();
    if (trimmed.endsWith('명')) return trimmed;
    return `${trimmed}명`;
  };

  const formatAbsentDisplay = (val?: string) => {
    if (!val || !val.trim()) return '';
    const trimmed = val.trim();
    if (trimmed.endsWith('번') || trimmed === '없음') return trimmed;
    if (/^\d+$/.test(trimmed)) return `${trimmed}번`;
    return trimmed;
  };

  const formatLastNumDisplay = (val?: string) => {
    if (!val || !val.trim()) return '';
    const trimmed = val.trim();
    if (trimmed.endsWith('번')) return trimmed;
    if (/^\d+$/.test(trimmed)) return `${trimmed}번`;
    return `${trimmed}번`;
  };

  // Remaining time formatter helper
  const formatRemaining = (sec: number) => {
    if (sec <= 0) return '00분 00초';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}시간 ${String(m).padStart(2, '0')}분 ${String(s).padStart(2, '0')}초`;
    return `${String(m).padStart(2, '0')}분 ${String(s).padStart(2, '0')}초`;
  };

  // Intelligent subject-to-class matching function (두번째 사진에서 학년 반 셋팅 시 각 반에 맞는 시간표 필터링)
  const matchSubjectForClass = (
    subject: SubjectItem,
    grade: string,
    classNum: string
  ): { isMatch: boolean; isExplicit: boolean; isElective: boolean } => {
    if (!subject) return { isMatch: false, isExplicit: false, isElective: false };
    // 수능 및 모의고사(전국연합학력평가) 시간표는 전 학급 공통 타종 일정이므로 항상 일치 처리
    if (isSuneungOrMockSchedule(daySchedule)) {
      return { isMatch: true, isExplicit: true, isElective: false };
    }
    const target = (subject.targetClass || '').trim();

    // 1. If target is empty, '전체', or '공통' -> matches all classes in all grades
    if (!target || target === '전체' || target === '공통') {
      return { isMatch: true, isExplicit: true, isElective: false };
    }

    // 2. Grade check: if target explicitly mentions another grade (e.g. "1학년", "3학년")
    const currentGradeStr = `${grade}학년`;
    const otherGrades = ['1학년', '2학년', '3학년'].filter((g) => g !== currentGradeStr);
    const mentionsOtherGrade = otherGrades.some((g) => target.includes(g));
    if (mentionsOtherGrade && !target.includes(currentGradeStr)) {
      return { isMatch: false, isExplicit: true, isElective: false };
    }

    // 3. '행정학급' -> matches the home-room class for this grade
    if (target.includes('행정학급')) {
      return { isMatch: true, isExplicit: true, isElective: false };
    }

    const num = parseInt(classNum, 10);
    if (isNaN(num)) {
      return { isMatch: true, isExplicit: false, isElective: false };
    }

    // 4. Class range check: e.g. "1~3반", "4~8반", "1-3반", "5~8반" (반 필수)
    const rangeRegex = /(\d+)\s*[~-]\s*(\d+)\s*반/g;
    let rangeFound = false;
    let inRange = false;
    let match;
    while ((match = rangeRegex.exec(target)) !== null) {
      rangeFound = true;
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      if (num >= min && num <= max) {
        inRange = true;
        break;
      }
    }

    if (rangeFound) {
      return { isMatch: inRange, isExplicit: true, isElective: false };
    }

    // 5. Explicit single or listed classes: e.g. "3반", "1, 2, 3반"
    const singleClassRegex = /(\d+)\s*반/g;
    const classesList: number[] = [];
    while ((match = singleClassRegex.exec(target)) !== null) {
      classesList.push(parseInt(match[1], 10));
    }

    if (classesList.length > 0) {
      return { isMatch: classesList.includes(num), isExplicit: true, isElective: false };
    }

    // 6. Elective classroom or special designation: e.g. "A206", "지정반", "A205"
    return { isMatch: false, isExplicit: false, isElective: true };
  };

  // Helper to filter out subjects belonging to other grades (동학년 과목만 남기기)
  const filterSameGradeSubjects = (subjects: SubjectItem[], grade: string) => {
    const currentGradeStr = `${grade}학년`;
    const otherGrades = ['1학년', '2학년', '3학년'].filter((g) => g !== currentGradeStr);
    return subjects.filter((s) => {
      const target = (s.targetClass || '').trim();
      const mentionsOtherGrade = otherGrades.some((g) => target.includes(g));
      if (mentionsOtherGrade && !target.includes(currentGradeStr)) {
        return false;
      }
      return true;
    });
  };

  // Get subjects that belong to the active class for a specific period
  const getPeriodSubjectsForClass = (subjects: SubjectItem[], grade: string, classNum: string) => {
    const sameGradeSubjects = filterSameGradeSubjects(subjects, grade);
    const explicitMatches = sameGradeSubjects.filter((s) => matchSubjectForClass(s, grade, classNum).isMatch);
    if (explicitMatches.length > 0) {
      return explicitMatches;
    }
    // If no explicit matches, check if period only has elective/room-moving subjects (e.g. 3교시: 미적분1 [지정반], 자습 [A205])
    const electives = sameGradeSubjects.filter((s) => matchSubjectForClass(s, grade, classNum).isElective);
    if (electives.length > 0) {
      return electives;
    }
    // Fallback: return same grade subjects so no period is empty
    return sameGradeSubjects;
  };

  // Get elective/room-moving notes for a period (e.g. 기하 A206)
  const getElectiveNotesForPeriod = (subjects: SubjectItem[], grade: string, classNum: string) => {
    const sameGradeSubjects = filterSameGradeSubjects(subjects, grade);
    const matching = getPeriodSubjectsForClass(sameGradeSubjects, grade, classNum);
    return sameGradeSubjects.filter((s) => !matching.includes(s));
  };

  // Parse all periods and exams from current daySchedule (synchronized with class timetable)
  const parsePeriods = () => {
    if (!daySchedule.schedule || daySchedule.schedule.length === 0) return [];
    return daySchedule.schedule
      .map((p, pIdx) => {
        let pStart = '';
        let pEnd = '';
        let pEntry = '';
        const subjectList: string[] = [];

        // When filterMyClassOnly is active, the clock/progress bar tracks this specific class's exam!
        const effectiveSubjects = filterMyClassOnly
          ? getPeriodSubjectsForClass(p.subjects, attendance.grade, attendance.classNum)
          : p.subjects;

        const toSec = (timeStr: string) => {
          const [h, m] = timeStr.split(':').map(Number);
          return (h || 0) * 3600 + (m || 0) * 60;
        };

        const normTime = (timeStr: string) => {
          const [h, m] = timeStr.split(':').map((v) => v.trim());
          return `${String(Number(h) || 0).padStart(2, '0')}:${String(Number(m) || 0).padStart(2, '0')}`;
        };

        const extractTimesFromSub = (s: SubjectItem) => {
          if (s.entryTime && !pEntry) {
            const entryMatch = s.entryTime.match(/(\d{1,2})\s*:\s*(\d{2})/);
            if (entryMatch) pEntry = normTime(`${entryMatch[1]}:${entryMatch[2]}`);
          }
          const timeMatches = [...(s.time || '').matchAll(/(\d{1,2})\s*:\s*(\d{2})/g)];
          if (timeMatches.length >= 2) {
            const sNorm = normTime(`${timeMatches[0][1]}:${timeMatches[0][2]}`);
            const eNorm = normTime(`${timeMatches[1][1]}:${timeMatches[1][2]}`);
            if (!pStart || toSec(sNorm) < toSec(pStart)) pStart = sNorm;
            if (!pEnd || toSec(eNorm) > toSec(pEnd)) pEnd = eNorm;
          }
        };

        effectiveSubjects.forEach((s) => {
          if (s.name) {
            const nameWithCode =
              s.subjectCode && !s.name.includes('(') ? `${s.name}(${s.subjectCode})` : s.name;
            if (!subjectList.includes(nameWithCode)) subjectList.push(nameWithCode);
          }
          extractTimesFromSub(s);
        });

        // Fallback to all subjects in period if class-filtered subjects lacked explicit time strings
        if (!pStart || !pEnd) {
          (p.subjects || []).forEach((s) => extractTimesFromSub(s));
        }

        const startSec = pStart ? toSec(pStart) : 0;
        const endSec = pEnd ? toSec(pEnd) : 0;
        const entrySec = pEntry ? toSec(pEntry) : Math.max(0, startSec - 600);

        return {
          pIdx,
          periodName: p.period,
          subjectNames: subjectList.join(', ') || '시험 과목',
          startTime: pStart || '09:00',
          endTime: pEnd || '10:00',
          entryTime: pEntry,
          startSec,
          endSec,
          entrySec,
          durationMin: Math.max(1, Math.round((endSec - startSec) / 60)),
        };
      })
      .filter(
        (item) =>
          item.startSec > 0 &&
          item.endSec > item.startSec &&
          !item.periodName.includes('휴식') &&
          !item.periodName.includes('쉬는') &&
          !item.periodName.includes('점심') &&
          !item.periodName.includes('중식') &&
          !item.periodName.includes('조례') &&
          !item.periodName.includes('조회') &&
          !item.periodName.includes('종례') &&
          !item.periodName.includes('청소') &&
          !item.periodName.includes('채점') &&
          !item.periodName.includes('입실') &&
          !item.periodName.includes('귀가')
      );
  };

  // Real-time Current Exam Progress State
  const periodItemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [currentExam, setCurrentExam] = useState<CurrentExamState>({
    statusType: 'before_all',
    periodName: '1교시',
    subjectNames: '자습',
    startTime: '08:30',
    endTime: '09:00',
    elapsedSeconds: 0,
    totalSeconds: 1800,
    remainingSeconds: 1800,
    remainingFormatted: '30분 00초',
    percent: 0,
    isEndingSoon: false,
    isStartingSoon: false,
    activePeriodIndex: null,
    nextPeriodIndex: 0,
    statusTitle: '시험 준비 중',
    statusSubtitle: '',
  });

  // Live clock and real-time progress update (compares current time vs exam finish time second by second)
  useEffect(() => {
    const updateTimeAndProgress = () => {
      const korea = getKoreaDate();
      setCurrentTime(korea.formattedClock);
      setCurrentFullDate(korea.formattedFullDate);

      const parsed = parsePeriods();
      if (!parsed || parsed.length === 0) return;

      let effectiveNowSec = korea.hours * 3600 + korea.minutes * 60 + korea.seconds;

      // Apply test simulation mode if enabled
      if (simMode === 'break') {
        if (parsed.length > 1) {
          // Break time right after period 1 ends (before period 2 starts)
          effectiveNowSec = parsed[0].endSec + 60;
        } else {
          effectiveNowSec = Math.max(0, parsed[0].startSec - 900);
        }
      } else if (simMode === 'p1') {
        effectiveNowSec = parsed[0].startSec + Math.floor((parsed[0].endSec - parsed[0].startSec) * 0.45);
      } else if (simMode === 'p2' && parsed.length > 1) {
        effectiveNowSec = parsed[1].startSec + Math.floor((parsed[1].endSec - parsed[1].startSec) * 0.65);
      } else if (simMode === 'warningAlert') {
        const target = parsed.length > 1 ? parsed[1] : parsed[0];
        // Set time to be 30 seconds into the warning window (e.g. 4분 30초 남음 if 5분전, 9분 30초 남음 if 10분전)
        effectiveNowSec = target.endSec - (alertThresholdSec - 30);
      }

      // Check for 10 minutes before exam start time automated alert & TTS (예비령)
      const startAlertTarget = (Array.isArray(parsed) ? parsed : []).find((p) => {
        const timeToStart = p.startSec - effectiveNowSec;
        return timeToStart <= 600 && timeToStart > 570; // 10분 전 (600초 ~ 570초)
      });

      const startAlertEnabled = alertSettings?.startAlertEnabled ?? true;
      if (startAlertTarget && startAlertEnabled && isSoundEnabled && !startAlertTarget.subjectNames.includes('자습')) {
        const startAlertKey = `start-${startAlertTarget.periodName}-${startAlertTarget.startTime}`;
        if (lastPlayedStartAlertKeyRef.current !== startAlertKey) {
          audioAlert.playAlertSound(alertSettings?.soundType || 'chime', alertSettings?.volume || 0.7);
          setActiveCenterNotification({
            type: 'warning',
            title: `[예비령: 시험 시작 10분 전]`,
            message: `곧 ${startAlertTarget.periodName} (${startAlertTarget.subjectNames}) 시험이 시작됩니다!\n입실 및 착석을 완료해주세요.`,
            periodName: startAlertTarget.periodName,
            subjectNames: startAlertTarget.subjectNames,
          });
          if (alertSettings?.ttsEnabled ?? true) {
            const startMsg =
              alertSettings?.startTtsMessage ||
              `곧 ${startAlertTarget.periodName} ${startAlertTarget.subjectNames} 시험이 시작됩니다.\n학생들은 입실을 완료하고 자리에 착석해 주시기 바랍니다.`;
            setTimeout(() => {
              audioAlert.speakTTS(startMsg, {
                volume: alertSettings?.volume || 0.9,
                rate: alertSettings?.ttsVoiceSpeed || 1.0,
                pitch: alertSettings?.ttsPitch || 1.0,
                voiceStyle: alertSettings?.ttsVoiceStyle || 'announcer',
              });
            }, 1500);
          }
          lastPlayedStartAlertKeyRef.current = startAlertKey;
        }
      } else {
        const inAnyStartWindow = parsed.some((p) => {
          const t = p.startSec - effectiveNowSec;
          return t <= 600 && t > 0;
        });
        if (!inAnyStartWindow) {
          lastPlayedStartAlertKeyRef.current = null;
        }
      }

      // Check for 5 minutes before exam start time automated alert (준비령: 문제지/답안지 배부)
      const prepAlertTarget = (Array.isArray(parsed) ? parsed : []).find((p) => {
        const timeToStart = p.startSec - effectiveNowSec;
        return timeToStart <= 300 && timeToStart > 270; // 5분 전 (300초 ~ 270초)
      });
      if (prepAlertTarget && startAlertEnabled && isSoundEnabled && !prepAlertTarget.subjectNames.includes('자습')) {
        const prepAlertKey = `prep-${prepAlertTarget.periodName}-${prepAlertTarget.startTime}`;
        if (lastPlayedPrepAlertKeyRef.current !== prepAlertKey) {
          audioAlert.playAlertSound(alertSettings?.soundType || 'chime', alertSettings?.volume || 0.7);
          setActiveCenterNotification({
            type: 'warning',
            title: `[준비령: 시험 시작 5분 전]`,
            message: `${prepAlertTarget.periodName} (${prepAlertTarget.subjectNames}) 준비령입니다.\n문제지 및 답안지 이상 유무를 확인해 주세요.`,
            periodName: prepAlertTarget.periodName,
            subjectNames: prepAlertTarget.subjectNames,
          });
          lastPlayedPrepAlertKeyRef.current = prepAlertKey;
        }
      } else {
        const inAnyPrepWindow = parsed.some((p) => {
          const t = p.startSec - effectiveNowSec;
          return t <= 300 && t > 0;
        });
        if (!inAnyPrepWindow) {
          lastPlayedPrepAlertKeyRef.current = null;
        }
      }

      // 1. Ongoing Exam Check: startSec <= effectiveNowSec < endSec
      const active = (Array.isArray(parsed) ? parsed : []).find((p) => effectiveNowSec >= p.startSec && effectiveNowSec < p.endSec);
      if (active) {
        const total = active.endSec - active.startSec;
        const elapsed = effectiveNowSec - active.startSec;
        const remaining = Math.max(0, active.endSec - effectiveNowSec);
        const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
        const isEndingSoon = remaining <= alertThresholdSec && remaining > 0;

        // Check if exam just started (within first 15 seconds)
        const startCenterKey = `center-start-${active.periodName}-${active.startTime}`;
        const isEnglishListening =
          (active.startTime === '13:10' || active.subjectNames.includes('영어') || active.periodName.includes('3교시')) &&
          (active.subjectNames.includes('듣기') || isSuneungOrMockSchedule(daySchedule) || active.startTime === '13:10');

        if (effectiveNowSec - active.startSec <= 15 && lastCenterNotificationKeyRef.current !== startCenterKey && !active.subjectNames.includes('자습')) {
          lastCenterNotificationKeyRef.current = startCenterKey;
          
          if (isEnglishListening) {
            // [사용자 절대 규칙] 3교시 영어영역은 13:10분 종이 울리면 안됨 (영어듣기가 시작되서)
            // 타종 및 소리 일체 차단! 무음 팝업 알림만 표출
            setActiveCenterNotification({
              type: 'start',
              title: `[3교시 영어 영역] 듣기평가 시작`,
              message: `※ 13:10 정각 본령(타종) 절대 금지 및 교내 정숙 ※\n영어 듣기평가 방송이 시작됩니다. 학생들은 청취에 집중해 주세요.`,
              periodName: active.periodName,
              subjectNames: active.subjectNames,
            });
          } else {
            // 일반 시험 시작 본령 (타종 및 안내)
            if (isSoundEnabled && startAlertEnabled) {
              audioAlert.playAlertSound(alertSettings?.soundType || 'chime', alertSettings?.volume || 0.7);
            }
            setActiveCenterNotification({
              type: 'start',
              title: `[${active.periodName}] 시험 시작 (본령)`,
              message: `${active.subjectNames} 시험이 시작되었습니다.\n학생들은 시험에 집중해 주시기 바랍니다.`,
              periodName: active.periodName,
              subjectNames: active.subjectNames,
            });
          }
        }

        // 경고 알림 시점에 도달했고 소리가 켜져 있으면 학교 차임벨 및 TTS 방송 재생 (중복 재생 방지)
        if (isEndingSoon && isSoundEnabled && !active.subjectNames.includes('자습')) {
          const alertKey = `${active.periodName}-${active.startTime}-${alertMinutes}`;
          if (lastPlayedAlertKeyRef.current !== alertKey) {
            audioAlert.playAlertSound(alertSettings?.soundType || 'chime', alertSettings?.volume || 0.7);
            // 사용자 요청: 종료 10분 전 알림 멘트 커스텀 TTS 음성 방송
            if (alertSettings?.ttsEnabled ?? true) {
              const msg =
                alertSettings?.ttsMessage ||
                `시험 종료 ${alertMinutes}분 전입니다.\n학생들은 답안지 OMR 카드를 점검하고 마킹 실수가 없는지 확인해 주시기 바랍니다.`;
              setTimeout(() => {
                audioAlert.speakTTS(msg, {
                  volume: alertSettings?.volume || 0.9,
                  rate: alertSettings?.ttsVoiceSpeed || 1.0,
                });
              }, 1800);
            }
            lastPlayedAlertKeyRef.current = alertKey;
            setActiveCenterNotification({
              type: 'ending_soon',
              title: `[${active.periodName}] 시험 종료 ${alertMinutes}분 전`,
              message: `OMR 답안지 마킹 실수가 없는지\n최종 점검하시기 바랍니다.`,
              periodName: active.periodName,
              subjectNames: active.subjectNames,
            });
          }
        } else if (!isEndingSoon) {
          lastPlayedAlertKeyRef.current = null;
        }

        setCurrentExam({
          statusType: 'ongoing',
          periodName: active.periodName,
          subjectNames: active.subjectNames,
          startTime: active.startTime,
          endTime: active.endTime,
          entryTime: active.entryTime,
          elapsedSeconds: elapsed,
          totalSeconds: total,
          remainingSeconds: remaining,
          remainingFormatted: formatRemaining(remaining),
          percent: parseFloat(pct.toFixed(1)),
          isEndingSoon: isEndingSoon && !active.subjectNames.includes('자습'),
          isStartingSoon: false,
          activePeriodIndex: active.pIdx,
          nextPeriodIndex: active.pIdx,
          statusTitle: active.subjectNames.includes('자습')
            ? `[${active.periodName}] ${active.subjectNames} 진행 중`
            : `[${active.periodName}] ${active.subjectNames} 시험 진행 중`,
          statusSubtitle: active.subjectNames.includes('자습')
            ? `자습 종료(${active.endTime})까지 ${formatRemaining(remaining)} 남음`
            : `시험 종료(${active.endTime})까지 ${formatRemaining(remaining)} 남음`,
        });
        return;
      }

      // 2. Preparation/Entry Time Check: entrySec <= effectiveNowSec < startSec
      const preparing = (Array.isArray(parsed) ? parsed : []).find((p) => effectiveNowSec >= p.entrySec && effectiveNowSec < p.startSec);
      if (preparing) {
        const remaining = preparing.startSec - effectiveNowSec;
        const isSelfStudy = preparing.subjectNames.includes('자습') && !preparing.subjectNames.split(',').some((s) => !s.includes('자습'));
        const isStartingSoon = remaining <= 600 && remaining > 0 && !isSelfStudy;
        setCurrentExam({
          statusType: 'preparing',
          periodName: preparing.periodName,
          subjectNames: preparing.subjectNames,
          startTime: preparing.startTime,
          endTime: preparing.endTime,
          entryTime: preparing.entryTime,
          elapsedSeconds: 0,
          totalSeconds: preparing.endSec - preparing.startSec,
          remainingSeconds: remaining,
          remainingFormatted: formatRemaining(remaining),
          percent: 0,
          isEndingSoon: false,
          isStartingSoon,
          activePeriodIndex: preparing.pIdx,
          nextPeriodIndex: preparing.pIdx,
          statusTitle: isSelfStudy
            ? `[${preparing.periodName}] 입실 완료 및 자습 시작 대기`
            : `[${preparing.periodName}] 입실 완료 및 시험 시작 대기`,
          statusSubtitle: isSelfStudy
            ? `자습 시작(${preparing.startTime})까지 ${formatRemaining(remaining)} 남음`
            : `시험 시작(${preparing.startTime})까지 ${formatRemaining(remaining)} 남음`,
        });
        return;
      }

      // 3. Before First Exam of the Day
      if (effectiveNowSec < parsed[0].startSec) {
        const first = parsed[0];
        const remaining = first.startSec - effectiveNowSec;
        const isSelfStudy = first.subjectNames.includes('자습') && !first.subjectNames.split(',').some((s) => !s.includes('자습'));
        const isStartingSoon = remaining <= 600 && remaining > 0 && !isSelfStudy;
        setCurrentExam({
          statusType: 'before_all',
          periodName: first.periodName,
          subjectNames: first.subjectNames,
          startTime: first.startTime,
          endTime: first.endTime,
          entryTime: first.entryTime,
          elapsedSeconds: 0,
          totalSeconds: first.endSec - first.startSec,
          remainingSeconds: remaining,
          remainingFormatted: formatRemaining(remaining),
          percent: 0,
          isEndingSoon: false,
          isStartingSoon,
          activePeriodIndex: null,
          nextPeriodIndex: first.pIdx,
          statusTitle: isSelfStudy
            ? `오늘 자습 시작 전 (${first.startTime} 시작)`
            : `오늘 시험 시작 전 (${first.startTime} 시작)`,
          statusSubtitle: isSelfStudy
            ? `1교시 시작까지 ${formatRemaining(remaining)} 남음`
            : `1교시 시작까지 ${formatRemaining(remaining)} 남음`,
        });
        return;
      }

      // 4. Break Time Between Periods
      const nextExam = (Array.isArray(parsed) ? parsed : []).find((p) => p.startSec > effectiveNowSec);
      if (nextExam) {
        const remaining = nextExam.startSec - effectiveNowSec;
        const isSelfStudy = nextExam.subjectNames.includes('자습') && !nextExam.subjectNames.split(',').some((s) => !s.includes('자습'));
        const isStartingSoon = remaining <= 600 && remaining > 0 && !isSelfStudy;
        setCurrentExam({
          statusType: 'break',
          periodName: nextExam.periodName,
          subjectNames: nextExam.subjectNames,
          startTime: nextExam.startTime,
          endTime: nextExam.endTime,
          entryTime: nextExam.entryTime,
          elapsedSeconds: 0,
          totalSeconds: nextExam.endSec - nextExam.startSec,
          remainingSeconds: remaining,
          remainingFormatted: formatRemaining(remaining),
          percent: 0,
          isEndingSoon: false,
          isStartingSoon,
          activePeriodIndex: null,
          nextPeriodIndex: nextExam.pIdx,
          statusTitle: `쉬는 시간 (다음: [${nextExam.periodName}] ${nextExam.subjectNames})`,
          statusSubtitle: isSelfStudy
            ? `다음 자습 시작(${nextExam.startTime})까지 ${formatRemaining(remaining)} 남음`
            : `다음 시험 시작(${nextExam.startTime})까지 ${formatRemaining(remaining)} 남음`,
        });
        return;
      }

      // 5. After All Exams Ended
      const last = parsed[parsed.length - 1];
      setCurrentExam({
        statusType: 'after_all',
        periodName: last.periodName,
        subjectNames: last.subjectNames,
        startTime: last.startTime,
        endTime: last.endTime,
        entryTime: last.entryTime,
        elapsedSeconds: last.endSec - last.startSec,
        totalSeconds: last.endSec - last.startSec,
        remainingSeconds: 0,
        remainingFormatted: '00분 00초',
        percent: 100,
        isEndingSoon: false,
        isStartingSoon: false,
        activePeriodIndex: null,
        nextPeriodIndex: last.pIdx,
        statusTitle: `오늘 시험 전체 종료 (${last.endTime} 마감)`,
        statusSubtitle: '모든 시험이 종료되었습니다. 수고하셨습니다!',
      });
    };

    updateTimeAndProgress();
    const interval = setInterval(updateTimeAndProgress, 1000);
    return () => clearInterval(interval);
  }, [
    daySchedule,
    simMode,
    alertThresholdSec,
    isSoundEnabled,
    attendance.grade,
    attendance.classNum,
    filterMyClassOnly,
    alertSettings?.soundType,
    alertSettings?.volume,
  ]);

  // Keep focusedPeriodIdx updated when active or next period changes
  useEffect(() => {
    const targetIdx = currentExam.activePeriodIndex !== null ? currentExam.activePeriodIndex : currentExam.nextPeriodIndex;
    if (targetIdx !== null) {
      setFocusedPeriodIdx(targetIdx);
    }
  }, [currentExam.activePeriodIndex, currentExam.nextPeriodIndex]);

  // Determine effective screen:
  // 시험 시간(statusType === 'ongoing', 즉 실제 시험 시작 시각 ~ 종료 시각)에만 집중 시험 화면(exam_view)으로 전환하고,
  // 쉬는 시간 / 입실 대기 시간(preparing) / 시험 시작 전(before_all) / 모든 시험 종료 후(after_all)에는 전체 시간표 화면(break_view) 표시
  const isExamActive = currentExam.statusType === 'ongoing';

  // 실시간으로 시험이 시작(ongoing 진입)되거나 종료(쉬는 시간 진입)될 때 수동 미리보기에 고정되어 있지 않도록 자동 모드로 즉시 복귀
  const prevStatusTypeRef = useRef<CurrentExamState['statusType']>(currentExam.statusType);
  useEffect(() => {
    if (prevStatusTypeRef.current !== currentExam.statusType) {
      const wasOngoing = prevStatusTypeRef.current === 'ongoing';
      const isNowOngoing = currentExam.statusType === 'ongoing';
      if (wasOngoing !== isNowOngoing) {
        setScreenMode('auto');
      }
      prevStatusTypeRef.current = currentExam.statusType;
    }
  }, [currentExam.statusType]);

  const effectiveScreen: 'break_view' | 'exam_view' =
    screenMode === 'auto'
      ? isExamActive
        ? 'exam_view'
        : 'break_view'
      : screenMode;

  // Toggle browser fullscreen
  const toggleFullscreen = () => {
    if (externalToggleFullscreen) {
      externalToggleFullscreen();
      return;
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.log(e));
      setInternalIsFullscreen(true);
      setFullscreenAspectMode('wide');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((e) => console.log(e));
      }
      setInternalIsFullscreen(false);
    }
  };

  // Preset bottom notices for quick admin editing
  const noticePresets = [
    '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※',
    '※ OMR 카드 마킹 시 컴퓨터용 수성 사인펜만 사용 가능 ※',
    '※ 휴대폰 및 스마트기기는 전원을 끄고 가방에 넣어 제출하세요 ※',
    '※ 부정행위 적발 시 0점 처리 및 학칙에 따라 징계 처분됩니다 ※',
    '※ 종료령이 울리면 즉시 필기도구를 내려놓고 손을 무릎에 올리세요 ※',
    ...DAILY_ENCOURAGEMENT_QUOTES.map((q) => `※ ${q} ※`),
  ];

  // Aspect ratio string helper
  const getAspectRatioString = (w: number, h: number) => {
    const ratio = w / h;
    if (Math.abs(ratio - 16 / 9) < 0.08) return '16:9';
    if (Math.abs(ratio - 16 / 10) < 0.08) return '16:10';
    if (Math.abs(ratio - 4 / 3) < 0.08) return '4:3';
    return `${ratio.toFixed(2)}:1`;
  };

  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Fullscreen Auto-Scaling & Aspect Ratio Calculation:
  // 동적 배너(종료 10분 전 안내 등) 출현 시에도 화면 배율이나 가로 폭이 절대 흔들리지 않도록 고정 기준 해상도 사용
  const BASE_WIDTH = 1380;
  // Center Floating Notification Modal Helper
  const renderCenterNotificationModal = () =>
    activeCenterNotification && (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className={`border-4 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-white shadow-[0_0_60px_rgba(0,0,0,0.95)] text-center space-y-5 ${
          activeCenterNotification.type === 'start' ? 'bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border-cyan-400 ring-4 ring-cyan-500/30' :
          activeCenterNotification.type === 'ending_soon' ? 'bg-gradient-to-b from-rose-950 via-slate-900 to-slate-950 border-yellow-400 ring-4 ring-rose-500/30' :
          'bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 border-amber-400 ring-4 ring-purple-500/30'
        }`}>
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/20 bg-white/10">
            {activeCenterNotification.type === 'start' ? (
              <Flame className="w-9 h-9 text-cyan-300" />
            ) : activeCenterNotification.type === 'ending_soon' ? (
              <AlertTriangle className="w-9 h-9 text-yellow-300" />
            ) : (
              <Bell className="w-9 h-9 text-amber-300" />
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-yellow-300 border border-white/20">
              {activeCenterNotification.periodName} 고사 안내
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
              {activeCenterNotification.title}
            </h2>
            <p className="text-lg sm:text-xl font-bold text-yellow-300 font-mono">
              {activeCenterNotification.subjectNames}
            </p>
          </div>

          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 text-slate-200 text-sm sm:text-base font-bold leading-relaxed whitespace-pre-line">
            {activeCenterNotification.message}
          </div>

          <button
            type="button"
            onClick={() => setActiveCenterNotification(null)}
            className="w-full py-3 px-6 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 rounded-2xl text-base font-black shadow-xl transition cursor-pointer"
          >
            확인 (화면 닫기 · 10초 후 자동 닫힘)
          </button>
        </div>
      </div>
    );

  // 전체(1~4교시) 선택 여부 및 화면 크기를 기반으로 흔들림 없는 고정 스케일 계산
  const isMockAll = isMockSchedule(daySchedule) && selectedMockPeriodId === 'all';
  const BASE_HEIGHT = isMockAll ? 790 : 860;

  // Fullscreen Safe Margins:
  // 교실 배포용 전체화면에서 상단바 제거 및 상하 여백을 최소화하여 칠판 전체가 한 화면 안에 완벽히 들어오도록 설정
  const topReservedSpace = 0;
  const bottomReservedSpace = isFullscreen ? 8 : 0;
  const sideReservedSpace = isFullscreen ? 16 : 0;

  const availableWidth = Math.max(360, windowSize.width - sideReservedSpace);
  const availableHeight = Math.max(300, windowSize.height - (topReservedSpace + bottomReservedSpace));

  const targetVerticalScale = availableHeight / BASE_HEIGHT;
  const targetHorizontalScale = availableWidth / BASE_WIDTH;
  const targetScale = Math.min(targetVerticalScale, targetHorizontalScale);

  let autoCalculatedScale: number;
  let dynamicBaseWidth: number;

  if (fullscreenAspectMode === 'photo') {
    autoCalculatedScale = targetScale * 0.985;
    dynamicBaseWidth = BASE_WIDTH;
  } else {
    const idealBaseWidth = availableWidth / targetVerticalScale;
    dynamicBaseWidth = Math.round(Math.max(1380, Math.min(1920, idealBaseWidth)));
    autoCalculatedScale = Math.min(targetVerticalScale, availableWidth / dynamicBaseWidth) * 0.985;
  }

  const effectiveScale = scaleMode === 'auto' ? autoCalculatedScale : customScale;
  const scaledWidth = Math.round(dynamicBaseWidth * effectiveScale);
  const scaledHeight = Math.round(BASE_HEIGHT * effectiveScale);

  // Render the core chalkboard content
  const renderChalkboardContent = () => (
    <div
      className={`relative rounded-3xl ${isMockAll ? 'p-2 sm:p-3 md:p-3.5' : 'p-3 sm:p-4 md:p-5'} ${currentTheme.frameBg} ${currentTheme.frameBorder} border-4 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.92),inset_0_1px_2px_rgba(255,255,255,0.18)] flex flex-col justify-between aspect-[16/9] w-[95%] mx-auto`}
    >
      {/* Metallic Frame Corner Accents */}
      <div
        className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 ${currentTheme.frameCorner} rounded-tl-2xl pointer-events-none`}
      />
      <div
        className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 ${currentTheme.frameCorner} rounded-tr-2xl pointer-events-none`}
      />
      <div
        className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 ${currentTheme.frameCorner} rounded-bl-2xl pointer-events-none`}
      />
      <div
        className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 ${currentTheme.frameCorner} rounded-br-2xl pointer-events-none`}
      />

      {/* Luxurious Dark Mode Chalkboard Canvas */}
      <div
        className={`${currentTheme.canvasBg} rounded-2xl ${isMockAll ? 'p-2.5 sm:p-3 md:p-3.5' : 'p-3.5 sm:p-4.5 md:p-5'} border-4 ${currentTheme.canvasBorder} shadow-[inset_0_4px_30px_rgba(0,0,0,0.92)] text-white relative flex flex-col justify-between select-none`}
      >
        {/* Direct Electronic Board Drawing Layer */}
        <ChalkCanvas
          isActive={isDrawingActive}
          onToggleActive={() => setIsDrawingActive(!isDrawingActive)}
        />

        {/* Multi-layered Realistic High-End Chalkboard Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
          {/* Layer 1: Fine mineral slate grain */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.08]" />
          {/* Layer 2: Subtle chalkboard matte vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.72)_100%)] opacity-80" />
          {/* Layer 3: Organic chalk sweep light wash */}
          <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.03)_0%,transparent_35%,rgba(255,255,255,0.015)_65%,transparent_100%)]" />
        </div>

        {/* Top Banner Header */}
        <div
          className={`relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 ${isMockAll ? 'pb-2' : 'pb-3'} border-b-2 ${currentTheme.headerBorder}`}
        >
          {/* School Emblem & Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
            {/* Emblem and School Title locked together on the same line */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* School Emblem */}
              {schoolLogo ? (
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-yellow-400 p-1 flex items-center justify-center shadow-lg shrink-0 overflow-hidden transition-colors ${
                    emblemBgMode === 'transparent'
                      ? 'bg-slate-900/60 backdrop-blur-xs'
                      : 'bg-white/95'
                  }`}
                  title="학교 마크 (관리자 모드에서 첨부됨)"
                >
                  <img
                    src={schoolLogo}
                    alt="학교 마크"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              ) : (
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-red-700 border-2 border-yellow-400 flex items-center justify-center shadow-lg shrink-0"
                  title="기본 高 마크"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-yellow-300/80 flex items-center justify-center text-yellow-300 font-extrabold text-xs tracking-tighter">
                    高
                  </div>
                </div>
              )}

              {/* Title right next to emblem */}
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                {schoolName && !daySchedule.fullTitle?.includes(schoolName) && (
                  <span className="text-yellow-300 font-black text-sm sm:text-lg md:text-2xl whitespace-nowrap">{schoolName}</span>
                )}
                <span className="text-sm sm:text-lg md:text-2xl font-black text-white tracking-tight drop-shadow-xs break-keep">
                  {isMockSchedule(daySchedule)
                    ? '전국연합학력평가'
                    : isSuneungOrMockSchedule(daySchedule)
                    ? daySchedule.fullTitle
                    : (daySchedule.fullTitle || `2026학년도 2학기 1차 고사 시간표(${daySchedule.date})`).replace(/\s*\([^)]*\)/g, '').replace(/[()]$/g, '').trim()}
                </span>
              </div>
            </div>

            {/* Badges: Date, Clock and Sound Alert Button */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {!isMockSchedule(daySchedule) && (
                <span className="text-xs sm:text-sm md:text-base font-black text-yellow-300 bg-yellow-400/20 px-3 py-1 rounded-xl border border-yellow-400/40 flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                  <Calendar className="w-4 h-4 text-yellow-300 shrink-0" />
                  <span>{currentFullDate}</span>
                </span>
              )}
              <span className="text-xs sm:text-sm md:text-base font-black text-emerald-300 bg-emerald-950/70 px-3 py-1 rounded-xl border border-emerald-500/50 flex items-center gap-1.5 shadow-xs font-mono tabular-nums whitespace-nowrap">
                <Clock className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                <span className="inline-block min-w-[8ch] text-center">{currentTime}</span>
              </span>

              {/* 전자칠판 화면 밝기 조절 스크롤바 (아이들 눈부심 방지) */}
              {renderBrightnessController('board')}

              {/* 알림 소리 ON/OFF 버튼 */}
              {alertSettings && onChangeAlertSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeAlertSettings({
                      ...alertSettings,
                      soundEnabled: !alertSettings.soundEnabled,
                    });
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1 shadow-xs border whitespace-nowrap ${
                    alertSettings.soundEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-600'
                  }`}
                  title={alertSettings.soundEnabled ? '시험 종료/시작 알림 소리 켜짐 (클릭하여 무음으로 전환)' : '알림 소리 꺼짐 (클릭하여 소리 켜기)'}
                >
                  {alertSettings.soundEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                      <span>알림 ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>알림 OFF</span>
                    </>
                  )}
                </button>
              )}

              {/* 모의고사 모드: '전체' 고정 모드로 동작하도록 버튼 제거 */}
              {isMockSchedule(daySchedule) && (
                <div className="hidden"></div>
              )}
            </div>
          </div>

          {/* Right Top Notice Banner */}
          {cleanNoticeText(daySchedule.notice)?.trim() ? (
            <div
              className={`${currentTheme.topNoticeBg} border-2 ${currentTheme.topNoticeBorder} rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs sm:text-sm md:text-base font-black text-yellow-300 shadow-md shrink-0 whitespace-normal break-words max-w-full`}
            >
              <span className="text-yellow-200 font-black break-words drop-shadow-xs">
                {cleanNoticeText(daySchedule.notice)}
              </span>
              <span
                className="inline-block w-3 h-4 bg-white/90 rotate-12 rounded-xs ml-1 shadow-xs shrink-0"
                title="분필 아이콘"
              />
            </div>
          ) : null}
        </div>



        {/* Blackboard Body: Left Attendance Panel & Right Schedule Table */}
        <div className={`relative z-10 grid grid-cols-1 lg:grid-cols-12 ${isMockAll ? 'gap-3 my-2' : 'gap-5 my-4'} items-stretch flex-1`}>
          {/* Left Panel: Class & Attendance Box */}
          <div className={`lg:col-span-4 bg-white rounded-3xl ${isMockAll ? 'p-3 sm:p-3.5' : 'p-4.5'} text-slate-900 shadow-xl border-4 border-slate-200 flex flex-col justify-between h-full relative`}>
            {/* Top Red Header: 학년 / 반 드롭다운 */}
            <div className={`bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-lg sm:text-xl ${isMockAll ? 'py-1.5 px-3' : 'py-2.5 px-4'} rounded-2xl text-center shadow-md flex items-center justify-center gap-3`}>
              {/* 학년 드롭다운 */}
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <select
                    value={attendance.grade}
                    onChange={(e) => handleUpdateAttendance({ ...attendance, grade: e.target.value })}
                    className="bg-white text-slate-950 font-black pl-3.5 pr-7 py-1.5 rounded-xl shadow-xs appearance-none cursor-pointer text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 border-2 border-red-300"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-600 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="font-black text-white text-lg sm:text-xl drop-shadow-xs">학년</span>
              </div>

              {/* 반 드롭다운 */}
              <div className="flex items-center gap-1.5 ml-1">
                <div className="relative">
                  <select
                    value={attendance.classNum}
                    onChange={(e) => handleUpdateAttendance({ ...attendance, classNum: e.target.value })}
                    className="bg-white text-slate-950 font-black pl-3.5 pr-7 py-1.5 rounded-xl shadow-xs appearance-none cursor-pointer text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 border-2 border-red-300"
                  >
                    {Array.from({ length: maxClasses }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-600 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="font-black text-white text-lg sm:text-xl drop-shadow-xs">반</span>
              </div>
            </div>

            {/* Attendance Rows Table - 글자 가독성 대폭 향상 (폰트 굵기 font-black & 큼직한 폰트) */}
            <div className={`flex-1 ${isMockAll ? 'my-1.5' : 'my-3'} flex flex-col justify-around border-2 border-slate-300 rounded-2xl overflow-hidden bg-white shadow-md divide-y-2 divide-slate-300`}>
              {/* 총원 */}
              <div className={`grid grid-cols-12 items-center bg-slate-50 flex-1 ${isMockAll ? 'min-h-[42px]' : 'min-h-[58px]'}`}>
                <div className={`col-span-5 bg-slate-200/90 ${isMockAll ? 'py-2 px-2 text-sm sm:text-base' : 'py-3.5 px-3 text-base sm:text-lg md:text-xl'} text-slate-950 text-center border-r-2 border-slate-300 font-black`}>
                  총원
                </div>
                <div
                  onClick={() => !isEditingAttendance && setIsEditingAttendance(true)}
                  className={`col-span-7 ${isMockAll ? 'py-1 px-3 min-h-[38px]' : 'py-2.5 px-4 min-h-[52px]'} text-slate-950 text-center font-black ${isMockAll ? 'text-xl sm:text-2xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'} flex items-center justify-center cursor-pointer hover:bg-slate-100/70 transition font-mono tracking-wider`}
                  title="클릭하여 숫자 입력 또는 전자칠판 판서 쓰기"
                >
                  {isEditingAttendance ? (
                    <input
                      type="text"
                      placeholder="숫자 입력"
                      value={attendance.totalCount}
                      onChange={(e) =>
                        setAttendance({ ...attendance, totalCount: e.target.value.replace(/명$/, '') })
                      }
                      className={`w-full text-center border-2 border-indigo-500 rounded-lg px-1 py-0.5 font-black ${isMockAll ? 'text-xl' : 'text-2xl'} font-mono text-slate-950`}
                    />
                  ) : (
                    <span className={`font-black text-slate-950 ${isMockAll ? 'text-xl sm:text-2xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-mono tracking-wider`}>
                      {formatCountDisplay(attendance.totalCount)}
                    </span>
                  )}
                </div>
              </div>

              {/* 응시 */}
              <div className={`grid grid-cols-12 items-center flex-1 ${isMockAll ? 'min-h-[42px]' : 'min-h-[58px]'}`}>
                <div className={`col-span-5 bg-slate-200/90 ${isMockAll ? 'py-2 px-2 text-sm sm:text-base' : 'py-3.5 px-3 text-base sm:text-lg md:text-xl'} text-slate-950 text-center border-r-2 border-slate-300 font-black`}>
                  응시
                </div>
                <div
                  onClick={() => !isEditingAttendance && setIsEditingAttendance(true)}
                  className={`col-span-7 ${isMockAll ? 'py-1 px-3 min-h-[38px]' : 'py-2.5 px-4 min-h-[52px]'} text-emerald-700 text-center font-black ${isMockAll ? 'text-xl sm:text-2xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'} flex items-center justify-center cursor-pointer hover:bg-slate-100/70 transition font-mono tracking-wider`}
                  title="클릭하여 숫자 입력 또는 전자칠판 판서 쓰기"
                >
                  {isEditingAttendance ? (
                    <input
                      type="text"
                      placeholder="숫자 입력"
                      value={attendance.presentCount}
                      onChange={(e) =>
                        setAttendance({ ...attendance, presentCount: e.target.value.replace(/명$/, '') })
                      }
                      className={`w-full text-center border-2 border-indigo-500 rounded-lg px-1 py-0.5 font-black ${isMockAll ? 'text-xl' : 'text-2xl'} font-mono text-emerald-700`}
                    />
                  ) : (
                    <span className={`font-black text-emerald-700 ${isMockAll ? 'text-xl sm:text-2xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-mono tracking-wider`}>
                      {formatCountDisplay(attendance.presentCount)}
                    </span>
                  )}
                </div>
              </div>

              {/* 결번 */}
              <div className={`grid grid-cols-12 items-center bg-slate-50 flex-1 ${isMockAll ? 'min-h-[42px]' : 'min-h-[58px]'}`}>
                <div className={`col-span-5 bg-slate-200/90 ${isMockAll ? 'py-2 px-2 text-sm sm:text-base' : 'py-3.5 px-3 text-base sm:text-lg md:text-xl'} text-slate-950 text-center border-r-2 border-slate-300 font-black`}>
                  결번
                </div>
                <div
                  onClick={() => !isEditingAttendance && setIsEditingAttendance(true)}
                  className={`col-span-7 ${isMockAll ? 'py-1 px-3 min-h-[38px]' : 'py-2.5 px-4 min-h-[52px]'} text-rose-600 text-center font-black ${isMockAll ? 'text-xl sm:text-2xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'} flex items-center justify-center cursor-pointer hover:bg-slate-100/70 transition font-mono tracking-wider`}
                  title="클릭하여 숫자/내용 입력 또는 전자칠판 판서 쓰기"
                >
                  {isEditingAttendance ? (
                    <input
                      type="text"
                      placeholder="결시 번호 또는 없음"
                      value={attendance.absentNotes}
                      onChange={(e) => setAttendance({ ...attendance, absentNotes: e.target.value })}
                      className={`w-full text-center border-2 border-indigo-500 rounded-lg px-1 py-0.5 font-black ${isMockAll ? 'text-xl' : 'text-2xl'} font-mono text-rose-600`}
                    />
                  ) : (
                    <span className={`font-black text-rose-600 ${isMockAll ? 'text-xl sm:text-2xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-mono tracking-wider`}>
                      {formatAbsentDisplay(attendance.absentNotes)}
                    </span>
                  )}
                </div>
              </div>

              {/* 끝 번호 */}
              <div className={`grid grid-cols-12 items-center flex-1 ${isMockAll ? 'min-h-[42px]' : 'min-h-[58px]'}`}>
                <div className={`col-span-5 bg-slate-200/90 ${isMockAll ? 'py-2 px-2 text-sm sm:text-base' : 'py-3.5 px-3 text-base sm:text-lg md:text-xl'} text-slate-950 text-center border-r-2 border-slate-300 font-black`}>
                  끝 번호
                </div>
                <div
                  onClick={() => !isEditingAttendance && setIsEditingAttendance(true)}
                  className={`col-span-7 ${isMockAll ? 'py-1 px-3 min-h-[38px]' : 'py-2.5 px-4 min-h-[52px]'} text-slate-950 text-center font-black ${isMockAll ? 'text-xl sm:text-2xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'} flex items-center justify-center cursor-pointer hover:bg-slate-100/70 transition font-mono tracking-wider`}
                  title="클릭하여 숫자 입력 또는 전자칠판 판서 쓰기"
                >
                  {isEditingAttendance ? (
                    <input
                      type="text"
                      placeholder="숫자 입력"
                      value={attendance.lastNum}
                      onChange={(e) =>
                        setAttendance({ ...attendance, lastNum: e.target.value.replace(/번$/, '') })
                      }
                      className={`w-full text-center border-2 border-indigo-500 rounded-lg px-1 py-0.5 font-black ${isMockAll ? 'text-xl' : 'text-2xl'} font-mono text-slate-950`}
                    />
                  ) : (
                    <span className={`font-black text-slate-950 ${isMockAll ? 'text-xl sm:text-2xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-mono tracking-wider`}>
                      {formatLastNumDisplay(attendance.lastNum)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Attendance Controls Bar */}
            <div className={`flex items-center gap-1.5 ${isMockAll ? 'pt-0.5' : 'pt-1'}`}>
              <button
                onClick={() => setIsEditingAttendance(!isEditingAttendance)}
                className={`flex-1 ${isMockAll ? 'py-1.5 text-xs' : 'py-2 text-xs sm:text-sm'} bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-black flex items-center justify-center gap-1 transition cursor-pointer border border-slate-300 shadow-2xs`}
              >
                {isEditingAttendance ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>입력 완료</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>숫자 입력</span>
                  </>
                )}
              </button>

              {/* Realtime Drawing Mode Toggle Button */}
              <button
                type="button"
                onClick={() => setIsDrawingActive(!isDrawingActive)}
                className={`px-2.5 py-2 rounded-xl text-xs font-black transition cursor-pointer border flex items-center gap-1 shadow-2xs ${
                  isDrawingActive
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 animate-pulse font-black'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                title="전자칠판 화면 위에 직접 펜으로 판서하기"
              >
                <Edit3 className={`w-3.5 h-3.5 ${isDrawingActive ? 'text-slate-950' : 'text-indigo-600'}`} />
                <span>{isDrawingActive ? '판서 켜짐' : '판서모드'}</span>
              </button>

              {/* Quick Reset to Blank for Handwriting (판서용 비우기) */}
              <button
                onClick={() => {
                  setAttendance({
                    ...attendance,
                    totalCount: '',
                    presentCount: '',
                    absentNotes: '',
                    lastNum: '',
                  });
                  setIsEditingAttendance(false);
                }}
                className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black transition cursor-pointer border border-rose-200 shadow-2xs flex items-center gap-1"
                title="인원 전체를 비우고 전자칠판 판서로 직접 필기"
              >
                <RotateCcw className="w-3 h-3" />
                <span>판서용 비우기</span>
              </button>

              {/* Sample Preset Button */}
              <button
                onClick={() => {
                  setAttendance({
                    ...attendance,
                    totalCount: '28',
                    presentCount: '27',
                    absentNotes: '14번',
                    lastNum: '28',
                  });
                  setIsEditingAttendance(false);
                }}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition cursor-pointer border border-slate-200"
                title="샘플 인원 채우기"
              >
                샘플
              </button>
            </div>
          </div>

          {/* Right Panel: Period Exam Schedule Table */}
          <div
            className={`lg:col-span-8 ${currentTheme.schedulePanelBg} rounded-3xl border-3 ${currentTheme.schedulePanelBorder} ${isMockAll ? 'p-2.5 sm:p-3 space-y-2' : 'p-3.5 sm:p-4.5 space-y-4'} shadow-inner flex flex-col justify-between`}
          >
            <div className={isMockAll ? 'space-y-1.5' : 'space-y-4'}>
              {/* Timetable Header with Class Filter Toggle */}
              <div
                className={`flex items-center justify-between ${isMockAll ? 'pb-1.5' : 'pb-2.5'} border-b-2 ${currentTheme.scheduleHeaderBorder} flex-wrap gap-2`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />
                  <h4 className="text-white font-black text-base sm:text-lg flex items-center gap-1.5">
                    <span className="text-yellow-300 font-black drop-shadow-xs">
                      {attendance.grade}학년 {attendance.classNum}반
                    </span>
                    <span className="text-emerald-300 font-black text-xs sm:text-sm">
                      {filterMyClassOnly ? '맞춤 시험 시간표' : '전체 시험 시간표'}
                    </span>
                  </h4>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* 시험 종료 10분 전 / 시작 10분 전 인라인 배지 (고정 폭 및 레이아웃 높이 변화 없음) */}
                  {currentExam.isEndingSoon && (
                    <div className="bg-rose-600 border-2 border-yellow-300 rounded-xl px-3 py-1 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md whitespace-nowrap tabular-nums">
                      <AlertTriangle className="w-4 h-4 text-yellow-300 shrink-0" />
                      <span>
                        [{currentExam.periodName} 종료 {alertMinutes}분 전] OMR 최종 점검 (남은 시간: {currentExam.remainingFormatted})
                      </span>
                    </div>
                  )}
                  {currentExam.isStartingSoon && !currentExam.subjectNames.includes('자습') && (
                    <div className="bg-cyan-700 border-2 border-yellow-300 rounded-xl px-3 py-1 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md whitespace-nowrap tabular-nums">
                      <Bell className="w-4 h-4 text-yellow-300 shrink-0" />
                      <span>
                        [시험 시작 10분 전] 곧 {currentExam.periodName} 시작 · 입실 완료
                      </span>
                    </div>
                  )}
                      {/* 전체화면(쉬는 시간 화면)에서도 자동 화면 전환 상태 확인 및 1.쉬는시간/2.시험시간 전환 가능 */}
                      <div className="flex items-center gap-1 bg-slate-950/90 px-1.5 py-0.5 rounded-xl border border-slate-700 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setScreenMode('auto')}
                          className={`px-2 py-0.5 rounded-lg font-black transition cursor-pointer flex items-center gap-1 ${
                            screenMode === 'auto'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="쉬는 시간(전체 시간표) ↔ 시험 시간(집중 대형 화면) 자동 전환"
                        >
                          <Sparkles className="w-3 h-3 text-yellow-300 shrink-0" />
                          <span>자동전환</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setScreenMode('break_view')}
                          className={`px-2 py-0.5 rounded-lg font-black transition cursor-pointer ${
                            screenMode === 'break_view'
                              ? 'bg-cyan-600 text-white shadow-2xs'
                              : screenMode === 'auto' && effectiveScreen === 'break_view'
                              ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/40'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="1. 쉬는 시간 (전체 시간표 화면)"
                        >
                          1.쉬는시간
                        </button>
                        <button
                          type="button"
                          onClick={() => setScreenMode('exam_view')}
                          className={`px-2 py-0.5 rounded-lg font-black transition cursor-pointer ${
                            screenMode === 'exam_view'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="2. 시험 시간 (과목 집중 대형 화면)"
                        >
                          2.시험시간
                        </button>
                      </div>

                      <button
                        onClick={() => setFilterMyClassOnly(!filterMyClassOnly)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer shadow-xs border ${
                          filterMyClassOnly
                            ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 border-yellow-300 font-black'
                            : 'bg-emerald-900/90 hover:bg-emerald-800 text-emerald-100 border-emerald-600'
                        }`}
                        title="우리 반 맞춤 과목만 보기 또는 전체 과목 보기 전환"
                      >
                        {filterMyClassOnly ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                            <span>우리 반 맞춤 보기 ({attendance.grade}-{attendance.classNum})</span>
                          </>
                        ) : (
                          <>
                            <Layers className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                            <span>전체 과목 보기</span>
                          </>
                        )}
                      </button>
                </div>
              </div>



              {(isMockSchedule(daySchedule)
                ? (selectedMockPeriodId === 'all'
                    ? daySchedule.schedule
                    : daySchedule.schedule.filter((p) => p.id === selectedMockPeriodId))
                : daySchedule.schedule
              ).map((period, pIdx) => {
                const isCurrentActivePeriod =
                  currentExam.activePeriodIndex === pIdx && currentExam.statusType === 'ongoing';

                const isEnglish = period.period.includes('3교시') && (isSuneungOrMockSchedule(daySchedule) || period.subjects.some((s) => s.name.includes('영어')));
                const isG4 = period.id === 'p-mk-4' || period.period.includes('4교시');

                // 모의고사 모드 전용: 1교시 국어 영역을 예비령 왼쪽에 넣은 1줄 4단 구성 (1~4교시 통일 레이아웃)
                if (isMockSchedule(daySchedule)) {
                  // 4교시의 경우 세부 과목(한국사, 탐구1, 탐구2) 선택 처리
                  const g4Options = [
                    { key: 'all', label: '전체 (102분)', subIdx: -1 },
                    { key: 'history', label: '한국사 (30분)', subIdx: 0 },
                    { key: 'inq1', label: '탐구 1 (40분)', subIdx: 1 },
                    { key: 'inq2', label: '탐구 2 (40분)', subIdx: 2 },
                  ];

                  let activeSub = period.subjects[0];
                  let displayPrelim = activeSub?.preliminaryBell || activeSub?.entryTime || '08:25';
                  let displayPrep = activeSub?.prepTimeRange ? activeSub.prepTimeRange.replace(/\s+/g, '') : '08:35';
                  let displayMain = activeSub?.time || '08:40 ~ 10:00';
                  let displayDuration = activeSub?.duration || 80;
                  let displayEnd = activeSub?.endBell || activeSub?.time?.split('~')[1]?.trim() || '10:00';
                  // 교시 번호(1교시 등)는 위의 배지에서 이미 표시되므로, 과목명에서는 교시명을 제거하여 중복 방지
                  let cleanSubjectName = (activeSub?.name || '')
                    .replace(/^\s*\d+교시\s*[-·:]?\s*/, '')
                    .trim();
                  let displayTitle = cleanSubjectName || '과목 정보';
                  let subNote = '';

                  if (isG4) {
                    displayTitle = '한국사 및 탐구 영역';
                    if (selectedG4SubIdx === 0 && period.subjects[0]) {
                      activeSub = period.subjects[0];
                      displayTitle = '한국사 (필수)';
                      displayPrelim = activeSub.preliminaryBell || '14:40';
                      displayPrep = activeSub.prepTimeRange || '14:45';
                      displayMain = activeSub.time || '14:50 ~ 15:20';
                      displayDuration = activeSub.duration || 30;
                      displayEnd = activeSub.endBell || '15:20';
                    } else if (selectedG4SubIdx === 1 && period.subjects[1]) {
                      activeSub = period.subjects[1];
                      displayTitle = '탐구 1 (통합사회)';
                      displayPrelim = activeSub.preliminaryBell || '15:25';
                      displayPrep = activeSub.prepTimeRange || '15:30';
                      displayMain = activeSub.time || '15:35 ~ 16:15';
                      displayDuration = activeSub.duration || 40;
                      displayEnd = activeSub.endBell || '16:15';
                    } else if (selectedG4SubIdx === 2 && period.subjects[2]) {
                      activeSub = period.subjects[2];
                      displayTitle = '탐구 2 (통합과학)';
                      displayPrelim = activeSub.preliminaryBell || '16:20';
                      displayPrep = activeSub.prepTimeRange || '16:25';
                      displayMain = activeSub.time || '16:30 ~ 17:10';
                      displayDuration = activeSub.duration || 40;
                      displayEnd = activeSub.endBell || '17:10';
                    } else {
                      // 전체 4교시 종합 일정
                      displayPrelim = '14:40';
                      displayPrep = '14:45';
                      displayMain = '14:50 ~ 17:10';
                      displayDuration = 102;
                      displayEnd = '17:10';
                      subNote = '한국사(14:50~15:20) · 탐구(15:35~17:10)';
                    }
                  }

                  return (
                    <div
                      key={period.id || period.period}
                      ref={(el) => {
                        periodItemRefs.current[pIdx] = el;
                      }}
                      className={`bg-white rounded-2xl border-2 ${isMockAll ? 'p-1.5 sm:p-2 shadow-xs' : 'p-3 sm:p-3.5 shadow-sm'} transition-all hover:shadow-md ${
                        isCurrentActivePeriod
                          ? 'border-yellow-400 ring-2 ring-yellow-400/50 shadow-md'
                          : 'border-slate-300'
                      }`}
                    >
                      {/* 1줄 4단 그리드: [1. 과목정보] | [2. 예비령] | [3. 준비령] | [4. 본령] */}
                      <div className={`grid grid-cols-1 md:grid-cols-12 ${isMockAll ? 'gap-1.5 sm:gap-2' : 'gap-2.5 sm:gap-3'} items-stretch`}>
                        {/* 1. Left: 교시 및 과목 정보 (예비령 왼쪽 한줄 배치) */}
                        <div className={`col-span-12 md:col-span-3 bg-slate-50 border-2 border-slate-200/90 rounded-xl ${isMockAll ? 'p-1.5 sm:p-2' : 'p-3'} flex flex-col justify-between items-center text-center`}>
                          {/* 상단: 교시 배지 및 바로 밑 과목명 · 시험시간 */}
                          <div className="w-full flex flex-col items-center">
                            <div className={`flex items-center gap-1.5 flex-wrap justify-center ${isMockAll ? 'mb-0.5' : 'mb-1'}`}>
                              <span className={`font-black bg-purple-700 text-white rounded-full shadow-2xs ${isMockAll ? 'text-[11px] px-2 py-0.2' : 'text-xs px-2.5 py-0.5'}`}>
                                {period.period.split('-')[0].trim()}
                              </span>
                              {isCurrentActivePeriod && (
                                <span className={`bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1 shadow-2xs ${isMockAll ? 'text-[9px]' : 'text-[10px]'}`}>
                                  <Flame className="w-3 h-3 text-red-600" />
                                  <span>진행 중</span>
                                </span>
                              )}
                            </div>

                            <h4 className={`font-black text-slate-950 leading-tight ${isMockAll ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`}>
                              {displayTitle}
                            </h4>
                            <span className={`inline-block font-black bg-indigo-100 text-indigo-900 rounded-full border border-indigo-200 ${isMockAll ? 'text-[10px] px-2 py-0.2 mt-0.5' : 'text-xs px-2.5 py-0.5 mt-1'}`}>
                              시험시간: {displayDuration}분
                            </span>
                          </div>

                          {/* 하단 보조 정보 및 칩: 1·2교시는 사용자 요청에 따라 정규타종 라벨 제거하고 위치 보존 */}
                          <div className={`w-full flex justify-center ${isMockAll ? 'mt-0.5 min-h-[16px]' : 'mt-2 min-h-[22px]'}`}>
                            {isEnglish ? (
                              <span className={`font-black bg-rose-100 text-rose-800 rounded-md border border-rose-200 shadow-2xs ${isMockAll ? 'text-[9px] px-1.5 py-0.2' : 'text-[10px] px-2.5 py-0.5'}`}>
                                📻 무타종 (듣기평가 직결)
                              </span>
                            ) : isG4 ? (
                              <div className="grid grid-cols-2 gap-1.5 w-full">
                                {g4Options.map((opt) => (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => setSelectedG4SubIdx(opt.subIdx === -1 ? 3 : opt.subIdx)}
                                    className={`w-full font-black rounded-md transition cursor-pointer ${isMockAll ? 'px-1 py-0.2 text-[9px]' : 'px-1.5 py-0.5 text-[10px]'} ${
                                      (opt.subIdx === -1 && selectedG4SubIdx === 3) || (opt.subIdx === selectedG4SubIdx && selectedG4SubIdx !== 3)
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* 2. 예비령 */}
                        <div className={`col-span-12 sm:col-span-4 md:col-span-3 bg-blue-50/90 border-2 border-blue-300 rounded-xl ${isMockAll ? 'p-1.5 sm:p-2' : 'p-3'} text-center flex flex-col justify-between shadow-2xs`}>
                          <div>
                            <span className={`inline-block font-black bg-blue-600 text-white rounded-md shadow-2xs ${isMockAll ? 'text-[11px] px-2 py-0.2 mb-0.5' : 'text-xs px-2.5 py-0.5 mb-1'}`}>
                              🔔 예비령
                            </span>
                            <div className={`${isMockAll ? 'text-[10px]' : 'text-[11px]'} text-slate-600 font-bold`}>수험생 입실 완료</div>
                          </div>
                          <div className={`${isMockAll ? 'text-lg sm:text-xl my-0.5' : 'text-2xl sm:text-3xl my-1'} font-mono font-black text-blue-950 tracking-tight`}>
                            {displayPrelim}
                          </div>
                          <div className={`${isMockAll ? 'text-[9px]' : 'text-[10px]'} text-blue-700 font-bold`}>입실 및 착석</div>
                        </div>

                        {/* 3. 준비령 */}
                        <div className={`col-span-12 sm:col-span-4 md:col-span-3 bg-amber-50/90 border-2 border-amber-300 rounded-xl ${isMockAll ? 'p-1.5 sm:p-2' : 'p-3'} text-center flex flex-col justify-between shadow-2xs`}>
                          <div>
                            <span className={`inline-block font-black bg-amber-600 text-white rounded-md shadow-2xs ${isMockAll ? 'text-[11px] px-2 py-0.2 mb-0.5' : 'text-xs px-2.5 py-0.5 mb-1'}`}>
                              🔔 준비령
                            </span>
                            <div className={`${isMockAll ? 'text-[10px]' : 'text-[11px]'} text-slate-600 font-bold`}>문제지·답안지 배부</div>
                          </div>
                          <div className={`${isMockAll ? 'text-lg sm:text-xl my-0.5' : 'text-2xl sm:text-3xl my-1'} font-mono font-black text-amber-950 tracking-tight`}>
                            {displayPrep}
                          </div>
                          <div className={`${isMockAll ? 'text-[9px]' : 'text-[10px]'} text-amber-700 font-bold`}>문답지 확인 및 마킹</div>
                        </div>

                        {/* 4. 본령 */}
                        <div className={`col-span-12 sm:col-span-4 md:col-span-3 bg-rose-50/95 border-2 border-rose-300 rounded-xl ${isMockAll ? 'p-1.5 sm:p-2' : 'p-3'} text-center flex flex-col justify-between shadow-2xs ring-1 ring-rose-400/40`}>
                          <div>
                            <span className={`inline-block font-black bg-rose-600 text-white rounded-md shadow-2xs ${isMockAll ? 'text-[11px] px-2 py-0.2 mb-0.5' : 'text-xs px-2.5 py-0.5 mb-1'}`}>
                              {isEnglish ? '📻 본령 (무타종)' : '🔔 본령 (시험 시작)'}
                            </span>
                            <div className={`${isMockAll ? 'text-[10px]' : 'text-[11px]'} text-rose-800 font-bold`}>
                              {isEnglish ? '영어 듣기평가 방송 직결' : '문제풀이 및 답안작성'}
                            </div>
                          </div>
                          <div>
                            <div className={`${isMockAll ? 'text-base sm:text-lg my-0.5' : 'text-xl sm:text-2xl my-0.5'} font-mono font-black text-rose-950 tracking-tight`}>
                              {displayMain}
                            </div>
                            {subNote && (
                              <div className={`${isMockAll ? 'text-[9px]' : 'text-[10px]'} text-rose-800 font-bold`}>
                                {subNote}
                              </div>
                            )}
                          </div>
                          <div className={`${isMockAll ? 'text-[9px]' : 'text-[10px]'} text-rose-800 font-bold`}>
                            종료 {displayEnd} (총 {displayDuration}분)
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const displayedSubjects = filterMyClassOnly
                  ? getPeriodSubjectsForClass(period.subjects, attendance.grade, attendance.classNum)
                  : period.subjects;

                const electiveNotes = filterMyClassOnly
                  ? getElectiveNotesForPeriod(period.subjects, attendance.grade, attendance.classNum)
                  : [];

                const isBreak = period.period.includes('휴식') || period.period.includes('쉬는');
                const isLunch = period.period.includes('점심') || period.period.includes('중식');
                const isMorningAssembly = period.period.includes('입실') || period.period.includes('조례');
                const isCleanup = period.period.includes('채점') || period.period.includes('청소');

                if (isMorningAssembly || isCleanup) {
                  const sub0 = period.subjects[0];
                  return (
                    <div
                      key={period.id || `special-${pIdx}`}
                      ref={(el) => {
                        periodItemRefs.current[pIdx] = el;
                      }}
                      className="rounded-2xl transition-all duration-300"
                    >
                      <div className={`p-3 sm:p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
                        isMorningAssembly
                          ? 'bg-indigo-950/80 border-indigo-400/60 text-indigo-100'
                          : 'bg-slate-900/90 border-purple-400/60 text-purple-100'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black border ${
                            isMorningAssembly
                              ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300'
                              : 'bg-purple-500/20 border-purple-400/50 text-purple-300'
                          }`}>
                            <Bell className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                isMorningAssembly
                                  ? 'bg-indigo-400 text-slate-950'
                                  : 'bg-purple-400 text-slate-950'
                              }`}>
                                {period.period} ({sub0?.duration || 10}분)
                              </span>
                              {sub0?.proceedGuide && (
                                <span className="text-xs font-black text-yellow-300 bg-slate-950/80 px-2.5 py-0.5 rounded-lg border border-yellow-400/40">
                                  진행요령: {sub0.proceedGuide}
                                </span>
                              )}
                            </div>
                            <div className="text-sm sm:text-base font-black text-white mt-1">
                              {sub0?.name}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                          <div className="text-xs sm:text-sm font-mono font-black text-white bg-slate-950/90 border border-slate-600 px-3 py-1.5 rounded-xl">
                            {sub0?.time}
                          </div>
                          {sub0?.supervisorInfo && (
                            <div className="text-xs sm:text-sm font-black text-yellow-300 bg-indigo-900/80 border border-indigo-400/50 px-3 py-1.5 rounded-xl">
                              감독교사: <strong className="text-white">{sub0.supervisorInfo}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isBreak) {
                  return (
                    <div
                      key={period.id || `break-${pIdx}`}
                      ref={(el) => {
                        periodItemRefs.current[pIdx] = el;
                      }}
                      className={`rounded-2xl transition-all duration-300 ${
                        isCurrentActivePeriod ? 'ring-2 ring-emerald-400 shadow-lg' : ''
                      }`}
                    >
                      <div className={`p-3 sm:p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
                        isCurrentActivePeriod
                          ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-emerald-400 text-emerald-100 ring-2 ring-emerald-400/50'
                          : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shrink-0">
                            <Coffee className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                                ☕ 휴식시간 ({period.subjects[0]?.duration || 20}분)
                              </span>
                              <button
                                type="button"
                                onClick={() => setScreenMode('exam_view')}
                                className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full hover:bg-amber-500 cursor-pointer shadow-xs"
                              >
                                시험 화면으로
                              </button>
                              {isCurrentActivePeriod && (
                                <span className="text-xs font-black text-yellow-300 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                  현재 휴식 중
                                </span>
                              )}
                            </div>
                            <div className="text-sm sm:text-base font-black text-white mt-0.5">
                              {period.subjects[0]?.name || '시험 종료 후 휴식'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="text-xs sm:text-sm font-mono font-black text-emerald-300 bg-emerald-900/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl">
                            {period.subjects[0]?.time}
                          </div>
                          {period.subjects[0]?.entryTime && (
                            <div className="text-xs sm:text-sm font-black text-yellow-300 bg-amber-950/80 border border-amber-500/60 px-3 py-1.5 rounded-xl flex items-center gap-1">
                              <span>다음 준비령/입실:</span>
                              <strong className="font-mono text-white text-sm">{period.subjects[0].entryTime}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isLunch) {
                  return (
                    <div
                      key={period.id || `lunch-${pIdx}`}
                      ref={(el) => {
                        periodItemRefs.current[pIdx] = el;
                      }}
                      className={`rounded-2xl transition-all duration-300 ${
                        isCurrentActivePeriod ? 'ring-2 ring-amber-400 shadow-lg' : ''
                      }`}
                    >
                      <div className={`p-3.5 sm:p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ${
                        isCurrentActivePeriod
                          ? 'bg-gradient-to-r from-amber-950 via-orange-950 to-slate-900 border-amber-400 text-amber-100 ring-2 ring-amber-400/50'
                          : 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0">
                            <Sun className="w-5 h-5 text-amber-300" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                                🍱 중식 및 점심시간 ({period.subjects[0]?.duration || 50}분)
                              </span>
                              <button
                                type="button"
                                onClick={() => setScreenMode('exam_view')}
                                className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full hover:bg-amber-500 cursor-pointer shadow-xs"
                              >
                                시험 화면으로
                              </button>
                              {isCurrentActivePeriod && (
                                <span className="text-xs font-black text-yellow-300 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                  현재 점심시간 진행 중
                                </span>
                              )}
                            </div>
                            <div className="text-sm sm:text-base font-black text-white mt-0.5">
                              {period.subjects[0]?.name || '중식 및 휴식 (3교시 전원 입실)'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                          <div className="text-xs sm:text-sm font-mono font-black text-amber-200 bg-amber-900/60 border border-amber-500/40 px-3 py-1.5 rounded-xl">
                            {period.subjects[0]?.time}
                          </div>
                          <div className="text-xs font-black text-rose-200 bg-rose-950/90 border border-rose-500/60 px-3 py-1.5 rounded-xl flex items-center gap-1">
                            <span>🚨 3교시 준비령/입실:</span>
                            <strong className="font-mono text-white text-sm">13:00 정각</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={period.id || period.period}
                    ref={(el) => {
                      periodItemRefs.current[pIdx] = el;
                    }}
                    className={`space-y-1.5 rounded-2xl transition-colors duration-300 ${
                      isCurrentActivePeriod ? 'ring-2 ring-yellow-400' : ''
                    }`}
                  >
                    {/* 3교시 영어 영역 특수 타종 금지 배너 */}
                    {isEnglish && (
                      <div className="bg-gradient-to-r from-rose-950 via-red-950 to-slate-950 border-2 border-rose-500/80 rounded-xl p-2.5 sm:px-4 sm:py-2 text-rose-200 text-xs sm:text-sm font-black flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg">🚫</span>
                          <span>13:10 정각 본령(타종) 절대 금지 | 영어 듣기평가 방송 송출 구간 (교내 절대 정숙)</span>
                        </div>
                        <span className="bg-red-500 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-black shrink-0">
                          무타종 방송 원칙
                        </span>
                      </div>
                    )}

                    {/* Red Period Badge with Live Status Indicator */}
                    <div
                      className={`text-white font-black text-base sm:text-lg py-1.5 px-4 sm:px-5 rounded-xl shadow-md border-2 tracking-wider flex items-center justify-between flex-wrap gap-2 transition-colors ${
                        isCurrentActivePeriod
                          ? 'bg-rose-600 border-yellow-300 ring-2 ring-yellow-400'
                          : 'bg-[#ef4444] border-red-300/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg">{period.period}</span>
                        {isCurrentActivePeriod && (
                          <span className="bg-yellow-400 text-slate-950 text-xs px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow-xs">
                            <Flame className="w-3.5 h-3.5 text-red-600" />
                            <span>실시간 진행 중</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-black text-red-100 opacity-95 text-right flex-wrap">
                        {displayedSubjects.length > 0 && displayedSubjects[0].prepTimeRange && (
                          <span className="bg-slate-950/70 text-yellow-300 px-2.5 py-0.5 rounded-lg border border-yellow-300/40 font-mono">
                            준비령 {displayedSubjects[0].prepTimeRange}
                          </span>
                        )}
                        {displayedSubjects.length > 0 && (
                          <span className="font-mono bg-red-900/50 px-2.5 py-0.5 rounded-lg">
                            본령 {displayedSubjects[0].time} ({displayedSubjects[0].duration}분)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subjects Grid Table - 가독성을 높이기 위해 폰트 굵기(font-black) 및 고대비 적용 */}
                    <div className={`rounded-2xl overflow-hidden border-2 shadow-md divide-y-2 divide-slate-200 transition-colors duration-300 ${
                      isCurrentActivePeriod ? 'border-yellow-400 ring-2 ring-yellow-400/90 bg-amber-50/95' : 'border-slate-300 bg-white'
                    }`}>
                      {displayedSubjects.map((sub, sIdx) => {
                        const matchInfo = matchSubjectForClass(sub, attendance.grade, attendance.classNum);
                        const isThisClassSubject = matchInfo.isMatch;
                        const isSelfStudy = sub.name.includes('자습');
                        const isCollectionStep = sub.name.includes('회수') || sub.name.includes('교체');

                        return (
                          <div
                            key={sub.id || `${sub.name}-${sIdx}`}
                            className={`grid grid-cols-12 items-center p-2.5 sm:p-3.5 text-slate-950 font-black text-base sm:text-lg transition-colors ${
                              isCollectionStep
                                ? 'bg-amber-50/90'
                                : !filterMyClassOnly && isThisClassSubject
                                ? 'bg-emerald-50/90 ring-2 ring-emerald-500'
                                : isSelfStudy
                                ? 'bg-slate-50'
                                : 'bg-white'
                            } ${isCurrentActivePeriod ? 'bg-amber-50/70' : ''}`}
                          >
                            {/* Subject Name - 입실처럼 정돈된 칸(박스)에 가운데 정렬 배치 */}
                            <div className="col-span-4 sm:col-span-3 pr-1.5 sm:pr-2">
                              <div
                                className={`py-1.5 px-3 rounded-xl border-2 shadow-xs flex items-center justify-center text-center gap-1.5 min-h-[52px] transition-all relative ${
                                  isCollectionStep
                                    ? 'bg-amber-100 border-amber-400 text-amber-950'
                                    : !filterMyClassOnly && isThisClassSubject
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/40'
                                    : isSelfStudy
                                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                                    : 'bg-slate-50 border-slate-300 text-slate-950'
                                }`}
                              >
                                <span className={`font-black text-slate-950 tracking-tight break-keep leading-tight text-center ${
                                  isCollectionStep ? 'text-xs sm:text-sm text-amber-950' : 'text-base sm:text-lg md:text-xl'
                                }`}>
                                  {sub.subjectCode && !sub.name.includes('(')
                                    ? `${sub.name}(${sub.subjectCode})`
                                    : sub.name}
                                </span>
                                {!filterMyClassOnly && isThisClassSubject && !isSuneungOrMockSchedule(daySchedule) && (
                                  <span className="bg-emerald-600 text-white text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md font-black shrink-0 shadow-2xs absolute right-2">
                                    우리 반
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Entry Time / 준비령 (입실) */}
                            <div className="col-span-2 text-center text-indigo-950 font-black text-sm sm:text-base md:text-xl bg-indigo-50 border-2 border-indigo-300 py-1.5 px-2 rounded-xl shadow-xs flex flex-col items-center justify-center leading-tight min-h-[52px]">
                              {sub.prepTimeRange ? (
                                <>
                                  <span className="text-[10px] sm:text-xs bg-indigo-600 text-white px-1.5 py-0.2 rounded font-black mb-0.5">
                                    준비령
                                  </span>
                                  <span className="font-mono tracking-tight text-indigo-800 text-xs sm:text-sm md:text-base font-black whitespace-nowrap">
                                    {sub.prepTimeRange.replace(/\s+/g, '')}
                                  </span>
                                </>
                              ) : sub.entryTime ? (
                                <>
                                  <span className="font-mono tracking-tight text-indigo-700 text-base sm:text-lg md:text-2xl font-black">{sub.entryTime.replace('입실', '').trim()}</span>
                                  <span className="text-[11px] sm:text-xs text-indigo-600 font-extrabold uppercase">
                                    {isCollectionStep ? '회수/배부' : isSuneungOrMockSchedule(daySchedule) ? '본령/입실' : '입실'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-400">입실-</span>
                              )}
                            </div>

                            {/* Exam Time & Duration (본령) */}
                            <div className="col-span-3 sm:col-span-3 text-center text-slate-950 font-black text-sm sm:text-base md:text-lg font-mono px-1 whitespace-nowrap flex flex-col items-center justify-center min-h-[52px]">
                              {isSuneungOrMockSchedule(daySchedule) && !isCollectionStep && (
                                <span className="text-[10px] sm:text-xs text-rose-600 font-sans font-black">
                                  본령 (문제풀이·답안작성)
                                </span>
                              )}
                              <div>
                                <span>{sub.time}</span>
                                {sub.duration ? (
                                  <span className="text-rose-700 font-black text-xs sm:text-sm ml-1">
                                    ({sub.duration}분)
                                  </span>
                                ) : (
                                  ''
                                )}
                              </div>
                            </div>

                            {/* Target Class / Room / 진행요령 & 감독교사 */}
                            <button
                              type="button"
                              onClick={() => {
                                const realIdx = period.subjects.findIndex(
                                  (orig) => orig.id === sub.id || (orig.name === sub.name && orig.time === sub.time)
                                );
                                const targetSubIdx = realIdx !== -1 ? realIdx : sIdx;
                                setTempTargetClassValue(sub.targetClass || '행정학급');
                                setTargetClassModal({
                                  isOpen: true,
                                  periodIdx: pIdx,
                                  subjectIdx: targetSubIdx,
                                  subName: sub.name,
                                  initialValue: sub.targetClass || '행정학급',
                                });
                              }}
                              className={`col-span-3 sm:col-span-4 text-center font-black py-1.5 px-2.5 rounded-xl border-2 text-xs sm:text-sm cursor-pointer transition flex flex-col items-center justify-center gap-0.5 shadow-2xs min-h-[52px] ${
                                isThisClassSubject
                                  ? 'text-emerald-950 bg-emerald-50/90 border-emerald-400 hover:bg-emerald-100'
                                  : 'text-indigo-950 bg-indigo-50 border-indigo-300 hover:bg-indigo-100'
                              }`}
                              title="클릭하여 진행요령/감독교사/대상 반 수정"
                            >
                              {sub.proceedGuide || sub.supervisorInfo ? (
                                <div className="w-full text-left space-y-0.5 leading-snug">
                                  {sub.proceedGuide && (
                                    <div className="text-[11px] sm:text-xs font-extrabold text-slate-800 break-keep">
                                      • {sub.proceedGuide}
                                    </div>
                                  )}
                                  {sub.supervisorInfo && (
                                    <div className="text-[11px] sm:text-xs font-black text-indigo-800 bg-indigo-100/90 px-2 py-0.5 rounded-md border border-indigo-300 inline-block break-keep">
                                      감독교사: {sub.supervisorInfo}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span>{sub.targetClass}</span>
                                  <Edit3 className="w-3 h-3 opacity-40 hover:opacity-100 shrink-0" />
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Elective / moving classroom notes for other rooms in this period */}
                    {filterMyClassOnly && electiveNotes.length > 0 && (
                      <div className="px-2 pt-0.5 text-xs text-slate-200 font-bold flex items-center gap-1.5 flex-wrap">
                        <span className="text-yellow-300 font-black text-[11px] shrink-0">※ 기타/이동수업:</span>
                        {electiveNotes.map((el, elIdx) => (
                          <span
                            key={elIdx}
                            className="bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-700 text-[11px] text-slate-200 font-bold"
                          >
                            {el.name} <strong className="text-yellow-300 font-black">({el.targetClass})</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Blackboard Bottom Accent (두번째 사진의 멘트 - 관리자 및 전자칠판에서 수정 가능) */}
        <div
          className={`relative z-10 ${isMockAll ? 'pt-1.5 mt-0.5' : 'pt-3 mt-1'} border-t-2 ${currentTheme.bottomNoticeWrapper} flex items-center justify-center`}
        >
          <div
            className={`w-full text-center ${isMockAll ? 'py-1.5 px-3' : 'py-2.5 px-4'} ${currentTheme.bottomNoticeBg} rounded-xl border-2 ${currentTheme.bottomNoticeBorder} shadow-lg flex items-center justify-between gap-3 group relative`}
          >
            {isEditingBottomNotice ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                <input
                  type="text"
                  value={tempBottomNotice}
                  onChange={(e) => setTempBottomNotice(e.target.value)}
                  placeholder="하단 안내 멘트 입력 (예: ※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※)"
                  className="flex-1 bg-slate-900 border-2 border-yellow-400 rounded-lg px-3 py-1.5 text-yellow-300 font-black text-center text-base sm:text-xl focus:outline-none w-full"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      if (onUpdateBottomNotice) {
                        onUpdateBottomNotice(tempBottomNotice);
                      }
                      setIsEditingBottomNotice(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-black shadow-xs transition"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setTempBottomNotice(
                        daySchedule.bottomNotice || '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※'
                      );
                      setIsEditingBottomNotice(false);
                    }}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0 overflow-hidden text-center">
                  <p
                    className={`${isMockAll ? 'text-sm sm:text-base md:text-lg lg:text-xl' : 'text-base sm:text-xl md:text-2xl lg:text-3xl'} font-black ${
                      currentExam.isEndingSoon
                        ? 'text-rose-300'
                        : currentExam.isStartingSoon
                        ? 'text-cyan-300'
                        : currentTheme.bottomNoticeText
                    } tracking-wider sm:tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] whitespace-nowrap truncate text-center`}
                  >
                    {currentExam.isEndingSoon
                      ? `※ [${currentExam.periodName} 시험 종료 ${alertMinutes}분 전] OMR 답안지 마킹 실수가 없는지 최종 확인하시기 바랍니다 ※`
                      : currentExam.isStartingSoon && !currentExam.subjectNames.includes('자습')
                      ? `※ [시험 시작 10분 전] 곧 ${currentExam.periodName} (${currentExam.subjectNames}) 시험이 시작됩니다 · 입실 및 착석을 완료해 주세요 ※`
                      : daySchedule.bottomNotice || '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※'}
                  </p>
                </div>

                {/* 멘트 수정 버튼 */}
                <button
                  onClick={() => setIsEditingBottomNotice(true)}
                  className="opacity-40 group-hover:opacity-100 transition text-yellow-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-black border border-yellow-400/40 flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                  title="2번째 사진 안내 멘트 수정"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>멘트 수정</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Preset notice quick picker when editing */}
        {isEditingBottomNotice && (
          <div className="relative z-20 mt-2 bg-slate-900/95 border border-slate-700 rounded-xl p-2.5 flex items-center gap-1.5 flex-wrap text-xs shadow-lg">
            <span className="text-slate-400 font-bold flex items-center gap-1 pl-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> 추천 문구:
            </span>
            {noticePresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setTempBottomNotice(preset)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-600 text-[11px] truncate max-w-[260px] transition cursor-pointer"
                title={preset}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render 2nd Screen: 시험 집중 대형 화면
  // 사용자 요청: "그리고 쉬는 시간에는 첫번째 화면 2번째 시간에는 응시현황과 그 과목명 / 입실 시간 / 시험시간 / 장소만 크게 보이면 어떨까?"
  const renderFocusedExamScreen = () => {
    const targetPeriod =
      daySchedule.schedule[focusedPeriodIdx] || daySchedule.schedule[0] || {
        period: '1교시',
        subjects: [],
      };
    const rawSubjects = targetPeriod.subjects || [];
    const targetSubjects = filterSameGradeSubjects(rawSubjects, attendance.grade);
    const classMatchedSubjects = getPeriodSubjectsForClass(
      rawSubjects,
      attendance.grade,
      attendance.classNum
    );
    const primarySubject =
      classMatchedSubjects[0] ||
      targetSubjects[0] || {
        id: 'sub-def',
        name: '시험 과목',
        subjectCode: '',
        time: '09:20~10:20',
        duration: 60,
        entryTime: '09:10',
        targetClass: `${attendance.grade}학년 ${attendance.classNum}반 교실`,
      };
    const otherElectives = targetSubjects.filter((s) => !classMatchedSubjects.includes(s));

    const isCurrentActivePeriod =
      currentExam.activePeriodIndex === focusedPeriodIdx && currentExam.statusType === 'ongoing';

    return (
      <div
        className={`relative rounded-3xl ${isMockAll ? 'p-2 sm:p-3 md:p-3.5' : 'p-3 sm:p-4 md:p-5'} ${currentTheme.frameBg} ${currentTheme.frameBorder} border-4 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.92),inset_0_1px_2px_rgba(255,255,255,0.18)] flex flex-col justify-between aspect-[16/9] w-[95%] mx-auto`}
      >
        {/* Metallic Frame Corner Accents */}
        <div
          className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 ${currentTheme.frameCorner} rounded-tl-2xl pointer-events-none`}
        />
        <div
          className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 ${currentTheme.frameCorner} rounded-tr-2xl pointer-events-none`}
        />
        <div
          className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 ${currentTheme.frameCorner} rounded-bl-2xl pointer-events-none`}
        />
        <div
          className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 ${currentTheme.frameCorner} rounded-br-2xl pointer-events-none`}
        />

        {/* Luxurious Dark Mode Chalkboard Canvas */}
        <div
          className={`${currentTheme.canvasBg} rounded-2xl ${isMockAll ? 'p-2.5 sm:p-3 md:p-3.5' : 'p-3.5 sm:p-4.5 md:p-5'} border-4 ${currentTheme.canvasBorder} shadow-[inset_0_4px_30px_rgba(0,0,0,0.92)] text-white relative flex flex-col justify-between select-none`}
        >
          {/* Direct Electronic Board Drawing Layer */}
          <ChalkCanvas
            isActive={isDrawingActive}
            onToggleActive={() => setIsDrawingActive(!isDrawingActive)}
          />

          {/* Multi-layered Realistic High-End Chalkboard Texture Overlay */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.08]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.72)_100%)] opacity-80" />
            <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.03)_0%,transparent_35%,rgba(255,255,255,0.015)_65%,transparent_100%)]" />
          </div>

          {/* Top Banner Header */}
          <div
            className={`relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 ${isMockAll ? 'pb-2' : 'pb-3'} border-b-2 ${currentTheme.headerBorder}`}
          >
            {/* School Emblem & Title */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                {schoolLogo ? (
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-yellow-400 p-1 flex items-center justify-center shadow-lg shrink-0 overflow-hidden transition-colors ${
                      emblemBgMode === 'transparent'
                        ? 'bg-slate-900/60 backdrop-blur-xs'
                        : 'bg-white/95'
                    }`}
                    title="학교 마크"
                  >
                    <img
                      src={schoolLogo}
                      alt="학교 마크"
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                ) : (
                  <div
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-700 border-2 border-yellow-400 flex items-center justify-center shadow-lg shrink-0"
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-yellow-300/80 flex items-center justify-center text-yellow-300 font-extrabold text-xs sm:text-sm tracking-tighter">
                      高
                    </div>
                  </div>
                )}

                <h2 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] flex items-center gap-2 flex-wrap">
                  {schoolName && !daySchedule.fullTitle?.includes(schoolName) && (
                    <span className="text-yellow-300 font-black">{schoolName}</span>
                  )}
                  <span>
                    {isMockSchedule(daySchedule)
                      ? '전국연합학력평가'
                      : isSuneungOrMockSchedule(daySchedule)
                      ? daySchedule.fullTitle
                      : (daySchedule.fullTitle || `2026학년도 2학기 1차 고사 시간표(${daySchedule.date})`).replace(/\s*\([^)]*\)/g, '').replace(/[()]$/g, '').trim()}
                  </span>
                </h2>
              </div>

              {!isMockSchedule(daySchedule) && (
                <span className="text-xs sm:text-sm md:text-base font-extrabold text-yellow-300 bg-yellow-400/20 px-3 py-1 rounded-xl border border-yellow-400/40 flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                  <Calendar className="w-4 h-4 text-yellow-300" />
                  <span>{currentFullDate}</span>
                </span>
              )}

              {/* 전자칠판 화면 밝기 조절 스크롤바 (아이들 눈부심 방지) */}
              {renderBrightnessController('board')}
            </div>

            {/* Right Top Notice Banner */}
            {cleanNoticeText(daySchedule.notice)?.trim() ? (
              <div
                className={`${currentTheme.topNoticeBg} border-2 ${currentTheme.topNoticeBorder} rounded-xl px-4 py-2 flex items-center gap-2 text-xs sm:text-sm md:text-base font-black text-yellow-300 shadow-md shrink-0 whitespace-normal break-words max-w-full`}
              >
                <span className="text-yellow-200 font-black break-words drop-shadow-xs">
                  {cleanNoticeText(daySchedule.notice)}
                </span>
                <span className="inline-block w-3.5 h-5 bg-white/90 rotate-12 rounded-xs ml-1 shadow-xs shrink-0" />
              </div>
            ) : null}
          </div>

          {/* Screen Mode & Period Switcher Bar */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 my-2.5 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-slate-700/80">
            {/* View Mode Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setScreenMode('auto')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
                  screenMode === 'auto'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md ring-2 ring-indigo-400/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                title="쉬는 시간엔 전체 시간표, 시험 시간엔 과목 대형 화면 자동 전환"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>자동 화면 전환</span>
                <span className="text-[10px] bg-indigo-950/80 text-indigo-200 px-1.5 py-0.5 rounded-md font-mono hidden sm:inline">
                  쉬는시간↔시험시간
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScreenMode('break_view')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
                  effectiveScreen === 'break_view' && screenMode !== 'auto'
                    ? 'bg-cyan-700 text-white shadow-md ring-2 ring-cyan-400/50'
                    : screenMode === 'auto' && effectiveScreen === 'break_view'
                    ? 'bg-cyan-950/90 text-cyan-200 border border-cyan-500/60'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                title="첫번째 화면: 전체 시간표 (쉬는 시간 모드)"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-300" />
                <span>1. 쉬는 시간 (전체 시간표)</span>
              </button>

              <button
                type="button"
                onClick={() => setScreenMode('exam_view')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
                  effectiveScreen === 'exam_view' && screenMode !== 'auto'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                    : screenMode === 'auto' && effectiveScreen === 'exam_view'
                    ? 'bg-amber-950/90 text-amber-200 border border-amber-500/60'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                title="2번째 화면: 응시현황과 과목명/입실시간/시험시간/장소 대형 화면"
              >
                <Target className="w-3.5 h-3.5 text-yellow-300" />
                <span>2. 시험 시간 (과목 대형 화면)</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md font-black">
                  현재 화면
                </span>
              </button>
            </div>

            {/* Period Picker Chips & Sound Toggle for 2nd screen */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-700">
              <span className="text-[11px] font-black text-slate-400 mr-1">표시 교시:</span>
              {daySchedule.schedule.map((p, idx) => {
                const isSelected = focusedPeriodIdx === idx;
                const isLiveNow = currentExam.activePeriodIndex === idx && currentExam.statusType === 'ongoing';
                return (
                  <button
                    key={p.id || p.period}
                    type="button"
                    onClick={() => setFocusedPeriodIdx(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-yellow-400 text-slate-950 shadow-md font-black ring-2 ring-yellow-300/60'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{p.period}</span>
                    {isLiveNow && (
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                    )}
                  </button>
                );
              })}
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => {
                  const newSound = !isSoundEnabled;
                  if (onChangeAlertSettings && alertSettings) {
                    onChangeAlertSettings({ ...alertSettings, soundEnabled: newSound });
                  }
                  if (newSound) {
                    audioAlert.playAlertSound(alertSettings?.soundType || 'chime', alertSettings?.volume || 0.7);
                  }
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  isSoundEnabled
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
                title={`시험 종료 알림음: ${isSoundEnabled ? '켜짐' : '꺼짐'}`}
              >
                {isSoundEnabled ? (
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3 h-3 text-slate-400" />
                )}
                <span>{isSoundEnabled ? '소리 ON' : '소리 OFF'}</span>
              </button>
            </div>
          </div>

          {/* Blackboard Body: Left Attendance Panel & Right Focused Exam Screen */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 my-3 items-stretch flex-1">
            {/* Left Panel: Class & Attendance Box */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-4.5 text-slate-900 shadow-xl border-4 border-slate-200 flex flex-col justify-between h-full relative">
              {/* Top Red Header: 학년 / 반 드롭다운 */}
              <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-lg sm:text-xl py-2.5 px-4 rounded-2xl text-center shadow-md flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <select
                      value={attendance.grade}
                      onChange={(e) => handleUpdateAttendance({ ...attendance, grade: e.target.value })}
                      className="bg-white text-slate-950 font-black pl-3.5 pr-7 py-1.5 rounded-xl shadow-xs appearance-none cursor-pointer text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 border-2 border-red-300"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-600 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <span className="font-black text-white text-lg sm:text-xl drop-shadow-xs">학년</span>
                </div>

                <div className="flex items-center gap-1.5 ml-1">
                  <div className="relative">
                    <select
                      value={attendance.classNum}
                      onChange={(e) => handleUpdateAttendance({ ...attendance, classNum: e.target.value })}
                      className="bg-white text-slate-950 font-black pl-3.5 pr-7 py-1.5 rounded-xl shadow-xs appearance-none cursor-pointer text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 border-2 border-red-300"
                    >
                      {Array.from({ length: maxClasses }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-600 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <span className="font-black text-white text-lg sm:text-xl drop-shadow-xs">반</span>
                </div>
              </div>

              {/* Attendance Rows Table - 초대형 가독성 폰트 */}
              <div className="flex-1 my-3.5 flex flex-col justify-around border-2 border-slate-300 rounded-2xl overflow-hidden bg-white shadow-md divide-y-2 divide-slate-300">
                {/* 총원 */}
                <div className="grid grid-cols-12 items-center bg-slate-50 flex-1 min-h-[64px]">
                  <div className="col-span-5 bg-slate-200/90 py-3.5 px-3 text-slate-950 text-center border-r-2 border-slate-300 font-black text-lg sm:text-xl md:text-2xl">
                    총원
                  </div>
                  <div
                    onClick={() => !isEditingAttendance && setIsEditingAttendance(true)}
                    className="col-span-7 py-2.5 px-4 text-slate-950 text-center font-black text-3xl sm:text-4xl md:text-5xl min-h-[56px] flex items-center justify-center cursor-pointer hover:bg-slate-100/70 transition font-mono tracking-wider"
                    title="클릭하여 숫자 입력 또는 전자칠판 판서 쓰기"
                  >
                    {isEditingAttendance ? (
                      <input
                        type="text"
                        placeholder="숫자 입력"
                        value={attendance.totalCount}
                        onChange={(e) =>
                          setAttendance({ ...attendance, totalCount: e.target.value.replace(/명$/, '') })
                        }
                        className="w-full text-center border-2 border-indigo-500 rounded-lg px-1 py-1 font-black text-3xl font-mono text-slate-950"
                      />
                    ) : (
                      <span className="font-black text-slate-950 text-3xl sm:text-4xl md:text-5xl font-mono tracking-wider">
                        {formatCountDisplay(attendance.totalCount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 응시 */}
                <div className="grid grid-cols-12 items-center flex-1 min-h-[64px]">
                  <div className="col-span-5 bg-slate-200/90 py-3.5 px-3 text-slate-950 text-center border-r-2 border-slate-300 font-black text-lg sm:text-xl md:text-2xl">
                    응시
                  </div>
                  <div
                    onClick={() => !isEditingAttendance && setIsEditingAttendance(true)}
                    className="col-span-7 py-2.5 px-4 text-emerald-700 text-center font-black text-3xl sm:text-4xl md:text-5xl min-h-[56px] flex items-center justify-center cursor-pointer hover:bg-slate-100/70 transition font-mono tracking-wider"
                    title="클릭하여 숫자 입력 또는 전자칠판 판서 쓰기"
                  >
                    {isEditingAttendance ? (
                      <input
                        type="text"
                        placeholder="숫자 입력"
                        value={attendance.presentCount}
                        onChange={(e) =>
                          setAttendance({ ...attendance, presentCount: e.target.value.replace(/명$/, '') })
                        }
                        className="w-full text-center border-2 border-indigo-500 rounded-lg px-1 py-1 font-black text-3xl font-mono text-emerald-700"
                      />
                    ) : (
                      <span className="font-black text-emerald-700 text-3xl sm:text-4xl md:text-5xl font-mono tracking-wider">
                        {formatCountDisplay(attendance.presentCount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 결번 */}
                <div className="grid grid-cols-12 items-center bg-slate-50 flex-1 min-h-[64px]">
                  <div className="col-span-5 bg-slate-200/90 py-3.5 px-3 text-slate-950 text-center border-r-2 border-slate-300 font-black text-lg sm:text-xl md:text-2xl">
                    결번
                  </div>
                  <div
                    onClick={() => !isEditingAttendance && setIsEditingAttendance(true)}
                    className="col-span-7 py-2.5 px-4 text-rose-600 text-center font-black text-3xl sm:text-4xl md:text-5xl min-h-[56px] flex items-center justify-center cursor-pointer hover:bg-slate-100/70 transition font-mono tracking-wider"
                    title="클릭하여 숫자/내용 입력 또는 전자칠판 판서 쓰기"
                  >
                    {isEditingAttendance ? (
                      <input
                        type="text"
                        placeholder="결시 번호 또는 없음"
                        value={attendance.absentNotes}
                        onChange={(e) => setAttendance({ ...attendance, absentNotes: e.target.value })}
                        className="w-full text-center border-2 border-indigo-500 rounded-lg px-1 py-1 font-black text-3xl font-mono text-rose-600"
                      />
                    ) : (
                      <span className="font-black text-rose-600 text-3xl sm:text-4xl md:text-5xl font-mono tracking-wider">
                        {formatAbsentDisplay(attendance.absentNotes)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 끝 번호 */}
                <div className="grid grid-cols-12 items-center flex-1 min-h-[64px]">
                  <div className="col-span-5 bg-slate-200/90 py-3.5 px-3 text-slate-950 text-center border-r-2 border-slate-300 font-black text-lg sm:text-xl md:text-2xl">
                    끝 번호
                  </div>
                  <div
                    onClick={() => !isEditingAttendance && setIsEditingAttendance(true)}
                    className="col-span-7 py-2.5 px-4 text-slate-950 text-center font-black text-3xl sm:text-4xl md:text-5xl min-h-[56px] flex items-center justify-center cursor-pointer hover:bg-slate-100/70 transition font-mono tracking-wider"
                    title="클릭하여 숫자 입력 또는 전자칠판 판서 쓰기"
                  >
                    {isEditingAttendance ? (
                      <input
                        type="text"
                        placeholder="숫자 입력"
                        value={attendance.lastNum}
                        onChange={(e) =>
                          setAttendance({ ...attendance, lastNum: e.target.value.replace(/번$/, '') })
                        }
                        className="w-full text-center border-2 border-indigo-500 rounded-lg px-1 py-1 font-black text-3xl font-mono text-slate-950"
                      />
                    ) : (
                      <span className="font-black text-slate-950 text-3xl sm:text-4xl md:text-5xl font-mono tracking-wider">
                        {formatLastNumDisplay(attendance.lastNum)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance Controls Bar */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingAttendance(!isEditingAttendance)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 transition cursor-pointer border border-slate-300 shadow-2xs"
                >
                  {isEditingAttendance ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>입력 완료</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>숫자 입력</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttendance({
                      ...attendance,
                      totalCount: '',
                      presentCount: '',
                      absentNotes: '',
                      lastNum: '',
                    });
                    setIsEditingAttendance(false);
                  }}
                  className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black transition cursor-pointer border border-rose-200 shadow-2xs flex items-center gap-1"
                  title="인원 전체를 비우고 전자칠판 판서로 직접 필기"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>비우기</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttendance({
                      ...attendance,
                      totalCount: '28',
                      presentCount: '27',
                      absentNotes: '14번',
                      lastNum: '28',
                    });
                    setIsEditingAttendance(false);
                  }}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition cursor-pointer border border-slate-200"
                >
                  샘플
                </button>
              </div>
            </div>

            {/* Right Panel: Focused Exam Card (과목명, 입실 시간, 시험시간, 장소만 크게 표시) */}
            <div
              className={`lg:col-span-8 ${currentTheme.schedulePanelBg} rounded-3xl border-3 ${currentTheme.schedulePanelBorder} p-4 sm:p-6 shadow-inner space-y-4 flex flex-col justify-between`}
            >
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                {/* Period Badge Header with Live Indicator */}
                <div className="flex items-center justify-between border-b-2 border-slate-700/80 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="bg-rose-600 text-white font-black text-xl sm:text-2xl px-5 py-1.5 rounded-2xl shadow-md border-2 border-yellow-300 tracking-wider">
                      {targetPeriod.period}
                    </span>
                    <span className="text-yellow-300 font-black text-base sm:text-lg">
                      {attendance.grade}학년 {attendance.classNum}반 시험 고사 진행
                    </span>
                  </div>

                  {isCurrentActivePeriod ? (
                    <span className="bg-yellow-400 text-slate-950 font-black px-3.5 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1.5 shadow-md animate-pulse">
                      <Flame className="w-4 h-4 text-red-600" />
                      <span>실시간 시험 진행 중</span>
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-300 font-bold px-3 py-1 rounded-full text-xs border border-slate-700">
                      집중 시험 안내 모드
                    </span>
                  )}
                </div>

                {/* 실시간 시험 진행 상태 표시 (사용자 요청: Progress Bar 및 상태박스 모두 제거) */}

                {/* 1. 과목명 (Extra Large High-Visibility Headline) */}
                <div className="bg-gradient-to-b from-slate-900 via-[#0c121d] to-slate-950 rounded-3xl p-4 sm:p-5 border-4 border-yellow-400 shadow-[0_10px_35px_rgba(0,0,0,0.95)] text-center relative overflow-hidden group">
                  <h3 className="text-[clamp(1.5rem,3.6vw,3.5rem)] font-black text-yellow-300 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] leading-tight truncate">
                    {primarySubject.subjectCode && !primarySubject.name.includes('(')
                      ? `${primarySubject.name}(${primarySubject.subjectCode})`
                      : primarySubject.name}
                  </h3>
                </div>

                {/* 2. 입실 시간, 현재 시간, 시험 시간, 남은 시험 시간 (4 Core Blocks - 고정 높이 및 줄바꿈 완전 차단) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* 입실 시간 */}
                  <div className="bg-white rounded-2xl p-4 border-3 border-slate-300 shadow-xl flex items-center gap-3.5 h-[88px] sm:h-[96px] overflow-hidden">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <DoorOpen className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider">
                        입실 시간
                      </div>
                      <div className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 font-mono tabular-nums tracking-tight whitespace-nowrap truncate">
                        {primarySubject.entryTime ? primarySubject.entryTime.replace('입실', '').trim() : '09:20'}
                      </div>
                    </div>
                  </div>

                  {/* 현재 시간 */}
                  <div className="bg-white rounded-2xl p-4 border-3 border-slate-300 shadow-xl flex items-center justify-between gap-3.5 h-[88px] sm:h-[96px] overflow-hidden">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider">
                          현재 시간
                        </div>
                        <div className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 whitespace-nowrap truncate tracking-tight font-mono tabular-nums">
                          {currentTime}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 시험 시간 */}
                  <div className="bg-white rounded-2xl p-4 border-3 border-slate-300 shadow-xl flex items-center gap-3.5 h-[88px] sm:h-[96px] overflow-hidden">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                      <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider">
                        시험 시간
                      </div>
                      <div className="flex items-baseline gap-2 whitespace-nowrap overflow-hidden">
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 font-mono tabular-nums tracking-tight">
                          {primarySubject.time.replace(/\s+/g, '')}
                        </span>
                        <span className="text-sm sm:text-base md:text-lg font-black text-amber-700 shrink-0">
                          (총 {primarySubject.duration || 60}분)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 남은 시험 시간 */}
                  <div className="bg-slate-950 rounded-2xl p-4 border-3 border-slate-700 shadow-xl flex items-center gap-3.5 h-[88px] sm:h-[96px] overflow-hidden">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Timer className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-wider">
                        남은 시험 시간
                      </div>
                      <div className="flex items-baseline gap-2 whitespace-nowrap overflow-hidden">
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-cyan-300 font-mono tabular-nums tracking-tight drop-shadow-xs">
                          {currentExam.remainingFormatted}
                        </span>
                        <span className="text-xs sm:text-sm md:text-base font-black text-emerald-400 font-mono tabular-nums shrink-0">
                          (진행률 {currentExam.percent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 고정 높이 상태 안내 바 (종료 10분 전 / 시작 10분 전 / 일반 진행 시 레이아웃 높이 변화 0px 유지) */}
                {currentExam.isEndingSoon ? (
                  <div className="bg-rose-600 border-2 border-yellow-300 rounded-2xl px-4 h-[48px] sm:h-[52px] text-center text-white font-black text-sm sm:text-lg shadow-lg flex items-center justify-center gap-2.5 overflow-hidden">
                    <AlertTriangle className="w-5 h-5 text-yellow-300 shrink-0" />
                    <span className="truncate">
                      ※ 시험 종료 {alertMinutes}분 전! OMR 답안지 마킹 실수가 없는지 최종 확인하세요 ※
                    </span>
                  </div>
                ) : currentExam.isStartingSoon && !currentExam.subjectNames.includes('자습') ? (
                  <div className="bg-cyan-700 border-2 border-yellow-300 rounded-2xl px-4 h-[48px] sm:h-[52px] text-center text-white font-black text-sm sm:text-lg shadow-lg flex items-center justify-center gap-2.5 overflow-hidden">
                    <Bell className="w-5 h-5 text-yellow-300 shrink-0" />
                    <span className="truncate">
                      [시험 시작 10분 전] 곧 {currentExam.periodName} ({currentExam.subjectNames}) 시험이 시작됩니다 · 입실 및 착석 완료
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-900/90 border-2 border-slate-700/80 rounded-2xl px-4 h-[48px] sm:h-[52px] text-center text-slate-200 font-bold text-sm sm:text-base shadow-inner flex items-center justify-center gap-2 overflow-hidden">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {otherElectives.length > 0
                        ? `이동수업 안내: ${otherElectives.map((el) => `${el.name}(${el.targetClass})`).join(', ')}`
                        : `시험 종료 ${alertMinutes}분 전에 OMR 답안지 마킹 점검 안내 방송이 자동으로 송출됩니다.`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Blackboard Bottom Accent (안내 멘트) */}
          <div
            className={`relative z-10 pt-3 mt-1 border-t-2 ${currentTheme.bottomNoticeWrapper} flex items-center justify-center`}
          >
            <div
              className={`w-full text-center py-2.5 px-4 ${currentTheme.bottomNoticeBg} rounded-xl border-2 ${currentTheme.bottomNoticeBorder} shadow-lg flex items-center justify-between gap-3 group relative`}
            >
              <div className="flex-1 min-w-0 overflow-hidden text-center">
                <p
                  className={`text-base sm:text-xl md:text-2xl lg:text-3xl font-black ${currentTheme.bottomNoticeText} tracking-wider sm:tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] whitespace-nowrap truncate text-center`}
                >
                  {daySchedule.bottomNotice || '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingBottomNotice(true)}
                className="opacity-40 group-hover:opacity-100 transition text-yellow-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-black border border-yellow-400/40 flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                title="2번째 사진 안내 멘트 수정"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>멘트 수정</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderClockAndControls = (compact: boolean = false) => (
    <div
      className={`bg-slate-900 border-2 border-slate-800 rounded-2xl text-white shadow-xl space-y-2.5 ${
        compact ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'
      }`}
    >
      {/* Top Row: Live Clock and Screen Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />

          {/* Seconds Clock Display */}
          <div className="flex items-center gap-2.5 bg-slate-950 px-4 py-2 rounded-2xl border-2 border-emerald-500/80 text-emerald-300 font-mono tabular-nums text-lg sm:text-2xl md:text-3xl font-black tracking-widest shadow-[0_0_25px_rgba(16,185,129,0.35)]">
            <Clock className="w-6 h-6 text-emerald-400 animate-pulse shrink-0" />
            <span className="whitespace-nowrap drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
              현재 시간 : <span className="inline-block min-w-[8ch] text-center">{currentTime}</span>
            </span>
          </div>

          {/* Exam Mode Quick Switcher in Clock Bar */}
          {onChangeExamMode && (
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] font-bold mr-0.5 hidden sm:inline">모드:</span>
              <button
                type="button"
                onClick={() => onChangeExamMode('regular')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                  examMode === 'regular' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>정기고사</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeExamMode('mock')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                  examMode === 'mock' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className="w-3 h-3" />
                <span>모의고사</span>
              </button>
            </div>
          )}

          {/* Screen Mode Quick Switcher in Clock Bar */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px] font-bold mr-0.5 hidden sm:inline">화면:</span>
            <button
              type="button"
              onClick={() => setScreenMode('auto')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                screenMode === 'auto'
                  ? 'bg-indigo-600 text-white shadow-xs font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="쉬는 시간↔시험 시간 자동 전환"
            >
              <Sparkles className="w-3 h-3 text-yellow-300" />
              <span>자동</span>
            </button>
            <button
              type="button"
              onClick={() => setScreenMode('break_view')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                effectiveScreen === 'break_view' && screenMode !== 'auto'
                  ? 'bg-cyan-700 text-white shadow-xs font-black'
                  : screenMode === 'auto' && effectiveScreen === 'break_view'
                  ? 'bg-cyan-950 text-cyan-200 font-bold border border-cyan-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="1. 쉬는 시간 (전체 시간표)"
            >
              <Layers className="w-3 h-3" />
              <span>1.쉬는시간</span>
            </button>
            <button
              type="button"
              onClick={() => setScreenMode('exam_view')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                effectiveScreen === 'exam_view' && screenMode !== 'auto'
                  ? 'bg-amber-700 text-white shadow-xs font-black'
                  : screenMode === 'auto' && effectiveScreen === 'exam_view'
                  ? 'bg-amber-950 text-amber-200 font-bold border border-amber-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="2. 시험 진행 (응시현황 및 대형 화면)"
            >
              <Maximize2 className="w-3 h-3" />
              <span>2.시험진행</span>
            </button>
          </div>

          {/* Simulation / Test Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-amber-400 text-[11px] font-bold mr-0.5 hidden sm:inline">테스트:</span>
            <button
              type="button"
              onClick={() => {
                setSimMode('realtime');
                setScreenMode('auto');
              }}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                simMode === 'realtime' ? 'bg-emerald-600 text-white font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="실제 시스템 시간 모드 (자동 화면 전환)"
            >
              실시간
            </button>
            <button
              type="button"
              onClick={() => {
                setSimMode('break');
                setScreenMode('auto');
              }}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                simMode === 'break' ? 'bg-cyan-600 text-white font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="쉬는 시간 시뮬레이션 테스트 (전체 시간표 화면 자동 전환)"
            >
              쉬는시간
            </button>
            <button
              type="button"
              onClick={() => {
                setSimMode('p1');
                setScreenMode('auto');
              }}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                simMode === 'p1' ? 'bg-amber-600 text-white font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="1교시 진행 중 시뮬레이션 테스트 (시험 진행 화면 자동 전환)"
            >
              1교시중
            </button>
            <button
              type="button"
              onClick={() => {
                setSimMode('p2');
                setScreenMode('auto');
              }}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                simMode === 'p2' ? 'bg-amber-600 text-white font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="2교시 진행 중 시뮬레이션 테스트 (시험 진행 화면 자동 전환)"
            >
              2교시중
            </button>
            <button
              type="button"
              onClick={() => {
                setSimMode('warningAlert');
                setScreenMode('auto');
              }}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                simMode === 'warningAlert' ? 'bg-rose-600 text-white font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="시험 종료 임박 시뮬레이션 테스트"
            >
              종료임박
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
          {isFullscreen && (
            <div className="bg-slate-950/90 border border-emerald-500/50 px-3 py-1 rounded-xl text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                칠판 해상도: {windowSize.width}×{windowSize.height} ({getAspectRatioString(windowSize.width, windowSize.height)})
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const newSound = !isSoundEnabled;
              if (onChangeAlertSettings && alertSettings) {
                onChangeAlertSettings({ ...alertSettings, soundEnabled: newSound });
              }
              if (newSound) {
                audioAlert.playAlertSound(alertSettings?.soundType || 'chime', alertSettings?.volume || 0.7);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              isSoundEnabled
                ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
            }`}
            title={`시험 종료 알림음: ${isSoundEnabled ? '켜짐' : '꺼짐'}`}
          >
            {isSoundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>알림음 ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>알림음 OFF</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsDrawingActive(!isDrawingActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              isDrawingActive
                ? 'bg-amber-400 text-slate-950 shadow-md animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
            }`}
            title="전자칠판 판서 쓰기"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{isDrawingActive ? '판서 진행 중' : '실시간 판서 모드'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
            title="저장된 상황별 안내 멘트 템플릿을 선택하여 즉시 TTS 방송"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>🔊 템플릿 방송</span>
          </button>

          <button
            onClick={() => {
              const next: BoardTheme =
                boardTheme === 'obsidian'
                  ? 'emerald'
                  : boardTheme === 'emerald'
                  ? 'midnight'
                  : 'obsidian';
              handleUpdateBoardTheme(next);
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-300 px-3 py-1.5 rounded-xl text-xs font-black border border-slate-700 transition cursor-pointer"
            title="칠판 배경 텍스처 변경"
          >
            <Palette className="w-3.5 h-3.5 text-yellow-400" />
            <span>{currentTheme.label}</span>
          </button>

          {/* 전자칠판 화면 밝기 조절 스크롤바 (아이들 눈부심 방지) */}
          {renderBrightnessController('normal')}

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-black border border-slate-700 transition cursor-pointer"
            title="전체화면"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? '창 모드' : '전체화면'}</span>
          </button>

          {onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-black border border-indigo-500 transition cursor-pointer shadow-md"
              title="관리자 모드로 전환"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>관리자 모드</span>
            </button>
          )}

          {onSwitchToSelector && (
            <button
              onClick={onSwitchToSelector}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-black border border-slate-700 transition cursor-pointer"
              title="시작 모드 선택 화면으로 이동"
            >
              <span>🏠 모드 선택</span>
            </button>
          )}
        </div>
      </div>





      {/* Visual Exam Finish Progress Bar Card (현재 진행 중인 시험의 남은 시간 및 자동 업데이트) */}
      <div
        className={`rounded-2xl p-2.5 sm:p-3 border transition-all duration-300 shadow-inner flex flex-col gap-2 ${
          currentExam.isEndingSoon
            ? 'bg-rose-950/80 border-rose-600/90 shadow-rose-950/50'
            : 'bg-slate-950/85 border-slate-800'
        }`}
      >
        {/* Top Info Row: Status, Active Exam, Time Comparison, and Remaining Countdown */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          {/* Left: Active Exam & Period Status Badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {currentExam.statusType === 'ongoing' ? (
              <span
                className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md ${
                  currentExam.isEndingSoon
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {currentExam.isEndingSoon ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-300" />
                ) : (
                  <Flame className="w-3.5 h-3.5 text-yellow-300" />
                )}
                <span>{currentExam.periodName} 시험 진행 중</span>
              </span>
            ) : currentExam.statusType === 'preparing' ? (
              <span className="bg-amber-600 text-white px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md">
                <Bell className="w-3.5 h-3.5 animate-bounce" />
                <span>{currentExam.periodName} 입실 완료 / 대기</span>
              </span>
            ) : currentExam.statusType === 'break' ? (
              <span className="bg-cyan-700 text-white px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md">
                <Clock className="w-3.5 h-3.5" />
                <span>쉬는 시간</span>
              </span>
            ) : (
              <span className="bg-slate-700 text-slate-200 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentExam.statusType === 'after_all' ? '전체 시험 종료' : '시험 시작 전'}</span>
              </span>
            )}

            {/* Subject Name */}
            <span className="text-white font-black text-sm sm:text-base md:text-lg drop-shadow-xs">
              {currentExam.subjectNames}
            </span>

            {/* Time Comparison: 현재 시간 vs 시험 종료 시간 */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-xl border border-slate-700/80 text-xs font-bold text-slate-300 font-mono tabular-nums shadow-inner whitespace-nowrap">
              <span className="text-slate-400">현재</span>
              <span className="text-emerald-400 font-black inline-block min-w-[8ch] text-center">{currentTime}</span>
              <span className="text-slate-500">➔</span>
              <span className="text-slate-400">종료</span>
              <span className="text-amber-400 font-black">{currentExam.endTime}</span>
            </div>
          </div>

          {/* Right: Remaining Countdown Box and Progress Percentage */}
          <div className="flex items-center gap-2.5 self-end lg:self-auto shrink-0">
            {/* Visual Countdown Box */}
            <div
              className={`px-3.5 py-1 rounded-xl border flex items-center gap-2 shadow-inner whitespace-nowrap ${
                currentExam.isEndingSoon
                  ? 'bg-rose-900/90 border-rose-500 text-rose-100 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-cyan-300'
              }`}
            >
              <Timer className={`w-4 h-4 shrink-0 ${currentExam.isEndingSoon ? 'text-yellow-300' : 'text-cyan-400'}`} />
              <span className="text-xs font-bold text-slate-300">남은 시간:</span>
              <span
                className={`font-mono tabular-nums font-black text-sm sm:text-base tracking-wider inline-block min-w-[8.5ch] text-right ${
                  currentExam.isEndingSoon ? 'text-yellow-300' : 'text-cyan-300'
                }`}
              >
                {currentExam.remainingFormatted}
              </span>
            </div>

            {/* Progress Percentage Badge */}
            <div className="bg-slate-900 px-3 py-1 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-inner whitespace-nowrap">
              <span className="text-slate-400">진행률:</span>
              <span className="text-emerald-400 font-mono tabular-nums font-black text-sm inline-block min-w-[5.2ch] text-right">
                {currentExam.percent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Warning Alert Notice (시험 종료 5분전/10분전 OMR 점검 강조 & 소리 상태 표시) */}
        {currentExam.isEndingSoon && (
          <div className="bg-rose-900/90 border border-rose-500 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 text-xs sm:text-sm font-black text-amber-200 shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-yellow-300 shrink-0" />
              <span>
                ※ 시험 종료 {alertMinutes}분 전입니다! OMR 답안지 마킹 및 성명·학번 표기를 최종 점검하세요 ※
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-rose-200 bg-rose-950/70 px-2 py-0.5 rounded-lg border border-rose-700/60 shrink-0 font-mono">
              {isSoundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{isSoundEnabled ? '소리 ON' : '무음'}</span>
            </div>
          </div>
        )}

        {/* Visual Animated Progress Bar */}
        <div className="w-full bg-slate-900 rounded-full h-3 sm:h-3.5 p-0.5 border border-slate-700/90 overflow-hidden relative shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-1000 relative shadow-md ${
              currentExam.isEndingSoon
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500'
                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, currentExam.percent))}%` }}
          >
            {/* Glowing tip pointer */}
            <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full shadow-[0_0_10px_#ffffff]" />
          </div>
        </div>

        {/* Progress Bar Milestones: 시작 시간 ~ 현재 상태 설명 ~ 종료 시간 */}
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 px-1">
          <span className="text-slate-300">시작 {currentExam.startTime}</span>
          <span className="text-slate-400 hidden sm:inline text-[11px] truncate max-w-[480px]">
            {currentExam.statusSubtitle}
          </span>
          <span className="text-amber-400 font-black">종료 {currentExam.endTime}</span>
        </div>
      </div>
    </div>
  );

  // If in FULLSCREEN mode (교실 배포용 전체화면):
  // 상단바를 완전히 제거하고 그 공간만큼 위로 올려서 전자칠판 전체가 화면 안에 딱 맞게 들어가도록 구성
  if (isFullscreen) {
    return (
      <div
        className={`fixed inset-0 z-50 ${currentTheme.fullscreenBg} w-screen h-screen flex flex-col items-center justify-start overflow-hidden select-none pt-1 pb-1 px-1 m-0 transition-colors duration-500`}
      >
        {/* Scaled Blackboard Container - 상단바 제거 공간만큼 위로 밀착 정렬 */}
        <div
          className="relative shrink-0 flex items-start justify-center mx-auto"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
        >
          <div
            ref={boardContainerRef}
            style={{
              width: `${dynamicBaseWidth}px`,
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
              filter: brightness < 100 ? `brightness(${brightness}%)` : undefined,
              transition: 'filter 0.2s ease',
            }}
            className="flex flex-col space-y-2 select-none -mt-[5px] mb-[2px]"
          >
            {effectiveScreen === 'break_view' ? renderChalkboardContent() : renderFocusedExamScreen()}
          </div>
        </div>

        {/* Target Class / Exam Room Edit Modal (window.prompt 완전 대체) */}
        {targetClassModal && targetClassModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-yellow-400 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-black text-yellow-300 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-500" />
                  <span>시험 장소 / 고사장 설정</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setTargetClassModal(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  [{targetClassModal.subName}] 고사실 / 대상 반 입력:
                </label>
                <input
                  type="text"
                  value={tempTargetClassValue}
                  onChange={(e) => setTempTargetClassValue(e.target.value)}
                  placeholder="예: 행정학급, 본교실, A206, 전체, 1~3반"
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-yellow-400 rounded-xl px-4 py-2.5 font-black text-base text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400">빠른 선택:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    '행정학급',
                    '본교실',
                    `${attendance.grade}학년 ${attendance.classNum}반 교실`,
                    '지정반',
                    'A206',
                    'A207',
                    '전체',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTempTargetClassValue(preset)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-700 transition cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTargetClassModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tempTargetClassValue.trim()) {
                      onUpdateTargetClass?.(
                        targetClassModal.periodIdx,
                        targetClassModal.subjectIdx,
                        tempTargetClassValue.trim()
                      );
                    }
                    setTargetClassModal(null);
                  }}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl text-xs font-black shadow-md transition cursor-pointer"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
        {renderCenterNotificationModal()}
      </div>
    );
  }

  // Normal Window Mode Layout
  return (
    <div ref={!isFullscreen ? boardContainerRef : undefined} className="max-w-[1380px] mx-auto w-full px-0 sm:px-0 space-y-2">
      {renderClockAndControls()}
      <div
        style={{
          filter: brightness < 100 ? `brightness(${brightness}%)` : undefined,
          transition: 'filter 0.2s ease, opacity 0.3s ease',
          transform: 'translateZ(0)',
        }}
        className="aspect-[16/9] w-full object-contain transition-opacity duration-300 ease-in-out"
      >
        {effectiveScreen === 'break_view' ? renderChalkboardContent() : renderFocusedExamScreen()}
      </div>
      {renderCenterNotificationModal()}

      {/* Target Class / Exam Room Edit Modal (window.prompt 완전 대체) */}
      {targetClassModal && targetClassModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-yellow-400 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-yellow-300 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                <span>시험 장소 / 고사장 설정</span>
              </h3>
              <button
                type="button"
                onClick={() => setTargetClassModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                [{targetClassModal.subName}] 고사실 / 대상 반 입력:
              </label>
              <input
                type="text"
                value={tempTargetClassValue}
                onChange={(e) => setTempTargetClassValue(e.target.value)}
                placeholder="예: 행정학급, 본교실, A206, 전체, 1~3반"
                className="w-full bg-slate-950 border-2 border-slate-700 focus:border-yellow-400 rounded-xl px-4 py-2.5 font-black text-base text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400">빠른 선택:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  '행정학급',
                  '본교실',
                  `${attendance.grade}학년 ${attendance.classNum}반 교실`,
                  '지정반',
                  'A206',
                  'A207',
                  '전체',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTempTargetClassValue(preset)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-700 transition cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTargetClassModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tempTargetClassValue.trim()) {
                    onUpdateTargetClass?.(
                      targetClassModal.periodIdx,
                      targetClassModal.subjectIdx,
                      tempTargetClassValue.trim()
                    );
                  }
                  setTargetClassModal(null);
                }}
                className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl text-xs font-black shadow-md transition cursor-pointer"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick TTS Broadcast Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl text-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    시험 안내 멘트 템플릿 빠른 방송
                  </h3>
                  <p className="text-xs text-slate-400">
                    원하는 상황별 템플릿을 클릭하면 곧바로 차임벨과 함께 교실에 TTS 음성 방송이 송출됩니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['전체', '시험시작', '시험종료', '주의사항', '일반안내'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTemplateCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                    templateCategoryFilter === cat
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Templates List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {(alertSettings?.announcementTemplates || DEFAULT_ANNOUNCEMENT_TEMPLATES)
                .filter((t) => templateCategoryFilter === '전체' || t.category === templateCategoryFilter)
                .map((template) => (
                  <div
                    key={template.id}
                    className="bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl transition flex flex-col justify-between space-y-3 shadow-md group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        template.category === '시험시작' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        template.category === '시험종료' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        template.category === '주의사항' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {template.category}
                      </span>
                      <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition">
                        {template.title}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-300 font-medium bg-slate-900 p-3 rounded-xl border border-slate-800 leading-relaxed line-clamp-3">
                      "{template.text}"
                    </p>

                    <button
                      type="button"
                      disabled={isBroadcastingTemplate}
                      onClick={() => {
                        handleBroadcastTemplate(template.text);
                        setIsTemplateModalOpen(false);
                      }}
                      className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{isBroadcastingTemplate ? '방송 송출 중...' : '클릭 즉시 TTS 방송 송출'}</span>
                    </button>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span>※ 관리자 모드에서 템플릿을 추가 및 수정할 수 있습니다.</span>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
