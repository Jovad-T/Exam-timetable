import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiApiKey } from './apiKeyStorage';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface RosterParseResult {
  classTotals: Record<string, string>;
  maxClassFound: number;
  totalStudentsCount: number;
  totalClassesCount: number;
  method: 'local_excel' | 'local_pdf' | 'ai_vision';
}

/**
 * Helper: Parse grade ("1"|"2"|"3") and class ("1"~"15") from a label like:
 * "1학년 2반", "1-2", "1-02", "2학년3반", "305반"
 */
function parseCombinedGradeClass(text: string, defaultGrade?: string | null): { grade: string; classNum: string } | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return null;

  // Pattern 1: "1학년 2반", "1학년2반", "1 - 2반", "1-2"
  const m1 = clean.match(/(?:^|[^\d])([1-3])\s*(?:학년|[-~./])\s*0?(\d{1,2})\s*(?:반)?(?:$|[^\d])/);
  if (m1) {
    const cNum = parseInt(m1[2], 10);
    if (cNum >= 1 && cNum <= 15) {
      return { grade: m1[1], classNum: String(cNum) };
    }
  }

  // Pattern 2: "101반", "208반" (3-digit grade+class)
  const m2 = clean.match(/^([1-3])0(\d)\s*반?$/);
  if (m2 && parseInt(m2[2], 10) >= 1) {
    return { grade: m2[1], classNum: String(parseInt(m2[2], 10)) };
  }

  // Pattern 3: Just "1반", "2반", "03반" when defaultGrade is known
  if (defaultGrade && ['1', '2', '3'].includes(defaultGrade)) {
    const m3 = clean.match(/^0?(\d{1,2})\s*반$/);
    if (m3) {
      const cNum = parseInt(m3[1], 10);
      if (cNum >= 1 && cNum <= 15) {
        return { grade: defaultGrade, classNum: String(cNum) };
      }
    }
  }

  return null;
}

/**
 * Comprehensive heuristic parser for 2D rows from Excel, CSV, or PDF tables.
 * Supports:
 * 1) Cross-tab / Matrix summary tables (학년 rows × 반 columns, or 반 rows × 학년 columns)
 * 2) Horizontal side-by-side multi-class roster sheets (1반 | 2반 | 3반 ... across columns)
 * 3) Vertical student roster tables (학년 / 반 / 번호 / 성명 / 학번) & vertical summary tables
 * 4) Sheet-per-class rosters & inline text patterns ("1학년 2반 28명", 5-digit student IDs)
 */
