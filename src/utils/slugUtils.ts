// Utility for converting Korean school names, Korean QWERTY keystrokes, and text to clean URL slugs

// Korean QWERTY key map (Dubeolsik to English)
const KOREAN_JAMO_TO_ENG: Record<string, string> = {
  'ㄱ': 'r', 'ㄲ': 'R', 'ㄳ': 'rt', 'ㄴ': 's', 'ㄵ': 'sw', 'ㄶ': 'sg',
  'ㄷ': 'e', 'ㄸ': 'E', 'ㄹ': 'f', 'ㄺ': 'fr', 'ㄻ': 'fa', 'ㄼ': 'fq',
  'ㄽ': 'ft', 'ㄾ': 'fx', 'ㄿ': 'fv', 'ㅀ': 'fg', 'ㅁ': 'a', 'ㅂ': 'q',
  'ㅃ': 'Q', 'ㅄ': 'qt', 'ㅅ': 't', 'ㅆ': 'T', 'ㅇ': 'd', 'ㅈ': 'w',
  'ㅉ': 'W', 'ㅊ': 'c', 'ㅋ': 'z', 'ㅌ': 'x', 'ㅍ': 'v', 'ㅎ': 'g',
  'ㅏ': 'k', 'ㅐ': 'o', 'ㅑ': 'i', 'ㅒ': 'O', 'ㅓ': 'j', 'ㅔ': 'p',
  'ㅕ': 'u', 'ㅖ': 'P', 'ㅗ': 'h', 'ㅘ': 'hk', 'ㅙ': 'ho', 'ㅚ': 'hl',
  'ㅛ': 'y', 'ㅜ': 'n', 'ㅝ': 'nj', 'ㅞ': 'np', 'ㅟ': 'nl', 'ㅠ': 'b',
  'ㅡ': 'm', 'ㅢ': 'ml', 'ㅣ': 'l',
};

// Hangul decomposition tables for Romanization
const CHO_SUNG = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
];
const JUNG_SUNG = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
];
const JONG_SUNG = [
  '', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 'h',
];

// Well-known school / regional keywords mapping
const KNOWN_WORDS: Record<string, string> = {
  '서울': 'seoul',
  '한국': 'korea',
  '경기': 'gyeonggi',
  '부산': 'busan',
  '인천': 'incheon',
  '대구': 'daegu',
  '대전': 'daejeon',
  '광주': 'gwangju',
  '울산': 'ulsan',
  '세종': 'sejong',
  '제주': 'jeju',
  '강원': 'gangwon',
  '충북': 'chungbuk',
  '충남': 'chungnam',
  '전북': 'jeonbuk',
  '전남': 'jeonnam',
  '경북': 'gyeongbuk',
  '경남': 'gyeongnam',
  '수원': 'suwon',
  '성남': 'seongnam',
  '고양': 'goyang',
  '용인': 'yongin',
  '부천': 'bucheon',
  '안산': 'ansan',
  '안양': 'anyang',
  '평택': 'pyeongtaek',
  '시흥': 'siheung',
  '김포': 'gimpo',
  '파주': 'paju',
  '의정부': 'uijeongbu',
  '단국': 'dankook',
  '한민': 'hanmin',
  '상산': 'sangsan',
  '배재': 'paichai',
  '휘문': 'whimoon',
  '중동': 'joongdong',
  '보성': 'bosung',
  '양정': 'yangjung',
  '현대': 'hyundai',
  '민사': 'minjok',
  '하나': 'hana',
  '대원': 'daewon',
  '명덕': 'myungduk',
  '이화': 'ewha',
  '숙명': 'sookmyung',
  '중앙': 'chungang',
};

/**
 * Decomposes a Hangul syllable into its Cho/Jung/Jong components
 */
function decomposeHangul(char: string): { cho: number; jung: number; jong: number } | null {
  const code = char.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  const cho = Math.floor(code / (21 * 28));
  const jung = Math.floor((code % (21 * 28)) / 28);
  const jong = code % 28;
  return { cho, jung, jong };
}

/**
 * Romanizes arbitrary Hangul text
 */
