import React, { useState, useEffect } from 'react';
import {
  School,
  Link as LinkIcon,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Save,
  Building2,
  CheckCircle2,
  Info,
  Wand2,
  Keyboard,
  Globe,
  RotateCcw,
  Cloud,
  Share2,
} from 'lucide-react';
import {
  generateSchoolSlug,
  cleanSlug,
  convertKoreanQwertyToEnglish,
  hasHangul,
} from '../utils/slugUtils';
import { getSchoolUrl } from '../utils/urlUtils';

interface SchoolSettingsCardProps {
  schoolName: string;
  schoolSlug: string;
  onSaveSchoolInfo: (name: string, slug: string) => void;
  onOpenClassroomMode?: () => void;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline';
  onOpenShareModal?: () => void;
}

const PRESET_SCHOOLS = [
  { name: '사직여자고등학교', slug: 'sajik-girls-high' },
  { name: '한국고등학교', slug: 'korea-high' },
  { name: '서울고등학교', slug: 'seoul-high' },
  { name: '경기고등학교', slug: 'gyeonggi-high' },
  { name: '부산고등학교', slug: 'busan-high' },
  { name: '세종과학고등학교', slug: 'sejong-science-high' },
  { name: '대전외국어고등학교', slug: 'daejeon-fl-high' },
];

