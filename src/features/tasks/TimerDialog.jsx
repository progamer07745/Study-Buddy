import { useEffect, useRef, useState } from "react";

const messages = ["ركز وهتوصل لهدفك! 🚀", "كل دقيقة تركيز بتفرق 💪", "أنت قدها، كمل! 🔥"];

export default function TimerDialog({ task, onClose, onComplete }) {
  const [seconds, setSeconds] = useState(task.focusTime * 60);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message] = useState(() => messages[Math.floor(Math.random() * messages.length)]);
  const deadlineRef = useRef(null);

  useEffect(() => {
    if (!running) return undefined;
    const syncRemainingTime = () => {
      const deadline = deadlineRef.current;
      if (!deadline) return;
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) deadlineRef.current = null;
    };

    syncRemainingTime();
    const interval = window.setInterval(syncRemainingTime, 1000);
    document.addEventListener("visibilitychange", syncRemainingTime);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncRemainingTime);
    };
  }, [running]);

  useEffect(() => {
    const pause = () => {
      if (deadlineRef.current) {
        setSeconds(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
        deadlineRef.current = null;
      }
      setRunning(false);
    };
    window.addEventListener("study-buddy:pause-focus", pause);
    return () => window.removeEventListener("study-buddy:pause-focus", pause);
  }, []);

  useEffect(() => {
    if (seconds !== 0 || !running || saving) return;
    setRunning(false); setSaving(true);
    onComplete(task).finally(() => { setSaving(false); onClose(); });
  }, [seconds, running, saving, onComplete, onClose, task]);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  function toggleRunning() {
    if (running) {
      if (deadlineRef.current) {
        setSeconds(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
        deadlineRef.current = null;
      }
      setRunning(false);
      return;
    }

    deadlineRef.current = Date.now() + seconds * 1000;
    setRunning(true);
  }

  return <div className="timer-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !running) onClose(); }}>
    <section className="timer-card" role="dialog" aria-modal="true" aria-label="جلسة التركيز">
      <button className="close-modal-btn" onClick={onClose} aria-label="إغلاق">×</button>
      <p className="eyebrow">جلسة تركيز · {task.focusTime} دقيقة</p><h2 id="timer-task-name">{task.title}</h2>
      <div className="timer-display" aria-live="polite">{time}</div>
      <p className="timer-quote">{message}</p>
      <div className="timer-controls"><button className="timer-btn primary" onClick={toggleRunning} disabled={saving}>{running ? "إيقاف مؤقت" : seconds === task.focusTime * 60 ? "ابدأ" : "استكمال"}</button><button className="timer-btn danger" onClick={onClose} disabled={saving}>إلغاء الجلسة</button></div>
      {saving && <p>جارٍ حفظ إنجازك...</p>}
    </section>
  </div>;
}
