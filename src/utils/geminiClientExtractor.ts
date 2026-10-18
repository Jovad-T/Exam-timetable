import { GoogleGenAI, Type } from '@google/genai';
import { ScheduleData, DayExamSchedule } from '../types/schedule';
import { cleanNoticeText, FIXED_NOTICE, DEFAULT_BOTTOM_NOTICE } from '../data/scheduleData';

export interface ExtractParams {
  apiKey: string;
  imageBase64?: string | null;
  mimeType?: string;
  extractedText?: string;
  modelChoice?: string;
  thinkingLevel?: string;
}

export async function extractScheduleWithClientGemini(params: ExtractParams): Promise<DayExamSchedule[]> {
  const { apiKey, imageBase64, mimeType, extractedText, modelChoice, thinkingLevel } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API 키가 입력되지 않았습니다. 관리자 설정에서 API 키를 저장해주세요.');
  }

  if (!imageBase64 && !extractedText) {
    throw new Error('분석할 시간표 이미지나 PDF 문서가 필요합니다.');
  }

  const client = new GoogleGenAI({ apiKey: apiKey.trim() });

  const reqModel = (modelChoice || '').toLowerCase();
  let geminiModel = 'gemini-3.8-flash';
  if (reqModel.includes('pro')) {
    geminiModel = 'gemini-1.5-pro';
  } else if (reqModel.includes('2.0')) {
    geminiModel = 'gemini-2.0-flash';
  } else if (reqModel.includes('1.5')) {
    geminiModel = 'gemini-1.5-flash';
  } else {
    geminiModel = 'gemini-3.8-flash';
  }

  const systemInstruction = `
당신은 고등학교 및 대학수학능력시험 시간표 PDF와 이미지를 분석하여 프론트엔드 애플리케이션에서 사용할 수 있는 구조화된 JSON 데이터로 변환하는 최고 전문가입니다.

[교시별 상세 시간표 및 구조 분석 프롬프트 지침]
1. 문서 구조 및 다중 날짜(Multi-Day) 정밀 분석:
   - 업로드된 시간표 문서에 여러 날짜(예: 10/12, 10/13 등)가 포함되어 있는 경우 절대 누락하거나 합치지 말고, 각 날짜별로 개별 DayExamSchedule 객체로 분리하여 배열로 구성하십시오.
   - 각 날짜별로 교시(period), 과목명(name), 과목코드(subjectCode), 입실시간(entryTime), 시험 시작/종료 시각(time), 소요 시간(분)(duration), 대상 반(targetClass)의 표 구조를 완벽히 독해하십시오.

2. '교시별 상세 시간표' 학습 및 자동 추출 강화:
   - 교시별(1교시, 2교시, 3교시, 점심시간 등) 상세 시간표의 시작 시각과 종료 시각을 정확히 포착하십시오.
   - **시험 시작 시간**과 **종료 시간**을 "HH:MM ~ HH:MM" 형식(예: "09:20~10:20" 또는 "08:40 ~ 10:00")으로 'time' 필드에 정확히 기재하십시오.
   - **소요 시간(분)**을 계산하여 'duration' 필드에 정수(예: 50, 60, 80, 100 등)로 반드시 입력하십시오. (예: 09:20~10:20은 60분)
   - **입실 완료 시간**('entryTime')은 표에 명시된 입실 시간(예: "09:10", "08:10")을 추출하고, 명시된 시각이 없다면 시험 시작 10분 전 시각을 계산하여 기재하십시오.

3. 과목명 및 과목코드 분리:
   - 과목명에 괄호로 과목코드(예: '기하(03)', '경제수학(04)')가 포함된 경우 괄호 안의 번호를 'subjectCode'에 분리하고 'name'에는 순수 과목명만 남기십시오.

4. 비시험 시간대(자습/조례/점심) 포함:
   - '1교시 자습', '점심시간', '조례' 등 시험 외 시간대도 누락하지 말고 subjects 배열에 포함하십시오.

5. 불필요한 공지 제거:
   - 학교 공지사항이나 장문 수칙은 제외하고 전자칠판 상단 격려 문구 기본값을 유지하십시오.
`;

  const isPdf = (mimeType && mimeType.includes('pdf')) || (imageBase64 && imageBase64.includes('application/pdf'));
  const promptText = extractedText
    ? `다음은 PDF 문서에서 추출한 텍스트 데이터입니다:\n\n${extractedText}\n\n이 텍스트와 교시별 상세 시간표 지침에 따라 각 과목의 시험 시작 시간, 종료 시간, 소요 시간(분), 입실 완료 시간을 정확히 자동 추출하여 지정된 JSON 구조로 변환해 주세요.`
    : isPdf
    ? `이 고등학교/수능 시험 시간표 PDF 문서를 시각적 표 구조와 함께 정밀 분석하여, 교시별 과목명, 시험 시작 시간, 종료 시간, 소요 시간(분), 입실 완료 시간을 완벽히 자동 추출하여 date, notice, schedule 구조의 JSON 배열로 생성해 주세요.`
    : `이 고등학교/수능 시험 시간표 이미지를 정밀 분석하여, 교시별 과목명, 시험 시작 시간, 종료 시간, 소요 시간(분), 입실 완료 시간을 완벽히 자동 추출하여 date, notice, schedule 구조의 JSON 배열로 생성해 주세요.`;

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

  const response = await client.models.generateContent({
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
            date: { type: Type.STRING, description: '시험 날짜 (예: "10/13" 또는 "11/13")' },
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
                        entryTime: { type: Type.STRING, description: '입실 완료 시간 (예: "08:10")' },
                        time: { type: Type.STRING, description: '시험 시작 및 종료 시간 (예: "08:40 ~ 10:00")' },
                        duration: { type: Type.INTEGER, description: '소요 시간 분 (예: 80)' },
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

  let raw = response.text || '[]';
  raw = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  let parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    if (parsed && typeof parsed === 'object') {
      parsed = parsed.schedule || parsed.data || [parsed];
    } else {
      parsed = [];
    }
  }

  const result: DayExamSchedule[] = parsed.map((item: any, idx: number) => ({
    id: item.id || `day-parsed-${Date.now()}-${idx}`,
    date: item.date || `10/${12 + idx}`,
    fullTitle: item.fullTitle || `2026학년도 2학기 고사 시간표(${item.date || `10/${12 + idx}`})`,
    notice: cleanNoticeText(item.notice),
    bottomNotice: item.bottomNotice || DEFAULT_BOTTOM_NOTICE,
    schedule: item.schedule || [],
  }));

  return result;
}
