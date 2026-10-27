import { FirebaseError } from 'firebase/app';

// Same wording as the dashboard's LoginPage, so both apps say the same thing.
const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'البريد الإلكتروني غير صالح',
  'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'auth/user-disabled': 'هذا الحساب موقوف',
  'auth/email-already-in-use': 'هذا البريد مسجّل بالفعل',
  'auth/weak-password': 'كلمة المرور ضعيفة (٦ أحرف على الأقل)',
  'auth/too-many-requests': 'محاولات كثيرة، حاول مرة أخرى بعد قليل',
  'auth/network-request-failed': 'تعذّر الاتصال بالخادم، تحقق من اتصالك بالإنترنت',
  'auth/account-exists-with-different-credential': 'هذا البريد مسجّل بكلمة مرور، سجّل الدخول بالبريد الإلكتروني',
  'auth/popup-blocked': 'المتصفح منع نافذة تسجيل الدخول، اسمح بالنوافذ المنبثقة وحاول مرة أخرى',
  'google/unavailable': 'تسجيل الدخول باستخدام Google غير متاح في هذه النسخة من التطبيق، استخدم البريد الإلكتروني',
  'google/play-services-not-available': 'خدمات Google Play غير متاحة أو تحتاج إلى تحديث على هذا الجهاز',
  unavailable: 'تعذّر الاتصال بالخادم، تحقق من اتصالك بالإنترنت',
  'permission-denied': 'لا تملك صلاحية تنفيذ هذا الإجراء',
};

/** The user closed the sign-in popup themselves; not worth an error message. */
export function isCancelledSignIn(error: unknown) {
  return (
    error instanceof FirebaseError &&
    (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')
  );
}

/** Arabic message for an error thrown by Firebase Auth, Firestore or Google sign-in. */
export function authErrorMessage(error: unknown) {
  const code = error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (!(code in AUTH_ERRORS)) {
    // The generic message hides the cause; log it so it shows in the Metro terminal.
    if (__DEV__) console.warn('Unhandled auth error:', code || '(no code)', error);
    return 'حدث خطأ غير متوقع، حاول مرة أخرى';
  }
  return AUTH_ERRORS[code];
}