export function romanizeHangul(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const decomposed = decomposeHangul(char);
    if (decomposed) {
      const cho = CHO_SUNG[decomposed.cho] || '';
      const jung = JUNG_SUNG[decomposed.jung] || '';
      const jong = JONG_SUNG[decomposed.jong] || '';
      result += cho + jung + jong;
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Converts Korean QWERTY keyboard keystrokes (e.g. "ㄴㄷㅐㅕㅣ" -> "seoul")
 */
export function convertKoreanQwertyToEnglish(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Check if it's already a jamo
    if (KOREAN_JAMO_TO_ENG[char]) {
      result += KOREAN_JAMO_TO_ENG[char];
      continue;
    }
    // Check if it's a decomposed Hangul syllable
    const decomposed = decomposeHangul(char);
    if (decomposed) {
      // Map back to jamo then to english
      const CHO_JAMO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
      const JUNG_JAMO = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
      const JONG_JAMO = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

      const c = CHO_JAMO[decomposed.cho] || '';
      const u = JUNG_JAMO[decomposed.jung] || '';
      const o = JONG_JAMO[decomposed.jong] || '';

      result += (KOREAN_JAMO_TO_ENG[c] || '') + (KOREAN_JAMO_TO_ENG[u] || '') + (KOREAN_JAMO_TO_ENG[o] || '');
    } else {
      result += char;
    }
  }
  return result.toLowerCase();
}

/**
 * Intelligently generates an English URL slug from a school name
 * E.g.: "서울고등학교" -> "seoul-high"
 *       "세종과학고등학교" -> "sejong-science-high"
 *       "한국외고" -> "korea-fl-high"
 *       "서울여고" -> "seoul-girls-high"
 */
export function generateSchoolSlug(schoolName: string): string {
  if (!schoolName || !schoolName.trim()) return '';

  let text = schoolName.trim();

  // If already in English or alphanumeric
  if (/^[a-zA-Z0-9\s-_]+$/.test(text)) {
    return cleanSlug(text.replace(/high\s*school/i, '-high').replace(/middle\s*school/i, '-middle'));
  }

  // 1. Process known school type suffixes
  let suffix = '-high';
  if (/과학고(등학교)?$/.test(text)) {
    suffix = '-science-high';
    text = text.replace(/과학고(등학교)?$/, '');
  } else if (/외국어고(등학교)?$|외고$/.test(text)) {
    suffix = '-fl-high';
    text = text.replace(/외국어고(등학교)?$|외고$/, '');
  } else if (/마이스터고(등학교)?$/.test(text)) {
    suffix = '-meister-high';
    text = text.replace(/마이스터고(등학교)?$/, '');
  } else if (/예술고(등학교)?$|예고$/.test(text)) {
    suffix = '-art-high';
    text = text.replace(/예술고(등학교)?$|예고$/, '');
  } else if (/체육고(등학교)?$|체고$/.test(text)) {
    suffix = '-sports-high';
    text = text.replace(/체육고(등학교)?$|체고$/, '');
  } else if (/여자고(등학교)?$|여고$/.test(text)) {
    suffix = '-girls-high';
    text = text.replace(/여자고(등학교)?$|여고$/, '');
  } else if (/남자고(등학교)?$|남고$/.test(text)) {
    suffix = '-boys-high';
    text = text.replace(/남자고(등학교)?$|남고$/, '');
  } else if (/중학교$|중$/.test(text)) {
    suffix = '-middle';
    text = text.replace(/중학교$|중$/, '');
  } else if (/초등학교$|초$/.test(text)) {
    suffix = '-elem';
    text = text.replace(/초등학교$|초$/, '');
  } else if (/고등학교$|고교$|고$/.test(text)) {
    suffix = '-high';
    text = text.replace(/고등학교$|고교$|고$/, '');
  }

  text = text.trim();

  if (!text) {
    return `school${suffix}`;
  }

  // 2. Check for known city / school names
  for (const [kr, en] of Object.entries(KNOWN_WORDS)) {
    if (text.startsWith(kr)) {
      const rest = text.slice(kr.length);
      const restRoman = rest ? '-' + romanizeHangul(rest) : '';
      return cleanSlug(`${en}${restRoman}${suffix}`);
    }
  }

  // 3. Fallback to romanization
  const romanized = romanizeHangul(text);
  return cleanSlug(`${romanized}${suffix}`);
}

/**
 * Cleans a slug string into standard URL-safe format:
 * - lowercase
 * - spaces and illegal chars become hyphens
 * - allows a-z, 0-9, and hangul (가-힣) if user wants Korean slug
 * - no duplicate hyphens or leading/trailing hyphens
 */
export function cleanSlug(input: string, allowHangul: boolean = false): string {
  if (!input) return '';
  let str = input.toLowerCase().trim();

  // If Korean QWERTY keystrokes (like ㄴㄷㅐㅕㅣ) are present without full syllables,
  // try converting to English
  if (/^[ㄱ-ㅎㅏ-ㅣ\s_-]+$/.test(str)) {
    str = convertKoreanQwertyToEnglish(str);
  }

  // Replace spaces and underscores with hyphens
  str = str.replace(/[\s_]+/g, '-');

  if (allowHangul) {
    str = str.replace(/[^a-z0-9가-힣-]/g, '');
  } else {
    str = str.replace(/[^a-z0-9-]/g, '');
  }

  // Collapse multiple hyphens
  str = str.replace(/-+/g, '-');
  // Trim hyphens from edges
  str = str.replace(/^-+|-+$/g, '');

  return str;
}

/**
 * Checks if a string contains any Korean characters
 */
export function hasHangul(text: string): boolean {
  return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text);
}
