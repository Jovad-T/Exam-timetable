import React, { useState } from 'react';
import { ExamAlertSettings, AnnouncementTemplate } from '../types/schedule';
import {
  Bell,
  Volume2,
  VolumeX,
  Clock,
  Play,
  AlertTriangle,
  Sliders,
  Sparkles,
  Mic,
  MessageSquare,
  Square,
  Check,
  BookOpen,
  Plus,
  Trash2,
  Tag,
  Edit3,
  Upload,
  FileAudio,
  ExternalLink,
  X,
} from 'lucide-react';
import { audioAlert } from '../utils/audioAlert';

export const DEFAULT_ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = [
  { id: '1', category: '시험시작', title: '시험 시작 및 입실 완료', text: '잠시 후 시험이 시작됩니다. 학생들은 입실을 완료하고 자리에 착석해 주시기 바랍니다.' },
  { id: '2', category: '시험시작', title: '전자기기 전원 끄기', text: '소지하고 있는 휴대전화 및 모든 전자기기는 전원을 끄고 가방에 넣어주세요.' },
  { id: '3', category: '시험종료', title: '시험 종료 10분 전 OMR 점검', text: '시험 종료 10분 전입니다. 학생들은 답안지 OMR 카드를 점검하고 마킹 실수가 없는지 확인해 주시기 바랍니다.' },
  { id: '4', category: '시험종료', title: '시험 종료 5분 전 최종 확인', text: '시험 종료 5분 전입니다. 컴퓨터용 사인펜으로 최종 마킹을 마치고 인적사항을 확인해 주세요.' },
  { id: '5', category: '시험종료', title: '시험 종료 및 답안 제출', text: '시험 종료 타종이 울렸습니다. 모든 학생들은 즉시 필기구를 내려놓고 답안지를 제출해 주시기 바랍니다.' },
  { id: '6', category: '주의사항', title: '수정테이프 사용 주의', text: '수정테이프 사용 시 번지지 않도록 주의하시고, 훼손된 경우 새 OMR 카드로 교체하여 작성하세요.' },
  { id: '7', category: '주의사항', title: '책상 서랍 비우기 (부정행위 방지)', text: '시험 중 부정행위 예방을 위해 책상 서랍을 비우고 참고서 등은 가방에 넣어 앞쪽에 보관해 주세요.' },
  { id: '8', category: '일반안내', title: '쉬는 시간 및 다음 교시 안내', text: '쉬는 시간이 시작되었습니다. 다음 교시 시험 과목을 미리 확인하고 차분하게 준비해 주시기 바랍니다.' },
];

interface AlertSettingsCardProps {
  settings: ExamAlertSettings;
  onChangeSettings: (newSettings: ExamAlertSettings) => void;
}

export const DEFAULT_TTS_MESSAGE =
  '시험 종료 10분 전입니다. 학생들은 답안지 OMR 카드를 점검하고 마킹 실수가 없는지 확인해 주시기 바랍니다.';

