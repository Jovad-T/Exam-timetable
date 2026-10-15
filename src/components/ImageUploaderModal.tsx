import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Sparkles, FileText, FileImage, AlertCircle, CheckCircle, RefreshCw, Cpu, Brain, Key } from 'lucide-react';
import { ScheduleData } from '../types/schedule';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { getGeminiApiKey, saveGeminiApiKey, getGeminiModel, saveGeminiModel } from '../utils/apiKeyStorage';
import { extractScheduleWithClientGemini } from '../utils/geminiClientExtractor';

// Configure pdf.js worker from cdn
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ImageUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractSuccess: (extractedData: ScheduleData) => void;
}

export const ImageUploaderModal: React.FC<ImageUploaderModalProps> = ({
  isOpen,
  onClose,
  onExtractSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image');
  const [extractedText, setExtractedText] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [fileName, setFileName] = useState<string>('');
  
  // AI Model & Thinking options
  const [modelChoice, setModelChoice] = useState<string>(() => getGeminiModel() || 'gemini-3.8-flash');
  const [thinkingLevel, setThinkingLevel] = useState<string>('balanced');
  const [customApiKey, setCustomApiKey] = useState<string>(() => getGeminiApiKey() || '');
  const [customGroqApiKey, setCustomGroqApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('custom_groq_key') || '';
    return '';
  });
  const [showApiKeySettings, setShowApiKeySettings] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('준비 중...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Sync API key when opened
    if (isOpen) {
      const storedKey = getGeminiApiKey();
      if (storedKey) setCustomApiKey(storedKey);
      const storedModel = getGeminiModel();
      if (storedModel) setModelChoice(storedModel);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      setErrorMsg('이미지 파일(PNG, JPG, WEBP) 또는 PDF 문서만 업로드할 수 있습니다.');
      return;
    }

    setFileName(file.name);
    const sizeInKb = (file.size / 1024).toFixed(1);
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    setFileSizeStr(file.size > 1024 * 1024 ? `${sizeInMb} MB` : `${sizeInKb} KB`);
    setErrorMsg(null);

    // 1. Convert any image or PDF file to Data URL (base64) for native Gemini Multimodal analysis
    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMsg('파일을 읽는 도중 오류가 발생했습니다. 다른 파일을 선택해주세요.');
    };

    reader.onload = async () => {
      const base64Data = reader.result as string;
      setSelectedFile(base64Data);

      if (isPdf) {
        setFileType('pdf');
        setMimeType('application/pdf');

        // 2. Safely attempt supplementary text extraction if possible (never blocking or showing errors if worker fails)
        try {
          const arrayBuffer = await file.arrayBuffer();
          if (pdfjsLib && pdfjsLib.getDocument) {
            const loadingTask = pdfjsLib.getDocument({
              data: arrayBuffer,
              isEvalSupported: false,
              useWorkerFetch: false,
            });
            const pdfDoc = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= Math.min(pdfDoc.numPages, 10); i++) {
              const page = await pdfDoc.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += `--- [Page ${i}] ---\n${pageText}\n\n`;
            }
            if (fullText.trim()) {
              setExtractedText(fullText);
            }
          }
        } catch {
          console.info('PDF local text extraction skipped; using direct multimodal AI vision parsing.');
        }
      } else {
        setFileType('image');
        setMimeType(file.type || 'image/jpeg');
        setExtractedText('');
      }
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMsg('분석할 시간표 이미지나 PDF 파일을 먼저 선택해주세요.');
      return;
    }

    setLoading(true);
    setLoadingStep('AI 시간표 분석 시작...');
    setErrorMsg(null);

    const effectiveApiKey = (customApiKey || getGeminiApiKey() || '').trim();

    try {
      // If user provided a Gemini key and chose a Gemini model, we can run direct client-side extraction first
      // OR try server route with automatic fallback to client-side
      const isGemini = !modelChoice.startsWith('groq-');

      if (isGemini && effectiveApiKey) {
        setLoadingStep('Gemini AI 직접 분석 중 (브라우저 직접 연결)...');
        try {
          const clientResult = await extractScheduleWithClientGemini({
            apiKey: effectiveApiKey,
            imageBase64: selectedFile,
            mimeType: fileType === 'pdf' ? 'application/pdf' : (mimeType || 'image/jpeg'),
            extractedText,
            modelChoice,
            thinkingLevel,
          });

          if (Array.isArray(clientResult) && clientResult.length > 0) {
            onExtractSuccess(clientResult);
            onClose();
            return;
          }
        } catch (directErr: any) {
          console.warn('Direct client Gemini attempt failed, trying backend route:', directErr);
          // If direct client attempt failed due to invalid API key, throw user-friendly error
          if (directErr.message?.includes('API_KEY_INVALID') || directErr.message?.includes('403')) {
            throw new Error('Gemini API 키가 유효하지 않습니다. Google AI Studio에서 키를 다시 확인해주세요.');
          }
        }
      }

      // Otherwise try server endpoint
      setLoadingStep('서버 AI 엔진에 요청 전송 중...');
      const payload: any = {
        modelChoice,
        thinkingLevel,
        imageBase64: selectedFile,
        mimeType: fileType === 'pdf' ? 'application/pdf' : (mimeType || 'image/jpeg'),
        customApiKey: effectiveApiKey,
        customGroqApiKey,
      };

      if (extractedText && extractedText.trim()) {
        payload.extractedText = extractedText;
      }

      const response = await fetch('/api/extract-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // SAFE JSON PARSING: Avoid "Unexpected token 'A', 'A server e'..." crashes
      const responseText = await response.text();
      let resData: any = null;
      try {
        resData = JSON.parse(responseText);
      } catch {
        // Server returned non-JSON (e.g. HTML 500 error page "A server error occurred...")
        if (isGemini && effectiveApiKey) {
          setLoadingStep('서버 응답 오류로 브라우저 직접 분석으로 재시도 중...');
          const fallbackResult = await extractScheduleWithClientGemini({
            apiKey: effectiveApiKey,
            imageBase64: selectedFile,
            mimeType: fileType === 'pdf' ? 'application/pdf' : (mimeType || 'image/jpeg'),
            extractedText,
            modelChoice,
            thinkingLevel,
          });
          if (Array.isArray(fallbackResult) && fallbackResult.length > 0) {
            onExtractSuccess(fallbackResult);
            onClose();
            return;
          }
        }

        throw new Error(
          `서버 오류 (${response.status}): Vercel 또는 서버에서 처리에 실패했습니다. 관리자 설정(⚙️)에서 Gemini API 키를 저장하시면 브라우저에서 직접 안정적으로 분석할 수 있습니다.`
        );
      }

      if (!response.ok || !resData?.success) {
        // If server returned failure and we have an API key, try direct client fallback
        if (isGemini && effectiveApiKey) {
          setLoadingStep('브라우저 직접 분석으로 재시도 중...');
          const fallbackResult = await extractScheduleWithClientGemini({
            apiKey: effectiveApiKey,
            imageBase64: selectedFile,
            mimeType: fileType === 'pdf' ? 'application/pdf' : (mimeType || 'image/jpeg'),
            extractedText,
            modelChoice,
            thinkingLevel,
          });
          if (Array.isArray(fallbackResult) && fallbackResult.length > 0) {
            onExtractSuccess(fallbackResult);
            onClose();
            return;
          }
        }

        throw new Error(resData?.error || '시간표 추출에 실패했습니다.');
      }

      if (Array.isArray(resData.data) && resData.data.length > 0) {
        onExtractSuccess(resData.data);
        onClose();
      } else {
        throw new Error('시간표 데이터를 감지하지 못했습니다. 명확한 시간표 파일을 올려주세요.');
      }
    } catch (err: any) {
      console.error('Schedule extract error:', err);
      const msg = err.message || 'AI 문서 파싱 중 오류가 발생했습니다.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden relative animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">시험 시간표 AI 자동 분석기</h3>
              <p className="text-xs text-slate-400">PDF 및 이미지 ➔ 교시별·과목별 정밀 시간표 데이터 자동 생성</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          
          {/* AI Model & Thinking Level Selectors */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" /> AI 파싱 엔진 & 모델 선택
              </label>
              <select
                value={modelChoice}
                onChange={(e) => {
                  setModelChoice(e.target.value);
                  saveGeminiModel(e.target.value);
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (권장 - 최신 초고속 & 최고 정확도)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (복잡한 표/다중 날짜 심층 추론)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (안정적 고속)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (레거시 호환)</option>
                <option value="groq-llama-3.3-70b">Groq Llama 3.3 70B (초고속 대형언어모델)</option>
                <option value="groq-deepseek-r1">Groq DeepSeek R1 (심층 추론)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-purple-600" /> 사고 수준 (Thinking Level)
              </label>
              <select
                value={thinkingLevel}
                onChange={(e) => setThinkingLevel(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="balanced">균형 (Balanced - 기본)</option>
                <option value="fast">고속 (Fast)</option>
                <option value="deep">심층 추론 (Deep Thinking / 정밀도 우선)</option>
              </select>
            </div>

            {/* Custom API Key Toggle & Inputs */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowApiKeySettings(!showApiKeySettings)}
                className="w-full flex items-center justify-between text-xs font-extrabold text-indigo-700 hover:text-indigo-950 transition py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" /> 커스텀 API 키 설정 {customApiKey ? '(등록됨 ✓)' : '(선택)'}
                </span>
                <span className="text-slate-500 text-[11px] font-bold">
                  {showApiKeySettings ? '접기 ▲' : '열기 ▼'}
                </span>
              </button>

              {showApiKeySettings && (
                <div className="mt-3 space-y-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Gemini API Key</span>
                      <span className="text-[10px] text-indigo-600 font-semibold">브라우저 직접 연결로 Vercel 오류 방지</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={customApiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomApiKey(val);
                          saveGeminiApiKey(val);
                        }}
                        placeholder="AIzaSy... (입력 시 브라우저에서 직접 분석 가능)"
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          saveGeminiApiKey(customApiKey);
                          alert('API 키가 안전하게 저장되었습니다!');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Groq API Key (Groq 모델 선택 시)</label>
                    <input
                      type="password"
                      value={customGroqApiKey}
                      onChange={(e) => {
                        setCustomGroqApiKey(e.target.value);
                        localStorage.setItem('custom_groq_key', e.target.value);
                      }}
                      placeholder="gsk_... (Groq 모델 사용 시 입력)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              selectedFile
                ? 'border-indigo-400 bg-indigo-50/40'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  {fileType === 'pdf' ? (
                    <FileText className="w-6 h-6" />
                  ) : (
                    <FileImage className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{fileName}</p>
                  <p className="text-[11px] text-slate-500">{fileSizeStr}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setExtractedText('');
                    setFileName('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline pt-1"
                >
                  다른 파일 선택하기
                </button>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    시험 시간표 이미지 또는 PDF 파일을 끌어다 놓거나 클릭하여 선택하세요
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    PNG, JPG, WEBP 또는 PDF 문서 지원
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-bold">분석 실패</p>
                <p className="text-rose-700 leading-relaxed whitespace-pre-line">{errorMsg}</p>
                {!customApiKey && (
                  <p className="text-[11px] text-indigo-700 font-semibold pt-1">
                    💡 팁: '커스텀 API 키 설정'을 열어 Gemini API 키를 등록하면 Vercel 서버 에러 없이 브라우저에서 직접 바로 분석할 수 있습니다.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !selectedFile}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-lg transition shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{loadingStep}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI 시간표 자동 분석 실행</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
