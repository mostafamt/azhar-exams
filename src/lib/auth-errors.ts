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
  unavailable: 'تعذّر الاتصال بالخادم، تحقق من اتصالك بالإنترنت',
};

/** Arabic message for an error thrown by Firebase Auth or Firestore. */
export function authErrorMessage(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : '';
  return AUTH_ERRORS[code] ?? 'حدث خطأ غير متوقع، حاول مرة أخرى';
}
