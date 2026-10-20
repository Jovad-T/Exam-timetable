import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  disableNetwork,
  enableNetwork,
  Firestore,
} from 'firebase/firestore';
import type { ScheduleData } from '../types/schedule';
import rawFirebaseConfig from '../../firebase-applet-config.json';

const LOG_PREFIX = '[FirebaseSync]';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};

const resolvedFirebaseConfig: FirebaseOptions & { firestoreDatabaseId?: string } = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || rawFirebaseConfig.measurementId || undefined,
  firestoreDatabaseId:
    env.VITE_FIREBASE_DATABASE_ID ||
    (rawFirebaseConfig as any).firestoreDatabaseId ||
    'ai-studio-aischeduledata-a2767f12-89e1-4ca3-ba74-922d5d8de62d',
};

const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : 'server';
console.info(`${LOG_PREFIX} Initializing Firebase client`, {
  origin: runtimeOrigin,
  projectId: resolvedFirebaseConfig.projectId,
  firestoreDatabaseId: resolvedFirebaseConfig.firestoreDatabaseId,
  configSource: env.VITE_FIREBASE_PROJECT_ID ? 'VITE_ENV' : 'firebase-applet-config.json',
});

// Initialize Firebase App across environments (AI Studio, Vercel, Electron)
const app = !getApps().length ? initializeApp(resolvedFirebaseConfig) : getApp();

function initFirestoreInstance(): Firestore {
  const databaseId = resolvedFirebaseConfig.firestoreDatabaseId;
  try {
    const instance = databaseId
      ? initializeFirestore(
          app,
          {
            experimentalAutoDetectLongPolling: true,
            ignoreUndefinedProperties: true,
          },
          databaseId
        )
      : initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true,
          ignoreUndefinedProperties: true,
        });
    console.info(`${LOG_PREFIX} Firestore initialized with long-polling auto-detect & ignoreUndefinedProperties`, {
      databaseId: databaseId || '(default)',
    });
    return instance;
  } catch (err) {
    console.info(`${LOG_PREFIX} Reusing existing Firestore instance via getFirestore()`, {
      databaseId: databaseId || '(default)',
      reason: err instanceof Error ? err.message : String(err),
    });
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

export const db: Firestore = initFirestoreInstance();

export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Quota management helpers (reset stale quota flags on fresh app load so cross-environment sync is never permanently blocked)
let quotaExceededMemoryFlag = false;

if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('firestore_quota_exceeded') !== null) {
      console.info(`${LOG_PREFIX} Clearing stale localStorage 'firestore_quota_exceeded' flag on startup`);
      localStorage.removeItem('firestore_quota_exceeded');
    }
  } catch {}
}

export const FIRESTORE_UPGRADE_URL = `https://console.firebase.google.com/project/${resolvedFirebaseConfig.projectId || 'exam-timetable-7f9b8'}/firestore/databases/${resolvedFirebaseConfig.firestoreDatabaseId || 'ai-studio-aischeduledata-a2767f12-89e1-4ca3-ba74-922d5d8de62d'}/data?openUpgradeDialog=true`;

export function isQuotaError(error: unknown): boolean {
  const errMsg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;
  return (
    code === 'resource-exhausted' ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Quota') ||
    errMsg.includes('quota')
  );
}

export function isRetryableFirestoreError(error: unknown): boolean {
  if (isQuotaError(error)) return false;
  const code = (error as any)?.code || '';
  const errMsg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (code === 'permission-denied' || code === 'unauthenticated' || code === 'invalid-argument') {
    return false;
  }
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'internal' ||
    code === 'aborted' ||
    code === 'unknown' ||
    errMsg.includes('offline') ||
    errMsg.includes('network') ||
    errMsg.includes('failed to fetch') ||
    errMsg.includes('unavailable') ||
    errMsg.includes('timeout')
  );
}

