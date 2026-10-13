import React, { useState } from 'react';
import { Code, Copy, Check, Download, FileCode, FileSpreadsheet, Terminal, Eye } from 'lucide-react';
import { ScheduleData } from '../types/schedule';

interface CodeOutputViewerProps {
  scheduleData: ScheduleData;
  onCopyCode: () => void;
  copied: boolean;
}

export const CodeOutputViewer: React.FC<CodeOutputViewerProps> = ({
  scheduleData,
  onCopyCode,
  copied,
}) => {
  const [activeFormat, setActiveFormat] = useState<'ts' | 'json' | 'md'>('ts');

  // Format scheduleData into clean TypeScript code string
  const generateTsCode = () => {
    const cleanData = scheduleData.map((day) => ({
      date: day.date,
      notice: day.notice,
      schedule: day.schedule.map((p) => ({
        period: p.period,
        subjects: p.subjects.map((s) => ({
          name: s.name,
          time: s.time,
          duration: s.duration,
          targetClass: s.targetClass,
        })),
      })),
    }));

    return `// 고등학교 시험 시간표 scheduleData 배열
export const scheduleData = ${JSON.stringify(cleanData, null, 2)};`;
  };

  const generateJsonCode = () => {
    const cleanData = scheduleData.map((day) => ({
      date: day.date,
      notice: day.notice,
      schedule: day.schedule.map((p) => ({
        period: p.period,
        subjects: p.subjects.map((s) => ({
          name: s.name,
          time: s.time,
          duration: s.duration,
          targetClass: s.targetClass,
        })),
      })),
    }));
    return JSON.stringify(cleanData, null, 2);
  };

  const generateMarkdownTable = () => {
    let md = `# 고등학교 시험 시간표\n\n`;
    scheduleData.forEach((day) => {
      md += `## 📅 ${day.date}\n`;
      md += `> **유의사항:** ${day.notice}\n\n`;
      md += `| 교시 | 시험시간 | 과목명 | 대상 반 | 시험시간(분) |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\n`;
      day.schedule.forEach((period) => {
        period.subjects.forEach((sub) => {
          md += `| ${period.period} | ${sub.time} | **${sub.name}** | ${sub.targetClass} | ${sub.duration}분 |\n`;
        });
      });
      md += `\n`;
    });
    return md;
  };

  const getActiveCode = () => {
    switch (activeFormat) {
      case 'ts':
        return generateTsCode();
      case 'json':
        return generateJsonCode();
      case 'md':
        return generateMarkdownTable();
    }
  };

  const handleDownload = () => {
    const code = getActiveCode();
    const ext = activeFormat === 'ts' ? 'ts' : activeFormat === 'json' ? 'json' : 'md';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scheduleData.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl text-slate-100">
      {/* Code Header Bar */}
      <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs font-bold">
            <Code className="w-3.5 h-3.5" />
            <span>추출 데이터 코드 (scheduleData)</span>
          </div>

          {/* Format Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveFormat('ts')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                activeFormat === 'ts'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              TypeScript (.ts)
            </button>
            <button
              onClick={() => setActiveFormat('json')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                activeFormat === 'json'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              JSON (.json)
            </button>
            <button
              onClick={() => setActiveFormat('md')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                activeFormat === 'md'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Markdown (.md)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCopyCode}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '복사 완료!' : '코드 복사'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>다운로드</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="p-5 font-mono text-xs sm:text-sm overflow-x-auto max-h-[450px] leading-relaxed select-all bg-slate-900/90 text-indigo-100">
        <pre className="whitespace-pre">{getActiveCode()}</pre>
      </div>
    </div>
  );
};
