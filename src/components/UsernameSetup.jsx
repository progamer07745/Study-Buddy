import { useState } from "react";
import { useAuth } from "../features/auth/AuthProvider.jsx";

export default function UsernameSetup() {
  const { user, completeUsername, signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    try { await signOut(); } catch { /* signOut clears the local session either way. */ }
  }

  async function submit(event) {
    event.preventDefault();
    const cleanUsername = username.trim();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      setError("استخدم من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا أو _.");
      return;
    }
    if (password.length < 10 || password.length > 72) {
      setError("كلمة المرور لازم تكون من 10 إلى 72 حرفًا.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await completeUsername({ username: cleanUsername, password, passwordConfirm });
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="username-setup-page" dir="rtl">
    <section className="username-setup-card" aria-labelledby="username-setup-title">
      <div className="username-setup-icon" aria-hidden="true">@</div>
      <p className="eyebrow">خطوة أخيرة</p>
      <h1 id="username-setup-title">كمّل إنشاء حسابك</h1>
      <p className="username-setup-copy">أهلًا {user?.name || "بيك"}! اختار اسم مستخدم وكلمة مرور لحسابك في Study Buddy.</p>
      <form onSubmit={submit}>
        <label className="username-setup-label" htmlFor="new-username">اسم المستخدم</label>
        <input
          id="new-username"
          className="username-setup-input"
          name="username"
          type="text"
          value={username}
          onChange={(event) => { setUsername(event.target.value); setError(""); }}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck="false"
          minLength={3}
          maxLength={30}
          pattern="[A-Za-z0-9_]{3,30}"
          placeholder="مثال: ahmed_22"
          required
          autoFocus
        />
        <p className="username-setup-hint">حروف إنجليزية وأرقام و _ فقط، من 3 إلى 30 حرفًا. الاسم ده هيظهر للناس في لوحة المتصدرين.</p>
        <label className="username-setup-label" htmlFor="new-password">كلمة مرور Study Buddy</label>
        <input
          id="new-password"
          className="username-setup-input"
          name="password"
          type="password"
          value={password}
          onChange={(event) => { setPassword(event.target.value); setError(""); }}
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          placeholder="10 أحرف على الأقل"
          required
        />
        <label className="username-setup-label" htmlFor="confirm-password">تأكيد كلمة المرور</label>
        <input
          id="confirm-password"
          className="username-setup-input"
          name="passwordConfirm"
          type="password"
          value={passwordConfirm}
          onChange={(event) => { setPasswordConfirm(event.target.value); setError(""); }}
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          placeholder="اكتبها مرة ثانية"
          required
        />
        <p className="username-setup-hint">دي كلمة مرور حسابك في Study Buddy، ومش محتاج تعرف كلمة مرور Google.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="auth-submit-btn" type="submit" disabled={busy}>
          {busy ? "جارٍ إنشاء حسابك..." : "إنشاء الحساب والمتابعة"}
        </button>
      </form>
      <button className="username-setup-logout" type="button" onClick={logout}>تسجيل الخروج</button>
    </section>
  </main>;
}