export const AlertSettingsCard: React.FC<AlertSettingsCardProps> = ({
  settings,
  onChangeSettings,
}) => {
  const currentTemplates = settings.announcementTemplates || DEFAULT_ANNOUNCEMENT_TEMPLATES;
  const [templateFilterCat, setTemplateFilterCat] = useState<string>('전체');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'시험시작' | '시험종료' | '주의사항' | '일반안내'>('시험시작');
  const [newText, setNewText] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState<string | undefined>(undefined);
  const [newAudioName, setNewAudioName] = useState<string | undefined>(undefined);
  const [audioUploadNotice, setAudioUploadNotice] = useState<string | null>(null);

  const readAudioFileAsDataUrl = (
    file: File,
    onLoaded: (dataUrl: string, fileName: string) => void
  ) => {
    // Firestore 1MB document limit protection: warn if single audio file exceeds 750KB
    if (file.size > 750 * 1024) {
      setAudioUploadNotice(
        `파일 크기(${(file.size / 1024).toFixed(0)}KB)가 큽니다. 클라우드 동기화를 위해 750KB 이하의 짧은 MP3 파일(클로바 더빙 MP3 다운로드 권장)을 사용해 주세요.`
      );
      setTimeout(() => setAudioUploadNotice(null), 5000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLoaded(reader.result, file.name);
        setAudioUploadNotice(`'${file.name}' 음성 파일이 등록되었습니다!`);
        setTimeout(() => setAudioUploadNotice(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) {
      return;
    }
    const newItem: AnnouncementTemplate = {
      id: Date.now().toString(),
      category: newCategory,
      title: newTitle.trim(),
      text: newText.trim(),
      ...(newAudioUrl ? { audioUrl: newAudioUrl, audioName: newAudioName } : {}),
    };
    const updated = [...currentTemplates, newItem];
    onChangeSettings({ ...settings, announcementTemplates: updated });
    setNewTitle('');
    setNewText('');
    setNewAudioUrl(undefined);
    setNewAudioName(undefined);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = currentTemplates.filter((t) => t.id !== id);
    onChangeSettings({ ...settings, announcementTemplates: updated });
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<'시험시작' | '시험종료' | '주의사항' | '일반안내'>('시험시작');
  const [editText, setEditText] = useState('');
  const [editAudioUrl, setEditAudioUrl] = useState<string | undefined>(undefined);
  const [editAudioName, setEditAudioName] = useState<string | undefined>(undefined);

  const handleStartEdit = (template: AnnouncementTemplate) => {
    setEditingId(template.id);
    setEditTitle(template.title);
    setEditCategory(template.category);
    setEditText(template.text);
    setEditAudioUrl(template.audioUrl);
    setEditAudioName(template.audioName);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim() || !editText.trim()) {
      return;
    }
    const updated = currentTemplates.map((t) =>
      t.id === id
        ? {
            ...t,
            title: editTitle.trim(),
            category: editCategory,
            text: editText.trim(),
            audioUrl: editAudioUrl,
            audioName: editAudioName,
          }
        : t
    );
    onChangeSettings({ ...settings, announcementTemplates: updated });
    setEditingId(null);
  };

  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [isPlayingTts, setIsPlayingTts] = useState(false);

  const ttsMessage = settings.ttsMessage || DEFAULT_TTS_MESSAGE;
  const isTtsEnabled = settings.ttsEnabled ?? true;

  const handleTestSound = (
    type: 'chime' | 'bell' | 'electronic' = settings.soundType || 'chime'
  ) => {
    setIsPlayingTest(true);
    audioAlert.playAlertSound(type, settings.volume || 0.7);
    setTimeout(() => {
      setIsPlayingTest(false);
    }, 1800);
  };

  const handleTestTTS = () => {
    setIsPlayingTts(true);
    const success = audioAlert.speakTTS(ttsMessage, {
      volume: settings.volume || 0.9,
      rate: settings.ttsVoiceSpeed || 1.0,
      pitch: settings.ttsPitch || 1.0,
      voiceStyle: settings.ttsVoiceStyle || 'announcer',
      audioUrl: settings.ttsAudioUrl,
      onEnd: () => setIsPlayingTts(false),
    });
    if (!success) {
      setIsPlayingTts(false);
    }
  };

  const handleStopTTS = () => {
    audioAlert.stopTTS();
    setIsPlayingTts(false);
  };

  const handleCombinedTest = () => {
    // 1st play chime bell, then after 1.8s speak the custom TTS announcement (or uploaded Clova Dubbing MP3)!
    setIsPlayingTest(true);
    audioAlert.playAlertSound(settings.soundType || 'chime', settings.volume || 0.7);
    setTimeout(() => {
      setIsPlayingTest(false);
      if (isTtsEnabled) {
        setIsPlayingTts(true);
        audioAlert.speakTTS(ttsMessage, {
          volume: settings.volume || 0.9,
          rate: settings.ttsVoiceSpeed || 1.0,
          pitch: settings.ttsPitch || 1.0,
          voiceStyle: settings.ttsVoiceStyle || 'announcer',
          audioUrl: settings.ttsAudioUrl,
          onEnd: () => setIsPlayingTts(false),
        });
      }
    }, 1800);
  };

  const ttsPresets = [
    {
      title: 'OMR 카드 마킹 점검 (기본)',
      text: '시험 종료 10분 전입니다. 학생들은 답안지 OMR 카드를 점검하고 마킹 실수가 없는지 확인해 주시기 바랍니다.',
    },
    {
      title: '수정테이프 사용 주의 및 교체',
      text: '시험 종료 10분 전입니다. 수정테이프 사용 시 번지지 않도록 주의하고, 잘못된 마킹은 새 OMR 카드로 교체하여 작성하세요.',
    },
    {
      title: '5분 전 최종 답안 확인',
      text: '시험 종료 5분 전입니다. 컴퓨터용 사인펜으로 최종 마킹을 마치고 인적사항이 정확히 기재되었는지 다시 한번 확인해 주세요.',
    },
    {
      title: '휴대전화 및 전자기기 전원 차단',
      text: '잠시 후 시험이 시작됩니다. 소지하고 있는 휴대전화, 스마트워치 등 모든 전자기기는 전원을 끄고 가방에 넣어주세요.',
    },
    {
      title: '답안지 인적사항 최종 점검',
      text: '시험 종료 3분 전입니다. 답안지 상단의 학번과 성명이 정확히 기재되어 있는지 최종 확인해 주시기 바랍니다.',
    },
    {
      title: '책상 서랍 및 주변 정리 (부정행위 방지)',
      text: '시험 중에는 책상 서랍을 비우고 학습 참고서 등 부정행위 소지가 있는 물품은 모두 가방에 넣고 앞쪽에 보관해 주세요.',
    },
    {
      title: '종료 타종 시 즉시 필기구 내려놓기',
      text: '시험 종료 타종이 울리면 즉시 필기구를 내려놓고 답안지를 제출할 수 있도록 정돈해 주시기 바랍니다.',
    },
    {
      title: '다음 교시 준비 및 휴식 안내',
      text: '쉬는 시간이 시작되었습니다. 다음 교시 시험 과목을 미리 확인하고 다음 시험을 차분하게 준비해 주시기 바랍니다.',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-md p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                시험 종료 전 경고 알림 & TTS 음성 방송 설정
              </h3>
              <span className="bg-indigo-100 text-indigo-800 text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                관리자 전용
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              시험 종료 N분 전 칠판 깜빡임 경고 배너, 차임벨, 그리고 원하는 문구의 TTS 한국어 음성 방송을 설정합니다.
            </p>
          </div>
        </div>

        {/* Quick Test Sound Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCombinedTest}
            disabled={isPlayingTest || isPlayingTts}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer shrink-0"
            title="차임벨 울린 후 TTS 음성까지 전체 시험 방송 시뮬레이션"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>차임벨 + TTS 전체 테스트</span>
          </button>
        </div>
      </div>

      {/* Main Settings Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. 소리 켜기 / 끄기 (Sound Toggle) */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.soundEnabled ? (
                <Volume2 className="w-4.5 h-4.5 text-emerald-600" />
              ) : (
                <VolumeX className="w-4.5 h-4.5 text-slate-400" />
              )}
              <span className="text-sm font-black text-slate-800">경고 알림 소리 (차임벨)</span>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                settings.soundEnabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {settings.soundEnabled ? '소리 켜짐 (ON)' : '무음 모드 (OFF)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, soundEnabled: true })}
              className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                settings.soundEnabled
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>소리 켜기</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, soundEnabled: false })}
              className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                !settings.soundEnabled
                  ? 'bg-slate-700 text-white shadow-sm ring-2 ring-slate-400/50'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>소리 끄기 (무음)</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            {settings.soundEnabled
              ? '시험 종료 시점에 도달하면 맑은 학교 딩동댕 차임벨이 울립니다.'
              : '소리 없이 전자칠판 상단 배너와 깜빡임 효과로만 알림을 표시합니다.'}
          </p>
        </div>

        {/* 2. 알림 시간 셋팅 (5분전 / 10분전) */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-indigo-600" />
              <span className="text-sm font-black text-slate-800">알림 시점 선택</span>
            </div>
            <span className="text-xs font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
              종료 {settings.alertMinutes}분 전
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, alertMinutes: 5 })}
              className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                settings.alertMinutes === 5
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>5분 전 알림</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, alertMinutes: 10 })}
              className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                settings.alertMinutes === 10
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>10분 전 알림</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            시험 종료까지 남은 시간이 <strong>{settings.alertMinutes}분 이하</strong>가 되면 경고가 작동합니다.
          </p>
        </div>
      </div>

      {/* 3. 알림음 종류 선택 */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" /> 차임벨 종류:
          </span>
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'chime', name: '학교 딩동댕 차임' },
                { id: 'bell', name: '타종 2단 벨' },
                { id: 'electronic', name: '전자 알림음' },
              ] as const
            ).map((sound) => (
              <button
                key={sound.id}
                type="button"
                onClick={() => {
                  onChangeSettings({ ...settings, soundType: sound.id });
                  handleTestSound(sound.id);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  (settings.soundType || 'chime') === sound.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {sound.name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleTestSound()}
          disabled={isPlayingTest}
          className="self-start sm:self-auto flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition cursor-pointer shrink-0"
        >
          <Play className="w-3 h-3 fill-indigo-600" />
          <span>차임벨 단독 미리듣기</span>
        </button>
      </div>

      {audioUploadNotice && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <FileAudio className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{audioUploadNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setAudioUploadNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. 시험 시작 10분 전 자동 알림 및 '곧 시험이 시작됩니다' TTS 설정 */}
      <div className="bg-gradient-to-br from-cyan-50 via-blue-50/40 to-white rounded-2xl p-4 sm:p-5 border-2 border-cyan-300 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-cyan-200/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900">
                  시험 시작 10분 전 자동 알림 및 '곧 시험이 시작됩니다' TTS 방송
                </h4>
                <span className="text-[10px] bg-cyan-100 text-cyan-800 font-extrabold px-2 py-0.5 rounded-full border border-cyan-200">
                  자동 타이머 연동
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                각 교시 시험 시작 10분 전이 되면 자동으로 알림 배너가 켜지고, 클로바 더빙 MP3 또는 TTS 음성이 방송됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, startAlertEnabled: !(settings.startAlertEnabled ?? true) })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                settings.startAlertEnabled ?? true
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{settings.startAlertEnabled ?? true ? '시작 10분전 알림 ON' : '시작 10분전 알림 OFF'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-600" />
            <span>시험 시작 10분 전 TTS 방송 멘트 (자유롭게 수정 가능):</span>
          </label>
          <textarea
            rows={2}
            value={settings.startTtsMessage || '곧 시험이 시작됩니다. 학생들은 입실을 완료하고 자리에 착석해 주시기 바랍니다.'}
            onChange={(e) => onChangeSettings({ ...settings, startTtsMessage: e.target.value })}
            placeholder="시험 시작 10분 전 안내할 멘트를 입력하세요..."
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-cyan-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-xs text-slate-900 leading-relaxed shadow-xs"
          />

          {/* Clova Dubbing Audio Upload for 10-min Start Alert */}
          <div className="bg-white/90 rounded-xl p-3 border border-cyan-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <FileAudio className="w-4 h-4 text-cyan-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-800 block">
                  시작 10분 전 클로바 더빙 음성 파일 (MP3/WAV) 등록
                </span>
                {settings.startTtsAudioUrl ? (
                  <span className="text-[11px] font-bold text-emerald-700 truncate block">
                    ✓ 등록됨: {settings.startTtsAudioName || '커스텀 시작 안내 음성.mp3'} (기계음 대신 이 파일이 방송됩니다)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 block">
                    파일 미등록 시 위 텍스트가 기본 브라우저 TTS로 낭독됩니다.
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <label className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>{settings.startTtsAudioUrl ? '음성 파일 변경' : 'MP3/WAV 업로드'}</span>
                <input
                  type="file"
                  accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      readAudioFileAsDataUrl(file, (dataUrl, fileName) => {
                        onChangeSettings({
                          ...settings,
                          startTtsAudioUrl: dataUrl,
                          startTtsAudioName: fileName,
                        });
                      });
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              {settings.startTtsAudioUrl && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      audioAlert.playCustomAudio(settings.startTtsAudioUrl!, {
                        volume: settings.volume || 0.9,
                        rate: settings.ttsVoiceSpeed || 1.0,
                      })
                    }
                    className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-emerald-700" />
                    <span>들어보기</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeSettings({
                        ...settings,
                        startTtsAudioUrl: undefined,
                        startTtsAudioName: undefined,
                      })
                    }
                    className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. TTS (Text-to-Speech) 음성 멘트 커스텀 설정 및 네이버 클로바 더빙 MP3 등록 */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50/40 to-white rounded-2xl p-4 sm:p-5 border-2 border-indigo-300 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-200/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-slate-900">
                  종료 {settings.alertMinutes}분 전 TTS 안내 멘트 & 클로바 더빙(MP3) 등록
                </h4>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                  네이버 클로바 더빙 호환
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                네이버 클로바 더빙에서 다운로드한 MP3/WAV 파일을 등록하거나, 원하는 문구를 직접 입력해 방송할 수 있습니다.
              </p>
            </div>
          </div>

          {/* TTS On/Off Toggle */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, ttsEnabled: !isTtsEnabled })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                isTtsEnabled
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isTtsEnabled ? 'TTS 음성 방송 ON' : 'TTS 음성 방송 OFF'}</span>
            </button>
          </div>
        </div>

        {/* Naver Clova Dubbing MP3/WAV Direct Registration Box */}
        <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <FileAudio className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-emerald-950">
                    외부 AI 음성 (VoiceStudio, 클로바 더빙, 타입캐스트 등) 또는 MP3/녹음 등록
                  </span>
                  <a
                    href="https://ai.kt.com/service/voice-studio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 hover:text-rose-900 bg-white px-2 py-0.5 rounded-lg border border-rose-300 shadow-2xs transition"
                  >
                    <span>VoiceStudio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://clovadubbing.naver.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 hover:text-emerald-900 bg-white px-2 py-0.5 rounded-lg border border-emerald-300 shadow-2xs transition"
                  >
                    <span>클로바 더빙</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://typecast.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-700 hover:text-indigo-900 bg-white px-2 py-0.5 rounded-lg border border-indigo-300 shadow-2xs transition"
                  >
                    <span>타입캐스트</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium mt-0.5 leading-relaxed">
                  <strong>보이스스튜디오(VoiceStudio), 클로바 더빙, 타입캐스트, Vrew</strong> 등에서 생성해 다운로드한 <strong>MP3, WAV, M4A</strong> 파일이나 <strong>스마트폰 음성 녹음본</strong>을 업로드하시면 전자칠판에서 그대로 고품질 재생됩니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <label className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>{settings.ttsAudioUrl ? ' 다른 오디오 파일로 변경' : 'AI 음성 / MP3 업로드'}</span>
                <input
                  type="file"
                  accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      readAudioFileAsDataUrl(file, (dataUrl, fileName) => {
                        onChangeSettings({
                          ...settings,
                          ttsAudioUrl: dataUrl,
                          ttsAudioName: fileName,
                        });
                      });
                    }
                    e.target.value = '';
                  }}
                />
              </label>

              {settings.ttsAudioUrl && (
                <button
                  type="button"
                  onClick={() =>
                    onChangeSettings({
                      ...settings,
                      ttsAudioUrl: undefined,
                      ttsAudioName: undefined,
                    })
                  }
                  className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  파일 등록 해제
                </button>
              )}
            </div>
          </div>

          {settings.ttsAudioUrl && (
            <div className="bg-white rounded-xl px-3.5 py-2 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shrink-0">
                  우선 재생 중
                </span>
                <span className="font-black text-slate-800 truncate">
                  {settings.ttsAudioName || '등록된 클로바 더빙 음성.mp3'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestTTS}
                className="text-emerald-700 hover:text-emerald-900 font-black flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-emerald-600" />
                <span>등록된 MP3 미리듣기</span>
              </button>
            </div>
          )}
        </div>

        {/* Text Input Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                방송될 멘트 문구 (클로바 더빙 대본 겸용 / MP3 미등록 시 기본 TTS로 낭독):
              </span>
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              {ttsMessage.length}자 입력됨
            </span>
          </div>

          <textarea
            rows={3}
            value={ttsMessage}
            onChange={(e) => onChangeSettings({ ...settings, ttsMessage: e.target.value })}
            placeholder="시험 종료 10분 전 안내할 멘트를 입력하세요..."
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-xs text-slate-900 leading-relaxed shadow-xs"
          />

          {/* Preset Buttons */}
          <div>
            <span className="text-[11px] font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600" /> 추천 안내 멘트 빠른 적용 (클릭):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {ttsPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, ttsMessage: preset.text })}
                  className={`text-left p-2 rounded-lg border text-[11px] transition cursor-pointer ${
                    ttsMessage === preset.text
                      ? 'bg-purple-100 text-purple-900 border-purple-300 font-black shadow-2xs'
                      : 'bg-white hover:bg-indigo-50/80 text-slate-700 border-slate-200 font-medium'
                  }`}
                >
                  <span className="font-extrabold text-indigo-700 block mb-0.5">
                    {preset.title}
                  </span>
                  <span className="line-clamp-1 text-slate-600">{preset.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Human-like TTS Voice Style & Emotion Expression */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-black text-slate-700 block">
            🎙️ 기본 브라우저 TTS 낭독 스타일 선택 (MP3 미등록 시 적용):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'announcer', name: '아나운서 톤', desc: '정중하고 또렷하게' },
              { id: 'friendly', name: '친근한 톤', desc: '부드럽고 다정하게' },
              { id: 'calm', name: '차분한 톤', desc: '진중하고 차분함' },
              { id: 'energetic', name: '힘찬 톤', desc: '생동감·활기참' },
              { id: 'warning', name: '경고조 톤', desc: '엄숙하고 단호함' },
            ].map((style) => {
              const currentStyle = settings.ttsVoiceStyle || 'announcer';
              const isSelected = currentStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, ttsVoiceStyle: style.id as any })}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400/40 font-black'
                      : 'bg-white hover:bg-purple-50/50 text-slate-800 border-slate-200 font-medium'
                  }`}
                >
                  <span className="text-xs font-black block">{style.name}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                    {style.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Speech Controls & Test Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-indigo-200/60">
          {/* Voice Speed */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600">음성 속도:</span>
            {[
              { rate: 0.9, label: '차분하게 (0.9x)' },
              { rate: 1.0, label: '표준 (1.0x)' },
              { rate: 1.1, label: '약간 빠름 (1.1x)' },
            ].map((sp) => (
              <button
                key={sp.rate}
                type="button"
                onClick={() => onChangeSettings({ ...settings, ttsVoiceSpeed: sp.rate })}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer border ${
                  (settings.ttsVoiceSpeed || 1.0) === sp.rate
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>

          {/* Test TTS Button */}
          <div className="flex items-center gap-2">
            {isPlayingTts ? (
              <button
                type="button"
                onClick={handleStopTTS}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>방송 중지</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestTTS}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
                title="등록된 클로바 더빙 MP3 또는 입력한 멘트 문구를 지금 바로 들어봅니다"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{settings.ttsAudioUrl ? '등록된 클로바 MP3 미리듣기' : 'TTS 음성 미리듣기'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6. 시험 안내 멘트 관리 (상황별 템플릿 저장소 및 전자칠판 즉시 연동) */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50/40 to-white rounded-2xl p-4 sm:p-5 border-2 border-amber-300 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black text-slate-900">
                  시험 안내 멘트 관리 (상황별 템플릿 & 개별 MP3 보관함)
                </h4>
                <span className="text-xs bg-amber-100 text-amber-800 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200">
                  클로바 더빙 파일 첨부 지원
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                각 상황별 안내 멘트마다 클로바 더빙에서 다운받은 MP3 파일을 함께 넣어두면, 전자칠판에서 클릭 즉시 해당 목소리로 방송됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs & Template List */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {['전체', '시험시작', '시험종료', '주의사항', '일반안내'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setTemplateFilterCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                  templateFilterCat === cat
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {currentTemplates
              .filter((t) => templateFilterCat === '전체' || t.category === templateFilterCat)
              .map((template) => {
                const isApplied = ttsMessage === template.text;
                return (
                  <div
                    key={template.id}
                    className={`p-3.5 rounded-2xl border-2 transition flex flex-col justify-between space-y-2.5 ${
                      isApplied
                        ? 'bg-amber-100/70 border-amber-400 shadow-md ring-2 ring-amber-400/30'
                        : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
                    }`}
                  >
                    {editingId === template.id ? (
                      /* Inline Edit Form */
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as any)}
                            className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-slate-900 focus:outline-none"
                          >
                            <option value="시험시작">시험시작</option>
                            <option value="시험종료">시험종료</option>
                            <option value="주의사항">주의사항</option>
                            <option value="일반안내">일반안내</option>
                          </select>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="제목 입력..."
                            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          placeholder="멘트 내용 입력..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none leading-relaxed"
                        />
                        <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px]">
                          <span className="truncate font-bold text-slate-700">
                            {editAudioName ? `🎵 ${editAudioName}` : '첨부된 MP3 파일 없음'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <label className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold cursor-pointer">
                              <span>MP3 선택</span>
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    readAudioFileAsDataUrl(f, (dataUrl, fileName) => {
                                      setEditAudioUrl(dataUrl);
                                      setEditAudioName(fileName);
                                    });
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {editAudioUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditAudioUrl(undefined);
                                  setEditAudioName(undefined);
                                }}
                                className="px-2 py-1 bg-rose-100 text-rose-700 rounded-md font-bold cursor-pointer"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(template.id)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-black transition cursor-pointer shadow-xs"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Display */
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              template.category === '시험시작' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' :
                              template.category === '시험종료' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              template.category === '주의사항' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {template.category}
                            </span>
                            <h5 className="text-xs font-black text-slate-900">{template.title}</h5>
                            {template.audioUrl && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                                <FileAudio className="w-3 h-3" />
                                <span>MP3 등록됨</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(template)}
                              className="text-slate-400 hover:text-indigo-600 p-1 rounded-md transition cursor-pointer"
                              title="템플릿 수정 및 MP3 첨부"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                              title="템플릿 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed">
                          "{template.text}"
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              onChangeSettings({
                                ...settings,
                                ttsMessage: template.text,
                                ...(template.audioUrl
                                  ? { ttsAudioUrl: template.audioUrl, ttsAudioName: template.audioName }
                                  : {}),
                              })
                            }
                            className={`w-full py-1.5 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              isApplied
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 border border-slate-200'
                            }`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>
                              {isApplied
                                ? '현재 TTS 멘트에 적용됨'
                                : template.audioUrl
                                ? '이 멘트 + 클로바 MP3 적용하기'
                                : '이 멘트를 TTS 방송으로 사용하기'}
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Add New Template Form */}
        <form onSubmit={handleAddTemplate} className="bg-white rounded-2xl p-4 border border-amber-200 space-y-3">
          <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-600" />
            <span>새로운 안내 멘트 템플릿 직접 추가하기 (클로바 더빙 MP3 첨부 가능)</span>
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">상황 카테고리</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="시험시작">시험시작</option>
                <option value="시험종료">시험종료</option>
                <option value="주의사항">주의사항</option>
                <option value="일반안내">일반안내</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">템플릿 제목 (예: 과학탐구 OMR 교체 안내)</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="템플릿 제목을 입력하세요..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">방송될 안내 멘트 내용 (TTS 텍스트)</label>
            <textarea
              rows={2}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="학생들에게 방송할 상세 멘트 내용을 입력하세요..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>{newAudioName ? `첨부됨: ${newAudioName}` : '클로바 더빙 MP3/WAV 파일 첨부 (선택)'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      readAudioFileAsDataUrl(file, (dataUrl, fileName) => {
                        setNewAudioUrl(dataUrl);
                        setNewAudioName(fileName);
                      });
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              {newAudioUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setNewAudioUrl(undefined);
                    setNewAudioName(undefined);
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  첨부 취소
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>템플릿 저장하기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

