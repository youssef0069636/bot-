import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type FirebaseErrorCategory =
  | 'DATABASE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'UNAUTHENTICATED'
  | 'NETWORK_OFFLINE'
  | 'QUOTA_EXCEEDED'
  | 'FAILED_PRECONDITION'
  | 'CONFIGURATION_ERROR'
  | 'AUTH_ERROR'
  | 'UNKNOWN';

export interface ClassifiedFirebaseError {
  category: FirebaseErrorCategory;
  message: string;
  code: string;
  rawMessage: string;
  isFatal: boolean;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  category: FirebaseErrorCategory;
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

/**
 * Accurately classifies any Firebase error into a structured category
 */
export function classifyFirebaseError(error: unknown): ClassifiedFirebaseError {
  if (!error) {
    return {
      category: 'UNKNOWN',
      message: 'حدث خطأ غير متوقع.',
      code: 'unknown',
      rawMessage: '',
      isFatal: false,
    };
  }

  const err = error as { code?: string; message?: string };
  const code = (err.code || '').toLowerCase();
  const rawMessage = err.message || (typeof error === 'string' ? error : String(error));
  const lowerMsg = rawMessage.toLowerCase();

  // 1. Database Not Found in Project (Critical difference from offline network error)
  if (
    lowerMsg.includes('database') &&
    (lowerMsg.includes('not found') || lowerMsg.includes('does not exist') || lowerMsg.includes('check your project configuration'))
  ) {
    return {
      category: 'DATABASE_NOT_FOUND',
      message: 'قاعدة بيانات Firestore غير موجودة في مشروع Firebase (Database Not Found). يرجى التأكد من إنشاء قاعدة البيانات في Firebase Console أو التحقق من معرف قاعدة البيانات (Database ID).',
      code: 'firestore/database-not-found',
      rawMessage,
      isFatal: true,
    };
  }

  // 2. Permission Denied / Security Rules Rejection
  if (
    code.includes('permission-denied') ||
    lowerMsg.includes('missing or insufficient permissions') ||
    lowerMsg.includes('permission-denied')
  ) {
    return {
      category: 'PERMISSION_DENIED',
      message: 'ليس لديك الصلاحية لتنفيذ هذا الإجراء (Permission Denied). تم رفض العملية من قِبل قواعد أمان Firestore.',
      code: 'firestore/permission-denied',
      rawMessage,
      isFatal: false,
    };
  }

  // 3. Unauthenticated Session
  if (code.includes('unauthenticated') || lowerMsg.includes('unauthenticated')) {
    return {
      category: 'UNAUTHENTICATED',
      message: 'انتهت جلستك أو لم تقم بتسجيل الدخول. يرجى تسجيل الدخول مجدداً.',
      code: 'firestore/unauthenticated',
      rawMessage,
      isFatal: false,
    };
  }

  // 4. Quota Exceeded
  if (code.includes('resource-exhausted') || lowerMsg.includes('quota exceeded')) {
    return {
      category: 'QUOTA_EXCEEDED',
      message: 'تم تجاوز حد الاستخدام اليومي المجاني لـ Firebase (Quota Exceeded).',
      code: 'firestore/resource-exhausted',
      rawMessage,
      isFatal: true,
    };
  }

  // 5. Failed Precondition / Missing Composite Indexes
  if (code.includes('failed-precondition') || lowerMsg.includes('failed-precondition') || lowerMsg.includes('index')) {
    return {
      category: 'FAILED_PRECONDITION',
      message: 'يتطلب هذا الاستعلام فهرساً مركباً في Firestore (Composite Index Required) أو أن إعدادات الحالة غير مكتملة.',
      code: 'firestore/failed-precondition',
      rawMessage,
      isFatal: false,
    };
  }

  // 6. Real Network / Client Offline
  if (
    code.includes('unavailable') ||
    lowerMsg.includes('the client is offline') ||
    code.includes('network-request-failed')
  ) {
    return {
      category: 'NETWORK_OFFLINE',
      message: 'تعذر الاتصال بخوادم Firebase. يرجى التحقق من اتصال الإنترنت.',
      code: 'firestore/unavailable',
      rawMessage,
      isFatal: false,
    };
  }

  // 7. Auth-specific errors
  if (code.startsWith('auth/')) {
    let authMsg = 'حدث خطأ أثناء المصادقة.';
    if (code === 'auth/unauthorized-domain') {
      authMsg = 'النطاق الحالي غير مصرح له في Firebase Authentication. يرجى إضافة bot-aternos.vercel.app في قائمة Authorized Domains.';
    } else if (code === 'auth/popup-closed-by-user') {
      authMsg = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
    } else if (code === 'auth/popup-blocked') {
      authMsg = 'تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة.';
    } else if (code === 'auth/email-already-in-use') {
      authMsg = 'هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول.';
    } else if (code === 'auth/weak-password') {
      authMsg = 'كلمة المرور ضعيفة جداً (يجب أن تتكون من 6 أحرف على الأقل).';
    } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
      authMsg = 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.';
    } else if (code === 'auth/user-disabled') {
      authMsg = 'تم تعطيل هذا الحساب من قِبل الإدارة.';
    } else if (code === 'auth/too-many-requests') {
      authMsg = 'تم حظر المحاولات مؤقتاً لكثرة المحاولات الخاطئة. يرجى الانتظار والمحاولة لاحقاً.';
    }

    return {
      category: 'AUTH_ERROR',
      message: authMsg,
      code,
      rawMessage,
      isFatal: false,
    };
  }

  return {
    category: 'UNKNOWN',
    message: rawMessage || 'حدث خطأ غير معروف في Firebase.',
    code: code || 'unknown',
    rawMessage,
    isFatal: false,
  };
}

/**
 * Structured Firestore error handler with diagnostic details
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const classified = classifyFirebaseError(error);
  const currentUser = auth.currentUser;

  const errInfo: FirestoreErrorInfo = {
    error: classified.rawMessage,
    operationType,
    path,
    category: classified.category,
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || false,
      isAnonymous: currentUser?.isAnonymous || false,
      tenantId: currentUser?.tenantId || null,
      providerInfo:
        currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
  };

  console.error('[Firebase Firestore Error]', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * User-friendly translator for Firebase Auth and Firestore errors
 */
export function getFriendlyFirebaseErrorMessage(error: unknown): string {
  return classifyFirebaseError(error).message;
}
