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
 * Strips all whitespace inside a cell string for reliable Korean header/label matching.
 * E.g. "제 1 학 년" -> "제1학년", "01 반" -> "01반", "재 적 인 원" -> "재적인원"
 */
function normCompact(raw: any): string {
  return String(raw ?? '').replace(/\s+/g, '').trim();
}

/**
 * Collapses spaces between single Korean characters (common in HWP/PDF exports: "강 민 준" -> "강민준").
 */
function normalizeKoreanSpacedText(raw: any): string {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  s = s.replace(/\s+/g, ' ');
  for (let i = 0; i < 3; i++) {
    s = s.replace(/([가-힣])\s+([가-힣])/g, '$1$2');
  }
  s = s.replace(/(\d)\s+(학년|반|번|명)/g, '$1$2');
  return s.trim();
}

/**
 * Parse grade ("1"|"2"|"3") and class ("1"~"15") from a label.
 * Strictly avoids matching date strings ("2026.3.2"), class ranges ("1~8반"), or 3-part student IDs ("1-2-15").
 */
function parseStrictGradeClass(
  text: string,
  defaultGrade?: string | null,
  allowBareHyphen = false
): { grade: string; classNum: string; isExplicitGrade: boolean } | null {
  const clean = normalizeKoreanSpacedText(text);
  if (!clean) return null;

  // Reject ranges like "1~8반", "1반~8반", "1-8반(전체)", dates like "2026-03-02", or 3-part numbers "1-2-15"
  if (/~\s*\d+\s*반/.test(clean) || /\d+\s*반\s*[~-]/.test(clean)) return null;
  if (/^\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(clean)) return null;
  if (/^\d{1,2}[-./]\d{1,2}[-./]\d{1,2}$/.test(clean)) return null;

  const compact = clean.replace(/\s+/g, '');

  // Pattern 1: Explicit "1학년 2반", "제2학년3반", "1학년02반"
  const m1 = compact.match(/^(?:제)?([1-3])학년0?(\d{1,2})반?(?:명렬표|명단|출석부)?$/);
  if (m1) {
    const cNum = parseInt(m1[2], 10);
    if (cNum >= 1 && cNum <= 15) {
      return { grade: m1[1], classNum: String(cNum), isExplicitGrade: true };
    }
  }

  // Pattern 2: "1-2반", "2-03반" (has explicit '반' at the end with hyphen)
  const m2 = compact.match(/^([1-3])-0?(\d{1,2})반$/);
  if (m2) {
    const cNum = parseInt(m2[2], 10);
    if (cNum >= 1 && cNum <= 15) {
      return { grade: m2[1], classNum: String(cNum), isExplicitGrade: true };
    }
  }

  // Pattern 3: 3-digit room/class "101반", "208반", "312반"
  const m3 = compact.match(/^([1-3])(0[1-9]|1[0-5])반$/);
  if (m3) {
    return {
      grade: m3[1],
      classNum: String(parseInt(m3[2], 10)),
      isExplicitGrade: true,
    };
  }

  // Pattern 4: Just "1반", "2반", "03반", "제1반"
  const m4 = compact.match(/^(?:제)?0?(\d{1,2})반$/);
  if (m4) {
    const cNum = parseInt(m4[1], 10);
    if (cNum >= 1 && cNum <= 15) {
      const g = defaultGrade && ['1', '2', '3'].includes(defaultGrade) ? defaultGrade : '2';
      return {
        grade: g,
        classNum: String(cNum),
        isExplicitGrade: Boolean(defaultGrade && ['1', '2', '3'].includes(defaultGrade)),
      };
    }
  }

  // Pattern 5: Bare "1-1", "2-3" ONLY when explicitly allowed
  if (allowBareHyphen) {
    const m5 = compact.match(/^([1-3])-0?(\d{1,2})$/);
    if (m5) {
      const cNum = parseInt(m5[2], 10);
      if (cNum >= 1 && cNum <= 15) {
        return { grade: m5[1], classNum: String(cNum), isExplicitGrade: true };
      }
    }
  }

  return null;
}

/**
 * Extracts a single explicit grade ("1" | "2" | "3") if a text line/title mentions a grade.
 * Returns null if multiple grades (e.g. "1, 2, 3학년") are mentioned on the same line.
 */
function extractSingleGradeFromTitle(text: string): string | null {
  const norm = normalizeKoreanSpacedText(text);
  const matches = norm.match(/([1-3])\s*학년/g);
  if (matches && matches.length >= 1) {
    const uniqueGrades = new Set(
      matches
        .map((m) => {
          const d = m.match(/([1-3])/);
          return d ? d[1] : '';
        })
        .filter(Boolean)
    );
    if (uniqueGrades.size === 1) {
      return Array.from(uniqueGrades)[0];
    }
  }
  return null;
}

/**
 * Checks if a cell string is a pure student count integer (e.g. "28", "28명", or "14 14 28" where 14+14=28).
 * Never strips letters from strings like "5번 홍길동" or "1학년 2반".
 */
function parsePureCountCell(raw: any): number {
  const s = String(raw ?? '').replace(/,/g, '').trim();
  if (!s) return NaN;
  const m = s.match(/^(\d{1,3})\s*(?:명|인)?$/);
  if (m) return parseInt(m[1], 10);

  // Also handle PDF merged sub-columns like "14 14 28" (남 여 계) where one number is the sum of the other two
  const parts = s.split(/\s+/).map((p) => p.replace(/(?:명|인)$/, ''));
  if (parts.length === 3 && parts.every((p) => /^\d{1,2}$/.test(p))) {
    const [a, b, c] = parts.map((p) => parseInt(p, 10));
    if (a + b === c && c >= 10 && c <= 55) return c;
    if (b + c === a && a >= 10 && a <= 55) return a;
  }
  return NaN;
}

/**
 * Checks if a token or cell contains a valid Korean student name (2~5 Korean chars),
 * excluding all common table header/summary/status keywords.
 */
const NON_NAME_KEYWORDS = new Set([
  '학년', '학급', '학급명', '학년반', '번호', '출석번호', '학번', '순번', '연번', '성명', '이름', '학생명', '학생',
  '성별', '비고', '구분', '계', '소계', '합계', '총계', '총원', '재적', '재적인원', '재적수', '현원', '현재원',
  '정원', '인원', '인원수', '학생수', '평균', '증감', '결원', '남자', '여자', '남학생', '여학생', '남여',
  '담임', '담임교사', '선생님', '교사', '결번', '전출', '전입', '자퇴', '휴학', '위탁', '유예', '면제', '제적',
  '전체', '전교', '전교생', '명렬표', '학생명렬표', '출석부', '현황', '현황표', '시간표', '고사실', '교실',
]);

function containsValidKoreanStudentName(rawCell: any): string | null {
  const norm = normalizeKoreanSpacedText(rawCell);
  if (!norm) return null;

  // Strip leading student number like "1. 홍길동", "01 홍길동", "10101 홍길동" and trailing notes like "(전입)"
  const cleaned = norm
    .replace(/^\d{1,5}\s*[.)-]?\s*/, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .trim();

  if (!cleaned) return null;
  if (/^\d+\s*(학년|반|번|명|교시|월|일)$/.test(cleaned)) return null;

  const tokens = cleaned.split(/[\s,/|]+/);
  for (const tok of tokens) {
    const m = tok.match(/^([가-힣]{2,5})[A-Za-z0-9]?$/);
    if (m) {
      const baseKor = m[1];
      if (!NON_NAME_KEYWORDS.has(baseKor) && !/^(제?\d+학년|\d+반|\d+번)$/.test(baseKor)) {
        return tok;
      }
    }
  }
  return null;
}

