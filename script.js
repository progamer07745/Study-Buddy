const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");

// تعريف الـ XP في البداية
let userXP = parseInt(localStorage.getItem("studyBuddyXP")) || 0;
const xpCounter = document.getElementById("xp-count");
if (xpCounter) xpCounter.innerText = userXP;

let isEditing = false;
let isLoading = false;

const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-center', // مريح جداً للعين تحت
    showConfirmButton: false,
    timer: 1500,
    background: 'rgba(30, 41, 59, 0.95)', // شفافية Glassmorphism
    color: '#5aa4ed',
    showClass: {
        popup: 'animate__animated animate__zoomIn animate__faster' // دخول زوم ناعم
    },
    hideClass: {
        popup: 'animate__animated animate__zoomOut animate__faster' // خروج زوم ناعم
    },
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
        toast.style.direction = 'rtl'; // السطر ده هيخلي الكلام يبدأ من اليمين
    }
});

function createTaskElement(taskText, categoryValue, categoryText, PriorityValue, PriorityText, isChecked = false) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.innerHTML = `
        <label class="task-body">
            <input type="checkbox" class="isCompleted" ${isChecked ? 'checked' : ''} />
            <span class="custom-check"></span>
            <span class="task-text">${taskText}</span>
            <span class="category-badge ${categoryValue.toLowerCase()}">${categoryText}</span>
            <span class="priority-badge p-${PriorityValue.toLowerCase()}">${PriorityText}</span>
        </label>
        <div class="controlsButtons">
            <button class="start-timer-btn" title="Start!"><i class="fas fa-play"></i></button>
            <button class="edit-btn"><i class="fas fa-pen"></i></button>
            <button class="delete-btn"><i class="fas fa-trash"></i></button>
        </div>
    `;

    // تفعيل زرار التايمر (الربط السحري)
    li.querySelector(".start-timer-btn").onclick = (e) => {
        e.preventDefault();
        startPomodoro(taskText, li);
    };

    // حدث الـ Checkbox (الـ XP)
    li.querySelector(".isCompleted").onchange = (e) => {
        if (!isLoading) {
            const xpCounter = document.getElementById("xp-count");

            // if (e.target.checked) {
            //     userXP += 10;
            //     // تفعيل الحركة
            //     xpCounter.classList.add("xp-pulse");
            //     // شيل الكلاس بعد ما الحركة تخلص عشان يرجع لوضعه الطبيعي بنعومة
            //     setTimeout(() => xpCounter.classList.remove("xp-pulse"), 600);

            //     Toast.fire({
            //         icon: 'success',
            //         title: 'عاش يا بطل! +10 XP 🏆'
            //     });
            // } else {
            //     userXP -= 10;
            //     xpCounter.classList.add("xp-drop");
            //     setTimeout(() => xpCounter.classList.remove("xp-drop"), 600);
            // }

            e.target.checked = !e.target.checked;

            Swal.fire({
                title: 'استنى يا بطل! 🛑',
                text: 'ما ينفعش تعلم على المهمة كدة.. لازم تخلصها الأول ! (دوس على أيقونة البدأ عشان تبدأ المهمة)',
                icon: 'warning',
                confirmButtonText: 'تمام، هركز! 🚀',
                confirmButtonColor: '#6366f1',
                background: '#1e293b',
                color: '#f8fafc'
            });

            localStorage.setItem("studyBuddyXP", userXP);
            if (xpCounter) xpCounter.innerText = userXP;

            updatehomeStats(true)
            saveTasks();
        }
    };
    // زر الحذف
    li.querySelector(".delete-btn").onclick = () => {
        if (isEditing) {
            Toast.fire({
                icon: 'warning',
                title: 'خلص التعديل اللي في ايدك الأول يا نجم !',
            });
            return;
        }
        Swal.fire({
            title: 'متأكد يا بطل؟',
            text: "هل فعلاً تريد حذف هذه المهمة؟",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'أيوه، امسحها!',
            cancelButtonText: 'لا، استنى',
            background: '#1e293b',
            color: '#f8fafc'
        }).then((result) => {
            if (result.isConfirmed) {
                li.classList.add("fall");
                setTimeout(() => {
                    li.remove();
                    saveTasks();
                }, 600);
            }
        });
    };

    // زر التعديل
    li.querySelector(".edit-btn").onclick = () => {
        if (isEditing) {
            Toast.fire({
                icon: 'warning',
                title: 'في تعديل شغال فعلاً! ⚠️'
            });
            return;
        }
        isEditing = true;
        taskInput.value = taskText;
        document.getElementById("taskCategory").value = categoryValue;
        document.getElementById("taskPriority").value = PriorityValue;
        li.remove();
        saveTasks();
        taskInput.focus();
    };

    return li;
}

// تشغيل زر الإضافة الأساسي
addBtn.onclick = () => {
    const taskText = taskInput.value.trim();
    if (taskText !== "") {
        isEditing = false;
        const cat = document.getElementById("taskCategory");
        const prio = document.getElementById("taskPriority");

        const li = createTaskElement(taskText, cat.value, cat.options[cat.selectedIndex].text, prio.value, prio.options[prio.selectedIndex].text);
        taskList.appendChild(li);

        taskInput.value = "";
        saveTasks();
        Toast.fire({
            icon: 'success',
            title: 'تمت إضافة المهمة!🚀'
        });
    } else {
        Toast.fire({
            icon: 'error',
            title: 'يا بطل اكتب المهمة الأول! ✍️'
        });
    }
};

