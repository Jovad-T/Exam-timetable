import React, { useState } from 'react';
import { School, Monitor, ChevronDown, Link as LinkIcon, Building2, Wand2, Sparkles, Check } from 'lucide-react';
import { generateSchoolSlug, cleanSlug, convertKoreanQwertyToEnglish, hasHangul } from '../utils/slugUtils';

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
  initialSchoolName = '한국고등학교',
  initialSchoolSlug = 'korea-high',
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('2');
  const [classNum, setClassNum] = useState<string>('3');
  const [schoolName, setSchoolName] = useState<string>(initialSchoolName);
  const [schoolSlug, setSchoolSlug] = useState<string>(initialSchoolSlug);

  if (!isOpen) return null;

  const handleSchoolNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSchoolName(val);
    // Automatically generate English slug if slug was empty, default, or matches previously generated slug
    if (val.trim()) {
      const generated = generateSchoolSlug(val);
      setSchoolSlug(generated);
    }
  };

  const handleAutoSlug = () => {
    if (schoolName.trim()) {
      const generated = generateSchoolSlug(schoolName);
      setSchoolSlug(generated);
    } else {
      setSchoolSlug('my-school');
    }
  };

  const handleSlugConvertEnglish = () => {
    if (!schoolSlug.trim()) return;
    // If it's Korean QWERTY
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
    const finalSchoolName = schoolName.trim() || '한국고등학교';
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
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-white space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
            <School className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            학교 고유 주소 및 교실 초기 설정
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            학교명을 입력하면 <strong className="text-emerald-400">영문 고유 주소(슬러그)</strong>가 자동 생성되며,<br />
            설치된 학년과 반을 설정해 주세요.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* School Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>학교명 (예: 서울고등학교, 한국고등학교)</span>
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={handleSchoolNameChange}
              placeholder="학교 이름을 입력하세요 (예: 서울고등학교)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition"
              required
            />
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
                  // Allow typing naturally without destroying composition or deleting letters
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
                placeholder="seoul-high"
                className="w-full bg-transparent text-white font-mono font-bold px-1.5 focus:outline-none"
                required
              />
              <span className="text-slate-500 font-mono text-[11px] shrink-0 select-none">:classroom</span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>영문 소문자, 숫자, 하이픈(-) 및 한글을 입력하실 수 있습니다.</span>
              <span className="text-emerald-400/80 font-mono">예: seoul-high</span>
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
            <span>고유 주소 생성 및 전자칠판 시작하기</span>
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-500">
          ※ 고유 주소를 통해 언제든지 이 학교의 시간표와 칠판 설정에 바로 접속할 수 있습니다.
        </div>

      </div>
    </div>
  );
};
