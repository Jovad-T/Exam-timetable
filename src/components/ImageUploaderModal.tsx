import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, FileText, FileImage, AlertCircle, CheckCircle, RefreshCw, Cpu, Brain } from 'lucide-react';
import { ScheduleData } from '../types/schedule';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

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
  const [modelChoice, setModelChoice] = useState<string>('gemini-3.8-flash');
  const [thinkingLevel, setThinkingLevel] = useState<string>('balanced');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const [fileSizeStr, setFileSizeStr] = useState<string>('');

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
          // Use safe worker fallback
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
        } catch (pdfErr) {
          // If browser blocks worker or PDF has no text layer, Gemini will read the PDF base64 directly with multimodal vision!
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
    setErrorMsg(null);

    try {
      const payload: any = {
        modelChoice,
        thinkingLevel,
        imageBase64: selectedFile,
        mimeType: fileType === 'pdf' ? 'application/pdf' : (mimeType || 'image/jpeg'),
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

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || '시간표 추출에 실패했습니다.');
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
              <h3 className="text-base font-bold text-white">PDF & 이미지 to Schedule AI 파싱 엔진</h3>
              <p className="text-xs text-slate-400">PDF(pdf.js 추출) 및 이미지 ➔ 다중 모델 AI 분석</p>
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
                onChange={(e) => setModelChoice(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (고성능 비전/텍스트)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (고정밀 분석)</option>
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
                <option value="fast">표준 (Fast / Standard)</option>
                <option value="balanced">균형 (Balanced)</option>
                <option value="deep">심층 추론 (Deep Thinking / Temp 0.0)</option>
              </select>
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
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3 w-full">
                {fileType === 'pdf' ? (
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs mx-auto flex items-center gap-3.5 max-w-md">
                    <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-200 text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
                      PDF
                    </div>
                    <div className="text-left truncate flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{fileName}</p>
                      <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {extractedText
                            ? `표 텍스트 감지 (${extractedText.length}자) + Gemini 비전 분석 준비됨`
                            : `Gemini 멀티모달 시각/표 구조 AI 분석 준비됨 (${fileSizeStr || 'PDF'})`}
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-hidden rounded-xl border border-slate-200 shadow-xs mx-auto flex items-center justify-center bg-slate-900/5">
                    <img
                      src={selectedFile}
                      alt="Uploaded Schedule"
                      className="max-h-56 object-contain rounded-xl"
                    />
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-lg max-w-xs mx-auto">
                  {fileType === 'pdf' ? <FileText className="w-4 h-4 shrink-0" /> : <FileImage className="w-4 h-4 shrink-0" />}
                  <span className="truncate">{fileName || '선택된 시험 시간표 파일'}</span>
                </div>
                <p className="text-xs text-slate-500">클릭하면 다른 파일로 교체합니다.</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    시험 시간표 PDF 또는 이미지를 이곳에 드래그하거나 클릭하여 선택하세요
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    지원 포맷: PDF (Gemini 비전 및 표 구조 직접 분석), PNG, JPG, WEBP
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Banner with helpful API Key guidance */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex flex-col gap-2 text-xs text-rose-900 font-medium animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-bold leading-relaxed">{errorMsg}</span>
              </div>
              {errorMsg.includes('GEMINI_API_KEY') && (
                <div className="p-3 bg-white/90 border border-rose-200 rounded-xl text-[11px] text-slate-700 leading-relaxed space-y-1">
                  <div className="font-extrabold text-rose-950 flex items-center gap-1.5">
                    <span>🔑 API 키 등록 안내:</span>
                  </div>
                  <div>
                    • <strong>Vercel 배포 시:</strong> Vercel 프로젝트 대시보드 ➔ <strong>[Settings]</strong> ➔ <strong>[Environment Variables]</strong>에서 Key: <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-bold text-rose-950">GEMINI_API_KEY</code> 를 등록해 주세요.
                  </div>
                  <div>
                    • <strong>로컬 개발 시:</strong> 프로젝트 루트의 <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">.env</code> 파일에 <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">GEMINI_API_KEY=your_key</code> 를 입력하시면 됩니다.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guidelines */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-800 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> PDF to Schedule 파싱 특징:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
              <li>PDF 문서 내부의 텍스트와 표 구조를 pdf.js로 안전하게 추출</li>
              <li>Gemini 또는 Groq(Llama 3.3, DeepSeek R1) 선택 및 사고 수준 설정</li>
              <li>일자별, 교시별, 과목별, 시험시간(분) 자동 구조화 JSON 변환</li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            취소
          </button>

          <button
            onClick={handleAnalyze}
            disabled={loading || (!selectedFile && !extractedText)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white transition shadow-sm cursor-pointer ${
              loading || (!selectedFile && !extractedText)
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>AI 문서 파싱 및 구조화 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>AI 시간표 데이터 추출 시작</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
