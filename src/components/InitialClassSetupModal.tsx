import React, { useState, useEffect } from 'react';
import { School, Monitor, ChevronDown, Link as LinkIcon, Building2, Wand2, Sparkles, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { generateSchoolSlug, cleanSlug, convertKoreanQwertyToEnglish, hasHangul } from '../utils/slugUtils';
import { listCloudSchools, fetchSchoolScheduleFromCloud } from '../services/firebase';

interface InitialClassSetupModalProps {
  isOpen: boolean;
  onSave: (grade: string, classNum: string, schoolName: string, schoolSlug: string) => void;
  onClose?: () => void;
  maxClasses?: number;
  initialSchoolName?: string;
  initialSchoolSlug?: string;
}

export const InitialClassSetupModal: React.FC<InitialClassSetupModalProps> = ({
  isOpen,
  onSave,
  maxClasses = 15,
  initialSchoolName = '사직여자고등학교',
  initialSchoolSlug = 'sajik-girls-high',
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('2');
  const [classNum, setClassNum] = useState<string>('3');
  const [schoolName, setSchoolName] = useState<string>(initialSchoolName || '사직여자고등학교');
  const [schoolSlug, setSchoolSlug] = useState<string>(initialSchoolSlug || 'sajik-girls-high');
  const [cloudSchools, setCloudSchools] = useState<Array<{ slug: string; name: string; updatedAt?: string }>>([]);
  const [isConnectingCloud, setIsConnectingCloud] = useState<boolean>(false);
  const [cloudConnectMessage, setCloudConnectMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSchoolName(initialSchoolName || '사직여자고등학교');
      setSchoolSlug(initialSchoolSlug || 'sajik-girls-high');
      setCloudConnectMessage(null);
      listCloudSchools().then((list) => {
        setCloudSchools(list);
        // If there is a cloud school matching current schoolName, automatically align slug
        const cleanCurrent = (initialSchoolName || '사직여자고등학교').replace(/\s+/g, '');
        const matched = list.find(
          (item) =>
            item.name.replace(/\s+/g, '') === cleanCurrent ||
            (cleanCurrent.includes('사직') && (item.name.includes('사직') || item.slug.includes('sajik')))
        );
        if (matched) {
          setSchoolSlug(matched.slug);
          setCloudConnectMessage({
            type: 'success',
            text: `Firebase 클라우드에서 '${matched.name}' (${matched.slug}) 데이터를 찾았습니다!`,
          });
        }
      });
    }
  }, [isOpen, initialSchoolName, initialSchoolSlug]);

  if (!isOpen) return null;

  const handleSchoolNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSchoolName(val);
    setCloudConnectMessage(null);
    if (val.trim()) {
      const cleanTyped = val.replace(/\s+/g, '');
      // 1. Check if any existing Firebase school matches the typed school name
      const matchedCloud = cloudSchools.find(
        (s) =>
          s.name.replace(/\s+/g, '') === cleanTyped ||
          (cleanTyped.includes('사직') && (s.name.includes('사직') || s.slug.includes('sajik')))
      );
      if (matchedCloud) {
        setSchoolSlug(matchedCloud.slug);
        setCloudConnectMessage({
          type: 'success',
          text: `클라우드에 저장된 '${matchedCloud.name}' 데이터(${matchedCloud.slug})와 자동 연결됩니다.`,
        });
      } else {
        const generated = generateSchoolSlug(val);
        setSchoolSlug(generated);
      }
    }
  };

  const handleConnectCloudData = async () => {
    const targetName = schoolName.trim() || '사직여자고등학교';
    const targetSlug = cleanSlug(schoolSlug, true) || generateSchoolSlug(targetName);
    setIsConnectingCloud(true);
    setCloudConnectMessage(null);
    try {
      const res = await fetchSchoolScheduleFromCloud(targetSlug, targetName);
      if (res.scheduleData && res.scheduleData.length > 0) {
        const finalName = res.schoolName || targetName;
        const finalSlug = res.resolvedSlug || targetSlug;
        setSchoolName(finalName);
        setSchoolSlug(finalSlug);
        setCloudConnectMessage({
          type: 'success',
          text: `연결 성공! Firebase에서 '${finalName}' 시간표(${res.scheduleData.length}일치)를 불러왔습니다.`,
        });
      } else {
        setCloudConnectMessage({
          type: 'info',
          text: `클라우드 확인 완료: '${targetName}'(${targetSlug}) 주소로 즉시 연동됩니다.`,
        });
      }
    } catch {
      setCloudConnectMessage({
        type: 'info',
        text: '클라우드 조회 중 일시적 오류가 발생했으나 시작 시 자동 동기화됩니다.',
      });
    } finally {
      setIsConnectingCloud(false);
    }
  };

  const handleAutoSlug = () => {
    if (schoolName.trim()) {
      const generated = generateSchoolSlug(schoolName);
      setSchoolSlug(generated);
    } else {
      setSchoolSlug('sajik-girls-high');
    }
  };

  const handleSlugConvertEnglish = () => {
    if (!schoolSlug.trim()) return;
    if (/^[ㄱ-ㅎㅏ-ㅣ\s_-]+$/.test(schoolSlug)) {
      setSchoolSlug(convertKoreanQwertyToEnglish(schoolSlug));
    } else if (hasHangul(schoolSlug)) {
      setSchoolSlug(generateSchoolSlug(schoolSlug));
    } else {
      setSchoolSlug(cleanSlug(schoolSlug));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSchoolName = schoolName.trim() || '사직여자고등학교';
    let finalSchoolSlug = cleanSlug(schoolSlug, true);
    if (!finalSchoolSlug) {
      finalSchoolSlug = generateSchoolSlug(finalSchoolName);
    }
    if (!classNum.trim()) {
      alert('반을 선택해 주세요.');
      return;
    }
    onSave(selectedGrade, classNum.trim(), finalSchoolName, finalSchoolSlug);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-white space-y-5">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
            <School className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            학교 고유 주소 및 교실 초기 설정
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            학교명(예: <strong className="text-emerald-400">사직여자고등학교</strong>)을 입력하면<br />
            Firebase에 저장된 시간표 데이터와 자동으로 연결됩니다.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* School Name Input + Quick Connect */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>학교명 (입력 시 Firebase 데이터 자동 매칭)</span>
              </label>
              <button
                type="button"
                onClick={handleConnectCloudData}
                disabled={isConnectingCloud}
                className="text-[11px] font-black text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                title="입력한 학교명으로 Firebase 클라우드 시간표 즉시 조회 및 연결"
              >
                {isConnectingCloud ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Cloud className="w-3 h-3" />
                )}
                <span>파이어베이스 데이터 불러오기</span>
              </button>
            </div>
            <input
              type="text"
              value={schoolName}
              onChange={handleSchoolNameChange}
              placeholder="학교 이름을 입력하세요 (예: 사직여자고등학교)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition"
              required
            />

            {/* Quick select buttons for 사직여자고등학교 & any discovered cloud schools */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-400 font-bold">빠른 선택:</span>
              <button
                type="button"
                onClick={() => {
                  setSchoolName('사직여자고등학교');
                  const matched = cloudSchools.find((s) => s.name.includes('사직') || s.slug.includes('sajik'));
                  setSchoolSlug(matched ? matched.slug : 'sajik-girls-high');
                }}
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border transition cursor-pointer ${
                  schoolName.includes('사직')
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                🏫 사직여자고등학교
              </button>
              {cloudSchools
                .filter((s) => !s.name.includes('사직') && s.name !== '한국고등학교')
                .slice(0, 3)
                .map((cs) => (
                  <button
                    key={cs.slug}
                    type="button"
                    onClick={() => {
                      setSchoolName(cs.name);
                      setSchoolSlug(cs.slug);
                      setCloudConnectMessage({
                        type: 'success',
                        text: `클라우드의 '${cs.name}' (${cs.slug}) 데이터로 연결되었습니다.`,
                      });
                    }}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      schoolSlug === cs.slug
                        ? 'bg-blue-500/20 text-blue-300 border-blue-400/50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    ☁️ {cs.name}
                  </button>
                ))}
            </div>

            {cloudConnectMessage && (
              <div
                className={`mt-1.5 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  cloudConnectMessage.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{cloudConnectMessage.text}</span>
              </div>
            )}
          </div>

          {/* School Slug / Unique Address Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>고유 접속 영문 주소 (슬러그)</span>
              </label>
              <div className="flex items-center gap-2">
                {hasHangul(schoolSlug) && (
                  <button
                    type="button"
                    onClick={handleSlugConvertEnglish}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 transition"
                    title="한글을 영문 슬러그로 자동 변환"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>영문으로 변환</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAutoSlug}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 transition"
                  title="학교명에 맞춰 영문 슬러그 자동 생성"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>자동생성</span>
                </button>
              </div>
            </div>

            <div className="flex items-center bg-slate-950 border border-slate-700 focus-within:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-400 transition">
              <span className="text-emerald-400 font-mono shrink-0 select-none">#school:</span>
              <input
                type="text"
                value={schoolSlug}
                onChange={(e) => {
                  const raw = e.target.value;
                  setSchoolSlug(raw.replace(/\s+/g, '-'));
                }}
                onBlur={() => {
                  if (schoolSlug.trim()) {
                    if (/^[ㄱ-ㅎㅏ-ㅣ\s_-]+$/.test(schoolSlug)) {
                      setSchoolSlug(convertKoreanQwertyToEnglish(schoolSlug));
                    } else if (hasHangul(schoolSlug)) {
                      setSchoolSlug(generateSchoolSlug(schoolSlug));
                    } else {
                      setSchoolSlug(cleanSlug(schoolSlug, false));
                    }
                  }
                }}
                placeholder="sajik-girls-high"
                className="w-full bg-transparent text-white font-mono font-bold px-1.5 focus:outline-none"
                required
              />
              <span className="text-slate-500 font-mono text-[11px] shrink-0 select-none">:classroom</span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>사직여고 기본 주소: sajik-girls-high</span>
              <span className="text-emerald-400/80 font-mono">예: sajik-girls-high</span>
            </p>
          </div>

          {/* Grade selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>학년 선택</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3'].map((g) => {
                const isSelected = selectedGrade === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrade(g)}
                    className={`py-2.5 rounded-xl font-black text-sm transition cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {g}학년
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>반 선택</span>
            </label>
            <div className="relative">
              <select
                value={classNum}
                onChange={(e) => setClassNum(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-black text-center text-base focus:outline-none focus:border-emerald-500 transition shadow-inner appearance-none cursor-pointer"
                required
              >
                {Array.from({ length: maxClasses }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)} className="bg-slate-900 text-white py-2">
                    {n}반
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 px-6 rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm mt-2"
          >
            <Monitor className="w-4 h-4" />
            <span>파이어베이스 연동 및 전자칠판 시작하기</span>
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-500">
          ※ 학교명을 입력하고 시작하면 파이어베이스에 저장된 시간표·학급 총원이 즉시 동기화됩니다.
        </div>

      </div>
    </div>
  );
};

