import { GoogleGenAI, Type } from '@google/genai';

function resolveApiKey(rawKey?: string): string {
  if (!rawKey) return '';
  const key = rawKey.trim();
  if (key.startsWith('enc_')) {
    try {
      const b64 = key.slice(4);
      const ciphered = decodeURIComponent(atob(b64));
      const SALT = 'AI_EXAM_SCHEDULE_SECURE_2026';
      let result = '';
      for (let i = 0; i < ciphered.length; i++) {
        result += String.fromCharCode(ciphered.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length));
      }
      return result;
    } catch {
      return key;
    }
  }
  if (key.startsWith('b64_')) {
    try {
      return atob(key.slice(4));
    } catch {
      return key;
    }
  }
  return key;
}

// Vercel Serverless Function Handler for POST /api/parse-roster
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. POST is required.' });
  }

  try {
    const { fileBase64, mimeType, extractedText, customApiKey } = req.body || {};

    if (!fileBase64 && !extractedText) {
      return res.status(400).json({
        success: false,
        error: '명렬표 파일 또는 추출된 텍스트 데이터가 필요합니다.',
      });
    }

    const clientKey = resolveApiKey(customApiKey);
    const apiKey = clientKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API 키가 설정되어 있지 않습니다. 우측 상단 [API 키 설정]에서 Gemini API 키를 입력하거나 Vercel 환경 변수(GEMINI_API_KEY)를 등록해 주세요.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-roster-parser',
        },
      },
    });

    const systemInstruction = `
당신은 대한민국 고등학교의 '전교 학생 명렬표' 또는 '학급 인원 현황표' 문서(PDF, 엑셀, 이미지 등)를 분석하여 각 학년·반별 총 학생 수(재적 인원)를 정확하게 집계하는 데이터 분석 전문가입니다.

[분석 및 집계 규칙]
1. 문서에 학년·반별 총원(예: "1학년 1반: 28명", "1-1 계 28", 표의 합계/재적 행 등)이 명시되어 있다면 해당 숫자를 우선 추출하십시오.
2. 만약 학생 개인별 명단(명렬표)이 나열되어 있다면:
   - 각 학년(1~3학년)과 반(1~15반)별로 실제 학생이 몇 명인지 카운트하거나 가장 큰 번호(결번 제외 실제 인원수)를 계산하여 학급당 총 학생 수를 도출하십시오.
   - 학번이 5자리(예: 10101 = 1학년 01반 01번, 20823 = 2학년 08반 23번) 또는 4자리(예: 1101 = 1학년 1반 01번)인 경우 학번 체계를 분석하여 학년과 반을 분류하고 각 반의 학생 수를 정확히 세십시오.
3. 결과는 반드시 JSON 객체 내 'classes' 배열 및 'maxClassNum'으로 반환하십시오.
`;

    const parts: any[] = [];
    const isPdf = (mimeType && mimeType.includes('pdf')) || (fileBase64 && fileBase64.includes('application/pdf'));

    if (extractedText && String(extractedText).trim().length > 20) {
      parts.push({
        text: `다음은 업로드된 전교 학생 명렬표/인원 현황 문서에서 추출한 텍스트입니다:\n\n${String(extractedText).slice(0, 60000)}\n\n위 데이터를 분석하여 모든 학년·반별 총 학생 수(count)를 빠짐없이 추출해 주세요.`,
      });
    } else if (fileBase64) {
      const base64Data = fileBase64
        .replace(/^data:[^;]+;base64,/, '')
        .trim();
      const effectiveMimeType = isPdf ? 'application/pdf' : (mimeType || 'image/jpeg');
      parts.push({ inlineData: { mimeType: effectiveMimeType, data: base64Data } });
      parts.push({
        text: '이 전교 학생 명렬표/학급 인원 현황 문서를 정밀 분석하여 모든 학년·반별 총 학생 수(count)를 빠짐없이 추출해 주세요.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classes: {
              type: Type.ARRAY,
              description: '학년·반별 학생 수 목록',
              items: {
                type: Type.OBJECT,
                properties: {
                  grade: { type: Type.STRING, description: '학년 숫자 ("1", "2", "3")' },
                  classNum: { type: Type.STRING, description: '반 번호 숫자 ("1", "2", ... "15")' },
                  count: { type: Type.INTEGER, description: '해당 학급 총 학생 수' },
                },
                required: ['grade', 'classNum', 'count'],
              },
            },
            maxClassNum: {
              type: Type.INTEGER,
              description: '감지된 가장 큰 반 번호 (1~15)',
            },
          },
          required: ['classes', 'maxClassNum'],
        },
      },
    });

    let rawText = response.text || '{"classes":[],"maxClassNum":0}';
    rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(rawText);

    const classTotals: Record<string, string> = {};
    let maxClassFound = parsed.maxClassNum || 0;

    if (Array.isArray(parsed.classes)) {
      for (const item of parsed.classes) {
        const g = String(item.grade || '').replace(/[^1-3]/g, '');
        const c = String(item.classNum || '').replace(/[^0-9]/g, '');
        const cnt = Number(item.count);
        if (g && c && !isNaN(cnt) && cnt > 0) {
          classTotals[`${g}-${c}`] = String(cnt);
          const cNum = parseInt(c, 10);
          if (cNum > maxClassFound && cNum <= 15) {
            maxClassFound = cNum;
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      classTotals,
      maxClassFound,
      totalClassesCount: Object.keys(classTotals).length,
      classes: Array.isArray(parsed.classes) ? parsed.classes : [],
    });
  } catch (error: any) {
    console.error('Roster Parsing Error on Vercel API:', error);
    const rawMsg = error?.message || '';
    const isQuotaError =
      rawMsg.includes('429') ||
      rawMsg.includes('RESOURCE_EXHAUSTED') ||
      rawMsg.toLowerCase().includes('quota');
    return res.status(isQuotaError ? 429 : 500).json({
      success: false,
      error: isQuotaError
        ? 'Gemini API 호출 할당량(Quota)을 초과했습니다. 잠시 후 다시 시도하거나 엑셀(.xlsx, .xls, .csv) 또는 텍스트 PDF 형식으로 첨부해 주세요.'
        : rawMsg || '명렬표 AI 분석 중 오류가 발생했습니다.',
    });
  }
}
