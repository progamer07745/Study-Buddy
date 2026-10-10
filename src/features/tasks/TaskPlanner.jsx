import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../auth/api.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import TimerDialog from "./TimerDialog.jsx";

const genres = [
  ["study", "مذاكرة"], ["homework", "واجب"], ["revision", "مراجعة"], ["exam", "امتحان"], ["applications", "تطبيق وحل"],
];
const priorities = [["low", "عادي 🟢"], ["medium", "متوسط 🟡"], ["high", "عاجل 🔴"]];

export default function TaskPlanner({ onRequireAuth, onUserUpdate }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [tasks, setTasks] = useState([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("study");
  const [priority, setPriority] = useState("low");
  const [focusTime, setFocusTime] = useState(25);
  const [editingId, setEditingId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadTasks = useCallback(async () => {
    if (!userId) { setTasks([]); setTasksLoaded(true); return; }
    setTasksLoaded(false);
    try {
      const result = await apiRequest("/tasks/usertasks");
      setTasks(result.data?.tasks || []);
    } catch (error) { setNotice(error.message); }
    finally { setTasksLoaded(true); }
  }, [userId]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function submitTask(event) {
    event.preventDefault();
    if (!user) { onRequireAuth(); return; }
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setBusy(true); setNotice("");
    try {
      if (editingId) {
        await apiRequest(`/tasks/usertasks/${editingId}`, { method: "PATCH", body: JSON.stringify({ title: cleanTitle, genre, priority }) });
        setNotice("تم تحديث المهمة.");
      } else {
        await apiRequest("/tasks/usertasks", { method: "POST", body: JSON.stringify({ title: cleanTitle, genre, priority, focusTime }) });
        setNotice("تمت إضافة المهمة.");
      }
      setTitle(""); setEditingId(null);
      await loadTasks();
      window.dispatchEvent(new Event("study-buddy:task-change"));
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  function editTask(task) {
    if (task.checked) return;
    setEditingId(task._id); setTitle(task.title); setGenre(task.genre); setPriority(task.priority);
    document.getElementById("taskInput")?.focus();
  }

  async function deleteTask(task) {
    if (!window.confirm(`حذف المهمة «${task.title}»؟`)) return;
    setBusy(true);
    try {
      await apiRequest(`/tasks/usertasks/${task._id}`, { method: "DELETE" });
      setTasks((items) => items.filter((item) => item._id !== task._id));
      window.dispatchEvent(new Event("study-buddy:task-change"));
      setNotice("تم حذف المهمة.");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function completeTask(task) {
    try {
      const result = await apiRequest(`/tasks/completetask/${task._id}`, { method: "POST" });
      setTasks((items) => items.map((item) => item._id === task._id ? result.data.task : item));
      onUserUpdate(result.user);
      setNotice(`أحسنت! حصلت على ${result.xpEarned} XP.`);
      window.dispatchEvent(new Event("study-buddy:task-change"));
    } catch (error) { setNotice(error.message); }
  }

  return <section className="page-section planner-page" dir="rtl">
    <header className="page-heading"><div><p className="eyebrow">خطوة صغيرة كل يوم</p><h1>مخطط <span>المذاكرة</span></h1></div><p>رتب أولوياتك وابدأ جلسة تركيز.</p></header>
    {!user ? <div className="guest-card"><i className="fas fa-lock" /><h2>سجل دخولك لحفظ مهامك</h2><p>المهام وXP محفوظة في حسابك وتظهر لك على أجهزتك.</p><button className="auth-submit-btn guest-sign-in" onClick={onRequireAuth}>تسجيل الدخول</button></div> : <>
      <form className="input-group task-form" onSubmit={submitTask}>
        <input id="taskInput" value={title} onChange={(event) => setTitle(event.target.value)} maxLength="160" placeholder="اكتب المهمة..." aria-label="عنوان المهمة" required />
        <select id="taskCategory" value={genre} onChange={(event) => setGenre(event.target.value)} aria-label="تصنيف المهمة">{genres.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select id="taskPriority" value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="أولوية المهمة">{priorities.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {!editingId && <label className="focus-select">دقائق التركيز<select value={focusTime} onChange={(event) => setFocusTime(Number(event.target.value))}>{Array.from({ length: 18 }, (_, index) => (index + 1) * 5).map((minutes) => <option key={minutes} value={minutes}>{minutes} دقيقة · {minutes * 2} XP</option>)}</select></label>}
        <button id="addBtn" type="submit" disabled={busy} aria-label={editingId ? "حفظ التعديل" : "إضافة مهمة"}><i className={`fas ${editingId ? "fa-check" : "fa-plus"}`} /></button>
        {editingId && <button type="button" className="cancel-edit" onClick={() => { setEditingId(null); setTitle(""); }}>إلغاء</button>}
      </form>
      {notice && <p className="inline-notice" role="status">{notice}</p>}
      <ul id="taskList" className="task-list">{tasks.map((task) => <li className={`task-item ${task.checked ? "is-done" : ""}`} key={task._id}>
        <div className="task-body"><span className="task-text">{task.title}</span><span className={`category-badge ${task.genre}`}>{genres.find(([value]) => value === task.genre)?.[1]}</span><span className={`priority-badge p-${task.priority}`}>{priorities.find(([value]) => value === task.priority)?.[1]}</span><span className="focus-time">{task.focusTime} دقيقة · {task.xpEarned} XP</span></div>
        <div className="controlsButtons">{task.checked ? <span className="completed-label"><i className="fas fa-circle-check" /> مكتملة</span> : <><button className="start-timer-btn" onClick={() => setActiveTask(task)} aria-label={`ابدأ ${task.title}`} title="ابدأ التركيز"><i className="fas fa-play" /></button><button className="edit-btn" onClick={() => editTask(task)} aria-label={`تعديل ${task.title}`} title="تعديل"><i className="fas fa-pen" /></button></>}<button className="delete-btn" onClick={() => deleteTask(task)} aria-label={`حذف ${task.title}`} title="حذف"><i className="fas fa-trash" /></button></div>
      </li>)}</ul>
      {tasksLoaded && !tasks.length && <div className="empty-state"><span>📚</span><h3>لسه مفيش مهام</h3><p>أضف أول مهمة وابدأ يومك.</p></div>}
      {!tasksLoaded && <p className="loading-state" role="status">جارٍ تحميل مهامك...</p>}
    </>}
    {activeTask && <TimerDialog task={activeTask} onClose={() => setActiveTask(null)} onComplete={completeTask} />}
  </section>;
}