export function parseSpreadsheetRowsHeuristically(sheetsData: { sheetName: string; rows: any[][] }[]): {
  classTotals: Record<string, string>;
  maxClassFound: number;
} {
  const studentCountPerClass: Record<string, number> = {};
  const maxNumberPerClass: Record<string, number> = {};
  const summaryCountPerClass: Record<string, number> = {};

  for (const { sheetName, rows } of sheetsData) {
    if (!rows || rows.length === 0) continue;

    // Infer grade or grade+class from sheet name if present (e.g., "1학년", "2학년 명렬표", "1-3", "2학년 1반")
    const sheetGradeMatch = sheetName.match(/([1-3])\s*학년/);
    let defaultSheetGrade = sheetGradeMatch ? sheetGradeMatch[1] : null;
    const sheetCombined = parseCombinedGradeClass(sheetName, defaultSheetGrade);
    if (sheetCombined && !defaultSheetGrade) {
      defaultSheetGrade = sheetCombined.grade;
    }

    // Also scan first 5 rows for a title like "1학년 명렬표", "2학년 학생 명단" if sheetGrade isn't set
    if (!defaultSheetGrade) {
      for (let r = 0; r < Math.min(rows.length, 5); r++) {
        const rowText = (rows[r] || []).map((c) => String(c ?? '')).join(' ');
        const titleGrades = rowText.match(/([1-3])\s*학년/g);
        if (titleGrades && titleGrades.length === 1) {
          const gm = titleGrades[0].match(/([1-3])/);
          if (gm) defaultSheetGrade = gm[1];
          break;
        }
      }
    }

    const beforeSheetKeysCount =
      Object.keys(studentCountPerClass).length + Object.keys(summaryCountPerClass).length;

    // =========================================================================
    // STRATEGY A: Cross-Tab / Matrix Summary Table (학급 인원 현황표)
    // Case A1: Header row has "1반", "2반", "3반"... and rows below have "1학년", "2학년", "3학년"
    // Case A2: Header row has "1학년", "2학년", "3학년" and rows below have "1반", "2반", "3반"...
    // =========================================================================
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      const classColsMap: Record<number, string> = {}; // colIndex -> classNum
      const gradeColsMap: Record<number, string> = {}; // colIndex -> grade

      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] ?? '').replace(/\s+/g, '').trim();
        if (!cell) continue;
        const cm = cell.match(/^0?(\d{1,2})반$/);
        if (cm && parseInt(cm[1], 10) >= 1 && parseInt(cm[1], 10) <= 15) {
          classColsMap[c] = String(parseInt(cm[1], 10));
        }
        const gm = cell.match(/^([1-3])학년$/);
        if (gm) {
          gradeColsMap[c] = gm[1];
        }
      }

      // Case A1: 2+ class columns found in row r, check if subsequent rows are grade rows ("1학년", "2학년", "3학년")
      if (Object.keys(classColsMap).length >= 2) {
        let matrixMatched = false;
        for (let subR = r + 1; subR < Math.min(rows.length, r + 15); subR++) {
          const subRow = rows[subR];
          if (!Array.isArray(subRow)) continue;
          // Look for grade indicator in the first few columns
          let rowGrade = '';
          for (let c = 0; c < Math.min(subRow.length, 4); c++) {
            if (classColsMap[c]) continue;
            const cell = String(subRow[c] ?? '').replace(/\s+/g, '').trim();
            const gm = cell.match(/^([1-3])(?:학년)?$/);
            if (gm) {
              rowGrade = gm[1];
              break;
            }
          }
          if (rowGrade) {
            for (const [colStr, classNum] of Object.entries(classColsMap)) {
              const colIdx = Number(colStr);
              const rawVal = String(subRow[colIdx] ?? '').replace(/[^0-9]/g, '');
              const countVal = parseInt(rawVal, 10);
              if (!isNaN(countVal) && countVal >= 5 && countVal <= 55) {
                summaryCountPerClass[`${rowGrade}-${classNum}`] = countVal;
                matrixMatched = true;
              }
            }
          }
        }
        if (matrixMatched) break;
      }

      // Case A2: 2+ grade columns found in row r ("1학년", "2학년", "3학년"), check if subsequent rows are class rows ("1반", "2반"...)
      if (Object.keys(gradeColsMap).length >= 2) {
        let matrixMatched = false;
        for (let subR = r + 1; subR < Math.min(rows.length, r + 25); subR++) {
          const subRow = rows[subR];
          if (!Array.isArray(subRow)) continue;
          let rowClass = '';
          for (let c = 0; c < Math.min(subRow.length, 4); c++) {
            if (gradeColsMap[c]) continue;
            const cell = String(subRow[c] ?? '').replace(/\s+/g, '').trim();
            const cm = cell.match(/^0?(\d{1,2})(?:반)?$/);
            if (cm && parseInt(cm[1], 10) >= 1 && parseInt(cm[1], 10) <= 15) {
              rowClass = String(parseInt(cm[1], 10));
              break;
            }
          }
          if (rowClass) {
            for (const [colStr, grade] of Object.entries(gradeColsMap)) {
              const colIdx = Number(colStr);
              const rawVal = String(subRow[colIdx] ?? '').replace(/[^0-9]/g, '');
              const countVal = parseInt(rawVal, 10);
              if (!isNaN(countVal) && countVal >= 5 && countVal <= 55) {
                summaryCountPerClass[`${grade}-${rowClass}`] = countVal;
                matrixMatched = true;
              }
            }
          }
        }
        if (matrixMatched) break;
      }
    }

    // =========================================================================
    // STRATEGY B: Horizontal Side-by-Side Multi-Class Roster (가로 다단 반 배치 명렬표)
    // E.g. Row has "1반 | | 2반 | | 3반..." or "1학년 1반 | | 1학년 2반..."
    // and rows below list students (1 홍길동, 2 김철수...) in each column block!
    // =========================================================================
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      const classBlocks: { colStart: number; colEnd: number; grade: string; classNum: string }[] = [];
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] ?? '').trim();
        if (!cell) continue;
        const parsed = parseCombinedGradeClass(cell, defaultSheetGrade || '2');
        if (parsed) {
          classBlocks.push({
            colStart: c,
            colEnd: row.length,
            grade: parsed.grade,
            classNum: parsed.classNum,
          });
        }
      }

      if (classBlocks.length >= 2) {
        for (let i = 0; i < classBlocks.length - 1; i++) {
          classBlocks[i].colEnd = classBlocks[i + 1].colStart;
        }

        let horizontalRosterFound = false;
        for (const block of classBlocks) {
          const key = `${block.grade}-${block.classNum}`;
          if (summaryCountPerClass[key]) continue; // Already matched as matrix

          let countInBlock = 0;
          let maxNumInBlock = 0;
          let explicitTotalInBlock = 0;

          for (let subR = r + 1; subR < rows.length; subR++) {
            const subRow = rows[subR];
            if (!Array.isArray(subRow)) continue;

            const slice = subRow.slice(block.colStart, Math.min(block.colEnd, block.colStart + 6));
            const sliceStrs = slice.map((v) => String(v ?? '').trim()).filter(Boolean);
            if (sliceStrs.length === 0) continue;

            const joined = sliceStrs.join(' ');
            // Skip sub-header row like "번호 성명"
            if (/^(번호|출석번호|학번|성명|이름|비고|성별|\s)+$/.test(joined)) continue;

            // Check if it's a summary row like "계 28", "총원 28명", "28명"
            const totalMatch = joined.match(/(?:총원|재적|합계|소계|계|인원)\s*[:：]?\s*(\d{1,2})\s*명?/) ||
                               joined.match(/^(\d{2})\s*명$/);
            if (totalMatch) {
              const tVal = parseInt(totalMatch[1], 10);
              if (tVal >= 5 && tVal <= 55) {
                explicitTotalInBlock = tVal;
                continue;
              }
            }

            // Check if slice has a student number (1~55) and a name, or a Korean name
            let foundNum = NaN;
            let foundName = false;
            for (const token of sliceStrs) {
              if (/^\d{1,2}$/.test(token)) {
                const n = parseInt(token, 10);
                if (n >= 1 && n <= 55 && isNaN(foundNum)) foundNum = n;
              } else if (/^[1-3][0-1]\d[0-5]\d$/.test(token)) {
                const n = parseInt(token.slice(3, 5), 10);
                if (n >= 1 && n <= 55) foundNum = n;
              } else if (/^[가-힣]{2,6}[A-Za-z0-9]?$/.test(token) && !/^(학년|학급|번호|성명|이름|합계|소계|총원|재적|남자|여자)$/.test(token)) {
                foundName = true;
              }
            }

            if (foundName || (!isNaN(foundNum) && sliceStrs.length >= 2)) {
              countInBlock++;
              if (!isNaN(foundNum) && foundNum > maxNumInBlock) {
                maxNumInBlock = foundNum;
              }
            }
          }

          const finalBlockCount = explicitTotalInBlock || countInBlock || maxNumInBlock;
          if (finalBlockCount >= 5 && finalBlockCount <= 55) {
            studentCountPerClass[key] = finalBlockCount;
            horizontalRosterFound = true;
          }
        }

        if (horizontalRosterFound) break;
      }
    }

    // =========================================================================
    // STRATEGY C: Standard Vertical Roster or Vertical Summary Table
    // =========================================================================
    let gradeCol = -1;
    let classCol = -1;
    let combinedGradeClassCol = -1;
    let numCol = -1;
    let studentIdCol = -1;
    let nameCol = -1;
    let totalCountCol = -1;
    let headerRowIndex = -1;

    for (let r = 0; r < Math.min(rows.length, 35); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      let tempGrade = -1;
      let tempClass = -1;
      let tempCombined = -1;
      let tempNum = -1;
      let tempId = -1;
      let tempName = -1;
      let tempTotal = -1;

      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] ?? '').replace(/\s+/g, '').trim();
        if (!cell) continue;

        if (/^(학년|grade)$/i.test(cell)) tempGrade = c;
        else if (/^(학년반|학급명|학년-반|학급\(반\))$/i.test(cell)) tempCombined = c;
        else if (/^(반|학급|학급반|class)$/i.test(cell)) tempClass = c;
        else if (/^(번호|출석번호|연번|번|no\.?)$/i.test(cell)) tempNum = c;
        else if (/^(학번|학생번호|수험번호|개인번호|id)$/i.test(cell)) tempId = c;
        else if (/^(성명|이름|학생명|학생성명|학생이름|성명\(한글\)|name)$/i.test(cell)) tempName = c;
        else if (/^(총원|재적|재적인원|재적수|인원|인원수|학생수|합계|총계|계)$/i.test(cell)) tempTotal = c;
      }

      if (
        (tempClass !== -1 && (tempGrade !== -1 || tempNum !== -1 || tempName !== -1 || tempTotal !== -1)) ||
        (tempCombined !== -1 && (tempNum !== -1 || tempName !== -1 || tempTotal !== -1)) ||
        tempId !== -1
      ) {
        gradeCol = tempGrade;
        classCol = tempClass;
        combinedGradeClassCol = tempCombined;
        numCol = tempNum;
        studentIdCol = tempId;
        nameCol = tempName;
        totalCountCol = tempTotal;
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex !== -1) {
      let currentContextGrade = defaultSheetGrade || '';

      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;

        // 1) Check studentIdCol (학번: 5-digit 20315 or 4-digit 2315)
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

        // 2) Extract grade & class
        let gStr = '';
        let cStr = '';

        if (combinedGradeClassCol !== -1) {
          const parsed = parseCombinedGradeClass(String(row[combinedGradeClassCol] ?? ''), currentContextGrade || defaultSheetGrade || '2');
          if (parsed) {
            gStr = parsed.grade;
            cStr = parsed.classNum;
            currentContextGrade = gStr;
          }
        }

        if (!gStr || !cStr) {
          const rawG = gradeCol !== -1 ? String(row[gradeCol] ?? '').replace(/[^0-9]/g, '') : '';
          if (rawG && ['1', '2', '3'].includes(rawG)) {
            gStr = rawG;
            currentContextGrade = rawG;
          } else {
            gStr = currentContextGrade || defaultSheetGrade || '2';
          }

          const rawClassCell = classCol !== -1 ? String(row[classCol] ?? '').trim() : '';
          const combined = parseCombinedGradeClass(rawClassCell, gStr);
          if (combined) {
            gStr = combined.grade;
            cStr = combined.classNum;
          } else {
            const digits = rawClassCell.replace(/[^0-9]/g, '');
            if (digits) cStr = String(parseInt(digits, 10));
          }
        }

        const cNum = parseInt(cStr, 10);
        if (!['1', '2', '3'].includes(gStr) || isNaN(cNum) || cNum < 1 || cNum > 15) {
          continue;
        }

        const key = `${gStr}-${cNum}`;

        // Summary table with totalCountCol
        if (totalCountCol !== -1 && numCol === -1 && nameCol === -1) {
          const totalVal = parseInt(String(row[totalCountCol] ?? '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(totalVal) && totalVal >= 1 && totalVal <= 60) {
            summaryCountPerClass[key] = totalVal;
            continue;
          }
        }

        const hasName = nameCol !== -1 ? Boolean(String(row[nameCol] ?? '').trim()) : true;
        const numVal = numCol !== -1 ? parseInt(String(row[numCol] ?? '').replace(/[^0-9]/g, ''), 10) : NaN;

        if (numCol !== -1 && !isNaN(numVal) && numVal >= 1 && numVal <= 60 && hasName) {
          studentCountPerClass[key] = (studentCountPerClass[key] || 0) + 1;
          if (!maxNumberPerClass[key] || numVal > maxNumberPerClass[key]) {
            maxNumberPerClass[key] = numVal;
          }
        } else if (nameCol !== -1 && hasName) {
          const nameVal = String(row[nameCol] ?? '').trim();
          if (nameVal && !/^(합계|소계|총계|계|평균|총원|재적)$/.test(nameVal)) {
            studentCountPerClass[key] = (studentCountPerClass[key] || 0) + 1;
          }
        } else if (totalCountCol !== -1) {
          const totalVal = parseInt(String(row[totalCountCol] ?? '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(totalVal) && totalVal >= 1 && totalVal <= 60) {
            summaryCountPerClass[key] = totalVal;
          }
        }
      }
    }

    // =========================================================================
    // STRATEGY D: Fallback Pattern Scan (Sheet-per-class, 5-digit IDs, or "X학년 Y반 Z명")
    // =========================================================================
    const afterStrategiesCount =
      Object.keys(studentCountPerClass).length + Object.keys(summaryCountPerClass).length;

    if (afterStrategiesCount === beforeSheetKeysCount) {
      // Check if sheetName itself represents a single class (e.g., "1-1", "2학년 3반")
      if (sheetCombined) {
        const key = `${sheetCombined.grade}-${sheetCombined.classNum}`;
        let sheetStudents = 0;
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          if (!Array.isArray(row)) continue;
          const rowStrs = row.map((v) => String(v ?? '').trim()).filter(Boolean);
          const hasNum = rowStrs.some((s) => /^\d{1,2}$/.test(s) && Number(s) >= 1 && Number(s) <= 55);
          const hasKorName = rowStrs.some((s) => /^[가-힣]{2,5}$/.test(s) && !/^(번호|성명|이름|학번|성별|비고|합계|총계)$/.test(s));
          if (hasNum && hasKorName) {
            sheetStudents++;
          }
        }
        if (sheetStudents >= 5) {
          studentCountPerClass[key] = sheetStudents;
        }
      }

      // Scan cells for 5-digit student IDs or inline "1학년 2반 28명" / "1-2 28명"
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;

        const rowJoined = row.map((c) => String(c ?? '').trim()).filter(Boolean).join(' ');
        // Inline summary pattern: "1학년 2반 28명" or "1학년 2반 : 28"
        const inlineMatches = rowJoined.matchAll(/([1-3])\s*(?:학년|[-])\s*0?(\d{1,2})\s*반?\s*[:：]?\s*(\d{2})\s*명/g);
        for (const m of inlineMatches) {
          const g = m[1];
          const c = String(parseInt(m[2], 10));
          const cnt = parseInt(m[3], 10);
          if (Number(c) >= 1 && Number(c) <= 15 && cnt >= 5 && cnt <= 55) {
            summaryCountPerClass[`${g}-${c}`] = cnt;
          }
        }

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
 * Reconstructs 2D table rows from a PDF document using pdf.js text item (X, Y) coordinates.
 * Also returns plain text and rendered page image (if scanned PDF with 0 text).
 */
async function extractPdfTableAndText(file: File): Promise<{
  sheetsData: { sheetName: string; rows: string[][] }[];
  extractedText: string;
  scannedPageBase64: string | null;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    isEvalSupported: false,
    useWorkerFetch: false,
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, 25);

  const sheetsData: { sheetName: string; rows: string[][] }[] = [];
  let extractedText = '';
  let totalTextItems = 0;

  for (let p = 1; p <= numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const items = (textContent.items || []) as any[];

    // Group items into rows by Y coordinate (tolerance: 4.5 units)
    const rowBuckets: { y: number; cells: { x: number; text: string }[] }[] = [];

    for (const item of items) {
      const str = String(item.str ?? '').trim();
      if (!str) continue;
      totalTextItems++;

      const x = item.transform ? Number(item.transform[4]) : 0;
      const y = item.transform ? Number(item.transform[5]) : 0;

      let bucket = rowBuckets.find((b) => Math.abs(b.y - y) <= 4.5);
      if (!bucket) {
        bucket = { y, cells: [] };
        rowBuckets.push(bucket);
      }
      bucket.cells.push({ x, text: str });
    }

    // Sort buckets top-to-bottom (higher Y is higher on PDF page)
    rowBuckets.sort((a, b) => b.y - a.y);

    const pageRows: string[][] = [];
    const pageLines: string[] = [];

    for (const bucket of rowBuckets) {
      bucket.cells.sort((a, b) => a.x - b.x);
      // Merge cells that are very close horizontally (< 8 units apart)
      const mergedCells: string[] = [];
      let lastX: number | null = null;

      for (const cell of bucket.cells) {
        if (lastX !== null && cell.x - lastX < 8 && mergedCells.length > 0) {
          mergedCells[mergedCells.length - 1] += cell.text;
        } else {
          mergedCells.push(cell.text);
        }
        lastX = cell.x + cell.text.length * 4;
      }

      if (mergedCells.length > 0) {
        pageRows.push(mergedCells);
        pageLines.push(mergedCells.join('\t'));
      }
    }

    sheetsData.push({ sheetName: `Page ${p}`, rows: pageRows });
    if (pageLines.length > 0) {
      extractedText += `--- [Page ${p}] ---\n${pageLines.join('\n')}\n\n`;
    }
  }

  // If the PDF is a scanned image with virtually no selectable text, render Page 1 to a lightweight JPEG
  let scannedPageBase64: string | null = null;
  if (totalTextItems < 5 && pdfDoc.numPages >= 1) {
    try {
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        scannedPageBase64 = canvas.toDataURL('image/jpeg', 0.82);
      }
    } catch {
      // Fallback to raw base64 if canvas render fails
    }
  }

  return { sheetsData, extractedText, scannedPageBase64 };
}

