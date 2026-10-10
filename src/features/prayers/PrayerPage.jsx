import { useEffect, useMemo, useState } from "react";
import { remembrances } from "./remembrances.js";

const prayerNames = { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" };
const tabs = [["success", "أدعية التوفيق"], ["morning", "أذكار الصباح"], ["evening", "أذكار المساء"]];
const safeRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };

function getRequiredCount(text) { return text.includes("(7 مرات)") ? 7 : text.includes("(3 مرات)") ? 3 : 1; }

export default function PrayerPage({ active, onPauseFocus }) {
  const [timings, setTimings] = useState(null);
  const [hijriDate, setHijriDate] = useState("");
  const [prayerError, setPrayerError] = useState("");
  const [tab, setTab] = useState("success");
  const [progress, setProgress] = useState(() => safeRead("remembranceProgress", {}));
  const [now, setNow] = useState(Date.now());
  const [lockStart, setLockStart] = useState(() => Number(localStorage.getItem("prayerLockStart")) || null);
  const [lockedPrayer, setLockedPrayer] = useState("");

  useEffect(() => {
    let activeRequest = true;
    const load = async (lat, lon) => {
      try {
        const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=5`);
        if (!response.ok) throw new Error("تعذر تحميل مواقيت الصلاة.");
        const payload = await response.json();
        if (!activeRequest || payload.code !== 200) return;
        setTimings(payload.data.timings);
        setHijriDate(payload.data.date.hijri.date);
        setPrayerError("");
      } catch { if (activeRequest) setPrayerError("تعذر تحميل المواقيت الآن. تحقق من اتصال الإنترنت."); }
    };
    const fallback = () => load(30.0444, 31.2357);
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((position) => load(position.coords.latitude, position.coords.longitude), fallback, { timeout: 8000, maximumAge: 60 * 60 * 1000 });
    else fallback();
    return () => { activeRequest = false; };
  }, []);

  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(interval); }, []);

  const nextPrayer = useMemo(() => {
    if (!timings) return null;
    const current = new Date(now);
    for (const key of Object.keys(prayerNames)) {
      const [hour, minute] = timings[key].split(":").map(Number);
      const date = new Date(current); date.setHours(hour, minute, 0, 0);
      if (date > current) return { key, name: prayerNames[key], date };
    }
    const [hour, minute] = timings.Fajr.split(":").map(Number);
    const date = new Date(current); date.setDate(date.getDate() + 1); date.setHours(hour, minute, 0, 0);
    return { key: "Fajr", name: prayerNames.Fajr, date };
  }, [timings, now]);

  useEffect(() => {
    if (!timings || lockStart) return;
    const current = new Date(now);
    const currentMinute = current.getHours() * 60 + current.getMinutes();
    for (const key of Object.keys(prayerNames)) {
      const [hour, minute] = timings[key].split(":").map(Number);
      const startMinute = hour * 60 + minute;
      const dayStamp = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}-${key}`;
      if (currentMinute >= startMinute && currentMinute < startMinute + 15 && localStorage.getItem("lastPrayerLock") !== dayStamp) {
        const start = Date.now(); localStorage.setItem("prayerLockStart", String(start)); localStorage.setItem("lastPrayerLock", dayStamp);
        setLockedPrayer(prayerNames[key]); setLockStart(start); onPauseFocus?.(); break;
      }
    }
  }, [timings, now, lockStart, onPauseFocus]);

  useEffect(() => {
    if (!lockStart || now - lockStart < 15 * 60 * 1000) return;
    localStorage.removeItem("prayerLockStart"); setLockStart(null);
  }, [lockStart, now]);

  function increment(text) {
    const key = text.slice(0, 30); const required = getRequiredCount(text);
    const next = { ...progress, [key]: Math.min(required, (progress[key] || 0) + 1) };
    setProgress(next); localStorage.setItem("remembranceProgress", JSON.stringify(next));
  }

  const lockRemaining = lockStart ? Math.max(0, 15 * 60 - Math.floor((now - lockStart) / 1000)) : 0;
  const nextDiff = nextPrayer ? Math.max(0, Math.floor((nextPrayer.date.getTime() - now) / 1000)) : 0;
  const nextCountdown = `${String(Math.floor(nextDiff / 3600)).padStart(2, "0")}:${String(Math.floor((nextDiff % 3600) / 60)).padStart(2, "0")}:${String(nextDiff % 60).padStart(2, "0")}`;

  return <>
    <section className="page-section prayer-page" dir="rtl" hidden={!active}>
      <header className="page-heading"><div><p className="eyebrow">عبادة وطمأنينة</p><h1>مواقيت <span>الصلاة</span></h1></div></header>
      {prayerError && <p className="inline-notice">{prayerError} نعرض مواقيت القاهرة عند تعذر تحديد الموقع.</p>}
      {timings ? <div className="prayer-card"><p className="hijri-date">تاريخ اليوم الهجري · {hijriDate}</p><div className="next-prayer">{nextPrayer && <>الصلاة القادمة: <strong>{nextPrayer.name}</strong><span>{nextCountdown}</span></>}</div><table className="prayers-list"><thead><tr><th>الصلاة</th><th>الوقت</th></tr></thead><tbody>{Object.entries(prayerNames).map(([key, name]) => <tr key={key}><td>{name}</td><td dir="ltr">{formatPrayerTime(timings[key])}</td></tr>)}</tbody></table></div> : <div className="prayer-card loading-state">جارٍ تحديد الموقع وحساب المواقيت...</div>}
      <div className="elSalah-quotes"><p><q>أرِحنا بها يا بلال ❤️</q></p></div>
      <div className="remembrance-section"><h2>وردك اليومي</h2><div className="remembrance-tabs">{tabs.map(([key, title]) => <button key={key} className={`tab-btn ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>{title}</button>)}</div><div className="cards-grid remembrance-cards">{remembrances[tab].map((text) => {
        const key = text.slice(0, 30); const required = getRequiredCount(text); const current = progress[key] || 0; const completed = current >= required;
        return <button key={text} className={`dua-card ${completed ? "completed" : ""}`} onClick={() => increment(text)} disabled={completed}><span className="dua-text">{text}</span>{required > 1 && <span className="count-badge">{current} / {required}</span>}</button>;
      })}</div></div>
    </section>
    {lockStart && <aside className="prayer-lock-overlay" role="status"><div className="overlay-content"><button className="prayer-reminder-dismiss" onClick={() => { localStorage.removeItem("prayerLockStart"); setLockStart(null); }} aria-label="إخفاء التذكير">×</button><span className="lock-icon">🕌</span><h2>حان وقت صلاة {lockedPrayer || "الصلاة"}</h2><p>تذكير لطيف بموعد الصلاة.</p><div id="return-timer">{String(Math.floor(lockRemaining / 60)).padStart(2, "0")}:{String(lockRemaining % 60).padStart(2, "0")}</div></div></aside>}
  </>;
}

function formatPrayerTime(value) {
  const [hour, minute] = value.split(":").map(Number);
  const period = hour >= 12 ? "م" : "ص";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
}
