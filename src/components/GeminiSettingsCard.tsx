import React, { useState, useEffect } from 'react';
import { Key, Cpu, Save, CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
import { saveGeminiApiKey, getGeminiApiKey, saveGeminiModel, getGeminiModel } from '../utils/apiKeyStorage';
import { GoogleGenAI } from '@google/genai';

export const GeminiSettingsCard: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('gemini-3.8-flash');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load decrypted key and model from secure storage
    const storedKey = getGeminiApiKey();
    if (storedKey) {
      setApiKey(storedKey);
    }
    const storedModel = getGeminiModel();
    if (storedModel) {
      setModel(storedModel);
    }
  }, []);

  const handleSave = () => {
    saveGeminiApiKey(apiKey);
    saveGeminiModel(model);
    setSaveSuccess(true);
    setTestResult(null);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setTestResult({ success: false, message: '먼저 Gemini API Key를 입력해주세요.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const client = new GoogleGenAI({ apiKey: keyToTest });
      // Quick test using gemini-3.8-flash
      const response = await client.models.generateContent({
        model: model || 'gemini-3.8-flash',
        contents: 'Ping test. Reply with OK.',
      });

      if (response && response.text) {
        setTestResult({
          success: true,
          message: `API 키 검증 성공! (${model} 모델 정상 응답)`,
        });
        // Auto-save when valid
        saveGeminiApiKey(keyToTest);
        saveGeminiModel(model);
      } else {
        throw new Error('응답을 받지 못했습니다.');
      }
    } catch (err: any) {
      console.error('Gemini API test error:', err);
      const errMsg = err?.message || String(err);
      let friendlyMsg = 'API 키 인증에 실패했습니다.';
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('403') || errMsg.includes('invalid')) {
        friendlyMsg = '유효하지 않은 API 키입니다. Google AI Studio에서 키를 다시 확인해주세요.';
      } else if (errMsg.includes('404') || errMsg.includes('not found')) {
        friendlyMsg = `선택한 모델(${model})을 찾을 수 없습니다. Gemini 2.5 Flash를 선택해보세요.`;
      } else {
        friendlyMsg = `연결 오류: ${errMsg}`;
      }
      setTestResult({ success: false, message: friendlyMsg });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-600" /> AI API 설정 (Google Gemini)
        </h3>
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          안전 암호화 로컬 보관
        </span>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        시간표 이미지 및 PDF 고속 AI 파싱에 사용할 Gemini API 키를 등록합니다.
        저장된 키는 암호화되어 브라우저에 안전하게 보관되며 시험 시간표 분석 시에만 사용됩니다.
      </p>
      
      <div className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Gemini API Key</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
            >
              Google AI Studio에서 무료 발급 받기 <ExternalLink className="w-3 h-3" />
            </a>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIzaSy로 시작하는 API 키 입력..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pr-9 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title={showKey ? '키 숨기기' : '키 보기'}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            {/* Primary Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow-xs cursor-pointer shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>저장하기</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" /> AI 분석 모델 버전
          </label>
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              saveGeminiModel(e.target.value);
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="gemini-3.8-flash">Gemini 3.8 Flash (최신)</option>
            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          </select>
        </div>

        {/* Action Controls & Testing */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !apiKey.trim()}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                <span>연결 테스트 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>API 키 연결 테스트</span>
              </>
            )}
          </button>

          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> 안전하게 저장되었습니다!
            </span>
          )}
        </div>

        {/* Test Connection Results */}
        {testResult && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
