import React, { useRef, useState } from 'react';
import {
  School,
  Upload,
  RotateCcw,
  CheckCircle2,
  Image as ImageIcon,
  Sparkles,
  Info,
  Wand2,
  Sliders,
  Eye,
  Loader2,
} from 'lucide-react';
import { makeImageBackgroundTransparent } from '../utils/imageTransparency';

interface SchoolLogoCardProps {
  schoolLogo: string | null;
  onChangeLogo: (logo: string | null) => void;
  fullTitle?: string;
}

export const SchoolLogoCard: React.FC<SchoolLogoCardProps> = ({
  schoolLogo,
  onChangeLogo,
  fullTitle = '2026학년도 2학기 1차 고사 시간표',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto transparency options
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);
  const [tolerance, setTolerance] = useState<number>(40);
  const [originalFileSrc, setOriginalFileSrc] = useState<string | null>(null);

  // Emblem background mode on chalkboard: 'white' | 'transparent'
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

  const handleUpdateEmblemBgMode = (mode: 'white' | 'transparent') => {
    setEmblemBgMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('school_emblem_bg_mode', mode);
      } catch {}
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(PNG, JPG, SVG, WebP 등)만 첨부할 수 있습니다.');
      return;
    }

    // Read original file as DataURL
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      setOriginalFileSrc(rawDataUrl);

      if (autoRemoveBg) {
        setIsProcessing(true);
        try {
          const result = await makeImageBackgroundTransparent(rawDataUrl, {
            tolerance,
            feather: 12,
            maxDimension: 800,
          });

          onChangeLogo(result.dataUrl);

          if (result.isAlreadyTransparent) {
            setSuccessMsg('학교 마크가 첨부되었습니다 (이미 투명 배경 PNG입니다).');
          } else {
            setSuccessMsg('✨ 학교 마크 배경이 자동으로 투명화되어 저장되었습니다!');
          }
        } catch {
          // Fallback to raw data url if processing fails
          onChangeLogo(rawDataUrl);
          setSuccessMsg('학교 마크가 성공적으로 첨부되었습니다.');
        } finally {
          setIsProcessing(false);
          setTimeout(() => setSuccessMsg(null), 3500);
        }
      } else {
        onChangeLogo(rawDataUrl);
        setSuccessMsg('학교 마크가 원본 그대로 첨부되었습니다.');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  // Re-process current image with different tolerance or mode
  const handleReapplyTransparency = async (newTolerance: number) => {
    const targetSource = originalFileSrc || schoolLogo;
    if (!targetSource) return;

    setTolerance(newTolerance);
    setIsProcessing(true);
    try {
      const result = await makeImageBackgroundTransparent(targetSource, {
        tolerance: newTolerance,
        feather: 12,
        maxDimension: 800,
      });

      onChangeLogo(result.dataUrl);
      setSuccessMsg(`✨ 감도(${newTolerance})를 적용하여 배경을 다시 투명화했습니다!`);
    } catch {
      setSuccessMsg('투명화 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleToggleAutoRemove = async () => {
    const next = !autoRemoveBg;
    setAutoRemoveBg(next);

    if (next) {
      // Apply transparency
      if (originalFileSrc) {
        setIsProcessing(true);
        try {
          const result = await makeImageBackgroundTransparent(originalFileSrc, {
            tolerance,
            feather: 12,
          });
          onChangeLogo(result.dataUrl);
          setSuccessMsg('✨ 배경 자동 투명화가 적용되었습니다.');
        } finally {
          setIsProcessing(false);
          setTimeout(() => setSuccessMsg(null), 2500);
        }
      }
    } else {
      // Revert to original
      if (originalFileSrc) {
        onChangeLogo(originalFileSrc);
        setSuccessMsg('원본 배경 이미지로 복원되었습니다.');
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Sample Preset Emblems
  const presetEmblems = [
    {
      id: 'default',
      name: '기본 高 마크',
      desc: '전통 붉은 원형 高 엠블럼',
      data: null,
    },
    {
      id: 'laurel',
      name: '월계수 엠블럼',
      desc: '청색 월계수 & 펜 마크',
      data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%231e3a8a" stroke="%23fbbf24" stroke-width="4"/><path d="M50 20 L58 38 L78 38 L62 50 L68 70 L50 58 L32 70 L38 50 L22 38 L42 38 Z" fill="%23fbbf24"/><circle cx="50" cy="50" r="24" fill="%231e3a8a"/><text x="50" y="58" font-size="20" font-weight="900" text-anchor="middle" fill="%23ffffff" font-family="sans-serif">高</text></svg>',
    },
    {
      id: 'emerald',
      name: '녹색 명문고 마크',
      desc: '에메랄드 방패 엠블럼',
      data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23064e3b" stroke="%2334d399" stroke-width="4"/><polygon points="50,15 80,30 75,70 50,88 25,70 20,30" fill="%23047857" stroke="%23a7f3d0" stroke-width="2"/><text x="50" y="60" font-size="24" font-weight="900" text-anchor="middle" fill="%23fef08a" font-family="sans-serif">學</text></svg>',
    },
    {
      id: 'crest',
      name: '황금빛 학문 마크',
      desc: '골드 & 네이비 명예 마크',
      data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%230f172a" stroke="%23f59e0b" stroke-width="4"/><circle cx="50" cy="50" r="38" fill="%23b45309" stroke="%23fbbf24" stroke-width="2"/><text x="50" y="60" font-size="26" font-weight="900" text-anchor="middle" fill="%23ffffff" font-family="sans-serif">校</text></svg>',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-md p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                학교 마크(로고) 첨부 및 자동 투명 배경 처리
              </h3>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                자동 배경 투명화 지원
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              학교 마크 이미지를 넣으면 <strong className="text-emerald-700">흰색/단색 배경을 자동으로 투명화</strong>하여 전자칠판 제목 앞에 깔끔하게 저장됩니다.
            </p>
          </div>
        </div>

        {/* Reset button */}
        {schoolLogo && (
          <button
            type="button"
            onClick={() => {
              onChangeLogo(null);
              setOriginalFileSrc(null);
              setSuccessMsg('기본 마크로 초기화되었습니다.');
              setTimeout(() => setSuccessMsg(null), 2500);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:border-rose-400 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본 마크(高)로 초기화</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Auto Transparency Mode Settings Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-xs sm:text-sm">
                자동 배경 투명화(누끼) 설정
              </span>
              <button
                type="button"
                onClick={handleToggleAutoRemove}
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition cursor-pointer ${
                  autoRemoveBg
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {autoRemoveBg ? '✓ 자동 투명화 켜짐' : '꺼짐 (원본 유지)'}
              </button>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              JPG나 흰색 배경이 있는 마크 이미지를 올리면 자동으로 배경을 날려 투명 PNG로 변환합니다.
            </p>
          </div>
        </div>

        {/* Tolerance options if logo exists */}
        {schoolLogo && (
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-emerald-600" />
              투명화 감도:
            </span>
            {[
              { label: '부드럽게(25)', val: 25 },
              { label: '표준(40)', val: 40 },
              { label: '강력하게(60)', val: 60 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                disabled={isProcessing}
                onClick={() => handleReapplyTransparency(p.val)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  tolerance === p.val
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={`배경 제거 감도를 ${p.val}로 설정하여 다시 투명화`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chalkboard Header Live Preview with Checkerboard comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 flex-wrap gap-2">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>전자칠판 상단 실제 표시 미리보기</span>
          </span>

          {/* Emblem Background Style Toggle */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 font-medium">칠판 배지 배경:</span>
            <button
              type="button"
              onClick={() => handleUpdateEmblemBgMode('white')}
              className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer border ${
                emblemBgMode === 'white'
                  ? 'bg-white text-slate-900 border-emerald-500 shadow-2xs font-black'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              화이트 원형
            </button>
            <button
              type="button"
              onClick={() => handleUpdateEmblemBgMode('transparent')}
              className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer border ${
                emblemBgMode === 'transparent'
                  ? 'bg-slate-900 text-yellow-300 border-yellow-400 shadow-2xs font-black'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              투명/다크 칠판
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-b from-[#111925] via-[#0c121c] to-[#070b12] rounded-2xl p-4 border-4 border-[#1e2838] shadow-[inset_0_4px_24px_rgba(0,0,0,0.9)] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Subtle Chalkboard Texture Overlay */}
          <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.08]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)] opacity-80" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            {/* School Emblem Preview */}
            {schoolLogo ? (
              <div
                className={`w-12 h-12 rounded-full border-2 border-yellow-400 p-1 flex items-center justify-center shadow-lg shrink-0 overflow-hidden transition-colors ${
                  emblemBgMode === 'white'
                    ? 'bg-white/95'
                    : 'bg-slate-900/60 backdrop-blur-xs'
                }`}
                title="적용된 학교 마크"
              >
                <img
                  src={schoolLogo}
                  alt="학교 마크 미리보기"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-700 border-2 border-yellow-400 flex items-center justify-center shadow-lg shrink-0">
                <div className="w-9 h-9 rounded-full border border-yellow-300/80 flex items-center justify-center text-yellow-300 font-black text-sm tracking-tighter">
                  高
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] text-amber-300 font-bold block">
                전자칠판 제목 (다크 모드 텍스처 적용됨)
              </span>
              <h4 className="text-base sm:text-xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                {fullTitle}
              </h4>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {schoolLogo && (
              <div
                className="w-8 h-8 rounded-lg border border-slate-600 p-0.5 flex items-center justify-center shadow-inner overflow-hidden"
                style={{
                  backgroundImage:
                    'repeating-conic-gradient(#cbd5e1 0% 25%, #f8fafc 0% 50%)',
                  backgroundSize: '8px 8px',
                }}
                title="투명 배경 바둑판 검증창"
              >
                <img
                  src={schoolLogo}
                  alt="투명 상태"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="bg-[#070c14]/95 border border-amber-400/80 rounded-lg px-3 py-1.5 text-xs font-black text-yellow-300 shadow-sm">
              {schoolLogo ? '✓ 학교 마크 적용 중 (투명 PNG)' : '기본 高 엠블럼'}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone & Presets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`md:col-span-7 border-2 border-dashed rounded-2xl p-5 text-center flex flex-col items-center justify-center transition cursor-pointer select-none relative ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50 scale-[1.01]'
              : 'border-slate-300 hover:border-emerald-400 bg-slate-50/70 hover:bg-emerald-50/30'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-4 text-emerald-700 animate-pulse">
              <Loader2 className="w-10 h-10 animate-spin mb-2 text-emerald-600" />
              <p className="text-sm font-black text-slate-800">
                ✨ 학교 마크 배경 자동 투명화(누끼) 처리 중...
              </p>
              <p className="text-xs text-slate-500 mt-1">
                흰색 및 외곽 단색 배경을 감지하여 투명 PNG로 변환하고 있습니다.
              </p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>

              <p className="text-sm font-bold text-slate-800 mb-1">
                학교 마크 이미지 파일 첨부하기 (클릭 또는 드래그)
              </p>
              <p className="text-xs text-slate-500 mb-2">
                PNG, JPG, SVG, WebP 파일 지원 • <strong className="text-emerald-700 font-bold">흰색 배경 자동 투명화</strong>
              </p>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition">
                  <ImageIcon className="w-3.5 h-3.5" />
                  내 컴퓨터에서 마크 파일 선택
                </span>
                {originalFileSrc && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAutoRemove();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    {autoRemoveBg ? '원본 배경으로 보기' : '투명 배경으로 보기'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Preset Badges Selector */}
        <div className="md:col-span-5 bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold text-slate-700 block mb-2">
              샘플 프리셋 엠블럼 빠른 선택
            </span>
            <div className="grid grid-cols-2 gap-2">
              {presetEmblems.map((preset) => {
                const isSelected =
                  preset.data === null
                    ? schoolLogo === null
                    : schoolLogo === preset.data;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onChangeLogo(preset.data);
                      setOriginalFileSrc(preset.data);
                      setSuccessMsg(`"${preset.name}"이(가) 적용되었습니다.`);
                      setTimeout(() => setSuccessMsg(null), 2500);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-100/60 ring-2 ring-emerald-400/30 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-slate-200 bg-white">
                      {preset.data ? (
                        <img
                          src={preset.data}
                          alt={preset.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-red-700 text-yellow-300 font-black text-[10px] flex items-center justify-center">
                          高
                        </div>
                      )}
                    </div>
                    <div className="truncate text-xs">
                      <span className="block truncate font-bold text-slate-900">
                        {preset.name}
                      </span>
                      <span className="block text-[10px] text-slate-500 truncate">
                        {preset.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-start gap-1 pt-1 border-t border-slate-200">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>설정한 마크는 배경 투명화 처리된 PNG 형태로 자동 저장되어 유지됩니다.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