/**
 * Unmerges vertical merges in an Excel worksheet so that vertically merged grade/class cells
 * (e.g. "1학년" merged across rows 2..10 or across 남/여/계 rows) are populated on each row.
 */
function extractExcelSheetRowsWithMerges(sheet: XLSX.WorkSheet): any[][] {
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' }).map((r) =>
    Array.isArray(r) ? [...r] : []
  );
  const merges = sheet['!merges'] || [];

  for (const merge of merges) {
    const { s, e } = merge;
    if (!rows[s.r]) continue;
    const topVal = rows[s.r][s.c];
    if (topVal === undefined || topVal === null || String(topVal).trim() === '') continue;

    // Propagate vertical merges (same column, spanning multiple rows) if it's a grade/class indicator
    if (s.c === e.c && e.r > s.r && e.r - s.r <= 40) {
      const compactVal = normCompact(topVal);
      if (/^(?:제?[1-3]학년|[1-3]|0?\d{1,2}반?|[1-3]-0?\d{1,2})$/.test(compactVal)) {
        for (let r = s.r + 1; r <= Math.min(e.r, rows.length - 1); r++) {
          if (rows[r] && String(rows[r][s.c] ?? '').trim() === '') {
            rows[r][s.c] = topVal;
          }
        }
      }
    }
  }

  return rows;
}

/**
 * Comprehensive, high-precision parser for 2D rows from Excel, CSV, or X-aligned PDF tables.
 * Processes each sheet with mutually exclusive table-type detection so strategies never corrupt each other.
 */
