import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import type { ScheduleData } from '../types/schedule';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if configured
export const db: Firestore = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota') || errMsg.includes('quota') || errMsg.includes('PERMISSION_DENIED')) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('firestore_quota_exceeded', 'true');
      } catch {}
    }
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Validate connection on startup as required by Firebase skill
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline mode or network is unreachable.');
    }
    return false;
  }
}

// Run connection validation in background
if (typeof window !== 'undefined') {
  validateFirestoreConnection().catch(() => {});
}

/**
 * Saves school info and exam schedule data to Firestore.
 * This makes the data immediately accessible to all classrooms across the school.
 */
export async function saveSchoolScheduleToCloud(
  schoolSlug: string,
  scheduleData: ScheduleData,
  schoolName: string,
  logoUrl?: string | null
): Promise<void> {
  if (!schoolSlug) return;
  if (typeof window !== 'undefined' && localStorage.getItem('firestore_quota_exceeded') === 'true') {
    return;
  }
  const now = new Date().toISOString();

  try {
    // 1. Save / Update School profile document
    const schoolPath = `schools/${schoolSlug}`;
    const schoolRef = doc(db, 'schools', schoolSlug);
    try {
      await setDoc(
        schoolRef,
        {
          name: schoolName || '한국고등학교',
          slug: schoolSlug,
          logoUrl: logoUrl || '',
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota') || errMsg.includes('quota')) {
        console.warn('Firestore quota exceeded. Continuing with local storage mode.');
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, schoolPath);
    }

    // 2. Save / Update Current Active Exam Schedule
    const schedulePath = `schools/${schoolSlug}/schedules/current`;
    const scheduleRef = doc(db, 'schools', schoolSlug, 'schedules', 'current');
    try {
      await setDoc(
        scheduleRef,
        {
          schoolSlug,
          schoolName: schoolName || '한국고등학교',
          scheduleJson: JSON.stringify(scheduleData),
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota') || errMsg.includes('quota')) {
        console.warn('Firestore quota exceeded. Continuing with local storage mode.');
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, schedulePath);
    }
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota') || errMsg.includes('quota')) {
      console.warn('Firestore quota exceeded. Continuing with local storage mode.');
      return;
    }
    console.error('Failed to sync schedule data to Firebase:', err);
  }
}

/**
 * Subscribes to real-time updates for a specific school.
 * All classroom electronic boards will instantly reflect any updates made by the administrator.
 */
export function subscribeSchoolSchedule(
  schoolSlug: string,
  onScheduleUpdate: (data: ScheduleData, cloudSchoolName?: string) => void,
  onSchoolProfileUpdate?: (name: string, logoUrl?: string) => void
): () => void {
  const schoolPath = `schools/${schoolSlug}`;
  const schoolRef = doc(db, 'schools', schoolSlug);
  const unsubSchool = onSnapshot(
    schoolRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && onSchoolProfileUpdate) {
          onSchoolProfileUpdate(data.name || '', data.logoUrl || '');
        }
      }
    },
    (err) => {
      console.warn('Real-time school profile listener warning:', err);
      // We don't block here, just log or handle specific errors
    }
  );

  // Listen to Active Exam Schedule document
  const schedulePath = `schools/${schoolSlug}/schedules/current`;
  const scheduleRef = doc(db, 'schools', schoolSlug, 'schedules', 'current');
  const unsubSchedule = onSnapshot(
    scheduleRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.scheduleJson) {
          try {
            const parsed = JSON.parse(data.scheduleJson);
            onScheduleUpdate(parsed, data.schoolName);
          } catch (e) {
            console.error('Error parsing cloud schedule JSON:', e);
          }
        }
      }
    },
    (err) => {
      console.warn('Real-time schedule listener warning:', err);
    }
  );

  return () => {
    unsubSchool();
    unsubSchedule();
  };
}

/**
 * One-time fetch of school schedule from Cloud Firestore (useful on initial page load)
 */
export async function fetchSchoolScheduleFromCloud(
  schoolSlug: string
): Promise<{ scheduleData: ScheduleData | null; schoolName: string | null; logoUrl: string | null }> {
  if (!schoolSlug) return { scheduleData: null, schoolName: null, logoUrl: null };

  try {
    const scheduleRef = doc(db, 'schools', schoolSlug, 'schedules', 'current');
    const scheduleSnap = await getDoc(scheduleRef);

    const schoolRef = doc(db, 'schools', schoolSlug);
    const schoolSnap = await getDoc(schoolRef);

    let scheduleData: ScheduleData | null = null;
    let schoolName: string | null = null;
    let logoUrl: string | null = null;

    if (schoolSnap.exists()) {
      const data = schoolSnap.data();
      schoolName = data.name || null;
      logoUrl = data.logoUrl || null;
    }

    if (scheduleSnap.exists()) {
      const data = scheduleSnap.data();
      if (data && data.scheduleJson) {
        scheduleData = JSON.parse(data.scheduleJson);
      }
      if (data && data.schoolName && !schoolName) {
        schoolName = data.schoolName;
      }
    }

    return { scheduleData, schoolName, logoUrl };
  } catch (err) {
    console.warn('Error fetching initial cloud schedule:', err);
    try {
      handleFirestoreError(err, OperationType.GET, `schools/${schoolSlug}`);
    } catch {}
    return { scheduleData: null, schoolName: null, logoUrl: null };
  }
}