export const SchoolSettingsCard: React.FC<SchoolSettingsCardProps> = ({
  schoolName,
  schoolSlug,
  onSaveSchoolInfo,
  onOpenClassroomMode,
  cloudSyncStatus = 'synced',
  onOpenShareModal,
}) => {
  const [nameInput, setNameInput] = useState(schoolName);
  const [slugInput, setSlugInput] = useState(schoolSlug);
  const [isAutoSync, setIsAutoSync] = useState(true);
  const [customDomain, setCustomDomain] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('custom_deploy_domain') || '';
      } catch {}
    }
    return '';
  });
  const [isEditingDomain, setIsEditingDomain] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [copiedType, setCopiedType] = useState<'classroom' | 'admin' | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setNameInput(schoolName);
  }, [schoolName]);

  useEffect(() => {
    setSlugInput(schoolSlug);
  }, [schoolSlug]);

  // Handle school name typing with real-time English slug generation
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameInput(val);
    if (isAutoSync) {
      if (val.trim()) {
        const auto = generateSchoolSlug(val);
        if (auto) setSlugInput(auto);
      }
    }
  };

  // Auto-generate slug from Korean school name
  const handleAutoSlug = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const generated = generateSchoolSlug(trimmed);
    setSlugInput(generated);
    setIsAutoSync(true);
  };

  // Convert current slug to English if user typed Korean or Korean QWERTY
  const handleConvertToEnglishSlug = () => {
    if (!slugInput.trim()) return;
    if (/^[ㄱ-ㅎㅏ-ㅣ\s_-]+$/.test(slugInput)) {
      setSlugInput(convertKoreanQwertyToEnglish(slugInput));
    } else if (hasHangul(slugInput)) {
      setSlugInput(generateSchoolSlug(slugInput));
    } else {
      setSlugInput(cleanSlug(slugInput));
    }
    setIsAutoSync(true);
  };

  const handleSelectPreset = (preset: { name: string; slug: string }) => {
    setNameInput(preset.name);
    setSlugInput(preset.slug);
    setIsAutoSync(true);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const finalName = nameInput.trim() || '한국고등학교';
    let finalSlug = cleanSlug(slugInput, true);
    if (!finalSlug) {
      finalSlug = generateSchoolSlug(finalName);
    }

    onSaveSchoolInfo(finalName, finalSlug);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
    }, 3000);
  };

  const getFullUrl = (role: 'classroom' | 'admin') => {
    return getSchoolUrl(slugInput, role, customDomain);
  };

  const handleCopyLink = (role: 'classroom' | 'admin') => {
    const url = getFullUrl(role);
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedType(role);
      setTimeout(() => setCopiedType(null), 2500);
    });
  };

  const hasChanges = nameInput.trim() !== schoolName || cleanSlug(slugInput) !== schoolSlug;

  return (
    <div
      id="school-settings-section"
      className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden transition-all hover:shadow-md"
    >
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shadow-inner shrink-0">
            <Building2 className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>학교명 및 고유 링크 주소 설정</span>
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                🏫 #{schoolSlug}
              </span>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Cloud className={`w-3.5 h-3.5 text-blue-400 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>
                  {cloudSyncStatus === 'syncing'
                    ? '클라우드 동기화 중...'
                    : cloudSyncStatus === 'offline'
                    ? '로컬 캐시 모드'
                    : 'Firebase 전 교실 실시간 연동됨'}
                </span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
              관리자 모드에서 학교 이름을 등록하고, 교실 전자칠판에 바로 띄울 수 있는 학교 전용 고유 주소를 관리합니다.
            </p>
          </div>
        </div>

        {savedFeedback ? (
          <div className="flex items-center gap-2 bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl font-black text-xs shadow-md animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>학교 설정 저장 완료!</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={!hasChanges && Boolean(schoolName)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-sm shrink-0 ${
              hasChanges
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-2 ring-emerald-300/50'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{hasChanges ? '변경사항 저장하기' : '학교 정보 저장됨'}</span>
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-6">
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: School Name & Quick Presets */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <School className="w-4 h-4 text-indigo-600" />
                  <span>학교명 (공식 명칭)</span>
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  시간표 상단 및 전자칠판 헤더에 표기
                </span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={nameInput}
                  onChange={handleNameChange}
                  placeholder="예: 서울고등학교, 한국고등학교"
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 rounded-xl px-4 py-2.5 text-slate-900 font-extrabold text-sm sm:text-base focus:outline-none focus:bg-white transition"
                  required
                />
              </div>
              <p className="text-[11px] text-indigo-700 flex items-center gap-1 pt-0.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>학교명을 입력하면 영문 주소(슬러그)가 실시간으로 자동 변환됩니다.</span>
              </p>
            </div>

            {/* Quick School Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>빠른 예시 학교 선택:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SCHOOLS.map((preset) => (
                  <button
                    key={preset.slug}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      nameInput === preset.name
                        ? 'bg-indigo-100 text-indigo-900 border-indigo-300 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Guidance note */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-start gap-2 leading-relaxed">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>학교명을 설정하면:</strong> 시험 시간표 상단 헤더, 인쇄물 제목, 그리고 교실 전자칠판 상단에{' '}
                <strong className="text-indigo-950 underline">{nameInput || '학교명'}</strong>이(가) 자동으로 반영됩니다.
              </div>
            </div>
          </div>

          {/* Right Column: School Slug & URL Generation */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-indigo-600" />
                  <span>고유 접속 영문 주소 (슬러그)</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isAutoSync ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>실시간 자동 변환 켜짐</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAutoSync(true);
                        if (nameInput.trim()) {
                          setSlugInput(generateSchoolSlug(nameInput));
                        }
                      }}
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition"
                      title="학교명과 다시 실시간 자동 연동"
                    >
                      <span>🔄 학교명과 다시 연동</span>
                    </button>
                  )}
                  {hasHangul(slugInput) && (
                    <button
                      type="button"
                      onClick={handleConvertToEnglishSlug}
                      className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition"
                      title="한글 입력을 영문 슬러그로 즉시 변환"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>영문으로 변환</span>
                    </button>
                  )}
                  {/^[ㄱ-ㅎㅏ-ㅣ\s_-]+$/.test(slugInput) && (
                    <button
                      type="button"
                      onClick={handleConvertToEnglishSlug}
                      className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition"
                      title="두벌식 영타 오타를 영문으로 복원"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
                      <span>영타 복원</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAutoSlug}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg border border-slate-200 transition"
                    title="학교명에 맞춰 영문 슬러그 자동 생성"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>재생성</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-indigo-600 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 focus-within:bg-white transition">
                <span className="text-indigo-600 font-mono shrink-0 select-none">#school:</span>
                <input
                  type="text"
                  value={slugInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setSlugInput(raw.replace(/\s+/g, '-'));
                    setIsAutoSync(false);
                  }}
                  onBlur={() => {
                    if (slugInput.trim()) {
                      if (/^[ㄱ-ㅎㅏ-ㅣ\s_-]+$/.test(slugInput)) {
                        setSlugInput(convertKoreanQwertyToEnglish(slugInput));
                      } else if (hasHangul(slugInput)) {
                        setSlugInput(generateSchoolSlug(slugInput));
                      } else {
                        setSlugInput(cleanSlug(slugInput, false));
                      }
                    }
                  }}
                  placeholder="seoul-high"
                  className="w-full bg-transparent text-slate-900 font-black px-1.5 py-0.5 text-sm focus:outline-none font-mono"
                  required
                />
                <span className="text-slate-400 font-mono text-[11px] shrink-0 select-none">:(mode)</span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>학교명 입력 시 영문으로 자동 변환되며, 직접 수정도 가능합니다.</span>
                <span className="text-indigo-600 font-mono font-bold">예: seoul-high</span>
              </p>
            </div>

            {/* Save Button for mobile / convenient access */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition active:scale-[0.99] cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>학교명 및 고유 주소 저장/적용</span>
              </button>
            </div>
          </div>
        </form>

        {/* Dedicated URLs Grid for Classroom and Admin */}
        <div className="border-t border-slate-100 pt-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{nameInput || '이 학교'} 전용 고유 바로가기 주소 (클릭하여 복사)</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                즐겨찾기나 브라우저 시작페이지로 등록하여 원클릭 접속
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={onOpenShareModal}
                  className="text-xs font-black px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="학교 고유 링크 전체 공유 및 메신저용 복사"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>공유하기</span>
                </button>
              )}

              {/* Custom Domain Settings Button */}
              <button
                type="button"
                onClick={() => setIsEditingDomain(!isEditingDomain)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs ${
                  customDomain.trim()
                    ? 'bg-blue-50 text-blue-800 border-blue-300 font-extrabold ring-1 ring-blue-300/60'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Vercel이나 학교 고유 도메인으로 배포 주소 설정"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{customDomain.trim() ? `배포 도메인: ${customDomain}` : '배포 도메인 설정 (Vercel 등)'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible / Interactive Custom Domain Setting Box */}
          {isEditingDomain && (
            <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border-2 border-blue-200/90 rounded-2xl space-y-3 text-xs animate-fadeIn shadow-xs">
              <div className="flex items-center justify-between font-extrabold text-blue-950 flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>배포 도메인 주소 설정 (Vercel 또는 학교 도메인)</span>
                </span>
                {customDomain && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDomain('');
                      try { localStorage.removeItem('custom_deploy_domain'); } catch {}
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer font-bold transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>사용자 지정 도메인 지우기 (접속 주소로 복원)</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white border-2 border-blue-300 focus-within:border-blue-600 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 transition shadow-inner">
                  <span className="text-blue-600 select-none mr-1.5">https://</span>
                  <input
                    type="text"
                    value={customDomain.replace(/^https?:\/\//, '')}
                    onChange={(e) => {
                      const val = e.target.value.trim().replace(/^https?:\/\//, '');
                      setCustomDomain(val);
                      try {
                        if (val) {
                          localStorage.setItem('custom_deploy_domain', val);
                        } else {
                          localStorage.removeItem('custom_deploy_domain');
                        }
                      } catch {}
                    }}
                    placeholder="실제 배포된 Vercel 주소 (예: my-exam.vercel.app)"
                    className="w-full bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400 font-mono"
                  />
                </div>
              </div>

              {customDomain && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl text-[11px] leading-relaxed flex items-start gap-2">
                  <span className="text-amber-600 font-bold">⚠️ 주의:</span>
                  <div className="flex-1">
                    현재 입력된 도메인(<code className="font-mono font-bold">{customDomain}</code>)으로 링크가 복사됩니다. 아직 Vercel에 실제로 배포되지 않았거나 주소에 오타가 있으면 접속 시 <strong>'연결할 수 없음'</strong> 에러가 발생합니다. 배포 전이시라면 위 <strong>[사용자 지정 도메인 지우기]</strong>를 눌러주세요.
                  </div>
                </div>
              )}

              <div className="bg-white/90 border border-blue-200/70 rounded-xl p-2.5 text-[11px] text-blue-900 leading-relaxed space-y-1.5">
                <div>
                  🚀 <strong>자동 감지 기본 작동:</strong> Vercel 배포 후 생성된 주소(예: <code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono font-bold text-blue-950">https://your-app.vercel.app</code>)로 접속하시면, <strong>코드를 단 한 줄도 수정하지 않아도 해당 Vercel 주소가 100% 자동 감지</strong>되어 복사 링크에 즉시 반영됩니다.
                </div>
                <div>
                  💡 <strong>지금 테스트할 때:</strong> AI Studio 환경에서는 다른 브라우저나 교실 화면에서도 접속 가능한 <strong>공개 공유 주소(ais-pre-)</strong>가 자동으로 복사되므로, 별도 입력 없이 기본 주소 그대로 복사하셔도 안전하게 연결됩니다.
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* 1. Classroom Display URL */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    교실 전자칠판 모드 주소
                  </span>
                  <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    교실 디스플레이 전용
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  교실 전자칠판에 띄우는 주소로, 관리자 메뉴 없이 전자칠판 전체화면으로 실행됩니다.
                </p>
                <div className="font-mono text-[11px] bg-white border border-emerald-200 text-emerald-900 rounded-lg p-2 break-all font-semibold select-all">
                  {getFullUrl('classroom')}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyLink('classroom')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                >
                  {copiedType === 'classroom' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>전자칠판 주소 복사</span>
                    </>
                  )}
                </button>

                {onOpenClassroomMode && (
                  <button
                    type="button"
                    onClick={onOpenClassroomMode}
                    className="flex items-center gap-1 py-1.5 px-3 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer"
                    title="지금 바로 전자칠판 화면으로 전환"
                  >
                    <span>열기</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Admin Management URL */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    관리자 편집 모드 주소
                  </span>
                  <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                    교사용/관리자 전용
                  </span>
                </div>
                <p className="text-[11px] text-indigo-800 font-medium">
                  교무실 등에서 시험 시간표를 편집하거나 공지사항 및 음향 설정을 변경하는 주소입니다.
                </p>
                <div className="font-mono text-[11px] bg-white border border-indigo-200 text-indigo-900 rounded-lg p-2 break-all font-semibold select-all">
                  {getFullUrl('admin')}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyLink('admin')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                >
                  {copiedType === 'admin' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>관리자 주소 복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