export async function withFirestoreRetry<T>(
  operationName: string,
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 600;
  let attempt = 0;

  while (true) {
    try {
      if (attempt > 0) {
        await enableNetwork(db).catch(() => {});
      }
      return await fn();
    } catch (error: any) {
      attempt++;
      const errCode = error?.code || 'unknown';
      const errMsg = error instanceof Error ? error.message : String(error);

      if (isQuotaError(error)) {
        console.warn(`${LOG_PREFIX} [${operationName}] Quota exhausted detected on attempt ${attempt}`, {
          code: errCode,
          message: errMsg,
        });
        throw error;
      }

      if (attempt > maxRetries || !isRetryableFirestoreError(error)) {
        console.error(`${LOG_PREFIX} [${operationName}] Failed permanently after ${attempt} attempt(s)`, {
          code: errCode,
          message: errMsg,
          retryable: isRetryableFirestoreError(error),
        });
        throw error;
      }

      const jitter = Math.floor(Math.random() * 200);
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
      console.warn(
        `${LOG_PREFIX} [${operationName}] Transient error on attempt ${attempt}/${maxRetries + 1} (${errCode}: ${errMsg}). Retrying in ${delayMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export function isFirestoreQuotaExceeded(): boolean {
  return quotaExceededMemoryFlag;
}

export function markFirestoreQuotaExceeded(): void {
  quotaExceededMemoryFlag = true;
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);

  if (isQuotaError(error)) {
    markFirestoreQuotaExceeded();
    console.warn(`${LOG_PREFIX} Firestore write/read quota reached. Running seamlessly in LocalStorage mode.`);
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error(`${LOG_PREFIX} Firestore Error:`, JSON.stringify(errInfo));
}

// Validate connection on startup and ensure network is enabled
export async function validateFirestoreConnection(): Promise<boolean> {
  if (isFirestoreQuotaExceeded()) {
    console.warn(`${LOG_PREFIX} Skipping connection validation because quotaExceededMemoryFlag is true`);
    return false;
  }
  const startTime = Date.now();
  try {
    await withFirestoreRetry(
      'validateFirestoreConnection',
      async () => {
        await enableNetwork(db).catch(() => {});
        await getDocFromServer(doc(db, 'test', 'connection'));
      },
      { maxRetries: 2, baseDelayMs: 500 }
    );
    quotaExceededMemoryFlag = false;
    console.info(`${LOG_PREFIX} Firestore connection validated successfully in ${Date.now() - startTime}ms`);
    return true;
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (isQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return false;
    }
    if (error instanceof Error && errMsg.includes('the client is offline')) {
      console.warn(`${LOG_PREFIX} Please check your Firebase configuration or network connectivity (client is offline).`);
    } else {
      console.warn(`${LOG_PREFIX} Connection check finished with warning (${Date.now() - startTime}ms):`, errMsg);
    }
    return false;
  }
}

// Run connection validation in background
if (typeof window !== 'undefined') {
  validateFirestoreConnection().catch(() => {});
}

function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined || val === null) return val;
  try {
    return JSON.parse(JSON.stringify(val));
  } catch {
    return val;
  }
}

/**
 * Saves school info and exam schedule data to Firestore.
 * This makes the data immediately accessible to all classrooms across the school.
 */
export async function saveSchoolScheduleToCloud(
  schoolSlug: string,
  scheduleData: ScheduleData,
  schoolName: string,
  logoUrl?: string | null,
  alertSettings?: any,
  classTotals?: Record<string, string>,
  maxClasses?: number
): Promise<void> {
  if (!schoolSlug) {
    console.warn(`${LOG_PREFIX} saveSchoolScheduleToCloud aborted: empty schoolSlug`);
    return;
  }
  if (isFirestoreQuotaExceeded()) {
    console.warn(`${LOG_PREFIX} saveSchoolScheduleToCloud skipped: quota exceeded flag is active`);
    return;
  }

  const normalizedSlug = schoolSlug.trim().slice(0, 100);
  const normalizedName = (schoolName || '한국고등학교').trim().slice(0, 100) || '한국고등학교';
  const now = new Date().toISOString();
  const scheduleJson = JSON.stringify(scheduleData || []);
  const startTime = Date.now();

  console.info(`${LOG_PREFIX} Starting saveSchoolScheduleToCloud`, {
    schoolSlug: normalizedSlug,
    schoolName: normalizedName,
    daysCount: Array.isArray(scheduleData) ? scheduleData.length : 0,
    payloadBytes: scheduleJson.length,
    updatedAt: now,
  });

  try {
    // 1. Save / Update School profile document
    const schoolPath = `schools/${normalizedSlug}`;
    const schoolRef = doc(db, 'schools', normalizedSlug);
    const schoolPayload = {
      name: normalizedName,
      slug: normalizedSlug,
      logoUrl: typeof logoUrl === 'string' ? logoUrl : '',
      updatedAt: now,
    };

    try {
      await withFirestoreRetry(`saveSchoolProfile(${schoolPath})`, () => setDoc(schoolRef, schoolPayload), {
        maxRetries: 3,
        baseDelayMs: 600,
      });
      console.info(`${LOG_PREFIX} Saved school profile document: ${schoolPath}`);
    } catch (err: any) {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
        console.warn(`${LOG_PREFIX} Firestore quota exceeded while saving school profile. Continuing in LocalStorage mode.`);
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, schoolPath);
      throw err;
    }

    // 2. Save / Update Current Active Exam Schedule
    const schedulePath = `schools/${normalizedSlug}/schedules/current`;
    const scheduleRef = doc(db, 'schools', normalizedSlug, 'schedules', 'current');
    try {
      const schedulePayload: Record<string, any> = {
        schoolSlug: normalizedSlug,
        schoolName: normalizedName,
        scheduleJson,
        updatedAt: now,
      };
      if (alertSettings !== undefined && alertSettings !== null) {
        schedulePayload.alertSettings = sanitizeForFirestore(alertSettings);
      }
      if (classTotals !== undefined && classTotals !== null) {
        schedulePayload.classTotals = sanitizeForFirestore(classTotals);
      }
      if (typeof maxClasses === 'number' && !Number.isNaN(maxClasses)) {
        schedulePayload.maxClasses = maxClasses;
      }

      await withFirestoreRetry(`saveSchoolSchedule(${schedulePath})`, () => setDoc(scheduleRef, schedulePayload), {
        maxRetries: 3,
        baseDelayMs: 600,
      });
      console.info(`${LOG_PREFIX} Successfully persisted schedule to ${schedulePath} in ${Date.now() - startTime}ms`, {
        updatedAt: now,
        daysCount: Array.isArray(scheduleData) ? scheduleData.length : 0,
      });
    } catch (err: any) {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
        console.warn(`${LOG_PREFIX} Firestore quota exceeded while saving schedule. Continuing in LocalStorage mode.`);
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, schedulePath);
      throw err;
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded();
      console.warn(`${LOG_PREFIX} Firestore quota exceeded. Seamlessly continuing with LocalStorage mode.`);
      return;
    }
    console.error(`${LOG_PREFIX} Failed to sync schedule data to Firebase:`, err);
    throw err;
  }
}

/**
 * Subscribes to real-time updates for a specific school.
 * All classroom electronic boards will instantly reflect any updates made by the administrator.
 */
export function subscribeSchoolSchedule(
  schoolSlug: string,
  onScheduleUpdate: (
    data: ScheduleData,
    cloudSchoolName?: string,
    alertSettings?: any,
    classTotals?: Record<string, string>,
    maxClasses?: number
  ) => void,
  onSchoolProfileUpdate?: (name: string, logoUrl?: string) => void
): () => void {
  if (!schoolSlug || isFirestoreQuotaExceeded()) {
    console.warn(`${LOG_PREFIX} subscribeSchoolSchedule skipped`, {
      schoolSlug,
      quotaExceeded: isFirestoreQuotaExceeded(),
    });
    return () => {};
  }

  const normalizedSlug = schoolSlug.trim().slice(0, 100);
  console.info(`${LOG_PREFIX} Attaching real-time listeners for school "${normalizedSlug}"`);

  const schoolRef = doc(db, 'schools', normalizedSlug);
  const unsubSchool = onSnapshot(
    schoolRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        console.info(`${LOG_PREFIX} Real-time school profile snapshot received`, {
          schoolSlug: normalizedSlug,
          fromCache: snap.metadata.fromCache,
          updatedAt: data?.updatedAt,
        });
        if (data && onSchoolProfileUpdate) {
          onSchoolProfileUpdate(data.name || '', data.logoUrl || '');
        }
      }
    },
    (err: any) => {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
      }
      console.warn(`${LOG_PREFIX} Real-time school profile listener warning for "${normalizedSlug}":`, err);
    }
  );

  // Listen to Active Exam Schedule document
  const scheduleRef = doc(db, 'schools', normalizedSlug, 'schedules', 'current');
  const unsubSchedule = onSnapshot(
    scheduleRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        console.info(`${LOG_PREFIX} Real-time schedule snapshot received`, {
          schoolSlug: normalizedSlug,
          fromCache: snap.metadata.fromCache,
          hasPendingWrites: snap.metadata.hasPendingWrites,
          updatedAt: data?.updatedAt,
        });
        if (data && data.scheduleJson) {
          try {
            const parsed = JSON.parse(data.scheduleJson);
            onScheduleUpdate(parsed, data.schoolName, data.alertSettings, data.classTotals, data.maxClasses);
          } catch (e) {
            console.error(`${LOG_PREFIX} Error parsing cloud schedule JSON:`, e);
          }
        }
      } else {
        console.info(`${LOG_PREFIX} Real-time schedule snapshot: document does not exist yet for "${normalizedSlug}"`);
      }
    },
    (err: any) => {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
      }
      console.warn(`${LOG_PREFIX} Real-time schedule listener warning for "${normalizedSlug}":`, err);
    }
  );

  return () => {
    console.info(`${LOG_PREFIX} Detaching real-time listeners for school "${normalizedSlug}"`);
    unsubSchool();
    unsubSchedule();
  };
}

/**
 * One-time fetch of school schedule from Cloud Firestore (useful on initial page load)
 */
export async function fetchSchoolScheduleFromCloud(
  schoolSlug: string
): Promise<{
  scheduleData: ScheduleData | null;
  schoolName: string | null;
  logoUrl: string | null;
  alertSettings: any | null;
  classTotals?: Record<string, string> | null;
  maxClasses?: number | null;
}> {
  if (!schoolSlug || isFirestoreQuotaExceeded()) {
    console.warn(`${LOG_PREFIX} fetchSchoolScheduleFromCloud skipped`, {
      schoolSlug,
      quotaExceeded: isFirestoreQuotaExceeded(),
    });
    return { scheduleData: null, schoolName: null, logoUrl: null, alertSettings: null };
  }

  const normalizedSlug = schoolSlug.trim().slice(0, 100);
  const startTime = Date.now();
  console.info(`${LOG_PREFIX} Fetching initial schedule from Firestore for "${normalizedSlug}"...`);

  try {
    const scheduleRef = doc(db, 'schools', normalizedSlug, 'schedules', 'current');
    const schoolRef = doc(db, 'schools', normalizedSlug);

    // Fetch directly from server with retry first to avoid stale IndexedDB cache across AI Studio / Vercel
    const [scheduleSnap, schoolSnap] = await Promise.all([
      withFirestoreRetry(
        `fetchScheduleFromServer(schools/${normalizedSlug}/schedules/current)`,
        () => getDocFromServer(scheduleRef),
        { maxRetries: 2, baseDelayMs: 500 }
      ).catch(async (serverErr) => {
        console.warn(`${LOG_PREFIX} Server fetch failed for schedule, falling back to local cache:`, serverErr);
        return getDoc(scheduleRef);
      }),
      withFirestoreRetry(
        `fetchSchoolFromServer(schools/${normalizedSlug})`,
        () => getDocFromServer(schoolRef),
        { maxRetries: 2, baseDelayMs: 500 }
      ).catch(async (serverErr) => {
        console.warn(`${LOG_PREFIX} Server fetch failed for school profile, falling back to local cache:`, serverErr);
        return getDoc(schoolRef);
      }),
    ]);

    let scheduleData: ScheduleData | null = null;
    let schoolName: string | null = null;
    let logoUrl: string | null = null;
    let alertSettings: any | null = null;
    let classTotals: Record<string, string> | null = null;
    let maxClasses: number | null = null;

    if (schoolSnap.exists()) {
      const data = schoolSnap.data();
      schoolName = data.name || null;
      logoUrl = data.logoUrl || null;
    }

    if (scheduleSnap.exists()) {
      const data = scheduleSnap.data();
      if (data && data.scheduleJson) {
        try {
          scheduleData = JSON.parse(data.scheduleJson);
        } catch (jsonErr) {
          console.error(`${LOG_PREFIX} Invalid JSON in Firestore schedule for school "${normalizedSlug}":`, jsonErr);
          scheduleData = null;
        }
      }
      if (data && data.schoolName && !schoolName) {
        schoolName = data.schoolName;
      }
      if (data && data.alertSettings) {
        alertSettings = data.alertSettings;
      }
      if (data && data.classTotals) {
        classTotals = data.classTotals;
      }
      if (data && typeof data.maxClasses === 'number') {
        maxClasses = data.maxClasses;
      }
      console.info(`${LOG_PREFIX} Initial cloud schedule loaded in ${Date.now() - startTime}ms`, {
        schoolSlug: normalizedSlug,
        daysCount: Array.isArray(scheduleData) ? scheduleData.length : 0,
        updatedAt: data?.updatedAt,
        fromCache: scheduleSnap.metadata.fromCache,
      });
    } else {
      console.info(`${LOG_PREFIX} No existing cloud schedule document found at schools/${normalizedSlug}/schedules/current (${Date.now() - startTime}ms)`);
    }

    return { scheduleData, schoolName, logoUrl, alertSettings, classTotals, maxClasses };
  } catch (err) {
    console.warn(`${LOG_PREFIX} Error fetching initial cloud schedule for "${normalizedSlug}":`, err);
    try {
      handleFirestoreError(err, OperationType.GET, `schools/${normalizedSlug}`);
    } catch {}
    return { scheduleData: null, schoolName: null, logoUrl: null, alertSettings: null };
  }
}
