import React, { useState } from 'react';
import {
  defaultScheduleData,
  allComprehensiveScheduleData,
  regularScheduleData,
  mockScheduleData,
  mockDaySchedule,
  isSuneungOrMockSchedule,
  isMockSchedule,
  isSuneungSchedule,
  isRegularSchedule,
  FIXED_NOTICE,
  DEFAULT_BOTTOM_NOTICE,
  cleanScheduleData,
  cleanNoticeText,
  isUnwantedBulkyNotice
} from './data/scheduleData';
import { ScheduleData, DayExamSchedule, SubjectItem, ExamAlertSettings } from './types/schedule';
import { Header } from './components/Header';
import { NoticeBanner } from './components/NoticeBanner';
import { AlertSettingsCard } from './components/AlertSettingsCard';
import { SchoolLogoCard } from './components/SchoolLogoCard';
import { GeminiSettingsCard } from './components/GeminiSettingsCard';
import { DateTabs } from './components/DateTabs';
import { TimetableGrid } from './components/TimetableGrid';
import { CodeOutputViewer } from './components/CodeOutputViewer';
import { ImageUploaderModal } from './components/ImageUploaderModal';
import { EditScheduleModal } from './components/EditScheduleModal';
import { DaySettingsModal } from './components/DaySettingsModal';
import { ElectronicBoard, BoardTheme, THEME_CONFIGS } from './components/ElectronicBoard';
import { AppModeSelector } from './components/AppModeSelector';
import { InitialClassSetupModal } from './components/InitialClassSetupModal';
import { ScheduleUploadCard } from './components/ScheduleUploadCard';
import { SchoolSettingsCard } from './components/SchoolSettingsCard';
import { ShareSchoolModal } from './components/ShareSchoolModal';
import { Sparkles, Calendar, BookOpen, Monitor, Code, RefreshCw, CheckCircle2, Palette, Hash, Grid, Cloud, Trash2, Sliders, Eye, EyeOff, Layers, Filter, Plus, Home, GraduationCap, Award, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { cleanSlug, generateSchoolSlug } from './utils/slugUtils';
import { getTodayActiveTabId, findTodayScheduleDay, isTodayScheduleDay } from './utils/dateUtils';
import { parseRosterFile } from './utils/rosterParser';
import {
  saveSchoolScheduleToCloud,
  subscribeSchoolSchedule,
  fetchSchoolScheduleFromCloud,
  isFirestoreQuotaExceeded,
  FIRESTORE_UPGRADE_URL,
} from './services/firebase';

export default function App() {
  const safeParse = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return defaultValue;
      return JSON.parse(saved) as T;
    } catch (e) {
      console.error(`Error parsing localStorage key "${key}":`, e);
      try { localStorage.removeItem(key); } catch {}
      return defaultValue;
    }
  };

  const [schoolSlug, setSchoolSlug] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2 && (pathParts[pathParts.length - 1] === 'admin' || pathParts[pathParts.length - 1] === 'classroom')) {
          const slugFromPath = cleanSlug(decodeURIComponent(pathParts[pathParts.length - 2]), true);
          if (slugFromPath) return slugFromPath;
        }
        const params = new URLSearchParams(window.location.search);
        const qSchool = params.get('school');
        if (qSchool) return cleanSlug(qSchool, true) || 'korea-high';
        const hash = decodeURIComponent(window.location.hash.replace('#', ''));
        if (hash.startsWith('school:')) {
          const parts = hash.split(':');
          if (parts[1]) return parts[1];
        }
        const saved = localStorage.getItem('current_school_slug');
        if (saved) return saved;
      } catch {}
    }
    return 'korea-high';
  });

  const [schoolName, setSchoolName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`school_name_${schoolSlug}`);
        if (saved) return saved;
      } catch {}
    }
    return '한국고등학교';
  });

  const [schoolLogo, setSchoolLogo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('school_emblem_logo');
      } catch {
        return null;
      }
    }
    return null;
  });

  const handleUpdateSchoolLogo = (logo: string | null) => {
    setSchoolLogo(logo);
    if (typeof window !== 'undefined') {
      try {
        if (logo) {
          localStorage.setItem('school_emblem_logo', logo);
        } else {
          localStorage.removeItem('school_emblem_logo');
        }
      } catch {}
    }
  };

  const rawParsedSchedule = safeParse<ScheduleData>(`schedule_data_${schoolSlug}`, defaultScheduleData);
  const parsedSchedule = cleanScheduleData(rawParsedSchedule);
  const initialSchedule: ScheduleData = Array.isArray(parsedSchedule) && parsedSchedule.length > 0 ? parsedSchedule : defaultScheduleData;
  const [scheduleData, setScheduleData] = useState<ScheduleData>(initialSchedule);

  React.useEffect(() => {
    setScheduleData((prev) => {
      const cleaned = cleanScheduleData(prev);
      if (JSON.stringify(cleaned) !== JSON.stringify(prev)) {
        try {
          localStorage.setItem(`schedule_data_${schoolSlug}`, JSON.stringify(cleaned));
        } catch {}
        return cleaned;
      }
      return prev;
    });
  }, [schoolSlug]);

  const [examMode, setExamMode] = useState<'regular' | 'mock'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selected_exam_mode');
        if (saved === 'regular' || saved === 'mock') {
          return saved;
        }
      } catch {}
    }
    return 'mock';
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedMode = localStorage.getItem('selected_exam_mode');
        if (savedMode === 'regular') {
          const regDays = initialSchedule.filter((d) => isRegularSchedule(d));
          return getTodayActiveTabId(regDays.length > 0 ? regDays : regularScheduleData);
        }
      } catch {}
    }
    return 'day-mock-g12';
  });

  React.useEffect(() => {
    if (examMode === 'mock') {
      setActiveTab('day-mock-g12');
    } else if (examMode === 'regular') {
      const regDays = (Array.isArray(scheduleData) ? scheduleData : []).filter((d) => isRegularSchedule(d));
      const existsInReg = activeTab === 'ALL' || regDays.some((d) => d.id === activeTab || d.date === activeTab);
      if (!existsInReg) {
        const fallbackReg = regDays.length > 0 ? regDays : regularScheduleData;
        setActiveTab(getTodayActiveTabId(fallbackReg));
      }
    }
  }, [examMode, scheduleData]);

  const [selectedGrade, setSelectedGrade] = useState<string>('2학년');

  const handleSelectExamMode = (mode: 'regular' | 'mock') => {
    setExamMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('selected_exam_mode', mode);
      } catch {}
    }

    const cleaned = cleanScheduleData(scheduleData);
    if (JSON.stringify(cleaned) !== JSON.stringify(scheduleData)) {
      setScheduleData(cleaned);
    }

    if (mode === 'mock') {
      setActiveTab('day-mock-g12');
      setSelectedGrade('2학년');
    } else {
      const regDays = cleaned.filter((d) => isRegularSchedule(d));
      const targetList = regDays.length > 0 ? regDays : regularScheduleData;
      if (regDays.length === 0) {
        setScheduleData(allComprehensiveScheduleData);
      }
      setActiveTab(getTodayActiveTabId(targetList));
    }
  };

  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'board' | 'developer'>('developer');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const path = window.location.pathname.replace(/\/+$/, '');
        const params = new URLSearchParams(window.location.search);
        const hash = decodeURIComponent(window.location.hash.replace('#', ''));
        const savedRole = localStorage.getItem('current_app_role');
        const autoFs = localStorage.getItem('classroom_auto_fullscreen');
        if (
          path.endsWith('/classroom') ||
          params.get('mode') === 'classroom' ||
          params.get('fullscreen') === 'true' ||
          params.get('fullscreen') === '1' ||
          hash.includes(':classroom') ||
          hash === 'classroom' ||
          savedRole === 'classroom' ||
          autoFs === 'true'
        ) {
          return true;
        }
      } catch {}
    }
    return false;
  });
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline'>(() => {
    return isFirestoreQuotaExceeded() ? 'offline' : 'synced';
  });
  const [isSettingsExpanded, setIsSettingsExpanded] = useState<boolean>(true);

  const [alertSettings, setAlertSettings] = useState<ExamAlertSettings>(() => {
    return safeParse<ExamAlertSettings>('exam_alert_settings', {
      enabled: true,
      soundEnabled: true,
      alertMinutes: 10,
      soundType: 'chime',
      volume: 0.7,
      ttsEnabled: true,
      ttsMessage: '시험 종료 10분 전입니다. 학생들은 답안지 OMR 카드를 점검하고 마킹 실수가 없는지 확인해 주시기 바랍니다.',
      ttsVoiceSpeed: 1.0,
      startAlertEnabled: true,
      startTtsMessage: '곧 시험이 시작됩니다. 학생들은 입실을 완료하고 자리에 착석해 주시기 바랍니다.',
    });
  });

  const handleUpdateAlertSettings = (newSettings: ExamAlertSettings) => {
    setAlertSettings(newSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('exam_alert_settings', JSON.stringify(newSettings));
      } catch {}
    }
    if (appRole === 'admin' && schoolSlug) {
      const dataToSave = scheduleData || defaultScheduleData;
      saveSchoolScheduleToCloud(schoolSlug, dataToSave, schoolName, schoolLogo, newSettings, classTotals, maxClasses);
    }
  };

  const [appRole, setAppRole] = useState<'selector' | 'classroom' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const path = window.location.pathname.replace(/\/+$/, '');
        const params = new URLSearchParams(window.location.search);
        const hash = decodeURIComponent(window.location.hash.replace('#', ''));

        if (path.endsWith('/admin') || params.get('mode') === 'admin' || hash.includes(':admin') || hash === 'admin') {
          return 'admin';
        }

        // URL 파라미터(?exam=regular|mock, ?direct=1, ?fullscreen=1) 또는 localStorage에 이미 교실 설정이 완료된 경우 즉시 교실 전체화면 진입
        const examParam = params.get('exam') || params.get('examMode');
        const directParam = params.get('direct') === '1' || params.get('fullscreen') === '1' || params.get('mode') === 'classroom';
        const savedRole = localStorage.getItem('current_app_role');
        const activeSlug = (() => {
          const pathParts = path.split('/').filter(Boolean);
          if (pathParts.length >= 2 && pathParts[pathParts.length - 1] === 'classroom') {
            return cleanSlug(decodeURIComponent(pathParts[pathParts.length - 2]), true) || 'korea-high';
          }
          return params.get('school') || localStorage.getItem('current_school_slug') || 'korea-high';
        })();
        const hasSavedClassroomConfig = Boolean(localStorage.getItem(`class_attendance_settings_${activeSlug}`));

        if (
          examParam === 'regular' ||
          examParam === 'mock' ||
          directParam ||
          hash.includes(':classroom') ||
          hash === 'classroom' ||
          (path.endsWith('/classroom') && (savedRole === 'classroom' || hasSavedClassroomConfig))
        ) {
          return 'classroom';
        }

        if (path.endsWith('/classroom')) {
          return 'selector';
        }
      } catch {}
    }
    return 'selector';
  });

  const changeAppRole = (role: 'selector' | 'classroom' | 'admin', slug: string = schoolSlug) => {
    const cleanTargetSlug = cleanSlug(slug, true) || 'korea-high';
    setAppRole(role);
    setSchoolSlug(cleanTargetSlug);
    if (role === 'admin') {
      setViewMode('developer');
      setIsFullscreen(false);
    } else if (role === 'classroom') {
      setViewMode('board');
      setIsFullscreen(true);
    } else if (role === 'selector') {
      setIsFullscreen(false);
    }
    if (typeof window !== 'undefined') {
      const targetEndpoint = role === 'admin' ? 'admin' : 'classroom';
      const path = `/${cleanTargetSlug}/${targetEndpoint}`;
      if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
      }
      try {
        localStorage.setItem('current_app_role', role);
        localStorage.setItem('current_school_slug', cleanTargetSlug);
        localStorage.setItem('classroom_auto_fullscreen', role === 'classroom' ? 'true' : 'false');
      } catch {}
    }
  };

  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/\/+$/, '');
      const pathParts = path.split('/').filter(Boolean);
      if (pathParts.length >= 2 && (pathParts[pathParts.length - 1] === 'admin' || pathParts[pathParts.length - 1] === 'classroom')) {
        const slugFromPath = cleanSlug(decodeURIComponent(pathParts[pathParts.length - 2]), true);
        if (slugFromPath) setSchoolSlug(slugFromPath);
      }
      if (path.endsWith('/admin')) {
        setAppRole('admin');
        setViewMode('developer');
        setIsFullscreen(false);
      } else if (path.endsWith('/classroom')) {
        setAppRole('classroom');
        setViewMode('board');
        setIsFullscreen(true);
      } else {
        setAppRole('selector');
        setIsFullscreen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    if (!schoolSlug) return;
    fetchSchoolScheduleFromCloud(schoolSlug)
      .then(({ scheduleData: cloudData, schoolName: cloudName, logoUrl, alertSettings: cloudAlertSettings, classTotals: cloudClassTotals, maxClasses: cloudMaxClasses }) => {
        if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
          const cleanedCloudData = cleanScheduleData(cloudData);
          setScheduleData(cleanedCloudData);
          try { localStorage.setItem(`schedule_data_${schoolSlug}`, JSON.stringify(cleanedCloudData)); } catch {}
        }
        if (cloudName) {
          setSchoolName(cloudName);
          try { localStorage.setItem(`school_name_${schoolSlug}`, cloudName); } catch {}
        }
        if (logoUrl) {
          setSchoolLogo(logoUrl);
          try { localStorage.setItem('school_logo', logoUrl); } catch {}
        }
        if (cloudAlertSettings) {
          setAlertSettings(cloudAlertSettings);
          try { localStorage.setItem('exam_alert_settings', JSON.stringify(cloudAlertSettings)); } catch {}
        }
        if (cloudClassTotals) {
          setClassTotals(cloudClassTotals);
          try { localStorage.setItem(`class_totals_${schoolSlug}`, JSON.stringify(cloudClassTotals)); } catch {}
        }
        if (typeof cloudMaxClasses === 'number' && cloudMaxClasses > 0) {
          setMaxClasses(cloudMaxClasses);
          try { localStorage.setItem('max_classes', String(cloudMaxClasses)); } catch {}
        }
      })
      .catch((err) => { console.error('Failed to fetch initial data from cloud:', err); })
      .finally(() => { setCloudSyncStatus('synced'); });

    const unsubscribe = subscribeSchoolSchedule(
      schoolSlug,
      (newScheduleData, cloudName, cloudAlertSettings, cloudClassTotals, cloudMaxClasses) => {
        if (newScheduleData && Array.isArray(newScheduleData) && newScheduleData.length > 0) {
          const cleaned = cleanScheduleData(newScheduleData);
          setScheduleData(cleaned);
          try { localStorage.setItem(`schedule_data_${schoolSlug}`, JSON.stringify(cleaned)); } catch {}
        }
        if (cloudName) {
          setSchoolName(cloudName);
          try { localStorage.setItem(`school_name_${schoolSlug}`, cloudName); } catch {}
        }
        if (cloudAlertSettings) {
          setAlertSettings(cloudAlertSettings);
          try { localStorage.setItem('exam_alert_settings', JSON.stringify(cloudAlertSettings)); } catch {}
        }
        if (cloudClassTotals) {
          setClassTotals(cloudClassTotals);
          try { localStorage.setItem(`class_totals_${schoolSlug}`, JSON.stringify(cloudClassTotals)); } catch {}
        }
        if (typeof cloudMaxClasses === 'number' && cloudMaxClasses > 0) {
          setMaxClasses(cloudMaxClasses);
          try { localStorage.setItem('max_classes', String(cloudMaxClasses)); } catch {}
        }
        setCloudSyncStatus('synced');
      },
      (name, logo) => {
        if (name) {
          setSchoolName(name);
          try { localStorage.setItem(`school_name_${schoolSlug}`, name); } catch {}
        }
        if (logo) {
          setSchoolLogo(logo);
          try { localStorage.setItem('school_logo', logo); } catch {}
        }
      }
    );

    return () => unsubscribe();
  }, [schoolSlug]);

  const handleUpdateSchoolInfo = async (newName: string, newSlug: string) => {
    const cleanName = newName.trim() || '한국고등학교';
    let processedSlug = cleanSlug(newSlug, true);
    if (!processedSlug) {
      processedSlug = generateSchoolSlug(cleanName);
    }
    setSchoolName(cleanName);
    const prevSlug = schoolSlug;
    setSchoolSlug(processedSlug);

    const currentRole = appRole === 'classroom' ? 'classroom' : 'admin';
    setAppRole(currentRole);
    if (typeof window !== 'undefined') {
      const targetEndpoint = currentRole === 'admin' ? 'admin' : 'classroom';
      const newPath = `/${processedSlug}/${targetEndpoint}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, '', newPath);
      }
    }

    setTimeout(() => {
      setCloudSyncStatus('syncing');
      saveSchoolScheduleToCloud(processedSlug, scheduleData, cleanName, schoolLogo, alertSettings, classTotals, maxClasses)
        .then(() => setCloudSyncStatus('synced'))
        .catch(() => setCloudSyncStatus('offline'));

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('current_school_slug', processedSlug);
          localStorage.setItem(`school_name_${processedSlug}`, cleanName);
          localStorage.setItem(`class_totals_${processedSlug}`, JSON.stringify(classTotals));
          const currentScheduleStr = localStorage.getItem(`schedule_data_${prevSlug}`);
          if (currentScheduleStr) {
            localStorage.setItem(`schedule_data_${processedSlug}`, currentScheduleStr);
          } else {
            localStorage.setItem(`schedule_data_${processedSlug}`, JSON.stringify(scheduleData));
          }
        } catch (e) {
          console.error("Storage update error", e);
        }
      }
    }, 0);
  };

  React.useEffect(() => {
    if (!schoolSlug) return;
    try {
      localStorage.setItem(`schedule_data_${schoolSlug}`, JSON.stringify(scheduleData));
    } catch {}

    if (appRole === 'admin' && cloudSyncStatus !== 'offline' && !isFirestoreQuotaExceeded()) {
      const timer = setTimeout(() => {
        setCloudSyncStatus('syncing');
        saveSchoolScheduleToCloud(schoolSlug, scheduleData, schoolName, schoolLogo, alertSettings, classTotals, maxClasses)
          .then(() => setCloudSyncStatus('synced'))
          .catch(() => setCloudSyncStatus('offline'));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [scheduleData, schoolSlug, schoolName, schoolLogo, appRole, alertSettings]);

  // 교실 모드 URL 또는 관련 URL 파라미터/localStorage 감지 시 자동으로 전체화면 활성화 및 상단바 제거
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const examParam = params.get('exam') || params.get('examMode');
    if (examParam === 'regular' || examParam === 'mock') {
      handleSelectExamMode(examParam);
    }

    if (appRole === 'classroom') {
      setIsFullscreen(true);
      setViewMode('board');
      try {
        localStorage.setItem('classroom_auto_fullscreen', 'true');
      } catch {}
      if (typeof document !== 'undefined' && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
  }, [appRole]);

  const [isInitialClassSetupOpen, setIsInitialClassSetupOpen] = useState<boolean>(false);
  const [maxClasses, setMaxClasses] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('max_classes');
        if (saved) return parseInt(saved, 10) || 15;
      } catch {}
    }
    return 15;
  });

  const [classTotals, setClassTotals] = useState<Record<string, string>>(() => {
    return safeParse<Record<string, string>>(`class_totals_${schoolSlug}`, {});
  });
  const [totalSettingGradeTab, setTotalSettingGradeTab] = useState<'1' | '2' | '3'>('2');
  const [bulkTotalInput, setBulkTotalInput] = useState<string>('');
  const [saveSuccessToast, setSaveSuccessToast] = useState<boolean>(false);
  const [isParsingRoster, setIsParsingRoster] = useState<boolean>(false);
  const [lastRosterFile, setLastRosterFile] = useState<File | null>(null);
  const [rosterParseStatus, setRosterParseStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    method?: string;
  } | null>(null);
  const rosterFileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!schoolSlug) return;
    const savedTotals = safeParse<Record<string, string>>(`class_totals_${schoolSlug}`, {});
    setClassTotals(savedTotals);
  }, [schoolSlug]);

  const syncAttendanceWithTotals = (newTotals: Record<string, string>, targetSlug: string = schoolSlug) => {
    if (typeof window === 'undefined') return;
    try {
      const updateStorageKey = (key: string) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const g = (parsed.grade || '2').replace('학년', '').trim();
        const c = (parsed.classNum || '3').replace('반', '').trim();
        const preset = newTotals[`${g}-${c}`] || newTotals[`default-${g}`] || newTotals['default'];
        if (preset !== undefined) {
          localStorage.setItem(key, JSON.stringify({ ...parsed, totalCount: preset }));
        }
      };
      updateStorageKey('class_attendance_settings');
      if (targetSlug) {
        updateStorageKey(`class_attendance_settings_${targetSlug}`);
      }
    } catch {}
  };

  const handleUpdateMaxClasses = (newMax: number) => {
    setMaxClasses(newMax);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('max_classes', String(newMax)); } catch {}
    }
  };

  const handleUpdateClassTotals = (updatedTotals: Record<string, string>) => {
    setClassTotals(updatedTotals);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`class_totals_${schoolSlug}`, JSON.stringify(updatedTotals));
      } catch {}
    }
    syncAttendanceWithTotals(updatedTotals, schoolSlug);
  };

  const handleRosterFileUpload = async (file: File, forceAi = false) => {
    setIsParsingRoster(true);
    setRosterParseStatus(null);
    setLastRosterFile(file);
    try {
      const result = await parseRosterFile(file, {
        forceAi,
        defaultGrade: totalSettingGradeTab,
      });
      if (result.totalClassesCount === 0) {
        setRosterParseStatus({
          type: 'error',
          message: '파일에서 학년·반별 인원 정보를 찾지 못했습니다. 학년/반/번호 또는 총원이 포함된 명렬표인지 확인해 주세요.',
        });
        return;
      }

      const parsedGrades = new Set<string>();
      for (const k of Object.keys(result.classTotals)) {
        const g = k.split('-')[0];
        if (['1', '2', '3'].includes(g)) parsedGrades.add(g);
      }

      const cleanedPrevTotals: Record<string, string> = {};
      for (const [k, v] of Object.entries(classTotals)) {
        const g = k.split('-')[0];
        if (!parsedGrades.has(g) && !(k.startsWith('default-') && parsedGrades.has(k.replace('default-', '')))) {
          cleanedPrevTotals[k] = v;
        }
      }

      const mergedTotals = { ...cleanedPrevTotals, ...result.classTotals };
      let nextMaxClasses = maxClasses;
      if (result.maxClassFound >= 2 && result.maxClassFound <= 15) {
        nextMaxClasses = result.maxClassFound;
        handleUpdateMaxClasses(nextMaxClasses);
      }

      if (!parsedGrades.has(totalSettingGradeTab) && parsedGrades.size > 0) {
        const firstG = Array.from(parsedGrades).sort()[0] as '1' | '2' | '3';
        setTotalSettingGradeTab(firstG);
      }

      handleUpdateClassTotals(mergedTotals);
      if (appRole === 'admin' && schoolSlug) {
        saveSchoolScheduleToCloud(
          schoolSlug,
          scheduleData || defaultScheduleData,
          schoolName,
          schoolLogo,
          alertSettings,
          mergedTotals,
          nextMaxClasses
        );
      }

      const gradeSummaries: string[] = [];
      for (const g of ['1', '2', '3']) {
        const gKeys = Object.keys(result.classTotals).filter((k) => k.startsWith(`${g}-`));
        if (gKeys.length > 0) {
          const gSum = gKeys.reduce((acc, k) => acc + (parseInt(result.classTotals[k], 10) || 0), 0);
          gradeSummaries.push(`${g}학년 ${gKeys.length}개반(${gSum}명)`);
        }
      }
      const methodLabel = result.method === 'ai_vision' ? 'AI 정밀 분석' : '정밀 표 구조 분석';

      setRosterParseStatus({
        type: 'success',
        method: result.method,
        message: `'${file.name}' [${methodLabel}] 완료! ${gradeSummaries.join(', ')} — 총 ${result.totalClassesCount}개 학급(합계 ${result.totalStudentsCount}명) 저장됨`,
      });
    } catch (err: any) {
      setRosterParseStatus({
        type: 'error',
        message: err?.message || '명렬표 파일 분석 중 오류가 발생했습니다.',
      });
    } finally {
      setIsParsingRoster(false);
      if (rosterFileInputRef.current) {
        rosterFileInputRef.current.value = '';
      }
    }
  };

  const handleSaveClassAndTotalsSettings = () => {
    handleUpdateMaxClasses(maxClasses);
    handleUpdateClassTotals(classTotals);
    if (appRole === 'admin' && schoolSlug) {
      saveSchoolScheduleToCloud(schoolSlug, scheduleData || defaultScheduleData, schoolName, schoolLogo, alertSettings, classTotals, maxClasses);
    }
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 2500);
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      // 교실 모드일 때는 브라우저 네이티브 전체화면 여부와 무관하게 항상 전체화면 레이아웃(상단바 제거) 유지
      if (appRole === 'classroom') {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(Boolean(document.fullscreenElement));
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [appRole]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      setIsFullscreen(true);
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      if (appRole !== 'classroom') {
        setIsFullscreen(false);
      }
    }
  };

  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => {
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

  const handleUpdateBoardTheme = (theme: BoardTheme) => {
    setBoardTheme(theme);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('electronic_board_theme', theme); } catch {}
    }
  };

  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [editingContext, setEditingContext] = useState<{
    dayIdx: number;
    periodIdx: number;
    subIdx: number | null;
    subject: SubjectItem | null;
  } | null>(null);

  const modeFilteredSchedules: ScheduleData = React.useMemo(() => {
    const all = Array.isArray(scheduleData) && scheduleData.length > 0 ? scheduleData : allComprehensiveScheduleData;
    if (examMode === 'mock') {
      const found = all.filter((d) => isMockSchedule(d));
      return found.length > 0 ? found : [mockDaySchedule];
    }
    const foundReg = all.filter((d) => isRegularSchedule(d));
    return foundReg.length > 0 ? foundReg : regularScheduleData;
  }, [scheduleData, examMode]);

  const totalDays = modeFilteredSchedules.length;
  const totalSubjects = modeFilteredSchedules.reduce(
    (accDay, day) => accDay + (Array.isArray(day?.schedule) ? day.schedule : []).reduce((accPeriod, p) => accPeriod + (Array.isArray(p?.subjects) ? p.subjects.length : 0), 0), 0
  );

  const currentDaySchedule: DayExamSchedule =
    modeFilteredSchedules.find((d) => d.id === activeTab || d.date === activeTab) || modeFilteredSchedules[0] || (examMode === 'mock' ? mockDaySchedule : regularScheduleData[0]);

  const handleCopyCode = () => {
    const cleanData = scheduleData.map((day) => ({
      date: day.date, fullTitle: day.fullTitle, notice: day.notice, bottomNotice: day.bottomNotice || DEFAULT_BOTTOM_NOTICE,
      schedule: day.schedule.map((p) => ({
        period: p.period, subjects: p.subjects.map((s) => ({
          name: s.name, subjectCode: s.subjectCode, entryTime: s.entryTime, time: s.time, duration: s.duration, targetClass: s.targetClass,
        })),
      })),
    }));
    const codeStr = `// 고등학교 시험 시간표 scheduleData 배열\nexport const scheduleData = ${JSON.stringify(cleanData, null, 2)};`;
    navigator.clipboard.writeText(codeStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportJson = () => {
    const cleanData = scheduleData.map((day) => ({
      date: day.date, fullTitle: day.fullTitle, notice: day.notice, bottomNotice: day.bottomNotice || DEFAULT_BOTTOM_NOTICE,
      schedule: day.schedule.map((p) => ({
        period: p.period, subjects: p.subjects.map((s) => ({
          name: s.name, subjectCode: s.subjectCode, entryTime: s.entryTime, time: s.time, duration: s.duration, targetClass: s.targetClass,
        })),
      })),
    }));
    const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'highschool_exam_schedule.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => { window.print(); };

  const handleExtractSuccess = (extractedData: ScheduleData) => {
    const cleaned = cleanScheduleData(extractedData);
    setScheduleData(cleaned);
    if (cleaned.length > 0) setActiveTab(cleaned[0].id || cleaned[0].date);
  };

  const handleResetSample = () => {
    if (confirm('전체 표준 시험 시간표(모의고사 타종, 정기고사) 샘플 데이터로 복원하시겠습니까?')) {
      setScheduleData(allComprehensiveScheduleData);
      setActiveTab('day-mock-g12');
    }
  };

  const handleClearAllSchedule = () => {
    if (confirm('현재 등록된 시험 시간표 데이터를 모두 비우시겠습니까?\n\n- 빈 상태로 시작하여 새 시간표 파일을 업로드하거나 직접 추가할 수 있습니다.\n- 언제든 [샘플 복원] 버튼으로 예시 시간표를 다시 불러올 수 있습니다.')) {
      setScheduleData([]);
      setActiveTab('');
    }
  };

  const handleEditDay = (dayIdx: number, newDate: string, newTitle: string) => {
    setScheduleData((prev) => {
      const updated = [...prev];
      updated[dayIdx] = { ...updated[dayIdx], date: newDate, fullTitle: newTitle };
      return updated;
    });
  };

  const handleUpdateBottomNotice = (newNotice: string) => {
    setScheduleData((prev) =>
      prev.map((d) => d.id === currentDaySchedule.id || d.date === currentDaySchedule.date ? { ...d, bottomNotice: newNotice } : d)
    );
  };

  const handleUpdateAllBottomNotices = (newNotice: string) => {
    setScheduleData((prev) => prev.map((d) => ({ ...d, bottomNotice: newNotice })));
  };

  const handleUpdateTopNotice = (newNotice: string) => {
    const cleaned = cleanNoticeText(newNotice);
    setScheduleData((prev) =>
      prev.map((d) => d.id === currentDaySchedule.id || d.date === currentDaySchedule.date ? { ...d, notice: cleaned } : d)
    );
  };

  const handleUpdateAllTopNotices = (newNotice: string) => {
    const cleaned = cleanNoticeText(newNotice);
    setScheduleData((prev) => prev.map((d) => ({ ...d, notice: cleaned })));
  };

  const handleAddDay = () => setIsAddDayModalOpen(true);

  const handleSaveNewDay = (newDateStr: string, newTitleStr: string, newBottomNotice?: string, newTopNotice?: string) => {
    const newDay: DayExamSchedule = {
      id: `day-${Date.now()}`, date: newDateStr, fullTitle: newTitleStr || `2026학년도 2학기 1차 고사 시간표(${newDateStr})`, notice: newTopNotice || FIXED_NOTICE, bottomNotice: newBottomNotice || DEFAULT_BOTTOM_NOTICE,
      schedule: [{ id: `p-${Date.now()}-1`, period: '1교시', subjects: [{ id: `s-${Date.now()}-1`, name: '자습', time: '08:30 ~ 09:00', duration: 30, targetClass: '전체' }] }]
    };
    setScheduleData((prev) => [...prev, newDay]);
    setActiveTab(newDay.id!);
  };

  const handleDeleteDay = (dayIdx: number) => {
    if (confirm(`'${scheduleData[dayIdx].date}' 시간표 전체를 삭제하시겠습니까?`)) {
      setScheduleData((prev) => prev.filter((_, idx) => idx !== dayIdx));
      setActiveTab('ALL');
    }
  };

  const handleAddPeriod = (dayIdx: number) => {
    const periodNum = scheduleData[dayIdx].schedule.length + 1;
    const newPeriod = { id: `p-${Date.now()}`, period: `${periodNum}교시`, subjects: [{ id: `s-${Date.now()}`, name: '새 과목', entryTime: '09:10', time: '09:20~10:20', duration: 60, targetClass: '행정학급' }] };
    setScheduleData((prev) => {
      const updated = [...prev];
      updated[dayIdx] = { ...updated[dayIdx], schedule: [...updated[dayIdx].schedule, newPeriod] };
      return updated;
    });
  };

  const handleOpenEditSubject = (dayIdx: number, periodIdx: number, subIdx: number, subject: SubjectItem) => {
    setEditingContext({ dayIdx, periodIdx, subIdx, subject });
    setIsEditModalOpen(true);
  };

  const handleOpenAddSubject = (dayIdx: number, periodIdx: number) => {
    setEditingContext({ dayIdx, periodIdx, subIdx: null, subject: null });
    setIsEditModalOpen(true);
  };

  const handleDeleteSubject = (dayIdx: number, periodIdx: number, subIdx: number) => {
    setScheduleData((prev) => {
      const updated = [...prev];
      const period = updated[dayIdx].schedule[periodIdx];
      const newSubjects = period.subjects.filter((_, idx) => idx !== subIdx);
      const newSchedule = [...updated[dayIdx].schedule];
      newSchedule[periodIdx] = { ...period, subjects: newSubjects };
      updated[dayIdx] = { ...updated[dayIdx], schedule: newSchedule };
      return updated;
    });
  };

  const handleSaveSubject = (subject: SubjectItem) => {
    if (!editingContext) return;
    const { dayIdx, periodIdx, subIdx } = editingContext;
    setScheduleData((prev) => {
      const updated = [...prev];
      const period = updated[dayIdx].schedule[periodIdx];
      let newSubjects = [...period.subjects];
      if (subIdx !== null) { newSubjects[subIdx] = subject; } else { newSubjects.push(subject); }
      const newSchedule = [...updated[dayIdx].schedule];
      newSchedule[periodIdx] = { ...period, subjects: newSubjects };
      updated[dayIdx] = { ...updated[dayIdx], schedule: newSchedule };
      return updated;
    });
  };

  const handleQuickEditTargetClass = (dayIdx: number, periodIdx: number, subIdx: number, newTargetClass: string) => {
    setScheduleData((prev) => {
      const updated = [...prev];
      if (!updated[dayIdx] || !updated[dayIdx].schedule[periodIdx]) return prev;
      const period = updated[dayIdx].schedule[periodIdx];
      const subject = period.subjects[subIdx];
      if (!subject) return prev;
      const newSubjects = [...period.subjects];
      newSubjects[subIdx] = { ...subject, targetClass: newTargetClass };
      const newSchedule = [...updated[dayIdx].schedule];
      newSchedule[periodIdx] = { ...period, subjects: newSubjects };
      updated[dayIdx] = { ...updated[dayIdx], schedule: newSchedule };
      return updated;
    });
  };

  const displayedSchedules = activeTab === 'ALL' ? modeFilteredSchedules : modeFilteredSchedules.filter((d) => d.id === activeTab || d.date === activeTab);

  if (appRole === 'selector') {
    return (
      <>
        <AppModeSelector
          onSelectClassroomMode={(examType) => {
            handleSelectExamMode(examType);
            setIsInitialClassSetupOpen(true);
          }}
          onSelectAdminMode={() => {
            changeAppRole('admin');
            setViewMode('developer');
          }}
        />
        <InitialClassSetupModal
          isOpen={isInitialClassSetupOpen}
          onClose={() => setIsInitialClassSetupOpen(false)}
          maxClasses={maxClasses}
          initialSchoolName={schoolName}
          initialSchoolSlug={schoolSlug}
          onSave={(grade, classNum, sName, sSlug) => {
            setSchoolName(sName);
            setSchoolSlug(sSlug);
            setSelectedGrade(`${grade}학년`);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('current_school_slug', sSlug);
                localStorage.setItem(`school_name_${sSlug}`, sName);
                const savedTotals = safeParse<Record<string, string>>(`class_totals_${sSlug}`, classTotals);
                const presetTotal = savedTotals[`${grade}-${classNum}`] || savedTotals[`default-${grade}`] || savedTotals['default'] || '';
                const existing = localStorage.getItem(`class_attendance_settings_${sSlug}`);
                const parsed = existing ? JSON.parse(existing) : {};
                const nextAtt = { ...parsed, grade, classNum, totalCount: presetTotal || parsed.totalCount || '' };
                localStorage.setItem(`class_attendance_settings_${sSlug}`, JSON.stringify(nextAtt));
                localStorage.setItem('class_attendance_settings', JSON.stringify(nextAtt));
              } catch {}
            }
            changeAppRole('classroom', sSlug);
            setViewMode('board');
            setIsInitialClassSetupOpen(false);
          }}
        />
      </>
    );
  }

  if (appRole === 'classroom') {
    return (
      <div className="w-screen h-screen overflow-hidden bg-[#071a12] text-white font-sans p-0 m-0">
        <ElectronicBoard
          daySchedule={currentDaySchedule} allDays={modeFilteredSchedules} onSelectDay={(dayId) => setActiveTab(dayId)} examMode={examMode} onChangeExamMode={handleSelectExamMode} onOpenUploadModal={() => setIsUploadModalOpen(true)} isFullscreen={true} onToggleFullscreen={handleToggleFullscreen} onUpdateBottomNotice={handleUpdateBottomNotice} onUpdateTopNotice={handleUpdateTopNotice} alertSettings={alertSettings} onChangeAlertSettings={handleUpdateAlertSettings} selectedGrade={selectedGrade} onSelectGrade={setSelectedGrade} schoolLogo={schoolLogo} onUpdateSchoolLogo={handleUpdateSchoolLogo} schoolName={schoolName} boardTheme={boardTheme} onUpdateBoardTheme={handleUpdateBoardTheme} maxClasses={maxClasses} classTotals={classTotals} schoolSlug={schoolSlug}
          onSwitchToAdmin={() => { changeAppRole('admin'); setViewMode('developer'); }}
          onSwitchToSelector={() => { changeAppRole('selector'); }}
          onUpdateTargetClass={(periodIdx, subIdx, newTargetClass) => {
            const dayIdx = scheduleData.findIndex((d) => d.id === currentDaySchedule.id || d.date === currentDaySchedule.date);
            if (dayIdx !== -1) handleQuickEditTargetClass(dayIdx, periodIdx, subIdx, newTargetClass);
          }}
        />
        {isInitialClassSetupOpen && (
          <InitialClassSetupModal isOpen={isInitialClassSetupOpen} onClose={() => setIsInitialClassSetupOpen(false)} maxClasses={maxClasses} initialSchoolName={schoolName} initialSchoolSlug={schoolSlug} onSave={(grade, classNum, sName, sSlug) => {
            if (sName) setSchoolName(sName);
            if (sSlug) setSchoolSlug(sSlug);
            setSelectedGrade(`${grade}학년`);
            if (typeof window !== 'undefined') {
              try {
                const targetSlug = sSlug || schoolSlug;
                if (sSlug) localStorage.setItem('current_school_slug', sSlug);
                if (sName && sSlug) localStorage.setItem(`school_name_${sSlug}`, sName);
                const savedTotals = safeParse<Record<string, string>>(`class_totals_${targetSlug}`, classTotals);
                const presetTotal = savedTotals[`${grade}-${classNum}`] || savedTotals[`default-${grade}`] || savedTotals['default'] || '';
                const existing = localStorage.getItem(`class_attendance_settings_${targetSlug}`);
                const parsed = existing ? JSON.parse(existing) : {};
                const nextAtt = { ...parsed, grade, classNum, totalCount: presetTotal || parsed.totalCount || '' };
                localStorage.setItem(`class_attendance_settings_${targetSlug}`, JSON.stringify(nextAtt));
                localStorage.setItem('class_attendance_settings', JSON.stringify(nextAtt));
              } catch {}
            }
            changeAppRole('classroom', sSlug);
            setIsInitialClassSetupOpen(false);
          }} />
        )}
        <ImageUploaderModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onExtractSuccess={handleExtractSuccess} />
      </div>
    );
  }

  // ★★★ [해결된 부분] 3. Admin / Teacher Mode Dashboard 영역 ★★★
  // 미리보기(viewMode === 'board')일 때는 여백을 없애고 배경을 다크그린(#071a12)으로 강제 고정합니다.
  return (
    <div className={`min-h-screen font-sans selection:bg-indigo-500 selection:text-white print:bg-white print:p-0 flex flex-col ${
      viewMode === 'board'
        ? 'bg-[#071a12] text-white overflow-hidden' 
        : 'bg-slate-100 text-slate-800 pb-16'
    } ${isFullscreen ? 'pb-0' : ''}`}>
      
      {!isFullscreen && (
        <div className="print:hidden">
          <Header onOpenUpload={() => setIsUploadModalOpen(true)} onCopyCode={handleCopyCode} copied={copied} onExportJson={handleExportJson} onPrint={handlePrint} totalDays={totalDays} totalSubjects={totalSubjects} schoolName={schoolName} schoolSlug={schoolSlug} onSwitchToSelector={() => changeAppRole('selector')} onOpenSchoolSettings={() => { if (viewMode !== 'developer') setViewMode('developer'); setTimeout(() => { const el = document.getElementById('school-settings-section'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); }} onOpenShareModal={() => setIsShareModalOpen(true)} />
          {isFirestoreQuotaExceeded() && (
            <div className="bg-amber-950/90 border-b border-amber-500/60 px-4 py-2 text-amber-200 text-xs font-bold flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><span className="text-base">ℹ️</span><span>[안내] Firebase 무료 일일 쓰기 한도(Quota)가 소진되어 <strong>로컬 저장소(LocalStorage) 모드</strong>로 안전하게 자동 전환되었습니다. 시간표와 전자칠판 기능은 정상 작동합니다.</span></div>
              <a href={FIRESTORE_UPGRADE_URL} target="_blank" rel="noreferrer" className="text-amber-300 hover:text-white underline font-black shrink-0 px-2.5 py-1 rounded-lg bg-amber-900/80 border border-amber-400/50">Firebase 콘솔 확인 ➔</a>
            </div>
          )}
          
          <div className="bg-slate-900 border-b border-slate-800 text-white sticky top-[65px] z-20 shadow-md">
            <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-2">
              <div className="flex items-center justify-between gap-2 overflow-x-hidden whitespace-nowrap">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button onClick={() => changeAppRole('selector')} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/80 shrink-0" title="모드 선택 화면으로 돌아가기"><span>🏠</span><span className="hidden md:inline">모드 선택</span></button>
                  <button onClick={() => { changeAppRole('classroom'); setViewMode('board'); }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white transition cursor-pointer shadow-xs shrink-0" title="교실 배포용 전자칠판 전체 모드로 즉시 전환"><Monitor className="w-3.5 h-3.5" /><span className="hidden sm:inline">교실 모드</span></button>
                  <div className="h-4 w-px bg-slate-700 mx-0.5"></div>
                  <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
                    <button type="button" onClick={() => handleSelectExamMode('regular')} className={`px-2 py-0.5 rounded-md text-[11px] font-black transition cursor-pointer flex items-center gap-1 shrink-0 ${examMode === 'regular' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}><BookOpen className="w-3 h-3 text-emerald-300" /><span>정기고사</span></button>
                    <button type="button" onClick={() => handleSelectExamMode('mock')} className={`px-2 py-0.5 rounded-md text-[11px] font-black transition cursor-pointer flex items-center gap-1 shrink-0 ${examMode === 'mock' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}><Award className="w-3 h-3 text-purple-300" /><span>모의고사</span></button>
                  </div>
                  <div className="h-4 w-px bg-slate-700 mx-0.5"></div>
                  <div className="flex items-center gap-1 shrink-0">
                    {modeFilteredSchedules.length > 1 && (<button onClick={() => setActiveTab('ALL')} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer shrink-0 ${activeTab === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'}`}><Layers className="w-3 h-3" /><span>전체</span></button>)}
                    {modeFilteredSchedules.map((day) => {
                      const isSelected = activeTab === day.id || activeTab === day.date || modeFilteredSchedules.length === 1;
                      const isToday = isTodayScheduleDay(day);
                      return (
                        <button key={day.id || day.date} onClick={() => setActiveTab(day.id || day.date)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer shrink-0 ${isSelected ? 'bg-indigo-600 text-white shadow-xs' : isToday ? 'bg-amber-950/70 text-yellow-300 border border-yellow-500/50 hover:bg-amber-900/80' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'}`}><Calendar className={`w-3 h-3 ${isSelected ? 'text-indigo-200' : isToday ? 'text-yellow-400' : 'text-slate-400'}`} /><span>{isMockSchedule(day) ? '모의고사' : day.date}</span></button>
                      );
                    })}
                    <button onClick={handleAddDay} className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/80 hover:text-white transition cursor-pointer shrink-0"><Plus className="w-3.5 h-3.5 stroke-[2.5]" /></button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 text-xs font-black shrink-0">
                    <span className="text-[10px] text-slate-400 px-1.5 flex items-center gap-1 hidden lg:flex"><Filter className="w-3 h-3 text-indigo-400" />학년:</span>
                    {['1학년', '2학년', '3학년'].map((grade) => (
                      <button key={grade} onClick={() => setSelectedGrade(grade)} className={`px-2 py-0.5 rounded-md text-xs font-black transition cursor-pointer ${selectedGrade === grade ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}>{grade}</button>
                    ))}
                  </div>
                  <div className="h-4 w-px bg-slate-700 mx-0.5"></div>
                  <button type="button" onClick={() => setViewMode((prev) => (prev === 'board' ? 'developer' : 'board'))} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer shrink-0 shadow-xs ${viewMode === 'board' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 ring-2 ring-emerald-300/80 shadow-emerald-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'}`}>
                    {viewMode === 'board' ? (<><Eye className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" /><span>미리보기</span><span className="bg-slate-950 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">활성</span></>) : (<><EyeOff className="w-3.5 h-3.5 text-slate-400" /><span>미리보기</span><span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">비활성</span></>)}
                  </button>
                  <div className="h-4 w-px bg-slate-700 mx-0.5 hidden sm:block"></div>
                  <div className="flex items-center gap-1 hidden sm:flex shrink-0">
                    <button type="button" onClick={handleClearAllSchedule} className="text-xs text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-400/30 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold transition cursor-pointer"><Trash2 className="w-3 h-3 text-rose-400" /><span className="hidden xl:inline">시간표 비우기</span></button>
                    <button type="button" onClick={handleResetSample} className="text-xs text-slate-300 hover:text-white hover:bg-slate-700/60 border border-slate-600/50 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold transition cursor-pointer"><RefreshCw className="w-3 h-3 text-indigo-400" /><span className="hidden xl:inline">샘플 복원</span></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ★★★ [해결된 부분] Main Container ★★★ */}
      {/* 칠판 미리보기(viewMode === 'board')일 때 px, pt 등의 패딩(여백)을 모두 제거하여 흰 테두리를 차단합니다 */}
      <main className={
        viewMode === 'board' || isFullscreen
          ? "w-full p-0 m-0 flex-1 overflow-hidden flex flex-col" 
          : "w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-6 space-y-6 flex-1"
      }>
        
        {viewMode === 'board' ? (
          <div className="relative flex-1 flex flex-col">
            <ElectronicBoard
              daySchedule={currentDaySchedule} allDays={modeFilteredSchedules} onSelectDay={(dayId) => setActiveTab(dayId)} examMode={examMode} onChangeExamMode={handleSelectExamMode} onOpenUploadModal={() => setIsUploadModalOpen(true)} isFullscreen={isFullscreen} onToggleFullscreen={handleToggleFullscreen} onUpdateBottomNotice={handleUpdateBottomNotice} onUpdateTopNotice={handleUpdateTopNotice} alertSettings={alertSettings} onChangeAlertSettings={handleUpdateAlertSettings} selectedGrade={selectedGrade} onSelectGrade={setSelectedGrade} schoolLogo={schoolLogo} onUpdateSchoolLogo={handleUpdateSchoolLogo} schoolName={schoolName} boardTheme={boardTheme} onUpdateBoardTheme={handleUpdateBoardTheme} maxClasses={maxClasses} classTotals={classTotals} schoolSlug={schoolSlug}
              onSwitchToAdmin={() => { setViewMode('developer'); setIsFullscreen(false); }}
              onUpdateTargetClass={(periodIdx, subIdx, newTargetClass) => {
                const dayIdx = scheduleData.findIndex((d) => d.id === currentDaySchedule.id || d.date === currentDaySchedule.date);
                if (dayIdx !== -1) handleQuickEditTargetClass(dayIdx, periodIdx, subIdx, newTargetClass);
              }}
            />
          </div>
        ) : (
          <>
            <TimetableGrid
              daySchedules={displayedSchedules} selectedGrade={selectedGrade} setSelectedGrade={setSelectedGrade}
              onEditSubject={(dayIdx, periodIdx, subIdx, subject) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex((d) => d.id === targetDay.id || d.date === targetDay.date);
                handleOpenEditSubject(realIdx !== -1 ? realIdx : dayIdx, periodIdx, subIdx, subject);
              }}
              onDeleteSubject={(dayIdx, periodIdx, subIdx) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex((d) => d.id === targetDay.id || d.date === targetDay.date);
                handleDeleteSubject(realIdx !== -1 ? realIdx : dayIdx, periodIdx, subIdx);
              }}
              onAddSubject={(dayIdx, periodIdx) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex((d) => d.id === targetDay.id || d.date === targetDay.date);
                handleOpenAddSubject(realIdx !== -1 ? realIdx : dayIdx, periodIdx);
              }}
              onAddPeriod={(dayIdx) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex((d) => d.id === targetDay.id || d.date === targetDay.date);
                handleAddPeriod(realIdx !== -1 ? realIdx : dayIdx);
              }}
              onDeleteDay={(dayIdx) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex((d) => d.id === targetDay.id || d.date === targetDay.date);
                handleDeleteDay(realIdx !== -1 ? realIdx : dayIdx);
              }}
              onEditDay={(dayIdx, newDate, newTitle) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex((d) => d.id === targetDay.id || d.date === targetDay.date);
                handleEditDay(realIdx !== -1 ? realIdx : dayIdx, newDate, newTitle);
              }}
              onEditDayBottomNotice={(dayIdx, newBottomNotice) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex((d) => d.id === targetDay.id || d.date === targetDay.date);
                const actualIdx = realIdx !== -1 ? realIdx : dayIdx;
                setScheduleData((prev) => { const updated = [...prev]; updated[actualIdx] = { ...updated[actualIdx], bottomNotice: newBottomNotice }; return updated; });
              }}
              onEditDayTopNotice={(dayIdx, newTopNotice) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex((d) => d.id === targetDay.id || d.date === targetDay.date);
                const actualIdx = realIdx !== -1 ? realIdx : dayIdx;
                setScheduleData((prev) => { const updated = [...prev]; updated[actualIdx] = { ...updated[actualIdx], notice: newTopNotice }; return updated; });
              }}
              onQuickEditTargetClass={(dayIdx, periodIdx, subIdx, newTargetClass) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex((d) => d.id === targetDay.id || d.date === targetDay.date);
                handleQuickEditTargetClass(realIdx !== -1 ? realIdx : dayIdx, periodIdx, subIdx, newTargetClass);
              }}
              onAddDay={handleAddDay}
            />

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between print:hidden mt-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs"><Sliders className="w-5 h-5" /></div>
                <div><h3 className="text-sm font-black text-slate-900">학교 설정 및 AI 업로드·환경설정 툴박스</h3><p className="text-xs text-slate-500">학교명, 고유 링크, AI 자동 파싱, 학교 로고, 최대 반 개수, 테마 설정</p></div>
              </div>
              <button type="button" onClick={() => setIsSettingsExpanded(!isSettingsExpanded)} className="px-4 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm">
                <span>{isSettingsExpanded ? '설정 접기 🔼' : '설정 펼치기 🔽'}</span>
              </button>
            </div>

            {isSettingsExpanded && (
              <div className="space-y-6 pt-4 animate-fadeIn print:block">
                <SchoolSettingsCard schoolName={schoolName} schoolSlug={schoolSlug} onSaveSchoolInfo={handleUpdateSchoolInfo} cloudSyncStatus={cloudSyncStatus} onOpenShareModal={() => setIsShareModalOpen(true)} onOpenClassroomMode={() => { changeAppRole('classroom'); setViewMode('board'); }} />
                <ScheduleUploadCard onOpenUpload={() => setIsUploadModalOpen(true)} onSwitchToBoard={() => { changeAppRole('classroom'); setViewMode('board'); }} />
                <SchoolLogoCard schoolLogo={schoolLogo} onChangeLogo={handleUpdateSchoolLogo} fullTitle={currentDaySchedule?.fullTitle} />
                <GeminiSettingsCard />

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Grid className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <span>최대 학급 반 개수 및 학급당 총원 설정</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          전자칠판에서 선택 가능한 최대 반 번호와 각 학급의 총원을 미리 입력하면 전자칠판에 즉시 총원이 표시됩니다.
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                      현재 설정: <strong className="text-indigo-900">{maxClasses}반까지</strong>
                    </div>
                  </div>

                  {/* 1. 최대 반 개수 버튼 */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 block">1. 최대 학급 반 개수 선택</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Array.from({ length: 15 }, (_, i) => i + 1).map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => handleUpdateMaxClasses(cnt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                            maxClasses === cnt
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {cnt}반까지
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. 학급당 총원 미리 입력 및 명렬표 파일 자동 파싱 섹션 */}
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 flex-wrap">
                          <span>2. 학급당 총원(학생 수) 미리 입력 & 전교 학생 명렬표 자동 파싱</span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            전자칠판 총원 칸에 즉시 자동 표시
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          전교 학생 명렬표(엑셀 .xls/.xlsx, .csv, .pdf, 이미지)를 첨부하면 학년·반별 학생 수를 자동으로 계산하여 채워줍니다.
                        </p>
                      </div>

                      {/* 일괄 입력 도구 */}
                      <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className="text-xs font-black text-slate-700 px-1">일괄 입력:</span>
                        <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="예: 28"
                            value={bulkTotalInput}
                            onChange={(e) => setBulkTotalInput(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-14 text-xs font-black text-center text-slate-900 focus:outline-none font-mono"
                          />
                          <span className="text-xs font-bold text-slate-500">명</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!bulkTotalInput.trim()) return;
                            const val = bulkTotalInput.trim();
                            const next = { ...classTotals, [`default-${totalSettingGradeTab}`]: val };
                            for (let c = 1; c <= 15; c++) {
                              next[`${totalSettingGradeTab}-${c}`] = val;
                            }
                            handleUpdateClassTotals(next);
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black transition cursor-pointer"
                        >
                          {totalSettingGradeTab}학년 전체 적용
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!bulkTotalInput.trim()) return;
                            const val = bulkTotalInput.trim();
                            const next: Record<string, string> = { ...classTotals, default: val };
                            ['1', '2', '3'].forEach((g) => {
                              next[`default-${g}`] = val;
                              for (let c = 1; c <= 15; c++) {
                                next[`${g}-${c}`] = val;
                              }
                            });
                            handleUpdateClassTotals(next);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-black transition cursor-pointer"
                        >
                          전교생(1~3학년) 일괄 적용
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateClassTotals({});
                            setBulkTotalInput('');
                            setRosterParseStatus(null);
                          }}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          초기화
                        </button>
                      </div>
                    </div>

                    {/* 전교 학생 명렬표 파일 업로드 (Excel / PDF / CSV / 이미지) */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f && !isParsingRoster) handleRosterFileUpload(f);
                      }}
                      className="bg-gradient-to-r from-indigo-50/80 via-slate-50 to-emerald-50/70 border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-2xl p-4 transition flex flex-col sm:flex-row items-center justify-between gap-3"
                    >
                      <input
                        ref={rosterFileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv,.pdf,image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleRosterFileUpload(f);
                        }}
                        className="hidden"
                      />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-black text-slate-900">
                              전교 학생 명렬표 / 학급 인원 현황표 첨부 (.xls, .xlsx, .csv, .pdf)
                            </span>
                            <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                              자동 학급 총원 계산
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            나이스(NEIS) 학생 명렬표 엑셀 파일이나 학급 인원 현황 PDF를 이곳에 끌어다 놓거나 버튼을 눌러 첨부하세요.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isParsingRoster}
                        onClick={() => rosterFileInputRef.current?.click()}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-sm ${
                          isParsingRoster
                            ? 'bg-slate-300 text-slate-600 cursor-wait'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {isParsingRoster ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>명렬표 분석 중...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>명렬표 파일 첨부 (Excel / PDF)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {rosterParseStatus && (
                      <div
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-2 border ${
                          rosterParseStatus.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {rosterParseStatus.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span>{rosterParseStatus.message}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {lastRosterFile && !isParsingRoster && rosterParseStatus.method !== 'ai_vision' && (
                            <button
                              type="button"
                              onClick={() => handleRosterFileUpload(lastRosterFile, true)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>AI 정밀 재분석</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setRosterParseStatus(null)}
                            className="text-[11px] underline opacity-75 hover:opacity-100 cursor-pointer shrink-0"
                          >
                            닫기
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 학년 탭 선택 */}
                    <div className="flex items-center gap-1.5">
                      {(['1', '2', '3'] as const).map((g) => {
                        const isSel = totalSettingGradeTab === g;
                        const filledCount = Array.from({ length: maxClasses }, (_, i) => i + 1).filter(
                          (c) => Boolean(classTotals[`${g}-${c}`]?.trim())
                        ).length;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setTotalSettingGradeTab(g)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border flex items-center gap-1.5 ${
                              isSel
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span>{g}학년 반별 총원</span>
                            {filledCount > 0 && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                  isSel ? 'bg-emerald-400 text-slate-950' : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {filledCount}/{maxClasses}반 설정됨
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* 반별 총원 입력 그리드 (1반 ~ maxClasses반) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/90">
                      {Array.from({ length: maxClasses }, (_, i) => i + 1).map((c) => {
                        const key = `${totalSettingGradeTab}-${c}`;
                        const val = classTotals[key] ?? classTotals[`default-${totalSettingGradeTab}`] ?? classTotals['default'] ?? '';
                        return (
                          <div
                            key={key}
                            className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-2xs flex flex-col gap-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-700">
                                {totalSettingGradeTab}학년 {c}반
                              </span>
                              {val && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded">
                                  {val}명
                                </span>
                              )}
                            </div>
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus-within:bg-white focus-within:border-indigo-400">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="미입력"
                                value={val}
                                onChange={(e) => {
                                  const cleanedVal = e.target.value.replace(/[^0-9]/g, '');
                                  const next = { ...classTotals, [key]: cleanedVal };
                                  handleUpdateClassTotals(next);
                                }}
                                className="w-full text-sm font-black text-center text-indigo-950 bg-transparent focus:outline-none font-mono"
                              />
                              <span className="text-xs font-bold text-slate-400 shrink-0 ml-0.5">명</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
                    <span className="text-xs text-slate-500 font-bold">
                      설정하신 최대 반 개수({maxClasses}반까지) 및 학급당 총원이 전자칠판에 즉시 적용됩니다.
                    </span>
                    <div className="flex items-center gap-2">
                      {saveSuccessToast && (
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1 animate-fadeIn">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>최대 반 개수 및 학급별 총원이 저장되었습니다!</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveClassAndTotalsSettings}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>설정 저장하기</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl bg-slate-900 text-yellow-300 flex items-center justify-center shadow-xs"><Palette className="w-5 h-5" /></div><div><h3 className="text-base font-black text-slate-900 flex items-center gap-2"><span>전자칠판 다크 모드 텍스처 설정</span></h3><p className="text-xs text-slate-500 font-medium">고급스러운 다크 모드 칠판 질감이 적용됩니다.</p></div></div>
                    <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">현재 질감: <strong className="text-slate-900">{THEME_CONFIGS[boardTheme].name}</strong></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {(['obsidian', 'emerald', 'midnight'] as BoardTheme[]).map((tKey) => {
                      const cfg = THEME_CONFIGS[tKey];
                      const isSelected = boardTheme === tKey;
                      return (
                        <button key={tKey} type="button" onClick={() => handleUpdateBoardTheme(tKey)} className={`text-left p-3.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between space-y-2.5 ${isSelected ? 'border-yellow-400 bg-slate-950 text-white shadow-md ring-2 ring-yellow-400/30' : 'border-slate-200 hover:border-slate-400 bg-slate-50/80 text-slate-800'}`}>
                          <div className="flex items-center justify-between"><span className="text-xs font-black flex items-center gap-1.5">{tKey === 'obsidian' && '🌌'}{tKey === 'emerald' && '🌲'}{tKey === 'midnight' && '🌑'}<span className={isSelected ? 'text-yellow-300' : 'text-slate-900'}>{cfg.name}</span></span>{isSelected && (<span className="text-[10px] bg-yellow-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md">적용 중</span>)}</div>
                          <div className={`h-10 rounded-lg p-2 flex items-center justify-between border ${tKey === 'obsidian' ? 'bg-gradient-to-b from-[#111925] via-[#0c121c] to-[#070b12] border-slate-700' : tKey === 'emerald' ? 'bg-gradient-to-b from-[#0e251b] via-[#091a13] to-[#050f0b] border-emerald-800' : 'bg-gradient-to-b from-[#0e182c] via-[#091020] to-[#050a14] border-indigo-800'}`}><span className="text-[11px] font-black text-white">가독성 테스트</span><span className="text-[11px] font-black text-yellow-300 font-mono">08:50 ~ 09:40</span></div>
                          <p className={`text-[11px] leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{cfg.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AlertSettingsCard settings={alertSettings} onChangeSettings={handleUpdateAlertSettings} />
                <NoticeBanner notice={currentDaySchedule?.notice || FIXED_NOTICE} bottomNotice={currentDaySchedule?.bottomNotice || DEFAULT_BOTTOM_NOTICE} onEditTopNotice={handleUpdateAllTopNotices} onEditBottomNotice={handleUpdateAllBottomNotices} />
                <div className="print:hidden pt-4"><CodeOutputViewer scheduleData={scheduleData} onCopyCode={handleCopyCode} copied={copied} /></div>
              </div>
            )}
          </>
        )}
      </main>

      <ImageUploaderModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onExtractSuccess={handleExtractSuccess} />
      <EditScheduleModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveSubject} initialSubject={editingContext?.subject} periodName={editingContext !== null && scheduleData[editingContext.dayIdx] ? scheduleData[editingContext.dayIdx].schedule[editingContext.periodIdx]?.period || '' : ''} prevPeriodEndTime={(() => { if (!editingContext) return null; const { dayIdx, periodIdx } = editingContext; if (periodIdx <= 0) return null; const prevPeriod = scheduleData[dayIdx]?.schedule[periodIdx - 1]; if (!prevPeriod || !prevPeriod.subjects.length) return null; const lastSub = prevPeriod.subjects[prevPeriod.subjects.length - 1]; const matches = lastSub.time?.match(/(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/); return matches ? matches[2] : null; })()} selectedGrade={selectedGrade} />
      <DaySettingsModal isOpen={isAddDayModalOpen} onClose={() => setIsAddDayModalOpen(false)} mode="add" onSave={handleSaveNewDay} />
      <ShareSchoolModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} schoolName={schoolName} schoolSlug={schoolSlug} schoolLogo={schoolLogo} />
    </div>
  );
}