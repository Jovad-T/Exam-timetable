import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { getGeminiApiKey } from './apiKeyStorage';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface RosterParseResult {
  classTotals: Record<string, string>;
  maxClassFound: number;
  totalStudentsCount: number;
  totalClassesCount: number;
  method: 'local_excel' | 'ai_vision';
}

/**
 * Heuristic parser for 2D rows from Excel/CSV sheets.
 * Supports:
 * 1) Student roster rows (학년 / 반 / 번호 / 성명 OR 학번 5자리 20315 / 4자리 2315)
 * 2) Summary table rows (학년, 반, 총원/재적/인원수)
 */
function parseSpreadsheetRowsHeuristically(sheetsData: { sheetName: string; rows: any[][] }[]): {
  classTotals: Record<string, string>;
  maxClassFound: number;
} {
  const studentCountPerClass: Record<string, number> = {};
  const maxNumberPerClass: Record<string, number> = {};
  const summaryCountPerClass: Record<string, number> = {};

  for (const { sheetName, rows } of sheetsData) {
    if (!rows || rows.length === 0) continue;

    // Infer grade from sheet name if present (e.g., "1학년", "2학년 명렬표")
    const sheetGradeMatch = sheetName.match(/([1-3])\s*학년/);
    const defaultSheetGrade = sheetGradeMatch ? sheetGradeMatch[1] : null;

    let gradeCol = -1;
    let classCol = -1;
    let numCol = -1;
    let studentIdCol = -1;
    let nameCol = -1;
    let totalCountCol = -1;
    let headerRowIndex = -1;

    // 1. Scan first 15 rows for header keywords
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      let tempGrade = -1;
      let tempClass = -1;
      let tempNum = -1;
      let tempId = -1;
      let tempName = -1;
      let tempTotal = -1;

      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] ?? '').replace(/\s+/g, '').trim();
        if (!cell) continue;

        if (/^(학년|grade)$/i.test(cell)) tempGrade = c;
        else if (/^(반|학급|학급반|class)$/i.test(cell)) tempClass = c;
        else if (/^(번호|출석번호|번|no\.?)$/i.test(cell)) tempNum = c;
        else if (/^(학번|학생번호|수험번호|id)$/i.test(cell)) tempId = c;
        else if (/^(성명|이름|학생명|학생이름|name)$/i.test(cell)) tempName = c;
        else if (/^(총원|재적|재적인원|인원|인원수|학생수|합계|계)$/i.test(cell)) tempTotal = c;
      }

      if (
        (tempClass !== -1 && (tempGrade !== -1 || tempNum !== -1 || tempName !== -1 || tempTotal !== -1)) ||
        tempId !== -1
      ) {
        gradeCol = tempGrade;
        classCol = tempClass;
        numCol = tempNum;
        studentIdCol = tempId;
        nameCol = tempName;
        totalCountCol = tempTotal;
        headerRowIndex = r;
        break;
      }
    }

    // 2. If structured columns were found
    if (headerRowIndex !== -1) {
      let currentContextGrade = defaultSheetGrade || '';

      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;

        // Check if studentIdCol (학번) is available (e.g., 20828 or 20815)
        if (studentIdCol !== -1) {
          const rawId = String(row[studentIdCol] ?? '').replace(/[^0-9]/g, '');
          if (rawId.length === 5) {
            const g = rawId[0];
            const c = String(parseInt(rawId.slice(1, 3), 10));
            const n = parseInt(rawId.slice(3, 5), 10);
            if (['1', '2', '3'].includes(g) && Number(c) >= 1 && Number(c) <= 15 && n >= 1 && n <= 60) {
              const key = `${g}-${c}`;
              studentCountPerClass[key] = (studentCountPerClass[key] || 0) + 1;
              if (!maxNumberPerClass[key] || n > maxNumberPerClass[key]) {
                maxNumberPerClass[key] = n;
              }
              continue;
            }
          } else if (rawId.length === 4) {
            const g = rawId[0];
            const c = rawId[1];
            const n = parseInt(rawId.slice(2, 4), 10);
            if (['1', '2', '3'].includes(g) && Number(c) >= 1 && Number(c) <= 9 && n >= 1 && n <= 60) {
              const key = `${g}-${c}`;
              studentCountPerClass[key] = (studentCountPerClass[key] || 0) + 1;
              if (!maxNumberPerClass[key] || n > maxNumberPerClass[key]) {
                maxNumberPerClass[key] = n;
              }
              continue;
            }
          }
        }

        // Extract grade & class
        let gStr = gradeCol !== -1 ? String(row[gradeCol] ?? '').replace(/[^0-9]/g, '') : '';
        if (gStr && ['1', '2', '3'].includes(gStr)) {
          currentContextGrade = gStr;
        } else {
          gStr = currentContextGrade || defaultSheetGrade || '2';
        }

        const rawClassCell = classCol !== -1 ? String(row[classCol] ?? '').trim() : '';
        // Check if class cell is like "2-3" or "2학년 3반"
        let cStr = '';
        const combinedMatch = rawClassCell.match(/([1-3])\s*[-학년\s]\s*(\d{1,2})/);
        if (combinedMatch) {
          gStr = combinedMatch[1];
          cStr = String(parseInt(combinedMatch[2], 10));
        } else {
          cStr = rawClassCell.replace(/[^0-9]/g, '');
          if (cStr) cStr = String(parseInt(cStr, 10));
        }

        const cNum = parseInt(cStr, 10);
        if (!['1', '2', '3'].includes(gStr) || isNaN(cNum) || cNum < 1 || cNum > 15) {
          continue;
        }

        const key = `${gStr}-${cNum}`;

        // Case A: Summary table with totalCountCol (총원/재적 컬럼이 있고 번호 컬럼이 없는 경우)
        if (totalCountCol !== -1 && numCol === -1 && nameCol === -1) {
          const totalVal = parseInt(String(row[totalCountCol] ?? '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(totalVal) && totalVal >= 1 && totalVal <= 60) {
            summaryCountPerClass[key] = totalVal;
            continue;
          }
        }

        // Case B: Student roster row
        const hasName = nameCol !== -1 ? Boolean(String(row[nameCol] ?? '').trim()) : true;
        const numVal = numCol !== -1 ? parseInt(String(row[numCol] ?? '').replace(/[^0-9]/g, ''), 10) : NaN;

        if (numCol !== -1 && !isNaN(numVal) && numVal >= 1 && numVal <= 60 && hasName) {
          studentCountPerClass[key] = (studentCountPerClass[key] || 0) + 1;
          if (!maxNumberPerClass[key] || numVal > maxNumberPerClass[key]) {
            maxNumberPerClass[key] = numVal;
          }
        } else if (nameCol !== -1 && hasName) {
          const nameVal = String(row[nameCol] ?? '').trim();
          if (nameVal && !/^(합계|소계|총계|계|평균)$/.test(nameVal)) {
            studentCountPerClass[key] = (studentCountPerClass[key] || 0) + 1;
          }
        } else if (totalCountCol !== -1) {
          const totalVal = parseInt(String(row[totalCountCol] ?? '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(totalVal) && totalVal >= 1 && totalVal <= 60) {
            summaryCountPerClass[key] = totalVal;
          }
        }
      }
    } else {
      // 3. Fallback scan for 5-digit student IDs (학번: 10101 ~ 31550) or "X학년 Y반" patterns across cells
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;

        for (let c = 0; c < row.length; c++) {
          const cellStr = String(row[c] ?? '').trim();
          if (/^[1-3][0-1][0-9][0-5][0-9]$/.test(cellStr)) {
            const g = cellStr[0];
            const cls = String(parseInt(cellStr.slice(1, 3), 10));
            const num = parseInt(cellStr.slice(3, 5), 10);
            if (Number(cls) >= 1 && Number(cls) <= 15 && num >= 1 && num <= 55) {
              const key = `${g}-${cls}`;
              studentCountPerClass[key] = (studentCountPerClass[key] || 0) + 1;
              if (!maxNumberPerClass[key] || num > maxNumberPerClass[key]) {
                maxNumberPerClass[key] = num;
              }
              break;
            }
          }
        }
      }
    }
  }

  const finalTotals: Record<string, string> = {};
  let maxClassFound = 0;

  // Merge summary counts first, then student counts
  const allKeys = new Set([
    ...Object.keys(summaryCountPerClass),
    ...Object.keys(studentCountPerClass),
  ]);

  for (const key of allKeys) {
    const count = studentCountPerClass[key] || summaryCountPerClass[key];
    if (count && count > 0) {
      finalTotals[key] = String(count);
      const cNum = parseInt(key.split('-')[1], 10);
      if (!isNaN(cNum) && cNum > maxClassFound && cNum <= 15) {
        maxClassFound = cNum;
      }
    }
  }

  return { classTotals: finalTotals, maxClassFound };
}

