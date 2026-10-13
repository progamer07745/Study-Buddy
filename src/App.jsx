import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./features/auth/AuthProvider.jsx";
import { apiRequest } from "./features/auth/api.js";
import AuthModal from "./components/AuthModal.jsx";
import UsernameSetup from "./components/UsernameSetup.jsx";
import HomePage from "./features/home/HomePage.jsx";
import TaskPlanner from "./features/tasks/TaskPlanner.jsx";
import PrayerPage from "./features/prayers/PrayerPage.jsx";
import Leaderboard from "./features/leaderboard/Leaderboard.jsx";
import NotificationCenter from "./components/NotificationCenter.jsx";
import { promptPwaInstall } from "./pwa.js";

const navigation = [
  ["home", "fa-house", "الرئيسية"], ["planner", "fa-calendar-check", "المهام"],
  ["prayers", "fa-mosque", "الصلاة والأذكار"], ["leaderboard", "fa-trophy", "المتصدرون"],
];
const dayKey = () => new Date().toLocaleDateString("en-GB");

export default function App() {
  const { user, ready, signOut, updateUser } = useAuth();
  const [page, setPage] = useState(() => localStorage.getItem("lastActivePage") || "home");
  const [plannerOpened, setPlannerOpened] = useState(() => localStorage.getItem("lastActivePage") === "planner");
  const [authMode, setAuthMode] = useState(null);
  const [quranOpen, setQuranOpen] = useState(false);
  const [quranRead, setQuranRead] = useState(() => localStorage.getItem("lastOpenDate") === dayKey());
  const [quranText, setQuranText] = useState("");
  const [quranError, setQuranError] = useState("");
  const [notice, setNotice] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [installReady, setInstallReady] = useState(false);
  const focusQueue = useRef(Promise.resolve());
  const focusSessionId = useRef(null);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("google_auth");
    if (!result) return;
    const messages = {
      success: "تم تسجيل الدخول باستخدام Google.",
      cancelled: "تم إلغاء تسجيل الدخول باستخدام Google.",
      state: "انتهت صلاحية محاولة تسجيل الدخول. حاول مرة أخرى.",
      account_conflict: "البريد ده مربوط بحساب Google آخر، اختار حساب Google الصحيح.",
      not_configured: "تسجيل Google غير مُعدّ بعد. أضف بيانات Google OAuth إلى إعدادات الباك اند.",
      failed: "تعذر تسجيل الدخول باستخدام Google. حاول مرة أخرى.",
    };
    setNotice(messages[result] || messages.failed);
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
  }, []);

  useEffect(() => {
    const updateInstallState = () => setInstallReady(true);
    const installed = () => setInstallReady(false);
    window.addEventListener("study-buddy:pwa-install-ready", updateInstallState);
    window.addEventListener("study-buddy:pwa-installed", installed);
    return () => {
      window.removeEventListener("study-buddy:pwa-install-ready", updateInstallState);
      window.removeEventListener("study-buddy:pwa-installed", installed);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPage = params.get("page");
    if (["home", "planner", "prayers", "leaderboard"].includes(requestedPage)) {
      setPage(requestedPage);
      if (requestedPage === "planner") setPlannerOpened(true);
      localStorage.setItem("lastActivePage", requestedPage);
      params.delete("page");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    const startSession = (event) => {
      if (!user) return;
      const { taskId, remainingSeconds } = event.detail || {};
      focusQueue.current = focusQueue.current.catch(() => undefined).then(async () => {
        const result = await apiRequest("/notifications/focus/start", {
          method: "POST", body: JSON.stringify({ taskId, remainingSeconds }),
        });
        focusSessionId.current = result.data.sessionId;
      }).catch((error) => console.warn("Could not sync the focus notification.", error.message));
    };
    const stopSession = () => {
      if (!user) return;
      focusQueue.current = focusQueue.current.catch(() => undefined).then(async () => {
        await apiRequest("/notifications/focus/stop", {
          method: "POST", body: JSON.stringify({ sessionId: focusSessionId.current }),
        });
        focusSessionId.current = null;
        navigator.serviceWorker?.ready.then((registration) => registration.active?.postMessage({ type: "CLOSE_NOTIFICATION", tag: "study-buddy-focus" }));
      }).catch((error) => console.warn("Could not sync the focus notification.", error.message));
    };
    window.addEventListener("study-buddy:focus-start", startSession);
    window.addEventListener("study-buddy:focus-stop", stopSession);
    return () => {
      window.removeEventListener("study-buddy:focus-start", startSession);
      window.removeEventListener("study-buddy:focus-stop", stopSession);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const goToPage = (nextPage) => {
    setPage(nextPage);
    if (nextPage === "planner") setPlannerOpened(true);
    localStorage.setItem("lastActivePage", nextPage);
  };
  const openLogin = () => setAuthMode("login");
  const pauseFocus = useCallback(() => window.dispatchEvent(new Event("study-buddy:pause-focus")), []);

  async function logout() {
    try {
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager?.getSubscription();
          if (subscription) {
            try { await apiRequest("/notifications/subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint: subscription.endpoint }) }); }
            catch { /* Unsubscribe locally even when the API is temporarily offline. */ }
            await subscription.unsubscribe();
          }
        } catch { /* The service worker may not be ready on browsers without push support. */ }
      }
      await signOut();
      setNotice("تم تسجيل الخروج وإيقاف إشعارات هذا الجهاز.");
    } catch { setNotice("تم تسجيل الخروج من هذا الجهاز."); }
  }

  function confirmQuran(event) {
    event.preventDefault();
    const cleanText = quranText.trim();
    if (cleanText.length < 4) { setQuranError("اكتب ما قرأته اليوم، مثل اسم السورة أو رقم الصفحة."); return; }
    localStorage.setItem("lastOpenDate", dayKey());
    localStorage.setItem("lastReadContent", cleanText);
    setQuranRead(true);
    setQuranOpen(false); setQuranError("");
  }

  if (!ready) return <main className="app-loading"><div className="brand-mark">SB</div><p>جارٍ تجهيز مساحة المذاكرة...</p></main>;
  if (user && !user.usernameSetupComplete) return <UsernameSetup />;

  return <>
    <header className="top-bar"><div className="user-status-container">{user ? <div className="signed-in-user"><div className="profile-info"><i className="fas fa-circle-user" /><span>{user.username}</span><span className="header-xp">⭐ {user.xp || 0}</span></div><button className="notification-open-btn" onClick={() => setNotificationsOpen(true)} aria-label="إعدادات الإشعارات" title="إعدادات الإشعارات">🔔</button><button className="btn-logout" onClick={logout}>تسجيل الخروج</button></div> : <div className="guest-actions"><button className="btn-auth" onClick={openLogin}>تسجيل الدخول</button><button className="btn-auth primary" onClick={() => setAuthMode("register")}>إنشاء حساب</button></div>}{installReady && <button className="pwa-install-btn" onClick={async () => { const installed = await promptPwaInstall(); if (installed) setInstallReady(false); }}>تثبيت التطبيق</button>}</div></header>
    <div className="app-container">
      <aside className="side-menu"><div className="logo">SB</div><nav className="nav-menu" aria-label="التنقل الرئيسي">{navigation.map(([id, icon, label]) => <button key={id} className={`nav-btn ${page === id ? "active" : ""}`} onClick={() => goToPage(id)} aria-label={label} title={label}><i className={`fas ${icon}`} /><span className="nav-label">{label}</span></button>)}<div className="xp-status" title="نقاط الخبرة"><span>⭐</span><span id="xp-count">{user?.xp || 0}</span></div></nav></aside>
      <main className="content-area">
        <div hidden={page !== "home"}><HomePage quranRead={quranRead} onOpenQuran={() => setQuranOpen(true)} /></div>
        {plannerOpened && <div hidden={page !== "planner"}><TaskPlanner onRequireAuth={openLogin} onUserUpdate={updateUser} /></div>}
        {page === "prayers" && <PrayerPage active onPauseFocus={pauseFocus} />}
        {page === "leaderboard" && <Leaderboard />}
        {notice && <p className="app-toast" role="status">{notice}</p>}
      </main>
    </div>
    {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} />}
    {notificationsOpen && <NotificationCenter onClose={() => setNotificationsOpen(false)} />}
    {quranOpen && <div className="strict-overlay"><form className="quran-card" onSubmit={confirmQuran}><h2>ورد القرآن الكريم 📖</h2><p className="quote">نورٌ ليومك وبركةٌ في وقتك..<br /><span>قبل أن تبدأ رحلة العلم، هل قرأت وردك اليومي؟</span></p><input id="quranConfirm" value={quranText} onChange={(event) => setQuranText(event.target.value)} placeholder="ماذا قرأت اليوم؟ (مثلاً: سورة الكهف)" maxLength="160" autoComplete="off" />{quranError && <p className="form-error" role="alert">{quranError}</p>}<button type="submit">تمت القراءة بحمد الله</button><p className="footer-note">اكتب ما قرأته لتسجيل ورد اليوم</p></form></div>}
  </>;
}
