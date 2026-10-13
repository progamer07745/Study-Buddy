import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../features/auth/api.js";

const initialPreferences = {
  taskReminders: true,
  focusReminders: true,
  prayerReminders: true,
  prayerLeadMinutes: 15,
};

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("المتصفح لا يدعم تحديد الموقع."));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error("اسمح بالوصول للموقع لتفعيل تنبيهات الصلاة.")),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60 * 60 * 1000 },
    );
  });
}

export default function NotificationCenter({ onClose }) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [pushSubscription, setPushSubscription] = useState(null);
  const [location, setLocation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [savingStage, setSavingStage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [permission, setPermission] = useState(() => ("Notification" in window ? Notification.permission : "unsupported"));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const marker = `studyBuddyNotifications:${Date.now()}`;
    window.history.pushState({ ...(window.history.state || {}), [marker]: true }, "", window.location.href);
    const closeOnBack = () => onCloseRef.current();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener("popstate", closeOnBack);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("popstate", closeOnBack);
      window.removeEventListener("keydown", closeOnEscape);
      if (window.history.state?.[marker]) window.history.back();
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadExisting() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (!active || !existing) return;
        const result = await apiRequest(`/notifications/subscriptions?endpoint=${encodeURIComponent(existing.endpoint)}`, {}, false);
        if (!active || !result.data?.subscription) return;
        setPushSubscription(existing);
        setPreferences({ ...initialPreferences, ...result.data.subscription.preferences });
        if (Number.isFinite(result.data.subscription.latitude) && Number.isFinite(result.data.subscription.longitude)) {
          setLocation({ latitude: result.data.subscription.latitude, longitude: result.data.subscription.longitude });
        }
      } catch {
        // Keep notification setup available if this device has not subscribed yet.
      }
    }
    loadExisting();
    return () => { active = false; };
  }, []);

  function updatePreference(key, value) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setError(""); setMessage("");
  }

  async function saveSubscription(subscription, nextLocation = location) {
    await requestWithTimeout("/notifications/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo",
        latitude: nextLocation?.latitude ?? null,
        longitude: nextLocation?.longitude ?? null,
        preferences,
      }),
    });
    setPushSubscription(subscription);
    setLocation(nextLocation);
  }

  async function enableOrSave() {
    setBusy(true); setSavingStage("جارٍ التحقق من إعدادات الإشعارات..."); setError(""); setMessage("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("الإشعارات غير مدعومة في هذا المتصفح. جرّب Chrome أو Edge.");
      }
      if (Notification.permission === "denied") throw new Error("إذن الإشعارات مرفوض من إعدادات المتصفح. فعّله للموقع ثم حاول مرة أخرى.");
      const granted = Notification.permission === "granted" || await Notification.requestPermission() === "granted";
      setPermission(Notification.permission);
      if (!granted) throw new Error("لازم تسمح بالإشعارات من نافذة المتصفح.");

      setSavingStage("جارٍ الاتصال بالخادم...");
      const config = await requestWithTimeout("/notifications/config", {}, false);
      if (!config.enabled || !config.publicKey) throw new Error("إرسال الإشعارات لم يُفعّل على الخادم بعد. يلزم إعداد مفاتيح VAPID ومجدول Cloudflare.");
      setSavingStage("جارٍ تسجيل هذا الجهاز...");
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(config.publicKey) });

      let nextLocation = location;
      if (preferences.prayerReminders && !nextLocation) {
        setSavingStage("بانتظار إذن الموقع لحساب مواقيت الصلاة...");
        nextLocation = await getLocation();
      }
      setSavingStage("جارٍ حفظ الإعدادات...");
      await saveSubscription(subscription, nextLocation);
      setMessage("تم حفظ إعدادات الإشعارات على هذا الجهاز.");
    } catch (issue) {
      setError(issue.name === "TimeoutError" || issue.name === "AbortError" ? "الخادم ما ردّش خلال 20 ثانية. تحقق من اتصال الإنترنت وحالة الباك اند ثم حاول تاني." : issue.message || "تعذر إعداد الإشعارات.");
    } finally { setBusy(false); setSavingStage(""); }
  }

  async function disable() {
    if (!pushSubscription) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await requestWithTimeout("/notifications/subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint: pushSubscription.endpoint }) });
      await pushSubscription.unsubscribe();
      setPushSubscription(null);
      setMessage("تم إيقاف الإشعارات على هذا الجهاز.");
    } catch (issue) { setError(issue.message || "تعذر إيقاف الإشعارات."); }
    finally { setBusy(false); }
  }

  async function refreshLocation() {
    setBusy(true); setError(""); setMessage("");
    try {
      const nextLocation = await getLocation();
      setLocation(nextLocation);
      if (pushSubscription) await saveSubscription(pushSubscription, nextLocation);
      setMessage("تم تحديث موقع مواقيت الصلاة لهذا الجهاز.");
    } catch (issue) { setError(issue.message || "تعذر تحديث الموقع."); }
    finally { setBusy(false); }
  }

  return <div className="notification-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="notification-panel" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
      <button type="button" className="close-modal-btn" onClick={onClose} aria-label="إغلاق">×</button>
      <p className="eyebrow">خليك قريب من أهدافك</p>
      <h2 id="notifications-title">إعدادات الإشعارات</h2>
      <p className="notification-intro">اختار التنبيهات اللي تحب توصلك حتى لو Study Buddy مقفول.</p>
      <label className="notification-option"><span><strong>المهام المتبقية</strong><small>تذكير بعد ساعتين بلا نشاط على مهامك، ثم كل 4 ساعات إذا بقيت مهام غير مكتملة، من 8 صباحًا إلى 10 مساءً.</small></span><input type="checkbox" checked={preferences.taskReminders} onChange={(event) => updatePreference("taskReminders", event.target.checked)} /></label>
      <label className="notification-option"><span><strong>جلسة التركيز</strong><small>إشعار عند بدء جلسة التركيز وعند انتهاء وقتها.</small></span><input type="checkbox" checked={preferences.focusReminders} onChange={(event) => updatePreference("focusReminders", event.target.checked)} /></label>
      <label className="notification-option"><span><strong>مواقيت الصلاة</strong><small>إشعار عند دخول الوقت، وقبله بربع ساعة.</small></span><input type="checkbox" checked={preferences.prayerReminders} onChange={(event) => updatePreference("prayerReminders", event.target.checked)} /></label>
      <p className="notification-location">{location ? "سيتم حساب الصلاة حسب موقع هذا الجهاز." : "تنبيهات الصلاة تحتاج إذن الموقع مرة واحدة."}</p>
      {preferences.prayerReminders && <button className="notification-location-btn" onClick={refreshLocation} disabled={busy}>تحديث الموقع الحالي</button>}
      {permission === "denied" && <p className="notification-help">إذن الإشعارات مرفوض من المتصفح حاليًا. غيّره من إعدادات الموقع.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="notification-success" role="status">{message}</p>}
      <button className="auth-submit-btn" onClick={enableOrSave} disabled={busy}>{busy ? savingStage || "جارٍ الحفظ..." : pushSubscription ? "حفظ الإعدادات" : "تفعيل الإشعارات"}</button>
      {pushSubscription && <button className="notification-disable" onClick={disable} disabled={busy}>إيقاف الإشعارات على هذا الجهاز</button>}
      <p className="notification-footnote">التذكيرات اليومية تعتمد على بقاء خدمة الإشعارات متاحة، وقد تتأخر بسبب قيود المتصفح أو الشبكة.</p>
    </section>
  </div>;
}

function requestWithTimeout(path, options = {}, retry = true) {
  return apiRequest(path, { ...options, signal: AbortSignal.timeout(20000) }, retry);
}

function decodeVapidKey(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