/**
 * Parses an uploaded Roster file (.xls, .xlsx, .csv, .pdf, or image) into class total counts.
 */
export async function parseRosterFile(file: File): Promise<RosterParseResult> {
  const lowerName = file.name.toLowerCase();
  const isExcelOrCsv =
    /\.(xlsx?|csv)$/i.test(lowerName) ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel') ||
    file.type === 'text/csv';
  const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lowerName);

  if (!isExcelOrCsv && !isPdf && !isImage) {
    throw new Error('지원하지 않는 파일 형식입니다. 엑셀(.xlsx, .xls, .csv), PDF(.pdf), 또는 이미지 파일을 첨부해 주세요.');
  }

  // 1. Handle Excel / CSV files
  if (isExcelOrCsv) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetsData: { sheetName: string; rows: any[][] }[] = [];
    let combinedCsvText = '';

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
      sheetsData.push({ sheetName, rows });
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        combinedCsvText += `--- [Sheet: ${sheetName}] ---\n${csv}\n\n`;
      }
    }

    // Try fast local heuristic extraction first
    const localParsed = parseSpreadsheetRowsHeuristically(sheetsData);
    const keys = Object.keys(localParsed.classTotals);
    if (keys.length > 0) {
      const totalStudentsCount = Object.values(localParsed.classTotals).reduce(
        (acc, v) => acc + (parseInt(v, 10) || 0),
        0
      );
      return {
        classTotals: localParsed.classTotals,
        maxClassFound: localParsed.maxClassFound,
        totalStudentsCount,
        totalClassesCount: keys.length,
        method: 'local_excel',
      };
    }

    // If local heuristic couldn't find standard columns, fall back to server AI parsing with CSV text
    if (!combinedCsvText.trim()) {
      throw new Error('엑셀 파일에서 데이터를 읽을 수 없습니다. 파일 내용을 확인해 주세요.');
    }

    const res = await fetch('/api/parse-roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extractedText: combinedCsvText,
        customApiKey: getGeminiApiKey() || '',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || '엑셀 명렬표 AI 분석에 실패했습니다.');
    }

    const totalStudentsCount = Object.values(data.classTotals as Record<string, string>).reduce(
      (acc, v) => acc + (parseInt(v, 10) || 0),
      0
    );

    return {
      classTotals: data.classTotals,
      maxClassFound: data.maxClassFound || 0,
      totalStudentsCount,
      totalClassesCount: Object.keys(data.classTotals || {}).length,
      method: 'ai_vision',
    };
  }

  // 2. Handle PDF or Image files
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });

  let extractedPdfText = '';
  if (isPdf) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        isEvalSupported: false,
        useWorkerFetch: false,
      });
      const pdfDoc = await loadingTask.promise;
      for (let i = 1; i <= Math.min(pdfDoc.numPages, 25); i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        extractedPdfText += `--- [Page ${i}] ---\n${pageText}\n\n`;
      }
    } catch {
      // Proceed with direct multimodal PDF analysis
    }
  }

  const res = await fetch('/api/parse-roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileBase64: base64Data,
      mimeType: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
      extractedText: extractedPdfText,
      customApiKey: getGeminiApiKey() || '',
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'PDF/이미지 명렬표 AI 분석에 실패했습니다.');
  }

  const totalStudentsCount = Object.values(data.classTotals as Record<string, string>).reduce(
    (acc, v) => acc + (parseInt(v, 10) || 0),
    0
  );

  return {
    classTotals: data.classTotals,
    maxClassFound: data.maxClassFound || 0,
    totalStudentsCount,
    totalClassesCount: Object.keys(data.classTotals || {}).length,
    method: 'ai_vision',
  };
}
