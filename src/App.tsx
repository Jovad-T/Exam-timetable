import React, { useState } from 'react';
import { defaultScheduleData, FIXED_NOTICE, DEFAULT_BOTTOM_NOTICE } from './data/scheduleData';
import { ScheduleData, DayExamSchedule, SubjectItem, ExamAlertSettings } from './types/schedule';
import { Header } from './components/Header';
import { NoticeBanner } from './components/NoticeBanner';
import { AlertSettingsCard } from './components/AlertSettingsCard';
import { SchoolLogoCard } from './components/SchoolLogoCard';
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
import { Sparkles, Calendar, BookOpen, Monitor, Code, RefreshCw, CheckCircle2, Palette, Hash, Grid, Cloud, Trash2, Sliders } from 'lucide-react';
import { cleanSlug, generateSchoolSlug } from './utils/slugUtils';
import { getTodayActiveTabId, findTodayScheduleDay, isTodayScheduleDay } from './utils/dateUtils';
import {
  saveSchoolScheduleToCloud,
  subscribeSchoolSchedule,
  fetchSchoolScheduleFromCloud,
} from './services/firebase';

export default function App() {
  // Helper for safe JSON parsing from localStorage
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

  // School Slug & Name state
  const [schoolSlug, setSchoolSlug] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
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

  // School logo emblem state (관리자 모드에서 첨부된 학교 마크)
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

  const initialSchedule: ScheduleData = safeParse<ScheduleData>(`schedule_data_${schoolSlug}`, defaultScheduleData);
  const [scheduleData, setScheduleData] = useState<ScheduleData>(initialSchedule);

  // Automatically initialize activeTab to today's date (prioritizes today: 10/14, 10/15, etc.)
  const [activeTab, setActiveTab] = useState<string>(() => {
    return getTodayActiveTabId(initialSchedule);
  });

  // Automatically set active tab to today's date on load and when scheduleData updates
  React.useEffect(() => {
    try {
      const todayTab = getTodayActiveTabId(scheduleData);
      setActiveTab(todayTab);
    } catch {}
  }, [scheduleData]);
  const [selectedGrade, setSelectedGrade] = useState<string>('2학년');
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'board' | 'developer'>('board'); // "board" = Electronic Chalkboard, "developer" = Code/Grid
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [isSettingsExpanded, setIsSettingsExpanded] = useState<boolean>(false);

  // Exam end warning alert & sound settings (소리 켜기/끄기, 5분전/10분전 셋팅, TTS 음성 방송)
  const [alertSettings, setAlertSettings] = useState<ExamAlertSettings>(() => {
    return safeParse<ExamAlertSettings>('exam_alert_settings', {
      enabled: true,
      soundEnabled: true,
      alertMinutes: 10,
      soundType: 'chime',
      volume: 0.7,
      ttsEnabled: true,
      ttsMessage:
        '시험 종료 10분 전입니다. 학생들은 답안지 OMR 카드를 점검하고 마킹 실수가 없는지 확인해 주시기 바랍니다.',
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
      } catch {
        // ignore
      }
    }
    // 관리자 모드인 경우 Firebase로 동기화
    if (appRole === 'admin' && schoolSlug) {
      const dataToSave = scheduleData || defaultScheduleData;
      saveSchoolScheduleToCloud(schoolSlug, dataToSave, schoolName, schoolLogo, newSettings);
    }
  };

  // App Deployment Mode Role ('selector' | 'classroom' | 'admin') strictly tied to URL hash & localStorage
  const [appRole, setAppRole] = useState<'selector' | 'classroom' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const hash = decodeURIComponent(window.location.hash.replace('#', ''));
        if (hash.startsWith('school:')) {
          const parts = hash.split(':');
          const r = parts[2] as any;
          if (r === 'classroom' || r === 'admin' || r === 'selector') return r;
        }
        if (hash === 'selector' || hash === 'classroom' || hash === 'admin') {
          return hash;
        }
        const savedRole = localStorage.getItem('current_app_role') as any;
        if (savedRole === 'classroom' || savedRole === 'admin') {
          return savedRole;
        }
      } catch {}
    }
    return 'selector';
  });

  const changeAppRole = (role: 'selector' | 'classroom' | 'admin', slug: string = schoolSlug) => {
    setAppRole(role);
    setSchoolSlug(slug);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('current_app_role', role);
      } catch {}
    }
  };

  // Hash sync removed completely to prevent app reloads/bouncing.

  // URL hash sync removed to prevent app reloads/bouncing.

  // Real-time synchronization across all classrooms in the school via Cloud Firestore
  React.useEffect(() => {
    if (!schoolSlug) return;

    // 1. Initial fetch from Firestore
    fetchSchoolScheduleFromCloud(schoolSlug)
      .then(({ scheduleData: cloudData, schoolName: cloudName, logoUrl, alertSettings: cloudAlertSettings }) => {
        if (cloudData) {
          setScheduleData(cloudData);
          try {
            localStorage.setItem(`schedule_data_${schoolSlug}`, JSON.stringify(cloudData));
          } catch {}
        }
        if (cloudName) {
          setSchoolName(cloudName);
          try {
            localStorage.setItem(`school_name_${schoolSlug}`, cloudName);
          } catch {}
        }
        if (logoUrl) {
          setSchoolLogo(logoUrl);
          try {
            localStorage.setItem('school_logo', logoUrl);
          } catch {}
        }
        if (cloudAlertSettings) {
          setAlertSettings(cloudAlertSettings);
          try {
            localStorage.setItem('exam_alert_settings', JSON.stringify(cloudAlertSettings));
          } catch {}
        }
      })
      .catch((err) => {
        console.error('Failed to fetch initial data from cloud:', err);
      })
      .finally(() => {
        setCloudSyncStatus('synced');
      });

    // 2. Real-time onSnapshot listener: updates made in admin immediately reflect across all classroom displays
    const unsubscribe = subscribeSchoolSchedule(
      schoolSlug,
      (newScheduleData, cloudName, cloudAlertSettings) => {
        // [강제 동기화] 클라우드에서 받은 최신 데이터로 로컬 상태 및 저장소 무조건 갱신
        setScheduleData(newScheduleData);
        try {
          localStorage.setItem(`schedule_data_${schoolSlug}`, JSON.stringify(newScheduleData));
        } catch {}
        
        if (cloudName) {
          setSchoolName(cloudName);
          try {
            localStorage.setItem(`school_name_${schoolSlug}`, cloudName);
          } catch {}
        }
        
        // 클라우드 설정 반영
        if (cloudAlertSettings) {
          setAlertSettings(cloudAlertSettings);
          try {
            localStorage.setItem('exam_alert_settings', JSON.stringify(cloudAlertSettings));
          } catch {}
        }
        
        setCloudSyncStatus('synced');
      },
      (name, logo) => {
        if (name) {
          setSchoolName(name);
          try {
            localStorage.setItem(`school_name_${schoolSlug}`, name);
          } catch {}
        }
        if (logo) {
          setSchoolLogo(logo);
          try {
            localStorage.setItem('school_logo', logo);
          } catch {}
        }
      }
    );

    return () => unsubscribe();
  }, [schoolSlug]);

  // Update school name and slug from Admin mode or modal
  const handleUpdateSchoolInfo = async (newName: string, newSlug: string) => {
    const cleanName = newName.trim() || '한국고등학교';
    let processedSlug = cleanSlug(newSlug, true);
    if (!processedSlug) {
      processedSlug = generateSchoolSlug(cleanName);
    }

    // 1. Update State synchronously for immediate UI feedback
    setSchoolName(cleanName);
    const prevSlug = schoolSlug;
    setSchoolSlug(processedSlug);

    const currentRole = appRole === 'classroom' ? 'classroom' : 'admin';
    setAppRole(currentRole);

    // 2. Perform side effects (Storage/Cloud) asynchronously
    setTimeout(() => {
      // Save to Cloud Firestore
      setCloudSyncStatus('syncing');
      saveSchoolScheduleToCloud(processedSlug, scheduleData, cleanName, schoolLogo, alertSettings)
        .then(() => setCloudSyncStatus('synced'))
        .catch(() => setCloudSyncStatus('offline'));

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('current_school_slug', processedSlug);
          localStorage.setItem(`school_name_${processedSlug}`, cleanName);
          // Persist schedule data for this school slug as well
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

  // Auto-persist scheduleData under current school slug to localStorage & Firebase
  React.useEffect(() => {
    if (!schoolSlug) return;
    try {
      localStorage.setItem(`schedule_data_${schoolSlug}`, JSON.stringify(scheduleData));
    } catch {}

    // When in admin role, push updates to Cloud Firestore with debouncing (3s), skipping if offline/quota exceeded
    if (appRole === 'admin' && cloudSyncStatus !== 'offline' && typeof window !== 'undefined' && localStorage.getItem('firestore_quota_exceeded') !== 'true') {
      const timer = setTimeout(() => {
        setCloudSyncStatus('syncing');
        saveSchoolScheduleToCloud(schoolSlug, scheduleData, schoolName, schoolLogo, alertSettings)
          .then(() => setCloudSyncStatus('synced'))
          .catch(() => setCloudSyncStatus('offline'));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [scheduleData, schoolSlug, schoolName, schoolLogo, appRole, alertSettings]);

  // Auto fullscreen on entering classroom electronic board mode
  React.useEffect(() => {
    if (appRole === 'classroom') {
      setIsFullscreen(true);
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

  const handleUpdateMaxClasses = (newMax: number) => {
    setMaxClasses(newMax);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('max_classes', String(newMax));
      } catch {}
    }
  };

  // Track browser fullscreen state
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.log(e));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((e) => console.log(e));
      }
    }
  };


  // Electronic Blackboard Texture Theme State (사용자 요청: 고급 다크 모드 텍스처)
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('electronic_board_theme') as BoardTheme;
        if (saved === 'obsidian' || saved === 'emerald' || saved === 'midnight') {
          return saved;
        }
      } catch {
        // ignore
      }
    }
    return 'obsidian';
  });

  const handleUpdateBoardTheme = (theme: BoardTheme) => {
    setBoardTheme(theme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('electronic_board_theme', theme);
      } catch {
        // ignore
      }
    }
  };

  // Modals state
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

  // Statistics
  const totalDays = scheduleData.length;
  const totalSubjects = (Array.isArray(scheduleData) ? scheduleData : []).reduce(
    (accDay, day) =>
      accDay +
      (Array.isArray(day?.schedule) ? day.schedule : []).reduce(
        (accPeriod, p) => accPeriod + (Array.isArray(p?.subjects) ? p.subjects.length : 0),
        0
      ),
    0
  );

  // Selected single day object
  const currentDaySchedule: DayExamSchedule =
    (Array.isArray(scheduleData) ? scheduleData : []).find((d) => d.id === activeTab || d.date === activeTab) ||
    (Array.isArray(scheduleData) ? scheduleData[0] : undefined) || {
      id: 'empty-day',
      date: '시간표 등록 대기',
      fullTitle: `${schoolName} 시험 시간표 (등록 대기중)`,
      notice: FIXED_NOTICE,
      bottomNotice: DEFAULT_BOTTOM_NOTICE,
      schedule: [],
    };

  // Copy scheduleData code
  const handleCopyCode = () => {
    const cleanData = scheduleData.map((day) => ({
      date: day.date,
      fullTitle: day.fullTitle,
      notice: day.notice,
      bottomNotice: day.bottomNotice || DEFAULT_BOTTOM_NOTICE,
      schedule: day.schedule.map((p) => ({
        period: p.period,
        subjects: p.subjects.map((s) => ({
          name: s.name,
          subjectCode: s.subjectCode,
          entryTime: s.entryTime,
          time: s.time,
          duration: s.duration,
          targetClass: s.targetClass,
        })),
      })),
    }));

    const codeStr = `// 고등학교 시험 시간표 scheduleData 배열\nexport const scheduleData = ${JSON.stringify(
      cleanData,
      null,
      2
    )};`;

    navigator.clipboard.writeText(codeStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Export JSON helper
  const handleExportJson = () => {
    const cleanData = scheduleData.map((day) => ({
      date: day.date,
      fullTitle: day.fullTitle,
      notice: day.notice,
      bottomNotice: day.bottomNotice || DEFAULT_BOTTOM_NOTICE,
      schedule: day.schedule.map((p) => ({
        period: p.period,
        subjects: p.subjects.map((s) => ({
          name: s.name,
          subjectCode: s.subjectCode,
          entryTime: s.entryTime,
          time: s.time,
          duration: s.duration,
          targetClass: s.targetClass,
        })),
      })),
    }));

    const blob = new Blob([JSON.stringify(cleanData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'highschool_exam_schedule.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print helper
  const handlePrint = () => {
    window.print();
  };

  // AI Extract callback
  const handleExtractSuccess = (extractedData: ScheduleData) => {
    setScheduleData(extractedData);
    if (extractedData.length > 0) {
      setActiveTab(extractedData[0].id || extractedData[0].date);
    }
  };

  // Reset sample
  const handleResetSample = () => {
    if (confirm('기본 10/12 ~ 10/16 시험 시간표 샘플 데이터로 복원하시겠습니까?')) {
      setScheduleData(defaultScheduleData);
      setActiveTab('day-1012');
    }
  };

  // Clear all schedule data
  const handleClearAllSchedule = () => {
    if (
      confirm(
        '현재 등록된 시험 시간표 데이터를 모두 비우시겠습니까?\n\n- 빈 상태로 시작하여 새 시간표 파일을 업로드하거나 직접 추가할 수 있습니다.\n- 언제든 [샘플 복원] 버튼으로 예시 시간표를 다시 불러올 수 있습니다.'
      )
    ) {
      setScheduleData([]);
      setActiveTab('');
    }
  };

  // Edit day date and title
  const handleEditDay = (dayIdx: number, newDate: string, newTitle: string) => {
    setScheduleData((prev) => {
      const updated = [...prev];
      updated[dayIdx] = {
        ...updated[dayIdx],
        date: newDate,
        fullTitle: newTitle,
      };
      return updated;
    });
  };

  // Update bottom notice for current day
  const handleUpdateBottomNotice = (newNotice: string) => {
    setScheduleData((prev) =>
      prev.map((d) =>
        d.id === currentDaySchedule.id || d.date === currentDaySchedule.date
          ? { ...d, bottomNotice: newNotice }
          : d
      )
    );
  };

  // Update all bottom notices
  const handleUpdateAllBottomNotices = (newNotice: string) => {
    setScheduleData((prev) =>
      prev.map((d) => ({ ...d, bottomNotice: newNotice }))
    );
  };

  // Update top notice for current day
  const handleUpdateTopNotice = (newNotice: string) => {
    setScheduleData((prev) =>
      prev.map((d) =>
        d.id === currentDaySchedule.id || d.date === currentDaySchedule.date
          ? { ...d, notice: newNotice }
          : d
      )
    );
  };

  // Update all top notices
  const handleUpdateAllTopNotices = (newNotice: string) => {
    setScheduleData((prev) =>
      prev.map((d) => ({ ...d, notice: newNotice }))
    );
  };

  // Add new day schedule (모달 열기)
  const handleAddDay = () => {
    setIsAddDayModalOpen(true);
  };

  const handleSaveNewDay = (
    newDateStr: string,
    newTitleStr: string,
    newBottomNotice?: string,
    newTopNotice?: string
  ) => {
    const newDay: DayExamSchedule = {
      id: `day-${Date.now()}`,
      date: newDateStr,
      fullTitle: newTitleStr || `2026학년도 2학기 1차 고사 시간표(${newDateStr})`,
      notice: newTopNotice || FIXED_NOTICE,
      bottomNotice: newBottomNotice || DEFAULT_BOTTOM_NOTICE,
      schedule: [
        {
          id: `p-${Date.now()}-1`,
          period: '1교시',
          subjects: [
            {
              id: `s-${Date.now()}-1`,
              name: '자습',
              time: '08:30 ~ 09:00',
              duration: 30,
              targetClass: '전체',
            },
          ],
        },
      ],
    };

    setScheduleData((prev) => [...prev, newDay]);
    setActiveTab(newDay.id!);
  };

  // Delete day
  const handleDeleteDay = (dayIdx: number) => {
    if (confirm(`'${scheduleData[dayIdx].date}' 시간표 전체를 삭제하시겠습니까?`)) {
      setScheduleData((prev) => prev.filter((_, idx) => idx !== dayIdx));
      setActiveTab('ALL');
    }
  };

  // Add new period
  const handleAddPeriod = (dayIdx: number) => {
    const periodNum = scheduleData[dayIdx].schedule.length + 1;
    const periodName = `${periodNum}교시`;

    const newPeriod = {
      id: `p-${Date.now()}`,
      period: periodName,
      subjects: [
        {
          id: `s-${Date.now()}`,
          name: '새 과목',
          entryTime: '09:10',
          time: '09:20~10:20',
          duration: 60,
          targetClass: '행정학급',
        },
      ],
    };

    setScheduleData((prev) => {
      const updated = [...prev];
      updated[dayIdx] = {
        ...updated[dayIdx],
        schedule: [...updated[dayIdx].schedule, newPeriod],
      };
      return updated;
    });
  };

  // Edit subject
  const handleOpenEditSubject = (
    dayIdx: number,
    periodIdx: number,
    subIdx: number,
    subject: SubjectItem
  ) => {
    setEditingContext({
      dayIdx,
      periodIdx,
      subIdx,
      subject,
    });
    setIsEditModalOpen(true);
  };

  // Add subject
  const handleOpenAddSubject = (dayIdx: number, periodIdx: number) => {
    setEditingContext({
      dayIdx,
      periodIdx,
      subIdx: null,
      subject: null,
    });
    setIsEditModalOpen(true);
  };

  // Delete subject
  const handleDeleteSubject = (
    dayIdx: number,
    periodIdx: number,
    subIdx: number
  ) => {
    setScheduleData((prev) => {
      const updated = [...prev];
      const period = updated[dayIdx].schedule[periodIdx];
      const newSubjects = period.subjects.filter((_, idx) => idx !== subIdx);

      const newSchedule = [...updated[dayIdx].schedule];
      newSchedule[periodIdx] = {
        ...period,
        subjects: newSubjects,
      };

      updated[dayIdx] = {
        ...updated[dayIdx],
        schedule: newSchedule,
      };
      return updated;
    });
  };

  // Save subject
  const handleSaveSubject = (subject: SubjectItem) => {
    if (!editingContext) return;

    const { dayIdx, periodIdx, subIdx } = editingContext;

    setScheduleData((prev) => {
      const updated = [...prev];
      const period = updated[dayIdx].schedule[periodIdx];

      let newSubjects = [...period.subjects];
      if (subIdx !== null) {
        newSubjects[subIdx] = subject;
      } else {
        newSubjects.push(subject);
      }

      const newSchedule = [...updated[dayIdx].schedule];
      newSchedule[periodIdx] = {
        ...period,
        subjects: newSubjects,
      };

      updated[dayIdx] = {
        ...updated[dayIdx],
        schedule: newSchedule,
      };

      return updated;
    });
  };

  // Quick edit targetClass for a specific subject
  const handleQuickEditTargetClass = (
    dayIdx: number,
    periodIdx: number,
    subIdx: number,
    newTargetClass: string
  ) => {
    setScheduleData((prev) => {
      const updated = [...prev];
      if (!updated[dayIdx] || !updated[dayIdx].schedule[periodIdx]) return prev;

      const period = updated[dayIdx].schedule[periodIdx];
      const subject = period.subjects[subIdx];
      if (!subject) return prev;

      const newSubjects = [...period.subjects];
      newSubjects[subIdx] = {
        ...subject,
        targetClass: newTargetClass,
      };

      const newSchedule = [...updated[dayIdx].schedule];
      newSchedule[periodIdx] = {
        ...period,
        subjects: newSubjects,
      };

      updated[dayIdx] = {
        ...updated[dayIdx],
        schedule: newSchedule,
      };

      return updated;
    });
  };

  // Filtered schedules for developer view
  const displayedSchedules =
    activeTab === 'ALL'
      ? scheduleData
      : scheduleData.filter((d) => d.id === activeTab || d.date === activeTab);

  // 1. Selector Mode (when no mode chosen yet)
  if (appRole === 'selector') {
    return (
      <>
        <AppModeSelector
          onSelectClassroomMode={() => setIsInitialClassSetupOpen(true)}
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
                const existing = localStorage.getItem(`class_attendance_settings_${sSlug}`);
                const parsed = existing ? JSON.parse(existing) : {};
                localStorage.setItem(
                  `class_attendance_settings_${sSlug}`,
                  JSON.stringify({ ...parsed, grade, classNum })
                );
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

  // 2. Classroom Electronic Board Mode (Direct classroom deployment with initial grade/class setup)
  if (appRole === 'classroom') {
    return (
      <div className={`min-h-screen bg-slate-950 text-white font-sans ${isFullscreen ? 'p-0 m-0' : 'pb-10'}`}>
        <ElectronicBoard
          daySchedule={currentDaySchedule}
          allDays={scheduleData}
          onSelectDay={(dayId) => setActiveTab(dayId)}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onUpdateBottomNotice={handleUpdateBottomNotice}
          onUpdateTopNotice={handleUpdateTopNotice}
          alertSettings={alertSettings}
          onChangeAlertSettings={handleUpdateAlertSettings}
          selectedGrade={selectedGrade}
          onSelectGrade={setSelectedGrade}
          schoolLogo={schoolLogo}
          onUpdateSchoolLogo={handleUpdateSchoolLogo}
          schoolName={schoolName}
          boardTheme={boardTheme}
          onUpdateBoardTheme={handleUpdateBoardTheme}
          maxClasses={maxClasses}
          onSwitchToAdmin={() => {
            changeAppRole('admin');
            setViewMode('developer');
          }}
          onSwitchToSelector={() => {
            changeAppRole('selector');
          }}
          onUpdateTargetClass={(periodIdx, subIdx, newTargetClass) => {
            const dayIdx = scheduleData.findIndex(
              (d) => d.id === currentDaySchedule.id || d.date === currentDaySchedule.date
            );
            if (dayIdx !== -1) {
              handleQuickEditTargetClass(dayIdx, periodIdx, subIdx, newTargetClass);
            }
          }}
        />

        {isInitialClassSetupOpen && (
          <InitialClassSetupModal
            isOpen={isInitialClassSetupOpen}
            onClose={() => setIsInitialClassSetupOpen(false)}
            maxClasses={maxClasses}
            initialSchoolName={schoolName}
            initialSchoolSlug={schoolSlug}
            onSave={(grade, classNum, sName, sSlug) => {
              if (sName) setSchoolName(sName);
              if (sSlug) setSchoolSlug(sSlug);
              setSelectedGrade(`${grade}학년`);
              if (typeof window !== 'undefined') {
                try {
                  if (sSlug) localStorage.setItem('current_school_slug', sSlug);
                  if (sName && sSlug) localStorage.setItem(`school_name_${sSlug}`, sName);
                  const existing = localStorage.getItem(`class_attendance_settings_${sSlug || schoolSlug}`);
                  const parsed = existing ? JSON.parse(existing) : {};
                  localStorage.setItem(
                    `class_attendance_settings_${sSlug || schoolSlug}`,
                    JSON.stringify({ ...parsed, grade, classNum })
                  );
                } catch {}
              }
              changeAppRole('classroom', sSlug);
              setIsInitialClassSetupOpen(false);
            }}
          />
        )}

        <ImageUploaderModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onExtractSuccess={handleExtractSuccess}
        />
      </div>
    );
  }

  // 3. Admin / Teacher Mode Dashboard
  return (
    <div className={`min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white print:bg-white print:p-0 ${
      isFullscreen ? 'pb-2' : 'pb-16'
    }`}>
      
      {/* Header Bar: Only shown when NOT in fullscreen mode */}
      {!isFullscreen && (
        <div className="print:hidden">
          <Header
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onCopyCode={handleCopyCode}
            copied={copied}
            onExportJson={handleExportJson}
            onPrint={handlePrint}
            totalDays={totalDays}
            totalSubjects={totalSubjects}
            schoolName={schoolName}
            schoolSlug={schoolSlug}
            onSwitchToSelector={() => changeAppRole('selector')}
            onOpenSchoolSettings={() => {
              if (viewMode !== 'developer') {
                setViewMode('developer');
              }
              setTimeout(() => {
                const el = document.getElementById('school-settings-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }, 100);
            }}
            onOpenShareModal={() => setIsShareModalOpen(true)}
          />

          {/* View Mode Switcher Subheader */}
          <div className="bg-slate-800 border-b border-slate-700 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    changeAppRole('classroom');
                    setViewMode('board');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-sm"
                  title="교실 배포용 전자칠판 모드로 전환"
                >
                  <Monitor className="w-4 h-4" />
                  <span>교실 전자칠판 모드</span>
                </button>

                <button
                  onClick={() => {
                    changeAppRole('selector');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                  title="모드 선택 화면으로 돌아가기"
                >
                  <span>🏠 모드 선택</span>
                </button>

                <div className="h-4 w-px bg-slate-700 mx-1"></div>

                <button
                  onClick={() => setViewMode('board')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === 'board'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>미리보기</span>
                </button>

                <button
                  onClick={() => setViewMode('developer')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === 'developer'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  <span>관리자 편집 (시간표/코드)</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleClearAllSchedule}
                  className="text-xs text-rose-300 hover:text-white hover:bg-rose-500/25 border border-rose-400/30 px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition cursor-pointer"
                  title="등록된 시험 시간표(더미 데이터 포함)를 모두 비우고 빈 상태로 만듭니다"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>시간표 비우기</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetSample}
                  className="text-xs text-slate-300 hover:text-white hover:bg-slate-700/60 border border-slate-600/50 px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition cursor-pointer"
                  title="체험용 기본 샘플 시간표로 다시 복원합니다"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>샘플 복원</span>
                </button>
              </div>
            </div>
          </div>

          {/* Date Tabs (For Admin View) */}
          {viewMode === 'developer' && (
            <DateTabs
              scheduleData={scheduleData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedGrade={selectedGrade}
              setSelectedGrade={setSelectedGrade}
              onAddDay={handleAddDay}
            />
          )}
        </div>
      )}

      {/* Main Container */}
      <main className={
        isFullscreen
          ? "w-full p-0 m-0 space-y-0 overflow-x-hidden"
          : "w-full px-3 sm:px-5 lg:px-8 pt-6 space-y-6 overflow-x-hidden"
      }>
        
        {viewMode === 'board' ? (
          /* Electronic Blackboard View */
          <ElectronicBoard
            daySchedule={currentDaySchedule}
            allDays={scheduleData}
            onSelectDay={(dayId) => setActiveTab(dayId)}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onUpdateBottomNotice={handleUpdateBottomNotice}
            onUpdateTopNotice={handleUpdateTopNotice}
            alertSettings={alertSettings}
            onChangeAlertSettings={handleUpdateAlertSettings}
            selectedGrade={selectedGrade}
            onSelectGrade={setSelectedGrade}
            schoolLogo={schoolLogo}
            onUpdateSchoolLogo={handleUpdateSchoolLogo}
            schoolName={schoolName}
            boardTheme={boardTheme}
            onUpdateBoardTheme={handleUpdateBoardTheme}
            onUpdateTargetClass={(periodIdx, subIdx, newTargetClass) => {
              const dayIdx = scheduleData.findIndex(
                (d) => d.id === currentDaySchedule.id || d.date === currentDaySchedule.date
              );
              if (dayIdx !== -1) {
                handleQuickEditTargetClass(dayIdx, periodIdx, subIdx, newTargetClass);
              }
            }}
          />
        ) : (
          /* Admin Mode & Developer View: Timetable Grid first at top, followed by collapsible settings/tools toolbox */
          <>
            <TimetableGrid
              daySchedules={displayedSchedules}
              selectedGrade={selectedGrade}
              setSelectedGrade={setSelectedGrade}
              onEditSubject={(dayIdx, periodIdx, subIdx, subject) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex(
                  (d) => d.id === targetDay.id || d.date === targetDay.date
                );
                handleOpenEditSubject(realIdx !== -1 ? realIdx : dayIdx, periodIdx, subIdx, subject);
              }}
              onDeleteSubject={(dayIdx, periodIdx, subIdx) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex(
                  (d) => d.id === targetDay.id || d.date === targetDay.date
                );
                handleDeleteSubject(realIdx !== -1 ? realIdx : dayIdx, periodIdx, subIdx);
              }}
              onAddSubject={(dayIdx, periodIdx) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex(
                  (d) => d.id === targetDay.id || d.date === targetDay.date
                );
                handleOpenAddSubject(realIdx !== -1 ? realIdx : dayIdx, periodIdx);
              }}
              onAddPeriod={(dayIdx) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex(
                  (d) => d.id === targetDay.id || d.date === targetDay.date
                );
                handleAddPeriod(realIdx !== -1 ? realIdx : dayIdx);
              }}
              onDeleteDay={(dayIdx) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex(
                  (d) => d.id === targetDay.id || d.date === targetDay.date
                );
                handleDeleteDay(realIdx !== -1 ? realIdx : dayIdx);
              }}
              onEditDay={(dayIdx, newDate, newTitle) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex(
                  (d) => d.id === targetDay.id || d.date === targetDay.date
                );
                handleEditDay(realIdx !== -1 ? realIdx : dayIdx, newDate, newTitle);
              }}
              onEditDayBottomNotice={(dayIdx, newBottomNotice) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex(
                  (d) => d.id === targetDay.id || d.date === targetDay.date
                );
                const actualIdx = realIdx !== -1 ? realIdx : dayIdx;
                setScheduleData((prev) => {
                  const updated = [...prev];
                  updated[actualIdx] = {
                    ...updated[actualIdx],
                    bottomNotice: newBottomNotice,
                  };
                  return updated;
                });
              }}
              onEditDayTopNotice={(dayIdx, newTopNotice) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex(
                  (d) => d.id === targetDay.id || d.date === targetDay.date
                );
                const actualIdx = realIdx !== -1 ? realIdx : dayIdx;
                setScheduleData((prev) => {
                  const updated = [...prev];
                  updated[actualIdx] = {
                    ...updated[actualIdx],
                    notice: newTopNotice,
                  };
                  return updated;
                });
              }}
              onQuickEditTargetClass={(dayIdx, periodIdx, subIdx, newTargetClass) => {
                const targetDay = displayedSchedules[dayIdx];
                const realIdx = scheduleData.findIndex(
                  (d) => d.id === targetDay.id || d.date === targetDay.date
                );
                handleQuickEditTargetClass(realIdx !== -1 ? realIdx : dayIdx, periodIdx, subIdx, newTargetClass);
              }}
              onAddDay={handleAddDay}
            />

            {/* 학교 설정 및 환경설정 툴박스 (접이식 아코디언) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between print:hidden mt-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">학교 설정 및 AI 업로드·환경설정 툴박스</h3>
                  <p className="text-xs text-slate-500">학교명, 고유 링크, AI 자동 파싱, 학교 로고, 최대 반 개수, 테마 설정</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>{isSettingsExpanded ? '설정 접기 🔼' : '설정 펼치기 🔽'}</span>
              </button>
            </div>

            {isSettingsExpanded && (
              <div className="space-y-6 pt-4 animate-fadeIn print:block">
                {/* 학교명 및 고유 링크 주소 설정 */}
                <SchoolSettingsCard
                  schoolName={schoolName}
                  schoolSlug={schoolSlug}
                  onSaveSchoolInfo={handleUpdateSchoolInfo}
                  cloudSyncStatus={cloudSyncStatus}
                  onOpenShareModal={() => setIsShareModalOpen(true)}
                  onOpenClassroomMode={() => {
                    changeAppRole('classroom');
                    setViewMode('board');
                  }}
                />

                {/* 시험 시간표 PDF 및 이미지 AI 자동 파싱 업로드 카드 */}
                <ScheduleUploadCard
                  onOpenUpload={() => setIsUploadModalOpen(true)}
                  onSwitchToBoard={() => {
                    changeAppRole('classroom');
                    setViewMode('board');
                  }}
                />

                {/* 학교 마크(로고) 첨부 및 칠판 연동 */}
                <SchoolLogoCard
                  schoolLogo={schoolLogo}
                  onChangeLogo={handleUpdateSchoolLogo}
                  fullTitle={currentDaySchedule?.fullTitle}
                />

                {/* 총 반 개수 설정 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Grid className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <span>최대 학급 반 개수 설정</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          전자칠판 및 초기 설정에서 선택 가능한 최대 반 번호(예: 10반, 15반, 20반)를 설정합니다.
                        </p>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                      현재 설정: <strong className="text-indigo-900">{maxClasses}반까지</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((cnt) => {
                      const isSelected = maxClasses === cnt;
                      return (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => handleUpdateMaxClasses(cnt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {cnt}반까지
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
                    <span className="text-xs text-slate-500 font-bold">
                      설정하신 최대 반 개수({maxClasses}반까지)가 전자칠판 반 선택 목록에 적용됩니다.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateMaxClasses(maxClasses);
                        alert(`최대 학급 반 개수가 [${maxClasses}반까지]로 안전하게 저장되었습니다!`);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>설정 저장하기</span>
                    </button>
                  </div>
                </div>

                {/* 전자칠판 고급 다크 모드 텍스처 & 글자 가독성 설정 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-yellow-300 flex items-center justify-center shadow-xs">
                        <Palette className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <span>전자칠판 다크 모드 텍스처 & 글자 가독성 설정</span>
                          <span className="text-xs bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded-full border border-yellow-200">
                            기본 다크 모드 적용
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          고급스러운 다크 모드 칠판 질감과 원거리에서도 선명한 고대비 볼드 폰트가 적용됩니다.
                        </p>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                      현재 질감: <strong className="text-slate-900">{THEME_CONFIGS[boardTheme].name}</strong>
                    </div>
                  </div>

                  {/* 3 Themes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {(['obsidian', 'emerald', 'midnight'] as BoardTheme[]).map((tKey) => {
                      const cfg = THEME_CONFIGS[tKey];
                      const isSelected = boardTheme === tKey;
                      return (
                        <button
                          key={tKey}
                          type="button"
                          onClick={() => handleUpdateBoardTheme(tKey)}
                          className={`text-left p-3.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between space-y-2.5 ${
                            isSelected
                              ? 'border-yellow-400 bg-slate-950 text-white shadow-md ring-2 ring-yellow-400/30'
                              : 'border-slate-200 hover:border-slate-400 bg-slate-50/80 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black flex items-center gap-1.5">
                              {tKey === 'obsidian' && '🌌'}
                              {tKey === 'emerald' && '🌲'}
                              {tKey === 'midnight' && '🌑'}
                              <span className={isSelected ? 'text-yellow-300' : 'text-slate-900'}>
                                {cfg.name}
                              </span>
                            </span>
                            {isSelected && (
                              <span className="text-[10px] bg-yellow-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md">
                                적용 중
                              </span>
                            )}
                          </div>

                          {/* Mini Texture Preview swatch */}
                          <div
                            className={`h-10 rounded-lg p-2 flex items-center justify-between border ${
                              tKey === 'obsidian'
                                ? 'bg-gradient-to-b from-[#111925] via-[#0c121c] to-[#070b12] border-slate-700'
                                : tKey === 'emerald'
                                ? 'bg-gradient-to-b from-[#0e251b] via-[#091a13] to-[#050f0b] border-emerald-800'
                                : 'bg-gradient-to-b from-[#0e182c] via-[#091020] to-[#050a14] border-indigo-800'
                            }`}
                          >
                            <span className="text-[11px] font-black text-white">가독성 테스트</span>
                            <span className="text-[11px] font-black text-yellow-300 font-mono">08:50 ~ 09:40</span>
                          </div>

                          <p className={`text-[11px] leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {cfg.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 시험 종료 전 경고 알림 & 음향 설정 */}
                <AlertSettingsCard
                  settings={alertSettings}
                  onChangeSettings={handleUpdateAlertSettings}
                />

                <NoticeBanner
                  notice={currentDaySchedule?.notice || FIXED_NOTICE}
                  bottomNotice={currentDaySchedule?.bottomNotice || DEFAULT_BOTTOM_NOTICE}
                  onEditTopNotice={handleUpdateAllTopNotices}
                  onEditBottomNotice={handleUpdateAllBottomNotices}
                />

                <div className="print:hidden pt-4">
                  <CodeOutputViewer
                    scheduleData={scheduleData}
                    onCopyCode={handleCopyCode}
                    copied={copied}
                  />
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Upload AI Modal */}
      <ImageUploaderModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onExtractSuccess={handleExtractSuccess}
      />

      {/* Edit Subject Modal */}
      <EditScheduleModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveSubject}
        initialSubject={editingContext?.subject}
        periodName={
          editingContext !== null && scheduleData[editingContext.dayIdx]
            ? scheduleData[editingContext.dayIdx].schedule[editingContext.periodIdx]?.period || ''
            : ''
        }
        prevPeriodEndTime={(() => {
          if (!editingContext) return null;
          const { dayIdx, periodIdx } = editingContext;
          if (periodIdx <= 0) return null;
          const prevPeriod = scheduleData[dayIdx]?.schedule[periodIdx - 1];
          if (!prevPeriod || !prevPeriod.subjects.length) return null;
          const lastSub = prevPeriod.subjects[prevPeriod.subjects.length - 1];
          const matches = lastSub.time?.match(/(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/);
          return matches ? matches[2] : null;
        })()}
        selectedGrade={selectedGrade}
      />

      {/* Add New Day Modal (새 시험 일자 추가 모달) */}
      <DaySettingsModal
        isOpen={isAddDayModalOpen}
        onClose={() => setIsAddDayModalOpen(false)}
        mode="add"
        onSave={handleSaveNewDay}
      />

      {/* Share School Links Modal (학교 고유 주소 및 메신저용 공유 모달) */}
      <ShareSchoolModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        schoolName={schoolName}
        schoolSlug={schoolSlug}
        schoolLogo={schoolLogo}
      />

    </div>
  );
}
