import { auth } from './firebase';

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

/**
 * Structured Firestore error handler with diagnostic details
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const currentUser = auth.currentUser;

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    operationType,
    path,
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
  if (!error) return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';

  const err = error as { code?: string; message?: string };
  const code = err.code || '';
  const message = err.message || '';

  // Check Firestore codes
  if (code.includes('permission-denied') || message.includes('Missing or insufficient permissions') || message.includes('permission-denied')) {
    return 'ليس لديك الصلاحية لتنفيذ هذا الإجراء (Permission Denied).';
  }
  if (code.includes('unauthenticated') || message.includes('unauthenticated')) {
    return 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.';
  }
  if (code.includes('unavailable') || message.includes('the client is offline') || message.includes('unavailable')) {
    return 'تعذر الاتصال بـ Firebase. يرجى التحقق من اتصال الإنترنت.';
  }
  if (code.includes('resource-exhausted') || message.includes('Quota exceeded')) {
    return 'تم تجاوز حد الاستخدام اليومي لـ Firebase (Quota Exceeded).';
  }
  if (code.includes('not-found') || message.includes('NOT_FOUND')) {
    return 'المستند أو السجل المطلوب غير موجود في قاعدة البيانات.';
  }
  if (code.includes('failed-precondition') || message.includes('failed-precondition')) {
    return 'إعدادات قاعدة البيانات غير مكتملة أو تتطلب إنشاء الفهارس (Indexes).';
  }

  // Check Auth codes
  if (code === 'auth/unauthorized-domain') {
    return 'النطاق الحالي غير مصرح له في Firebase Authentication. يرجى إضافة bot-aternos.vercel.app في قائمة Authorized Domains في لوحة تحكم Firebase.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
  }
  if (code === 'auth/popup-blocked') {
    return 'تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.';
  }
  if (code === 'auth/network-request-failed') {
    return 'فشل الاتصال بالخادم. يرجى التحقق من شبكة الإنترنت.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'يوجد حساب مسجل مسبقاً بهذا البريد الإلكتروني عبر مزود تسجيل دخول آخر.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من التسجيل.';
  }
  if (code === 'auth/invalid-email') {
    return 'صيغة البريد الإلكتروني غير صحيحة.';
  }
  if (code === 'auth/weak-password') {
    return 'كلمة المرور ضعيفة جداً (يجب أن تتكون من 6 أحرف على الأقل).';
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.';
  }
  if (code === 'auth/user-disabled') {
    return 'تم تعطيل هذا الحساب من قبل الإدارة. يرجى التواصل مع الدعم الفني.';
  }
  if (code === 'auth/too-many-requests') {
    return 'تم حظر المحاولات مؤقتاً لكثرة المحاولات الخاطئة. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً.';
  }

  return message || 'حدث خطأ أثناء الاتصال بـ Firebase.';
}