export function parseSpreadsheetRowsHeuristically(
  sheetsData: { sheetName: string; rows: any[][] }[],
  fallbackDefaultGrade: string = '2'
): {
  classTotals: Record<string, string>;
  maxClassFound: number;
} {
  const summaryCountPerClass: Record<string, number> = {};
  const rosterStudentsPerClass: Record<string, Set<string>> = {};
  const fiveDigitIdsPerClass: Record<string, Set<string>> = {};

  const unmarkedHorizontalSections: { classCounts: Record<string, number> }[] = [];

  // Remember vertical table column layout across PDF pages if Page 2+ continues without repeating the header row
  let activeVerticalCols: {
    gradeCol: number;
    classCol: number;
    combinedGradeClassCol: number;
    numCol: number;
    studentIdCol: number;
    nameCol: number;
    totalCountCol: number;
    isSummaryTable: boolean;
    lastGrade: string;
  } | null = null;

  for (let sheetIdx = 0; sheetIdx < sheetsData.length; sheetIdx++) {
    const { sheetName, rows } = sheetsData[sheetIdx];
    if (!rows || rows.length === 0) continue;

    const isPdfPage = /^Page\s+\d+$/i.test(sheetName);
    if (!isPdfPage) {
      activeVerticalCols = null;
    }

    // 1. Infer default grade for this sheet from sheetName or top title rows
    let defaultSheetGrade = extractSingleGradeFromTitle(sheetName);
    const sheetCombined = parseStrictGradeClass(sheetName, defaultSheetGrade, true);
    if (sheetCombined && sheetCombined.isExplicitGrade && !defaultSheetGrade) {
      defaultSheetGrade = sheetCombined.grade;
    }

    if (!defaultSheetGrade) {
      for (let r = 0; r < Math.min(rows.length, 8); r++) {
        const rowText = (rows[r] || []).map((c) => String(c ?? '')).join(' ');
        const g = extractSingleGradeFromTitle(rowText);
        if (g) {
          defaultSheetGrade = g;
          break;
        }
      }
    }

    // =========================================================================
    // STRATEGY 1: Cross-Tab / Matrix Summary Table (학급별 인원 현황표)
    // =========================================================================
    let sheetMatchedAsMatrix = false;

    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      const classCols: { col: number; classNum: string }[] = [];
      const gradeCols: { col: number; grade: string }[] = [];

      for (let c = 0; c < row.length; c++) {
        const cell = normCompact(row[c]);
        if (!cell) continue;
        const cm = cell.match(/^(?:제)?0?(\d{1,2})반$/);
        if (cm && parseInt(cm[1], 10) >= 1 && parseInt(cm[1], 10) <= 15) {
          classCols.push({ col: c, classNum: String(parseInt(cm[1], 10)) });
        }
        const gm = cell.match(/^(?:제)?([1-3])학년$/);
        if (gm) {
          gradeCols.push({ col: c, grade: gm[1] });
        }
      }

      // -----------------------------------------------------------------------
      // Case 1A: Header row has 2+ class columns ("1반", "2반", "3반"...)
      // Verify it's a Summary Matrix (NOT a Horizontal Student Roster!)
      // -----------------------------------------------------------------------
      if (classCols.length >= 2) {
        const firstClassCol = classCols[0].col;

        let studentNamesFoundBelow = 0;
        let hasRowNumbers4To10InLeftCol = false;
        for (let subR = r + 1; subR < Math.min(rows.length, r + 15); subR++) {
          const subRow = rows[subR];
          if (!Array.isArray(subRow)) continue;
          for (let c = 0; c < firstClassCol; c++) {
            const leftVal = parsePureCountCell(subRow[c]);
            if (!isNaN(leftVal) && leftVal >= 4 && leftVal <= 30) {
              hasRowNumbers4To10InLeftCol = true;
            }
          }
          for (const cc of classCols) {
            if (containsValidKoreanStudentName(subRow[cc.col])) {
              studentNamesFoundBelow++;
            }
          }
        }

        if (studentNamesFoundBelow < 3) {
          const subHeaderRow = rows[r + 1] || [];
          const resolvedClassCols = classCols.map((cc, idx) => {
            const colStart = cc.col;
            const colEnd =
              idx < classCols.length - 1
                ? classCols[idx + 1].col
                : Math.min(
                    row.length,
                    colStart + (classCols.length >= 2 ? classCols[1].col - classCols[0].col : 1)
                  );
            let targetCol = colStart;
            for (let sc = colStart; sc < colEnd; sc++) {
              const sh = normCompact(subHeaderRow[sc]);
              if (/^(계|소계|합계|총원|재적|재적인원|현원|학생수|인원|인원수)$/.test(sh)) {
                targetCol = sc;
                break;
              }
            }
            return { classNum: cc.classNum, colStart, colEnd, targetCol };
          });

          const explicitCounts: Record<string, number> = {};
          const genderSums: Record<string, number> = {};
          let currentRowGrade = defaultSheetGrade || '';

          for (let subR = r + 1; subR < Math.min(rows.length, r + 25); subR++) {
            const subRow = rows[subR];
            if (!Array.isArray(subRow)) continue;

            let rowHasExplicitGrade = false;
            let isGrandTotalRow = false;
            let rowSubType: 'total' | 'gender' | 'ignore' | 'normal' = 'normal';

            for (let c = 0; c < Math.max(1, firstClassCol); c++) {
              if (c >= firstClassCol && firstClassCol > 0) break;
              const cell = normCompact(subRow[c]);
              if (!cell) continue;

              if (/^(총계|전체|전교|전교생|총합계)$/.test(cell)) {
                isGrandTotalRow = true;
              }
              const explicitGm = cell.match(/^(?:제)?([1-3])학년(계|소계|합계|재적|현원|총원)?$/);
              if (explicitGm) {
                currentRowGrade = explicitGm[1];
                rowHasExplicitGrade = true;
                if (explicitGm[2]) rowSubType = 'total';
              } else if (!hasRowNumbers4To10InLeftCol && /^[1-3]$/.test(cell)) {
                currentRowGrade = cell;
                rowHasExplicitGrade = true;
              }

              if (/^(남|남자|남학생|여|여자|여학생)$/.test(cell)) {
                rowSubType = 'gender';
              } else if (/^(계|소계|합계|재적|재적인원|현원|현재원|총원|학생수|인원수)$/.test(cell)) {
                if (!rowHasExplicitGrade && !currentRowGrade) {
                  isGrandTotalRow = true;
                } else {
                  rowSubType = 'total';
                }
              } else if (/^(학급수|정원|증감|결원|특수|전입|전출)$/.test(cell)) {
                rowSubType = 'ignore';
              }
            }

            if (isGrandTotalRow) break;
            if (rowSubType === 'ignore' || !currentRowGrade) continue;

            for (const rc of resolvedClassCols) {
              let countVal = parsePureCountCell(subRow[rc.targetCol]);

              if (rc.colEnd - rc.colStart >= 3) {
                const v0 = parsePureCountCell(subRow[rc.colStart]);
                const v1 = parsePureCountCell(subRow[rc.colStart + 1]);
                const v2 = parsePureCountCell(subRow[rc.colStart + 2]);
                if (!isNaN(v0) && !isNaN(v1) && !isNaN(v2)) {
                  if (v0 + v1 === v2 && v2 >= 10) countVal = v2;
                  else if (v1 + v2 === v0 && v0 >= 10) countVal = v0;
                }
              }

              if (!isNaN(countVal) && countVal >= 1 && countVal <= 55) {
                const key = `${currentRowGrade}-${rc.classNum}`;
                if (rowSubType === 'gender') {
                  genderSums[key] = (genderSums[key] || 0) + countVal;
                } else if (rowSubType === 'total') {
                  explicitCounts[key] = countVal;
                } else if (countVal >= 10 && explicitCounts[key] === undefined) {
                  explicitCounts[key] = countVal;
                }
              }
            }
          }

          const mergedMatrixKeys = new Set([
            ...Object.keys(explicitCounts),
            ...Object.keys(genderSums),
          ]);
          let validClassesFound = 0;
          for (const k of mergedMatrixKeys) {
            const val = explicitCounts[k] ?? genderSums[k];
            if (val && val >= 10 && val <= 55) {
              summaryCountPerClass[k] = val;
              validClassesFound++;
            }
          }
          if (validClassesFound >= 2) {
            sheetMatchedAsMatrix = true;
            break;
          }
        }
      }

      // -----------------------------------------------------------------------
      // Case 1B: Header row has 2+ grade columns ("1학년", "2학년", "3학년")
      // -----------------------------------------------------------------------
      if (gradeCols.length >= 2) {
        const firstGradeCol = gradeCols[0].col;
        const subHeaderRow = rows[r + 1] || [];

        const resolvedGradeCols = gradeCols.map((gc, idx) => {
          const colStart = gc.col;
          const colEnd =
            idx < gradeCols.length - 1
              ? gradeCols[idx + 1].col
              : Math.min(
                  row.length,
                  colStart + (gradeCols.length >= 2 ? gradeCols[1].col - gradeCols[0].col : 3)
                );
          let targetCol = colStart;
          for (let sc = colStart; sc < colEnd; sc++) {
            const sh = normCompact(subHeaderRow[sc]);
            if (/^(계|소계|합계|총원|재적|재적인원|현원|학생수|인원|인원수)$/.test(sh)) {
              targetCol = sc;
              break;
            }
          }
          return { grade: gc.grade, colStart, colEnd, targetCol };
        });

        let validClassesFound = 0;
        let currentRowClass = '';

        for (let subR = r + 1; subR < Math.min(rows.length, r + 35); subR++) {
          const subRow = rows[subR];
          if (!Array.isArray(subRow)) continue;

          let isTotalRow = false;
          let rowSubType: 'total' | 'gender' | 'ignore' | 'normal' = 'normal';

          for (let c = 0; c < Math.max(1, firstGradeCol); c++) {
            if (c >= firstGradeCol && firstGradeCol > 0) break;
            const cell = normCompact(subRow[c]);
            if (!cell) continue;
            if (/^(합계|총계|계|소계|전체|전교|평균)$/.test(cell)) {
              isTotalRow = true;
              break;
            }
            const cm = cell.match(/^(?:제)?0?(\d{1,2})(?:반)?$/);
            if (cm && parseInt(cm[1], 10) >= 1 && parseInt(cm[1], 10) <= 15) {
              currentRowClass = String(parseInt(cm[1], 10));
            }
            if (/^(남|남자|여|여자)$/.test(cell)) rowSubType = 'gender';
            else if (/^(정원|증감|결원)$/.test(cell)) rowSubType = 'ignore';
          }

          if (isTotalRow || rowSubType === 'ignore' || !currentRowClass) continue;

          for (const rg of resolvedGradeCols) {
            let countVal = parsePureCountCell(subRow[rg.targetCol]);

            if (rg.colEnd - rg.colStart >= 3) {
              const v0 = parsePureCountCell(subRow[rg.colStart]);
              const v1 = parsePureCountCell(subRow[rg.colStart + 1]);
              const v2 = parsePureCountCell(subRow[rg.colStart + 2]);
              if (!isNaN(v0) && !isNaN(v1) && !isNaN(v2)) {
                if (v0 + v1 === v2 && v2 >= 10) countVal = v2;
                else if (v1 + v2 === v0 && v0 >= 10) countVal = v0;
              }
            }

            if (!isNaN(countVal) && countVal >= 10 && countVal <= 55 && rowSubType !== 'gender') {
              summaryCountPerClass[`${rg.grade}-${currentRowClass}`] = countVal;
              validClassesFound++;
            }
          }
        }

        if (validClassesFound >= 2) {
          sheetMatchedAsMatrix = true;
          break;
        }
      }
    }

    if (sheetMatchedAsMatrix) {
      continue;
    }

    // =========================================================================
    // STRATEGY 2: Horizontal Side-by-Side Multi-Class Student Roster (가로 다단 명렬표)
    // =========================================================================
    let sheetMatchedAsHorizontalRoster = false;
    let currentSectionGrade = defaultSheetGrade;

    const findHorizontalClassHeadersInRow = (
      row: any[],
      contextGrade: string | null
    ): { colStart: number; grade: string; classNum: string; isExplicitGrade: boolean }[] => {
      if (!Array.isArray(row)) return [];
      const blocks: { colStart: number; grade: string; classNum: string; isExplicitGrade: boolean }[] = [];
      let studentNamesInRow = 0;

      for (let c = 0; c < row.length; c++) {
        const rawCell = String(row[c] ?? '').trim();
        if (!rawCell) continue;
        if (containsValidKoreanStudentName(rawCell)) studentNamesInRow++;
        const parsed = parseStrictGradeClass(rawCell, contextGrade, false);
        if (parsed) {
          blocks.push({
            colStart: c,
            grade: parsed.grade,
            classNum: parsed.classNum,
            isExplicitGrade: parsed.isExplicitGrade,
          });
        }
      }

      if (blocks.length >= 2 && studentNamesInRow <= 1) {
        return blocks;
      }
      return [];
    };

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      const rowJoinedText = row.map((c) => String(c ?? '')).join(' ');
      const sectionGradeMatch = extractSingleGradeFromTitle(rowJoinedText);
      if (sectionGradeMatch) {
        currentSectionGrade = sectionGradeMatch;
      }

      const rawBlocks = findHorizontalClassHeadersInRow(row, currentSectionGrade);
      if (rawBlocks.length < 2) continue;

      const diffs: number[] = [];
      for (let i = 0; i < rawBlocks.length - 1; i++) {
        const d = rawBlocks[i + 1].colStart - rawBlocks[i].colStart;
        if (d >= 1 && d <= 8) diffs.push(d);
      }
      diffs.sort((a, b) => a - b);
      const stdWidth = diffs.length > 0 ? diffs[Math.floor(diffs.length / 2)] : 1;

      const nextRow = rows[r + 1] || [];
      let shiftLeft = 0;
      if (
        stdWidth >= 2 &&
        rawBlocks[0].colStart >= 1 &&
        /^(번호|출석번호|번)$/.test(normCompact(nextRow[rawBlocks[0].colStart - 1])) &&
        /^(성명|이름|학생명)$/.test(normCompact(nextRow[rawBlocks[0].colStart]))
      ) {
        shiftLeft = 1;
      }

      const classBlocks = rawBlocks.map((b, i) => {
        const start = Math.max(0, b.colStart - shiftLeft);
        const end =
          i < rawBlocks.length - 1
            ? Math.max(start + 1, rawBlocks[i + 1].colStart - shiftLeft)
            : start + stdWidth;
        return {
          colStart: start,
          colEnd: end,
          grade: b.grade,
          classNum: b.classNum,
          isExplicitGrade: b.isExplicitGrade,
        };
      });

      let sectionEndRow = rows.length;
      for (let subR = r + 1; subR < rows.length; subR++) {
        const subRow = rows[subR];
        if (!Array.isArray(subRow)) continue;
        if (subR > r + 2 && findHorizontalClassHeadersInRow(subRow, currentSectionGrade).length >= 2) {
          sectionEndRow = subR;
          break;
        }
        const subRowText = subRow.map((c) => String(c ?? '')).join(' ');
        const nextGradeTitle = extractSingleGradeFromTitle(subRowText);
        if (
          subR > r + 3 &&
          nextGradeTitle &&
          currentSectionGrade &&
          nextGradeTitle !== currentSectionGrade &&
          subRow.filter((c) => String(c ?? '').trim() !== '').length <= 4
        ) {
          sectionEndRow = subR;
          break;
        }
      }

      const sectionCountsByClassNum: Record<string, number> = {};
      const sectionHasExplicitGrade = classBlocks.some((b) => b.isExplicitGrade) || Boolean(currentSectionGrade);

      for (const block of classBlocks) {
        const uniqueStudentsInBlock = new Set<string>();
        let explicitTotalInBlock = 0;
        let rowIdxCounter = 0;

        for (let subR = r + 1; subR < sectionEndRow; subR++) {
          const subRow = rows[subR];
          if (!Array.isArray(subRow)) continue;

          const firstColCompact = normCompact(subRow[0]);
          if (/^(남|남자|남학생|여|여자|여학생)$/.test(firstColCompact)) {
            continue;
          }

          const slice = subRow.slice(block.colStart, block.colEnd);
          const sliceStrs = slice.map((v) => String(v ?? '').trim()).filter(Boolean);
          if (sliceStrs.length === 0) continue;

          const joinedCompact = normCompact(sliceStrs.join(''));
          if (/^(번호|출석번호|학번|성명|이름|비고|성별)+$/.test(joinedCompact)) {
            continue;
          }

          if (/^(계|합계|소계|총원|재적|재적인원|현원|인원|학생수)$/.test(firstColCompact)) {
            for (const s of sliceStrs) {
              const cnt = parsePureCountCell(s);
              if (!isNaN(cnt) && cnt >= 10 && cnt <= 55) {
                explicitTotalInBlock = cnt;
                break;
              }
            }
            continue;
          }

          const inlineTotalMatch =
            sliceStrs.join(' ').match(/(?:총원|재적|합계|소계|계|인원)\s*[:：]?\s*(\d{2})\s*명?/) ||
            sliceStrs.join(' ').match(/^(\d{2})\s*명$/);
          if (inlineTotalMatch) {
            const tVal = parseInt(inlineTotalMatch[1], 10);
            if (tVal >= 10 && tVal <= 55) {
              explicitTotalInBlock = tVal;
              continue;
            }
          }

          let studentName: string | null = null;
          let studentId5: string | null = null;
          let attendanceNum = '';

          for (const cellStr of sliceStrs) {
            const id5Match = cellStr.match(/\b([1-3][0-1]\d[0-5]\d)\b/);
            if (id5Match) studentId5 = id5Match[1];

            const numMatch = cellStr.match(/^0?(\d{1,2})\s*번?$/);
            if (numMatch && !attendanceNum) {
              const n = parseInt(numMatch[1], 10);
              if (n >= 1 && n <= 55) attendanceNum = String(n);
            }

            if (!studentName) {
              studentName = containsValidKoreanStudentName(cellStr);
            }
          }

          if (!attendanceNum && block.colStart > 0) {
            const sharedNum = parsePureCountCell(subRow[0]);
            if (!isNaN(sharedNum) && sharedNum >= 1 && sharedNum <= 55) {
              attendanceNum = String(sharedNum);
            }
          }

          if (studentId5) {
            uniqueStudentsInBlock.add(`id:${studentId5}`);
          } else if (studentName) {
            rowIdxCounter++;
            const studentKey = attendanceNum
              ? `num:${attendanceNum}:${studentName}`
              : `row:${rowIdxCounter}:${studentName}`;
            uniqueStudentsInBlock.add(studentKey);
          }
        }

        const finalCount =
          uniqueStudentsInBlock.size >= 5
            ? uniqueStudentsInBlock.size
            : explicitTotalInBlock >= 5
            ? explicitTotalInBlock
            : 0;

        if (finalCount >= 5 && finalCount <= 55) {
          sheetMatchedAsHorizontalRoster = true;
          if (sectionHasExplicitGrade) {
            const g = block.isExplicitGrade ? block.grade : (currentSectionGrade || block.grade);
            const key = `${g}-${block.classNum}`;
            if (!rosterStudentsPerClass[key]) rosterStudentsPerClass[key] = new Set();
            if (uniqueStudentsInBlock.size >= 5) {
              for (const item of uniqueStudentsInBlock) rosterStudentsPerClass[key].add(item);
            } else {
              for (let k = 1; k <= finalCount; k++) rosterStudentsPerClass[key].add(`syn:${k}`);
            }
          } else {
            sectionCountsByClassNum[block.classNum] =
              (sectionCountsByClassNum[block.classNum] || 0) + finalCount;
          }
        }
      }

      if (!sectionHasExplicitGrade && Object.keys(sectionCountsByClassNum).length >= 2) {
        // Merge with previous unmarked section if their class numbers are disjoint (e.g. 1~4반 and 5~8반 of the same grade!)
        const prevSec = unmarkedHorizontalSections[unmarkedHorizontalSections.length - 1];
        const newClassKeys = Object.keys(sectionCountsByClassNum);
        const hasOverlapWithPrev =
          prevSec && newClassKeys.some((ck) => prevSec.classCounts[ck] !== undefined);

        if (prevSec && !hasOverlapWithPrev) {
          Object.assign(prevSec.classCounts, sectionCountsByClassNum);
        } else {
          unmarkedHorizontalSections.push({ classCounts: sectionCountsByClassNum });
        }
      }

      r = sectionEndRow - 1;
    }

    if (sheetMatchedAsHorizontalRoster) {
      continue;
    }

    // =========================================================================
    // STRATEGY 3: Vertical Student Roster OR Vertical Class Summary Table
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

      let tGrade = -1;
      let tClass = -1;
      let tCombined = -1;
      let tNum = -1;
      let tId = -1;
      let tName = -1;
      let tTotal = -1;
      let tTotalPrio = 0;

      for (let c = 0; c < row.length; c++) {
        const cell = normCompact(row[c]);
        if (!cell) continue;

        if (/^(학년|학급학년|grade)$/i.test(cell)) tGrade = c;
        else if (/^(학년반|학급명|학년-반|학급\(반\)|반\(학급\))$/i.test(cell)) tCombined = c;
        else if (/^(반|학급|학급반|반명|class)$/i.test(cell)) tClass = c;
        else if (/^(번호|출석번호|학급번호|번)$/i.test(cell)) tNum = c;
        else if (/^(학번|학생번호|수험번호|개인번호|studentid)$/i.test(cell)) tId = c;
        else if (/^(성명|이름|학생명|학생성명|학생이름|성명\(한글\)|name)$/i.test(cell)) tName = c;
        else if (/^(재적|재적인원|재적수|현원|현재원|총원|학생수|인원수|실인원)$/i.test(cell)) {
          if (tTotalPrio < 2) {
            tTotal = c;
            tTotalPrio = 2;
          }
        } else if (/^(합계|소계|총계|계|인원)$/i.test(cell)) {
          if (tTotalPrio < 1) {
            tTotal = c;
            tTotalPrio = 1;
          }
        }
      }

      if (
        (tClass !== -1 && (tGrade !== -1 || tNum !== -1 || tName !== -1 || tTotal !== -1)) ||
        (tCombined !== -1 && (tNum !== -1 || tName !== -1 || tTotal !== -1)) ||
        (tId !== -1 && tName !== -1)
      ) {
        gradeCol = tGrade;
        classCol = tClass;
        combinedGradeClassCol = tCombined;
        numCol = tNum;
        studentIdCol = tId;
        nameCol = tName;
        totalCountCol = tTotal;
        headerRowIndex = r;

        const nextRow = rows[r + 1];
        if (totalCountCol !== -1 && Array.isArray(nextRow)) {
          for (let sc = totalCountCol; sc < Math.min(nextRow.length, totalCountCol + 4); sc++) {
            if (/^(계|합계|소계|총원|재적|현원)$/.test(normCompact(nextRow[sc]))) {
              totalCountCol = sc;
              headerRowIndex = r + 1;
              break;
            }
          }
        }
        break;
      }
    }

    // If this is Page 2+ of a PDF that continues the vertical roster without repeating the header row:
    let startRowIndex = headerRowIndex + 1;
    let isSummaryTable = totalCountCol !== -1 && nameCol === -1 && studentIdCol === -1;
    let currentContextGrade = defaultSheetGrade || '';

    if (headerRowIndex !== -1) {
      activeVerticalCols = {
        gradeCol,
        classCol,
        combinedGradeClassCol,
        numCol,
        studentIdCol,
        nameCol,
        totalCountCol,
        isSummaryTable,
        lastGrade: currentContextGrade,
      };
    } else if (isPdfPage && activeVerticalCols) {
      gradeCol = activeVerticalCols.gradeCol;
      classCol = activeVerticalCols.classCol;
      combinedGradeClassCol = activeVerticalCols.combinedGradeClassCol;
      numCol = activeVerticalCols.numCol;
      studentIdCol = activeVerticalCols.studentIdCol;
      nameCol = activeVerticalCols.nameCol;
      totalCountCol = activeVerticalCols.totalCountCol;
      isSummaryTable = activeVerticalCols.isSummaryTable;
      currentContextGrade = defaultSheetGrade || activeVerticalCols.lastGrade || fallbackDefaultGrade;
      headerRowIndex = 0;
      startRowIndex = 0;
    }

    if (headerRowIndex !== -1) {
      for (let r = startRowIndex; r < rows.length; r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;

        if (studentIdCol !== -1) {
          const rawId = String(row[studentIdCol] ?? '').trim();
          const m5 = rawId.match(/^([1-3])(0[1-9]|1[0-5])(0[1-9]|[1-4]\d|5[0-5])$/);
          if (m5) {
            const g = m5[1];
            const c = String(parseInt(m5[2], 10));
            const key = `${g}-${c}`;
            if (!rosterStudentsPerClass[key]) rosterStudentsPerClass[key] = new Set();
            rosterStudentsPerClass[key].add(`id:${rawId}`);
            continue;
          }
          const m4 = rawId.match(/^([1-3])([1-9])(0[1-9]|[1-4]\d|5[0-5])$/);
          if (m4) {
            const g = m4[1];
            const c = m4[2];
            const key = `${g}-${c}`;
            if (!rosterStudentsPerClass[key]) rosterStudentsPerClass[key] = new Set();
            rosterStudentsPerClass[key].add(`id:${rawId}`);
            continue;
          }
        }

        let gStr = '';
        let cStr = '';

        if (combinedGradeClassCol !== -1) {
          const parsed = parseStrictGradeClass(
            String(row[combinedGradeClassCol] ?? ''),
            currentContextGrade || defaultSheetGrade || fallbackDefaultGrade,
            true
          );
          if (parsed) {
            gStr = parsed.grade;
            cStr = parsed.classNum;
            currentContextGrade = gStr;
          }
        }

        if (!gStr || !cStr) {
          if (gradeCol !== -1) {
            const rawGCell = normCompact(row[gradeCol]);
            if (/^(합계|소계|총계|계|전체)$/.test(rawGCell)) continue;
            const gm = rawGCell.match(/^(?:제)?([1-3])(?:학년)?$/);
            if (gm) {
              gStr = gm[1];
              currentContextGrade = gStr;
            }
          }
          if (!gStr) {
            gStr = currentContextGrade || defaultSheetGrade || fallbackDefaultGrade;
          }

          if (classCol !== -1) {
            const rawCCell = normCompact(row[classCol]);
            if (/^(합계|소계|총계|계|전체|평균)$/.test(rawCCell)) continue;
            const parsedC = parseStrictGradeClass(rawCCell, gStr, true);
            if (parsedC) {
              gStr = parsedC.grade;
              cStr = parsedC.classNum;
            } else {
              const cm = rawCCell.match(/^0?(\d{1,2})$/);
              if (cm) cStr = String(parseInt(cm[1], 10));
            }
          }
        }

        if (activeVerticalCols && currentContextGrade) {
          activeVerticalCols.lastGrade = currentContextGrade;
        }

        const cNum = parseInt(cStr, 10);
        if (!['1', '2', '3'].includes(gStr) || isNaN(cNum) || cNum < 1 || cNum > 15) {
          continue;
        }

        const key = `${gStr}-${cNum}`;

        if (isSummaryTable) {
          const totalVal = parsePureCountCell(row[totalCountCol]);
          if (!isNaN(totalVal) && totalVal >= 5 && totalVal <= 55) {
            summaryCountPerClass[key] = totalVal;
          }
          continue;
        }

        const nameStr =
          nameCol !== -1 ? containsValidKoreanStudentName(row[nameCol]) || String(row[nameCol] ?? '').trim() : '';
        if (nameCol !== -1 && (!nameStr || NON_NAME_KEYWORDS.has(normCompact(nameStr)))) {
          continue;
        }

        const numVal = numCol !== -1 ? parsePureCountCell(row[numCol]) : NaN;
        if (!rosterStudentsPerClass[key]) rosterStudentsPerClass[key] = new Set();

        if (!isNaN(numVal) && numVal >= 1 && numVal <= 55) {
          rosterStudentsPerClass[key].add(nameStr ? `num:${numVal}:${nameStr}` : `num:${numVal}`);
        } else if (nameStr) {
          rosterStudentsPerClass[key].add(`name:${nameStr}:${sheetIdx}:${r}`);
        }
      }
      continue;
    }

    // =========================================================================
    // STRATEGY 4: Fallback Scan (Sheet-per-class OR 5-digit Student IDs across columns)
    // =========================================================================
    if (sheetCombined) {
      const key = `${sheetCombined.grade}-${sheetCombined.classNum}`;
      const sheetStudents = new Set<string>();
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;
        const rowStrs = row.map((v) => String(v ?? '').trim()).filter(Boolean);
        let foundNum = NaN;
        let foundName: string | null = null;
        for (const s of rowStrs) {
          const n = parsePureCountCell(s);
          if (!isNaN(n) && n >= 1 && n <= 55 && isNaN(foundNum)) foundNum = n;
          if (!foundName) foundName = containsValidKoreanStudentName(s);
        }
        if (!isNaN(foundNum) && foundName) {
          sheetStudents.add(`num:${foundNum}:${foundName}`);
        }
      }
      if (sheetStudents.size >= 5) {
        rosterStudentsPerClass[key] = sheetStudents;
        continue;
      }
    }

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      const rowJoined = normalizeKoreanSpacedText(row.map((c) => String(c ?? '')).join(' '));
      const inlineMatches = rowJoined.matchAll(
        /([1-3])\s*(?:학년|[-])\s*0?(\d{1,2})\s*반\s*[:：]?\s*(\d{2})\s*명/g
      );
      for (const m of inlineMatches) {
        const g = m[1];
        const c = String(parseInt(m[2], 10));
        const cnt = parseInt(m[3], 10);
        if (Number(c) >= 1 && Number(c) <= 15 && cnt >= 10 && cnt <= 55) {
          summaryCountPerClass[`${g}-${c}`] = cnt;
        }
      }

      for (let c = 0; c < row.length; c++) {
        const cellStr = String(row[c] ?? '').trim();
        if (!cellStr) continue;
        const idMatches = cellStr.matchAll(/\b([1-3])(0[1-9]|1[0-5])(0[1-9]|[1-4]\d|5[0-5])\b/g);
        for (const m of idMatches) {
          const fullId = m[0];
          const g = m[1];
          const cls = String(parseInt(m[2], 10));
          const key = `${g}-${cls}`;
          if (!fiveDigitIdsPerClass[key]) fiveDigitIdsPerClass[key] = new Set();
          fiveDigitIdsPerClass[key].add(fullId);
        }
      }
    }
  }

  // Resolve unmarked horizontal sections:
  if (unmarkedHorizontalSections.length >= 2 && unmarkedHorizontalSections.length <= 3) {
    unmarkedHorizontalSections.forEach((sec, idx) => {
      const inferredGrade = String(idx + 1);
      for (const [classNum, cnt] of Object.entries(sec.classCounts)) {
        const key = `${inferredGrade}-${classNum}`;
        if (!summaryCountPerClass[key] && !rosterStudentsPerClass[key]) {
          summaryCountPerClass[key] = cnt;
        }
      }
    });
  } else if (unmarkedHorizontalSections.length === 1) {
    const targetGrade = ['1', '2', '3'].includes(fallbackDefaultGrade) ? fallbackDefaultGrade : '2';
    for (const [classNum, cnt] of Object.entries(unmarkedHorizontalSections[0].classCounts)) {
      const key = `${targetGrade}-${classNum}`;
      if (!summaryCountPerClass[key] && !rosterStudentsPerClass[key]) {
        summaryCountPerClass[key] = cnt;
      }
    }
  }

  const finalTotals: Record<string, string> = {};
  let maxClassFound = 0;

  for (const [key, idSet] of Object.entries(fiveDigitIdsPerClass)) {
    if (idSet.size >= 5 && idSet.size <= 55) {
      const hasLowNum = Array.from(idSet).some((id) => parseInt(id.slice(3, 5), 10) <= 5);
      if (hasLowNum && !rosterStudentsPerClass[key] && !summaryCountPerClass[key]) {
        summaryCountPerClass[key] = idSet.size;
      }
    }
  }

  const allKeys = new Set([
    ...Object.keys(summaryCountPerClass),
    ...Object.keys(rosterStudentsPerClass),
  ]);

  for (const key of allKeys) {
    const rosterCount = rosterStudentsPerClass[key]?.size || 0;
    const summaryCount = summaryCountPerClass[key] || 0;
    const count = summaryCount > 0 ? summaryCount : rosterCount;
    if (count >= 5 && count <= 55) {
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
 * Checks whether a locally parsed roster result looks complete and structurally sound.
 */
function isRosterResultCompleteAndSane(classTotals: Record<string, string>): boolean {
  const keys = Object.keys(classTotals);
  if (keys.length === 0) return false;

  const classesByGrade: Record<string, number[]> = {};
  for (const k of keys) {
    const [g, c] = k.split('-');
    const cNum = parseInt(c, 10);
    const cnt = parseInt(classTotals[k], 10);
    if (isNaN(cnt) || cnt < 10 || cnt > 50) return false;
    if (!classesByGrade[g]) classesByGrade[g] = [];
    classesByGrade[g].push(cNum);
  }

  for (const g of Object.keys(classesByGrade)) {
    const cNums = classesByGrade[g];
    const maxC = Math.max(...cNums);
    if (maxC >= 3 && cNums.length < Math.ceil(maxC * 0.75)) {
      return false;
    }
  }

  return true;
}

/**
 * Reconstructs true X-aligned 2D table rows from a PDF document using pdf.js text coordinates.
 * Uses header-midpoint X-partitioning when class headers ("1반", "2반"...) are present on a page,
 * and non-drifting X-clustering otherwise, so empty cells NEVER shift subsequent columns!
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
  const numPages = Math.min(pdfDoc.numPages, 30);

  const sheetsData: { sheetName: string; rows: string[][] }[] = [];
  let extractedText = '';
  let totalTextItems = 0;

  for (let p = 1; p <= numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const items = (textContent.items || []) as any[];

    const rowBuckets: { y: number; cells: { x: number; right: number; text: string }[] }[] = [];

    for (const item of items) {
      const str = String(item.str ?? '').trim();
      if (!str) continue;
      totalTextItems++;

      const x = item.transform ? Number(item.transform[4]) : 0;
      const y = item.transform ? Number(item.transform[5]) : 0;
      const w = typeof item.width === 'number' && item.width > 0 ? item.width : str.length * 5;

      let bucket = rowBuckets.find((b) => Math.abs(b.y - y) <= 4.0);
      if (!bucket) {
        bucket = { y, cells: [] };
        rowBuckets.push(bucket);
      }
      bucket.cells.push({ x, right: x + w, text: str });
    }

    rowBuckets.sort((a, b) => b.y - a.y);

    const mergedRowBuckets: { cells: { x: number; center: number; text: string }[] }[] = [];
    for (const bucket of rowBuckets) {
      bucket.cells.sort((a, b) => a.x - b.x);
      const merged: { x: number; right: number; text: string }[] = [];

      for (const cell of bucket.cells) {
        if (merged.length > 0) {
          const prev = merged[merged.length - 1];
          const gap = cell.x - prev.right;
          const bothDigits = /^\d+$/.test(prev.text) && /^\d+$/.test(cell.text);
          const singleKorSyllables =
            /^[가-힣]{1,2}$/.test(prev.text) && /^[가-힣]{1,2}$/.test(cell.text);
          const numThenUnit = /^\d{1,2}$/.test(prev.text) && /^(학년|반|번|명)$/.test(cell.text);

          if (gap <= 2.5 || (!bothDigits && (singleKorSyllables || numThenUnit) && gap <= 8.5)) {
            prev.text += cell.text;
            prev.right = Math.max(prev.right, cell.right);
            continue;
          }
        }
        merged.push({ x: cell.x, right: cell.right, text: cell.text });
      }

      if (merged.length > 0) {
        mergedRowBuckets.push({
          cells: merged.map((m) => ({
            x: m.x,
            center: (m.x + m.right) / 2,
            text: normalizeKoreanSpacedText(m.text),
          })),
        });
      }
    }

    // Check if the page has a Horizontal Class Header Row ("1반", "2반", "3반"...)
    let classHeaderCenters: number[] | null = null;
    for (const rb of mergedRowBuckets) {
      const classCells = rb.cells.filter((c) => {
        const parsed = parseStrictGradeClass(c.text, '2', false);
        return Boolean(parsed);
      });
      if (classCells.length >= 3) {
        classHeaderCenters = classCells.map((c) => c.center);
        break;
      }
    }

    const pageRows: string[][] = [];
    const pageLines: string[] = [];

    if (classHeaderCenters && classHeaderCenters.length >= 3) {
      // Partition every row using exact midpoint boundaries between class headers!
      const k = classHeaderCenters.length;
      const avgSpacing =
        (classHeaderCenters[k - 1] - classHeaderCenters[0]) / Math.max(1, k - 1);
      const bounds: { minX: number; maxX: number }[] = [];

      // Slot 0: Left label/번호 column before the first class header
      const firstLeftEdge = classHeaderCenters[0] - avgSpacing * 0.52;
      bounds.push({ minX: -Infinity, maxX: firstLeftEdge });

      // Slots 1..k: Exact territory of each class column
      for (let i = 0; i < k; i++) {
        const minX =
          i === 0 ? firstLeftEdge : (classHeaderCenters[i - 1] + classHeaderCenters[i]) / 2;
        const maxX =
          i === k - 1
            ? classHeaderCenters[k - 1] + avgSpacing * 0.52
            : (classHeaderCenters[i] + classHeaderCenters[i + 1]) / 2;
        bounds.push({ minX, maxX });
      }

      // Slot k+1: Trailing summary/note column after the last class header
      bounds.push({ minX: classHeaderCenters[k - 1] + avgSpacing * 0.52, maxX: Infinity });

      for (const rb of mergedRowBuckets) {
        const alignedRow = new Array(bounds.length).fill('');
        for (const cell of rb.cells) {
          let slotIdx = bounds.findIndex((b) => cell.center >= b.minX && cell.center < b.maxX);
          if (slotIdx === -1) slotIdx = bounds.length - 1;
          if (alignedRow[slotIdx]) {
            alignedRow[slotIdx] += ' ' + cell.text;
          } else {
            alignedRow[slotIdx] = cell.text;
          }
        }
        pageRows.push(alignedRow);
        pageLines.push(alignedRow.map((c) => c || '-').join('\t'));
      }
    } else {
      // Non-drifting X-coordinate cluster anchors
      const allCenters: number[] = [];
      for (const rb of mergedRowBuckets) {
        if (rb.cells.length >= 2) {
          for (const c of rb.cells) allCenters.push(c.center);
        }
      }
      allCenters.sort((a, b) => a - b);

      const clusters: { sum: number; count: number }[] = [];
      for (const cx of allCenters) {
        if (clusters.length === 0) {
          clusters.push({ sum: cx, count: 1 });
        } else {
          const last = clusters[clusters.length - 1];
          const mean = last.sum / last.count;
          if (cx - mean > 14) {
            clusters.push({ sum: cx, count: 1 });
          } else {
            last.sum += cx;
            last.count += 1;
          }
        }
      }
      const colAnchors = clusters.map((cl) => cl.sum / cl.count);

      for (const rb of mergedRowBuckets) {
        if (colAnchors.length >= 2 && rb.cells.length >= 2) {
          const alignedRow = new Array(colAnchors.length).fill('');
          for (const cell of rb.cells) {
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < colAnchors.length; i++) {
              const d = Math.abs(colAnchors[i] - cell.center);
              if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
              }
            }
            if (alignedRow[bestIdx]) {
              alignedRow[bestIdx] += ' ' + cell.text;
            } else {
              alignedRow[bestIdx] = cell.text;
            }
          }
          pageRows.push(alignedRow);
          pageLines.push(alignedRow.map((c) => c || '-').join('\t'));
        } else {
          const simpleRow = rb.cells.map((c) => c.text);
          pageRows.push(simpleRow);
          pageLines.push(simpleRow.join('\t'));
        }
      }
    }

    sheetsData.push({ sheetName: `Page ${p}`, rows: pageRows });
    if (pageLines.length > 0) {
      extractedText += `--- [Page ${p}] ---\n${pageLines.join('\n')}\n\n`;
    }
  }

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
    } catch {}
  }

  return { sheetsData, extractedText, scannedPageBase64 };
}

/**
 * Calls server /api/parse-roster or direct client Gemini with model fallback.
 */
async function callAiRosterFallback(params: {
  fileBase64?: string;
  mimeType?: string;
  extractedText?: string;
}): Promise<{ classTotals: Record<string, string>; maxClassFound: number }> {
  const customApiKey = (getGeminiApiKey() || '').trim();

  const parseAiJsonToTotals = (parsed: any) => {
    const classTotals: Record<string, string> = {};
    let maxClassFound = parsed.maxClassNum || 0;
    for (const item of parsed.classes || []) {
      const g = String(item.grade || '').replace(/[^1-3]/g, '');
      const c = String(item.classNum || '').replace(/[^0-9]/g, '');
      const cnt = Number(item.count);
      if (g && c && !isNaN(cnt) && cnt > 0) {
        const cNum = parseInt(c, 10);
        if (cNum >= 1 && cNum <= 15) {
          classTotals[`${g}-${cNum}`] = String(cnt);
          if (cNum > maxClassFound) maxClassFound = cNum;
        }
      }
    }
    return { classTotals, maxClassFound };
  };

  if (customApiKey) {
    try {
      const client = new GoogleGenAI({ apiKey: customApiKey });
      const parts: any[] = [];
      if (params.extractedText && params.extractedText.trim().length > 20) {
        parts.push({
          text: `다음 전교 학생 명렬표/학급 인원 현황표 데이터를 정밀 분석하여 학년별·반별 총원(실제 재적 학생 수)을 빠짐없이 JSON으로 추출해 주세요. 남/여 구분이 있는 표라면 반드시 '계(합계/총원)'를 추출하고, 명렬표라면 각 반의 실제 학생 수를 정확히 세어 주세요:\n\n${params.extractedText.slice(0, 70000)}`,
        });
      } else if (params.fileBase64) {
        const cleanB64 = params.fileBase64.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: { mimeType: params.mimeType || 'image/jpeg', data: cleanB64 },
        });
        parts.push({
          text: '이 학생 명렬표/학급 인원 현황 문서를 분석하여 학년별·반별 총원(학생 수)을 JSON으로 추출해 주세요.',
        });
      }

      const modelsToTry = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.8-flash'];
      for (const modelName of modelsToTry) {
        try {
          const response = await client.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              responseMimeType: 'application/json',
              temperature: 0.0,
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
          const raw = (response.text || '{"classes":[],"maxClassNum":0}')
            .replace(/^```json\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
          const result = parseAiJsonToTotals(JSON.parse(raw));
          if (Object.keys(result.classTotals).length > 0) {
            return result;
          }
        } catch (mErr: any) {
          if (mErr?.message?.includes('429') || mErr?.message?.includes('RESOURCE_EXHAUSTED')) {
            break;
          }
        }
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/parse-roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: params.extractedText ? undefined : params.fileBase64,
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

    if (res.ok && data?.success && data?.classTotals && Object.keys(data.classTotals).length > 0) {
      return {
        classTotals: data.classTotals,
        maxClassFound: data.maxClassFound || 0,
      };
    }

    if (res.status === 429 || data?.error?.includes('429') || data?.error?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Gemini API 호출 할당량(Quota)을 초과했습니다. 잠시 후 다시 시도해 주세요.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }
  } catch (err: any) {
    throw new Error(
      err?.message && !err.message.includes('Unexpected end of JSON')
        ? err.message
        : '파일에서 학년·반별 인원 표를 인식하지 못했습니다. 학년/반/번호(또는 총원)가 포함된 명렬표인지 확인해 주세요.'
    );
  }

  return { classTotals: {}, maxClassFound: 0 };
}

/**
 * Parses an uploaded Roster file (.xls, .xlsx, .csv, .pdf, or image) into class total counts.
 */
export async function parseRosterFile(
  file: File,
  options?: { forceAi?: boolean; defaultGrade?: string }
): Promise<RosterParseResult> {
  const lowerName = file.name.toLowerCase();
  const isExcelOrCsv =
    /\.(xlsx?|csv)$/i.test(lowerName) ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel') ||
    file.type === 'text/csv';
  const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lowerName);
  const fallbackDefaultGrade = options?.defaultGrade || '2';

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
      const rows = extractExcelSheetRowsWithMerges(sheet);
      sheetsData.push({ sheetName, rows });
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        combinedCsvText += `--- [Sheet: ${sheetName}] ---\n${csv}\n\n`;
      }
    }

    const localParsed = parseSpreadsheetRowsHeuristically(sheetsData, fallbackDefaultGrade);
    const localKeys = Object.keys(localParsed.classTotals);

    if (!options?.forceAi && localKeys.length > 0 && isRosterResultCompleteAndSane(localParsed.classTotals)) {
      const totalStudentsCount = Object.values(localParsed.classTotals).reduce(
        (acc, v) => acc + (parseInt(v, 10) || 0),
        0
      );
      return {
        classTotals: localParsed.classTotals,
        maxClassFound: localParsed.maxClassFound,
        totalStudentsCount,
        totalClassesCount: localKeys.length,
        method: 'local_excel',
      };
    }

    if (combinedCsvText.trim()) {
      try {
        const aiResult = await callAiRosterFallback({ extractedText: combinedCsvText });
        const aiKeys = Object.keys(aiResult.classTotals);
        if (aiKeys.length > 0) {
          const totalStudentsCount = Object.values(aiResult.classTotals).reduce(
            (acc, v) => acc + (parseInt(v, 10) || 0),
            0
          );
          return {
            classTotals: aiResult.classTotals,
            maxClassFound: aiResult.maxClassFound,
            totalStudentsCount,
            totalClassesCount: aiKeys.length,
            method: 'ai_vision',
          };
        }
      } catch (aiErr) {
        if (localKeys.length > 0) {
          const totalStudentsCount = Object.values(localParsed.classTotals).reduce(
            (acc, v) => acc + (parseInt(v, 10) || 0),
            0
          );
          return {
            classTotals: localParsed.classTotals,
            maxClassFound: localParsed.maxClassFound,
            totalStudentsCount,
            totalClassesCount: localKeys.length,
            method: 'local_excel',
          };
        }
        throw aiErr;
      }
    }

    if (localKeys.length > 0) {
      const totalStudentsCount = Object.values(localParsed.classTotals).reduce(
        (acc, v) => acc + (parseInt(v, 10) || 0),
        0
      );
      return {
        classTotals: localParsed.classTotals,
        maxClassFound: localParsed.maxClassFound,
        totalStudentsCount,
        totalClassesCount: localKeys.length,
        method: 'local_excel',
      };
    }

    throw new Error('엑셀 파일에서 학년·반별 인원 데이터를 찾지 못했습니다.');
  }

  // 2. Handle PDF files
  if (isPdf) {
    let extractedPdfText = '';
    let scannedPageBase64: string | null = null;
    let localPdfParsed: { classTotals: Record<string, string>; maxClassFound: number } = {
      classTotals: {},
      maxClassFound: 0,
    };

    try {
      const pdfExtracted = await extractPdfTableAndText(file);
      extractedPdfText = pdfExtracted.extractedText;
      scannedPageBase64 = pdfExtracted.scannedPageBase64;
      localPdfParsed = parseSpreadsheetRowsHeuristically(
        pdfExtracted.sheetsData,
        fallbackDefaultGrade
      );
    } catch {}

    const localKeys = Object.keys(localPdfParsed.classTotals);

    if (!options?.forceAi && localKeys.length > 0 && isRosterResultCompleteAndSane(localPdfParsed.classTotals)) {
      const totalStudentsCount = Object.values(localPdfParsed.classTotals).reduce(
        (acc, v) => acc + (parseInt(v, 10) || 0),
        0
      );
      return {
        classTotals: localPdfParsed.classTotals,
        maxClassFound: localPdfParsed.maxClassFound,
        totalStudentsCount,
        totalClassesCount: localKeys.length,
        method: 'local_pdf',
      };
    }

    try {
      if (extractedPdfText.trim().length > 20) {
        const aiResult = await callAiRosterFallback({ extractedText: extractedPdfText });
        if (Object.keys(aiResult.classTotals).length > 0) {
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
      }

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
      if (Object.keys(aiResult.classTotals).length > 0) {
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
    } catch (aiErr) {
      if (localKeys.length > 0) {
        const totalStudentsCount = Object.values(localPdfParsed.classTotals).reduce(
          (acc, v) => acc + (parseInt(v, 10) || 0),
          0
        );
        return {
          classTotals: localPdfParsed.classTotals,
          maxClassFound: localPdfParsed.maxClassFound,
          totalStudentsCount,
          totalClassesCount: localKeys.length,
          method: 'local_pdf',
        };
      }
      throw aiErr;
    }

    if (localKeys.length > 0) {
      const totalStudentsCount = Object.values(localPdfParsed.classTotals).reduce(
        (acc, v) => acc + (parseInt(v, 10) || 0),
        0
      );
      return {
        classTotals: localPdfParsed.classTotals,
        maxClassFound: localPdfParsed.maxClassFound,
        totalStudentsCount,
        totalClassesCount: localKeys.length,
        method: 'local_pdf',
      };
    }

    throw new Error('PDF 파일에서 학년·반별 인원 데이터를 찾지 못했습니다.');
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
