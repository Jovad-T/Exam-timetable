import { GoogleGenAI, Type } from '@google/genai';

const FIXED_NOTICE = '최선을 다하기! 부정행위 금지! 책상 서랍 비우기! 수정테이프 불가!';
const DEFAULT_BOTTOM_NOTICE = '※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※';

// Helper to decrypt client-sent encrypted API key if present
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

// Vercel Serverless Function Handler for POST /api/extract-schedule
export default async function handler(req: any, res: any) {
  // Set CORS and JSON Content-Type headers
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
    const { imageBase64, mimeType, extractedText, modelChoice, thinkingLevel, customApiKey } = req.body || {};

    // 1. Resolve API Key: custom key from client OR server environment variable
    const clientKey = resolveApiKey(customApiKey);
    const apiKey = clientKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API 키가 설정되어 있지 않습니다. 관리자 설정(⚙️)에서 Gemini API 키를 저장하시거나, Vercel [Settings] -> [Environment Variables]에 GEMINI_API_KEY를 등록해주세요.',
      });
    }

    if (!imageBase64 && !extractedText) {
      return res.status(400).json({ success: false, error: '이미지 또는 PDF 텍스트 데이터가 필요합니다.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-schedule-extractor',
        },
      },
    });

    // 2. Map model to valid public Gemini models for reliability on Vercel
    const reqModel = (modelChoice || '').toLowerCase();
    let geminiModel = 'gemini-2.5-flash';
    if (reqModel.includes('pro')) {
      geminiModel = 'gemini-2.5-pro';
    } else if (reqModel.includes('2.0')) {
      geminiModel = 'gemini-2.0-flash';
    } else if (reqModel.includes('1.5')) {
      geminiModel = 'gemini-1.5-flash';
    } else if (reqModel.includes('2.5')) {
      geminiModel = 'gemini-2.5-flash';
    }

    const systemInstruction = `
당신은 고등학교 시험 시간표 PDF 및 이미지를 분석하여 프론트엔드 애플리케이션에서 사용할 수 있는 구조화된 JSON 데이터로 변환하는 최고 전문가입니다.

[사고 과정 (Chain of Thought - CoT) 및 정밀 분석 지침]
1. 문서 구조 및 다중 날짜(Multi-Day) 분석 단계:
   - PDF 텍스트 또는 이미지에 여러 날짜(예: 10/12, 10/13, 10/14 등 복수의 날짜/요일)가 포함되어 있는 경우, 절대로 하나의 날짜로 병합하거나 누락하지 말고, 각 날짜별로 개별 DayExamSchedule 객체를 분리하여 배열(Array)에 모두 포함하십시오.
   - 날짜(date), 교시(period), 입실시간(entryTime), 시험시간(time), 과목명(name), 과목코드(subjectCode), 시험시간(분)(duration), 대상반(targetClass)의 컬럼 및 행 구조를 철저히 파악하십시오.
2. '입실 시간' / '입실' 열 자동 감지 및 entryTime 매핑 단계:
   - PDF 내 테이블에서 '입실 시간', '입실', '입실완료' 등의 키워드가 포함된 열(Column)을 자동으로 감지하여, 추출된 JSON의 각 SubjectItem 객체에 'entryTime' 필드로 정확히 매핑하십시오.
   - 만약 명시적인 입실 시간이 별도로 없다면, 시험 시작 시간 10분 전 시각(예: 09:30 시작이면 09:20)을 산출하여 'entryTime'에 기재하십시오.
3. 과목코드(subjectCode) 분리 추출 단계:
   - 과목명에 괄호로 과목코드(예: '경제수학(04)', '물질과 에너지(11)')가 포함되어 있는 경우, 괄호 안의 번호를 추출하여 'subjectCode' 필드에 별도로 기재하고, 'name'에는 괄호와 코드를 제외한 순수 과목명만 남기십시오.
4. '자습', '조례', '종례' 등 비시험 시간대 누락 방지 단계:
   - '1교시 자습', '자습', '조례' 등 시험이 아닌 자습 시간이나 특별 활동 시간대도 누락하지 말고, 해당 교시의 과목 목록(subjects)에 포함하십시오.
5. 모든 교시(1교시, 2교시, 3교시 등) 누락 없는 추출 단계:
   - 1교시, 2교시뿐만 아니라 3교시 및 그 이후의 모든 교시 데이터까지 누락 없이 철저히 분석하여 schedule 배열에 포함하십시오.
6. 최종 출력:
   - 지정된 JSON 스키마에 부합하는 유효한 JSON 배열만 출력하십시오.
`;

    const isPdf = (mimeType && mimeType.includes('pdf')) || (imageBase64 && imageBase64.includes('application/pdf'));
    const promptText = extractedText
      ? `다음은 PDF 문서에서 추출한 텍스트 데이터입니다:\n\n${extractedText}\n\n이 텍스트를 위 사고 과정(CoT) 지침에 따라 철저히 분석하여, PDF 내 '입실'/'입실 시간' 열을 자동 감지해 각 과목의 'entryTime'에 매핑하고, 3교시를 포함한 모든 교시를 누락 없이 지정된 JSON 구조로 변환해 주세요.`
      : isPdf
      ? `이 고등학교 시험 시간표 PDF 문서를 시각적 표 구조와 함께 정밀 분석하여, 각 시험 일자별로 분리하고, 입실시간(entryTime), 과목코드, 자습/조례 및 3교시를 포함한 모든 교시 데이터를 누락 없이 date, notice, schedule(period, subjects) 구조의 JSON 배열로 추출해 주세요.`
      : `이 고등학교 시험 시간표 이미지를 분석하여 각 시험 일자별로 분리하고, 입실시간(entryTime), 과목코드, 자습/조례 및 3교시를 포함한 모든 교시 데이터를 누락 없이 date, notice, schedule(period, subjects) 구조의 JSON 배열로 추출해 주세요.`;

    const parts: any[] = [];
    if (extractedText) {
      parts.push({ text: promptText });
    }
    if (imageBase64) {
      const base64Data = imageBase64
        .replace(/^data:image\/\w+;base64,/, '')
        .replace(/^data:application\/pdf;base64,/, '');
      const effectiveMimeType = isPdf ? 'application/pdf' : (mimeType || 'image/jpeg');
      parts.push({ inlineData: { mimeType: effectiveMimeType, data: base64Data } });
      if (!extractedText) {
        parts.push({ text: promptText });
      }
    }

    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: thinkingLevel === 'deep' ? 0.0 : 0.2,
        responseSchema: {
          type: Type.ARRAY,
          description: '날짜별 시험 시간표 배열',
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: '시험 날짜 (예: "10/13(목)")' },
              notice: { type: Type.STRING, description: '유의사항' },
              schedule: {
                type: Type.ARRAY,
                description: '교시별 시험 목록',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    period: { type: Type.STRING, description: '교시명 (예: "1교시")' },
                    subjects: {
                      type: Type.ARRAY,
                      description: '해당 교시 과목 목록',
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING, description: '과목명' },
                          subjectCode: { type: Type.STRING, description: '과목코드' },
                          entryTime: { type: Type.STRING, description: '입실 시간' },
                          time: { type: Type.STRING, description: '시험 시간' },
                          duration: { type: Type.INTEGER, description: '시험 시간(분)' },
                          targetClass: { type: Type.STRING, description: '대상 반 또는 학년' },
                        },
                        required: ['name', 'subjectCode', 'entryTime', 'time', 'duration', 'targetClass'],
                      },
                    },
                  },
                  required: ['period', 'subjects'],
                },
              },
            },
            required: ['date', 'notice', 'schedule'],
          },
        },
      },
    });

    let rawText = response.text || '[]';
    // Clean code blocks if present
    rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    let parsedData = JSON.parse(rawText);

    parsedData = parsedData.map((item: any, idx: number) => ({
      id: item.id || `day-parsed-${Date.now()}-${idx}`,
      date: item.date || `10/${12 + idx}`,
      fullTitle: item.fullTitle || `2026학년도 2학기 1차 고사 시간표(${item.date || `10/${12 + idx}`})`,
      notice: item.notice || FIXED_NOTICE,
      bottomNotice: item.bottomNotice || DEFAULT_BOTTOM_NOTICE,
      schedule: item.schedule || [],
    }));

    return res.status(200).json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Extraction Error on Vercel API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '시간표 문서 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
}
