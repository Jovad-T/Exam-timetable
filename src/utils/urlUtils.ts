import { cleanSlug } from './slugUtils';

/**
 * Resolves the absolute base URL considering:
 * 1. User-customized domain from localStorage / UI
 * 2. Vercel / Production environment variables (VITE_APP_URL, VITE_PUBLIC_URL, VITE_SITE_URL, VITE_VERCEL_URL)
 * 3. Browser runtime (window.location.origin + window.location.pathname)
 */
export function getBaseUrl(overrideDomain?: string): string {
  // 1. Explicit override passed or stored in localStorage
  if (overrideDomain && overrideDomain.trim()) {
    let domain = overrideDomain.trim().replace(/\/+$/, '');
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `https://${domain}`;
    }
    return domain;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('custom_deploy_domain');
      if (stored && stored.trim()) {
        let domain = stored.trim().replace(/\/+$/, '');
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
          domain = `https://${domain}`;
        }
        return domain;
      }
    } catch {}
  }

  // 2. Browser window location (Current visiting domain takes precedence in browser runtime)
  if (typeof window !== 'undefined') {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    const pathname = window.location.pathname.replace(/\/+$/, '');
    if (origin && origin !== 'null') {
      return `${origin}${pathname}`;
    }
  }

  // 3. Environment variables (Vercel / Vite env vars fallback)
  const envAppUrl =
    (import.meta as any).env?.VITE_APP_URL ||
    (import.meta as any).env?.VITE_PUBLIC_URL ||
    (import.meta as any).env?.VITE_SITE_URL;

  if (envAppUrl && typeof envAppUrl === 'string' && envAppUrl.trim()) {
    let domain = envAppUrl.trim().replace(/\/+$/, '');
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `https://${domain}`;
    }
    return domain;
  }

  const vercelUrl = (import.meta as any).env?.VITE_VERCEL_URL;
  if (vercelUrl && typeof vercelUrl === 'string' && vercelUrl.trim()) {
    return `https://${vercelUrl.trim().replace(/\/+$/, '')}`;
  }

  return '';
}

/**
 * Generates the full absolute URL for a specific school role ('classroom' | 'admin' | 'selector')
 */
export function getSchoolUrl(
  schoolSlug: string,
  role: 'classroom' | 'admin' | 'selector' = 'classroom',
  overrideDomain?: string
): string {
  const base = getBaseUrl(overrideDomain);
  const activeSlug = cleanSlug(schoolSlug, true) || 'korea-high';

  if (role === 'selector') {
    return `${base}/#selector`;
  }

  return `${base}/#school:${activeSlug}:${role}`;
}

/**
 * Formatted message text suitable for sharing with other teachers or school messengers
 */
export function formatSchoolShareMessage(
  schoolName: string,
  schoolSlug: string,
  overrideDomain?: string
): string {
  const classroomUrl = getSchoolUrl(schoolSlug, 'classroom', overrideDomain);
  const adminUrl = getSchoolUrl(schoolSlug, 'admin', overrideDomain);
  const name = schoolName.trim() || '고등학교';

  return `[${name}] 시험 시간표 & 교실 전자칠판 바로가기

📺 교실 전자칠판 모드 (교실 디스플레이 전용):
${classroomUrl}

⚙️ 관리자 편집 모드 (교무실 시간표 및 공지 관리):
${adminUrl}

* 교실 전자칠판에 해당 주소로 접속하면 실시간 시험 타이머와 시간표가 자동 실행됩니다.`;
}
