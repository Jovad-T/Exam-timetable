import React, { useState, useEffect } from 'react';
import { Key, Cpu, Save } from 'lucide-react';

export const GeminiSettingsCard: React.FC = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('custom_gemini_key') || '');
  const [model, setModel] = useState(() => localStorage.getItem('custom_gemini_model') || 'gemini-3.8-flash');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('custom_gemini_key', apiKey);
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
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">기본 모델 버전</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="gemini-3.0-flash">Default (Gemini 3)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          className="w-full mt-4 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-md"
        >
          {saved ? '저장됨!' : <><Save className="w-3.5 h-3.5" /> 설정 저장하기</>}
        </button>
      </div>
    </div>
  );
};