function saveTasks() {
    const tasks = [];
    document.querySelectorAll(".task-item").forEach(li => {
        tasks.push({
            text: li.querySelector(".task-text").innerText,
            catVal: li.querySelector(".category-badge").classList[1],
            catTxt: li.querySelector(".category-badge").innerText,
            prioVal: li.querySelector(".priority-badge").classList[1].replace('p-', ''),
            prioTxt: li.querySelector(".priority-badge").innerText,
            checked: li.querySelector(".isCompleted").checked
        });
    });
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadEverything() {
    isLoading = true;
    const data = JSON.parse(localStorage.getItem("tasks")) || [];
    data.forEach(t => {
        const li = createTaskElement(t.text, t.catVal, t.catTxt, t.prioVal, t.prioTxt, t.checked);

        if (t.checked) {
            li.querySelector(".isCompleted").disabled = true;
        }

        taskList.appendChild(li);
    });
    isLoading = false;

    const lastSection = localStorage.getItem("lastActivePage") || "home-section";
    const activeBtn = document.querySelector(`.nav-btn[onclick*="${lastSection}"]`);

    if (activeBtn) {
        showPage(lastSection, {currentTarget: activeBtn});
    }
    else {
        updatehomeStats();
    }
    initializeLocation();
}

window.addEventListener("DOMContentLoaded", loadEverything);

function updatehomeStats(skipCircle = false) {
    // 1. هات البيانات الطازة
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const userXP = parseInt(localStorage.getItem("studyBuddyXP")) || 0;

    // 2. تحديث الـ XP (دي شغالة في كل مكان)
    const xpElements = document.querySelectorAll("#xp-count, #current-xp-home");
    xpElements.forEach(el => el.innerText = userXP);

    // 3. حسابات النسبة
    const total = tasks.length;
    const completed = tasks.filter(t => String(t.checked) === "true").length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 4. تحديث عناصر الهوم "فقط" لو موجودة قدامنا دلوقتي
    const circle = document.getElementById("progress-circle");
    const percentText = document.getElementById("progress-text") || document.getElementById("progress-percent");
    const tasksDoneEl = document.getElementById("tasks-done");

    if (circle && !skipCircle) {
        const offset = 565 - (565 * percent) / 100;
        circle.style.strokeDashoffset = offset;
    }
    if (percentText) percentText.innerText = percent + "%";
    if (tasksDoneEl) tasksDoneEl.innerText = completed;

    // 5. الترحيب
    const greeting = document.getElementById("greeting");
    if (greeting) {
        const hour = new Date().getHours();
        greeting.innerText = hour < 12 ? "صباح الخير يا بطل! ☀️" : (hour < 18 ? "مساء النشاط يا نجم! ⚡" : "مساء الهمة يا وحش! 🌙");
    }
}

let timerInterval;
let timeLeft;
let isRunning = false;

const timeSlider = document.getElementById("time-slider");
const selectedMinutesSpan = document.getElementById("selected-minutes");
const display = document.getElementById("timer-countdown");

timeSlider.oninput = function () {
    selectedMinutesSpan.innerText = this.value + "minutes";
    display.innerText = `${this.value.padStart(2, '0')}:00`
    timeLeft = this.value * 60;

    const potentialXP = this.value * 2;
    document.querySelector(".timer-quote").innerText = `ركز وهتاخد ${potentialXP} XP! 🔥`;
}

function startPomodoro(taskName, taskElement) {
    const overlay = document.getElementById("pomodoro-overlay");
    const taskTitle = document.getElementById("timer-task-name");
    const startBtn = document.getElementById("pause-resume-btn");
    const selectorArea = document.getElementById("time-selector-area");

    taskTitle.innerText = `${taskName}`;
    overlay.style.display = "flex";
    selectorArea.style.display = "block";

    clearInterval(timerInterval);
    timeLeft = timeSlider.value * 60;
    updateTimerDisplay();
    startBtn.innerText = "Start";
    isRunning = false;

    startBtn.onclick = function () {
        if (!isRunning) {
            // أول ما يبدأ، نخفي الـ Slider عشان مغيرش الوقت وهو شغال
            selectorArea.style.display = "none";
            this.innerText = "Pause";
            isRunning = true;

            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    finishTask(taskElement);
                }
            }, 1000);
        } else {
            clearInterval(timerInterval);
            this.innerText = "Continue";
            isRunning = false;
        }
    };
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    display.innerText =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function finishTask(taskEl) {
    const overlay = document.getElementById("pomodoro-overlay");
    const timeSlider = document.getElementById("time-slider");
    overlay.style.display = "none";

    const checkbox = taskEl.querySelector(".isCompleted");
    if (!checkbox.checked) {
        const minuteSpent = parseInt(timeSlider.value);
        const earnedXP = minuteSpent * 2;
        userXP += earnedXP;

        localStorage.setItem("studyBuddyXP", userXP);
        const xpCounter = document.getElementById("xp-count");
        if (xpCounter) {
            xpCounter.innerText = userXP;
            xpCounter.classList.add("xp-pulse"); // حركة الدلع اللي عملناها
            setTimeout(() => xpCounter.classList.remove("xp-pulse"), 600);
        }

        Swal.fire({
            title: "عاش يا وحش! 💪",
            text: `خلصت ${minuteSpent} دقيقة تركيز وأخدت ${earnedXP} XP!`,
            icon: 'success',
            confirmButtonColor: '#6366f1',
            direction: 'rtl'
        });

        checkbox.checked = true;
        checkbox.disabled = true;
        saveTasks();
        updatehomeStats();
    }


}

document.getElementById("cancel-timer-btn").addEventListener("click", () => {
    clearInterval(timerInterval);
    document.getElementById("pomodoro-overlay").style.display = "none";
})