/**
 * Safely calls server /api/parse-roster or direct client Gemini fallback
 * without ever throwing "Unexpected end of JSON input".
 */
async function callAiRosterFallback(params: {
  fileBase64?: string;
  mimeType?: string;
  extractedText?: string;
}): Promise<{ classTotals: Record<string, string>; maxClassFound: number }> {
  const customApiKey = (getGeminiApiKey() || '').trim();

  try {
    const res = await fetch('/api/parse-roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: params.fileBase64,
        mimeType: params.mimeType,
        extractedText: params.extractedText,
        customApiKey,
      }),
    });

    const rawText = await res.text();
    let data: any = null;
    if (rawText && rawText.trim()) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    }

    if (res.ok && data?.success && data?.classTotals) {
      return {
        classTotals: data.classTotals,
        maxClassFound: data.maxClassFound || 0,
      };
    }

    if (res.status === 429 || data?.error?.includes('429') || data?.error?.includes('RESOURCE_EXHAUSTED') || data?.error?.includes('quota')) {
      throw new Error('Gemini API 호출 할당량(Quota)을 초과했습니다. 잠시 후 다시 시도하거나 엑셀(.xlsx, .xls, .csv) 또는 텍스트 PDF 형식으로 첨부해 주세요.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }
  } catch (err: any) {
    if (err?.message?.includes('할당량')) {
      throw err;
    }
    // If user configured a custom Gemini key in browser, attempt direct client-side fallback
    if (customApiKey) {
      const client = new GoogleGenAI({ apiKey: customApiKey });
      const parts: any[] = [];
      if (params.extractedText) {
        parts.push({
          text: `다음 전교 학생 명렬표/인원 현황 데이터를 분석하여 학년별·반별 총원(학생 수)을 JSON으로 추출해 주세요:\n\n${params.extractedText.slice(0, 60000)}`,
        });
      } else if (params.fileBase64) {
        const cleanB64 = params.fileBase64
          .replace(/^data:image\/\w+;base64,/, '')
          .replace(/^data:application\/pdf;base64,/, '');
        parts.push({
          inlineData: { mimeType: params.mimeType || 'image/jpeg', data: cleanB64 },
        });
        parts.push({
          text: '이 학생 명렬표/인원 현황 문서를 분석하여 학년별·반별 총원(학생 수)을 JSON으로 추출해 주세요.',
        });
      }

      const response = await client.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              classes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    grade: { type: Type.STRING },
                    classNum: { type: Type.STRING },
                    count: { type: Type.INTEGER },
                  },
                  required: ['grade', 'classNum', 'count'],
                },
              },
              maxClassNum: { type: Type.INTEGER },
            },
            required: ['classes', 'maxClassNum'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{"classes":[],"maxClassNum":0}');
      const classTotals: Record<string, string> = {};
      let maxClassFound = parsed.maxClassNum || 0;
      for (const item of parsed.classes || []) {
        const g = String(item.grade || '').replace(/[^1-3]/g, '');
        const c = String(item.classNum || '').replace(/[^0-9]/g, '');
        const cnt = Number(item.count);
        if (g && c && !isNaN(cnt) && cnt > 0) {
          classTotals[`${g}-${c}`] = String(cnt);
          const cNum = parseInt(c, 10);
          if (cNum > maxClassFound && cNum <= 15) maxClassFound = cNum;
        }
      }
      return { classTotals, maxClassFound };
    }

    throw new Error(
      err?.message && !err.message.includes('Unexpected end of JSON')
        ? err.message
        : '파일에서 학년·반별 인원 표를 인식하지 못했거나 서버 응답이 지연되었습니다. 학년/반/번호(또는 총원)가 포함된 명렬표인지 확인해 주세요.'
    );
  }

  return { classTotals: {}, maxClassFound: 0 };
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

  // 1. Handle Excel / CSV files (Instant local heuristic first)
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

    if (!combinedCsvText.trim()) {
      throw new Error('엑셀 파일에서 데이터를 읽을 수 없습니다. 파일 내용을 확인해 주세요.');
    }

    const aiResult = await callAiRosterFallback({ extractedText: combinedCsvText });
    const totalStudentsCount = Object.values(aiResult.classTotals).reduce(
      (acc, v) => acc + (parseInt(v, 10) || 0),
      0
    );

    return {
      classTotals: aiResult.classTotals,
      maxClassFound: aiResult.maxClassFound,
      totalStudentsCount,
      totalClassesCount: Object.keys(aiResult.classTotals).length,
      method: 'ai_vision',
    };
  }

  // 2. Handle PDF files (Instant local coordinate table extraction first, AI fallback for scanned PDFs)
  if (isPdf) {
    let extractedPdfText = '';
    let scannedPageBase64: string | null = null;

    try {
      const pdfExtracted = await extractPdfTableAndText(file);
      extractedPdfText = pdfExtracted.extractedText;
      scannedPageBase64 = pdfExtracted.scannedPageBase64;

      // Try instant local table heuristic on the reconstructed PDF rows!
      const localPdfParsed = parseSpreadsheetRowsHeuristically(pdfExtracted.sheetsData);
      const keys = Object.keys(localPdfParsed.classTotals);
      if (keys.length > 0) {
        const totalStudentsCount = Object.values(localPdfParsed.classTotals).reduce(
          (acc, v) => acc + (parseInt(v, 10) || 0),
          0
        );
        return {
          classTotals: localPdfParsed.classTotals,
          maxClassFound: localPdfParsed.maxClassFound,
          totalStudentsCount,
          totalClassesCount: keys.length,
          method: 'local_pdf',
        };
      }
    } catch {
      // Fall through to AI parsing if pdf.js encounters an encrypted or non-standard stream
    }

    // If PDF has extracted text, only send the text (much faster & smaller than full PDF binary)
    if (extractedPdfText.trim().length > 20) {
      const aiResult = await callAiRosterFallback({ extractedText: extractedPdfText });
      const totalStudentsCount = Object.values(aiResult.classTotals).reduce(
        (acc, v) => acc + (parseInt(v, 10) || 0),
        0
      );
      return {
        classTotals: aiResult.classTotals,
        maxClassFound: aiResult.maxClassFound,
        totalStudentsCount,
        totalClassesCount: Object.keys(aiResult.classTotals).length,
        method: 'ai_vision',
      };
    }

    // Scanned PDF: send rendered JPEG page (or raw PDF base64 if rendering failed)
    const base64Data =
      scannedPageBase64 ||
      (await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
        reader.readAsDataURL(file);
      }));

    const aiResult = await callAiRosterFallback({
      fileBase64: base64Data,
      mimeType: scannedPageBase64 ? 'image/jpeg' : 'application/pdf',
    });
    const totalStudentsCount = Object.values(aiResult.classTotals).reduce(
      (acc, v) => acc + (parseInt(v, 10) || 0),
      0
    );

    return {
      classTotals: aiResult.classTotals,
      maxClassFound: aiResult.maxClassFound,
      totalStudentsCount,
      totalClassesCount: Object.keys(aiResult.classTotals).length,
      method: 'ai_vision',
    };
  }

  // 3. Handle Image files (.png, .jpg, .webp)
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('이미지 파일을 읽는 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });

  const aiResult = await callAiRosterFallback({
    fileBase64: base64Data,
    mimeType: file.type || 'image/jpeg',
  });
  const totalStudentsCount = Object.values(aiResult.classTotals).reduce(
    (acc, v) => acc + (parseInt(v, 10) || 0),
    0
  );

  return {
    classTotals: aiResult.classTotals,
    maxClassFound: aiResult.maxClassFound,
    totalStudentsCount,
    totalClassesCount: Object.keys(aiResult.classTotals).length,
    method: 'ai_vision',
  };
}
