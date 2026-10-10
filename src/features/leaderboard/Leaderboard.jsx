import { useEffect, useState } from "react";
import { apiRequest } from "../auth/api.js";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let active = true;
    apiRequest("/leaderboard", {}, false).then((result) => { if (active) { setUsers(result.data?.topUsers || []); setState("ready"); } })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, []);
  return <section className="page-section leaderboard-page" dir="rtl"><div className="leaderboard-container"><p className="eyebrow">إنجازات المجتمع</p><h1>لوحة <span>المتصدرين</span></h1><div className="leaderboard-names-container"><ol className="leaderboard-names">{state === "loading" && <li className="loading-state">جارٍ تحميل الترتيب...</li>}{state === "error" && <li className="error-state">تعذر تحميل لوحة المتصدرين.</li>}{state === "ready" && !users.length && <li className="loading-state">لا توجد نتائج حتى الآن.</li>}{users.map((user, index) => <li className={`leaderboard-user ${index < 3 ? `top-${index + 1}` : ""}`} key={user._id}><div className="user-info"><span className="user-rank">{["🥇", "🥈", "🥉"][index] || index + 1}</span><span className="user-name">{user.username}</span></div><div className="user-score"><span>{user.xp || 0}</span><small>XP</small></div></li>)}</ol></div></div></section>;
}
