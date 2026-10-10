import { useEffect, useState } from "react";
import { apiRequest } from "../auth/api.js";
import { useAuth } from "../auth/AuthProvider.jsx";

const rankFor = (xp) => xp < 100 ? "مكافح مبتدئ 🌱" : xp < 500 ? "وحش المذاكرة 🦁" : xp < 1500 ? "صانع المستحيل ⚡" : "أسطورة زمانك 👑";

export default function HomePage({ onOpenQuran, quranRead }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => {
      if (!user) { setTasks([]); setTasksLoaded(true); return; }
      apiRequest("/tasks/usertasks").then((result) => {
        if (active) { setTasks(result.data?.tasks || []); setTasksLoaded(true); }
      }).catch(() => { if (active) setTasksLoaded(true); });
    };
    if (user) setTasksLoaded(false);
    load();
    window.addEventListener("study-buddy:task-change", load);
    return () => { active = false; window.removeEventListener("study-buddy:task-change", load); };
  }, [user?.id]);
  const complete = tasks.filter((task) => task.checked).length;
  const percent = tasks.length ? Math.round(complete / tasks.length * 100) : 0;
  const xp = user?.xp || 0;
  const hour = new Date().getHours();
  const [greeting, greetingEmoji] = hour < 12 ? ["صباح الخير", "☀️"] : hour < 18 ? ["مساء النشاط", "⚡"] : ["مساء الهمة", "🌙"];

  return <section className="page-section home-page" dir="rtl">
    <div className="hero-brand"><div className="brand-mark">SB</div><div><h1>Study<span>Buddy</span></h1><p>Your sweet partner in studying.</p></div></div>
    <div className="welcome-header"><p className="eyebrow">مساحة إنجازك اليومية</p><h2>{greeting} يا {user?.username || "بطل"}! {greetingEmoji}</h2><div className="user-rank">{rankFor(xp)}</div><p className="subtitle">جاهز لإنجاز مهامك اليوم؟</p></div>
    <div className="stats-grid"><article className="stat-card"><i className="fas fa-circle-check" /><div className="stat-info"><span>{complete}</span><p>مهام مكتملة</p></div></article><article className="stat-card"><i className="fas fa-fire" /><div className="stat-info"><span>{xp}</span><p>إجمالي XP</p></div></article></div>
    <div className="main-progress-circle" role="progressbar" aria-label="إنجاز المهام" aria-valuemin="0" aria-valuemax="100" aria-valuenow={tasksLoaded ? percent : undefined}><svg width="200" height="200" viewBox="0 0 200 200"><circle className="bg" cx="100" cy="100" r="90" /><circle className="progress" cx="100" cy="100" r="90" style={{ strokeDashoffset: 565 - (565 * percent) / 100 }} /></svg><div className="progress-text"><span>{tasksLoaded ? `${percent}%` : "…"}</span><p>إنجاز المهام</p></div></div>
    <div className="quote-container"><p>"النجاح هو مجموع محاولات صغيرة تتكرر كل يوم."</p></div>
    <div className="quran-reminder"><div><strong>ورد القرآن الكريم</strong><p>{quranRead ? "تم تسجيل وردك اليوم، بارك الله فيك." : "ابدأ يومك بورد من القرآن الكريم."}</p></div><button type="button" onClick={onOpenQuran}>{quranRead ? "تحديث الورد" : "تسجيل الورد"}</button></div>
    {!user && <p className="home-hint">سجّل الدخول من أعلى الصفحة لحفظ إنجازك ومزامنته.</p>}
  </section>;
}
