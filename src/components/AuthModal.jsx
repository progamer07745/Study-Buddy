import { useState } from "react";
import { useAuth } from "../features/auth/AuthProvider.jsx";
import { googleAuthUrl } from "../features/auth/api.js";

export default function AuthModal({ mode, onClose, onModeChange }) {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    try {
      if (mode === "register" && values.password !== values.passwordConfirm) throw new Error("كلمتا المرور غير متطابقتين.");
      await signIn(mode === "register" ? values : { email: values.email, password: values.password }, mode === "register");
      onClose();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  }

  return <div className="auth-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="close-modal-btn" onClick={onClose} aria-label="إغلاق">×</button>
      <form className="auth-form" onSubmit={submit}>
        <h2 id="auth-title">{mode === "login" ? "أهلًا بعودتك" : "إنشاء حساب"}</h2>
        {mode === "register" && <>
          <div className="form-group"><input name="name" placeholder="الاسم" autoComplete="name" required maxLength="80" /></div>
          <div className="form-group"><input name="username" placeholder="اسم المستخدم" aria-describedby="username-public-note" autoComplete="username" required minLength="3" maxLength="30" pattern="[A-Za-z0-9_]+" /><small id="username-public-note" className="field-hint">اسم المستخدم ده هيظهر للناس في لوحة المتصدرين.</small></div>
        </>}
        <div className="form-group"><input type="email" name="email" placeholder="البريد الإلكتروني" autoComplete="email" required maxLength="254" /></div>
        <div className="form-group"><input type="password" name="password" placeholder="كلمة المرور" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 10 : 1} maxLength="72" /></div>
        {mode === "register" && <div className="form-group"><input type="password" name="passwordConfirm" placeholder="تأكيد كلمة المرور" autoComplete="new-password" required maxLength="72" /></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="auth-submit-btn" disabled={busy}>{busy ? "جارٍ التحميل..." : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}</button>
        <div className="auth-divider"><span>أو</span></div>
        <button type="button" className="google-auth-btn" onClick={() => window.location.assign(googleAuthUrl)}>
          <svg aria-hidden="true" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.63 5.92c4.45-4.1 7.13-10.14 7.13-17.57Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.88l-7.63-5.92c-2.12 1.42-4.84 2.27-8.27 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
          متابعة باستخدام Google
        </button>
        <p className="switch-form">{mode === "login" ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}<button type="button" className="text-button" onClick={() => { setError(""); onModeChange(mode === "login" ? "register" : "login"); }}>{mode === "login" ? "سجل الآن" : "سجل الدخول"}</button></p>
      </form>
    </section>
  </div>;
}
