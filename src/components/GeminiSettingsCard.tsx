import React, { useState, useEffect } from 'react';
import { Key, Cpu, Save } from 'lucide-react';

export const GeminiSettingsCard: React.FC = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('custom_gemini_key') || '');
  const [model, setModel] = useState(() => localStorage.getItem('custom_gemini_model') || 'gemini-3.8-flash');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Basic obfuscation (NOT secure encryption, for obfuscation only)
    const encodedKey = apiKey ? btoa(apiKey) : '';
    localStorage.setItem('custom_gemini_key', encodedKey);
    localStorage.setItem('custom_gemini_model', model);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
        <Key className="w-4 h-4 text-indigo-600" /> AI API 설정 (Gemini)
      </h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Gemini API Key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-lg text-xs transition shadow-md"
            >
              {saved ? '저장됨!' : <><Save className="w-3.5 h-3.5" /> 저장</>}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">기본 모델 버전</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="gemini-3.8-flash">Default (Gemini 3.8 Flash)</option>
            <option value="gemini-4-argon">Gemini 4 Argon</option>
            <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
            <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
            <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
            <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
          </select>
        </div>
      </div>
    </div>
  );
};
