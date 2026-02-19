const prayersList = document.getElementById("prayerlist");

const currentDate = document.querySelector(".current-date");

const timeprayers = document.querySelector(".timePrayers");

// تشغيل فحص الورد فور تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    checkDailyQuran();
});

async function fetchPrayers(lat, long) {
    const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${long}&method=5`);
    const data = await response.json();

    // 1. الاحتفاظ بالوقت الأصلي (نظام 24 ساعة) للمراقب الصارم
    const rawTimes = {
        ...data.data.timings
    };
    watchPrayerTimes(rawTimes);

    let time = data.data.timings;
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const arabicNames = {
        Fajr: "الفجر",
        Dhuhr: "الظهر",
        Asr: "العصر",
        Maghrib: "المغرب",
        Isha: "العشاء"
    };

    let targetPrayer = "";
    let targetTime = null;
    const now = new Date();

    // 2. حساب الصلاة القادمة (باستخدام نظام 24 ساعة لضمان الدقة)
    for (let p of prayers) {
        let [h, m] = time[p].split(":");
        let pDate = new Date();
        pDate.setHours(h, m, 0);
        if (pDate > now) {
            targetPrayer = arabicNames[p];
            targetTime = pDate;
            break;
        }
    }

    if (!targetTime) {
        targetPrayer = "الفجر";
        let [h, m] = time["Fajr"].split(":");
        targetTime = new Date();
        targetTime.setDate(targetTime.getDate() + 1);
        targetTime.setHours(h, m, 0);
    }

    // 3. تحديث العداد التنازلي
    setInterval(() => {
        let diff = targetTime - new Date();
        let hours = Math.floor(diff / (1000 * 60 * 60));
        let mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        let secs = Math.floor((diff % (1000 * 60)) / 1000);

        const statusElement = document.getElementById("next-prayer-status");
        if (statusElement) {
            statusElement.innerText = `الوقت المتبقي لصلاة ${targetPrayer} هو : ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            if (hours === 0 && mins < 10) {
                statusElement.style.color = "#ff4d4d";
                statusElement.style.fontWeight = "bold";
            }
        }
    }, 1000);

    // 4. تحويل الوقت للعرض فقط في الجدول (نظام 12 ساعة)
    const displayTimes = {};
    for (let p in time) {
        let [h, m] = time[p].split(":");
        let hour = parseInt(h);
        let period = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        displayTimes[p] = `${hour}:${m} ${period}`;
    }

    prayersList.innerHTML = `
        <div class="current-date" dir="rtl"> تاريخ اليوم : "${data.data.date.hijri.date}"</div>
        <div id="next-prayer-status" dir="rtl" style="text-align:center; margin-bottom:15px; font-weight:bold;">جاري حساب الصلاة القادمة ...</div>
        <table class="prayers-list" dir="rtl">
            <tbody>
                <tr><td>الفجر</td><td dir="ltr">${displayTimes.Fajr}</td></tr>
                <tr><td>الظهر</td><td dir="ltr">${displayTimes.Dhuhr}</td></tr>
                <tr><td>العصر</td><td dir="ltr">${displayTimes.Asr}</td></tr>
                <tr><td>المغرب</td><td dir="ltr">${displayTimes.Maghrib}</td></tr>
                <tr><td>العشاء</td><td dir="ltr">${displayTimes.Isha}</td></tr>
            </tbody>
        </table>
    `;
}

function initializeLocation() {
    if (navigator.geolocation) {
        // نطلب الموقع
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const long = position.coords.longitude;
                fetchPrayers(lat, long);
                console.log("Location accessed");
            },
            (error) => {
                // لو رفض أو حصل مشكلة، نظهر التنبيه
                Swal.fire({
                    title: 'تنبيه!',
                    text: 'بما أنه لم يتم السماح بالوصول للموقع، سنعرض لك مواقيت الصلاة في القاهرة.',
                    icon: 'info',
                    color: '#f1faee',
                    background: '#1a0c4b',
                    confirmButtonText: 'تمام',
                    confirmButtonColor: '#2c3e50'
                });
                fetchPrayers(30.0444, 31.2357); // Cairo
            }, {
                timeout: 10000
            } // مهلة 10 ثواني عشان الموبايل ميهنجش
        );
    } else {
        alert("متصفحك لا يدعم خاصية تحديد الموقع.");
        fetchPrayers(30.0444, 31.2357);
    }
}
// بيانات الأدعية والأذكار
const remembrances = {
    success: [
        "اللهم لا سهل إلا ما جعلته سهلاً، وأنت تجعل الحزن إذا شئت سهلاً.",
        "اللهم إني أسألك فهم النبيين، وحفظ المرسلين، والملائكة المقربين.",
        "اللهم اجعل ألسنتنا عامرة بذكرك، وقلوبنا بخشيتك، وأسرارنا بطاعتك.",
        "ربِّ اشرح لي صدري ويسر لي أمري واحلل عقدة من لساني يفقهوا قولي.",
        "اللهم إني استودعتك ما قرأت وما حفظت وما تعلمت، فردّه إليّ عند حاجتي إليه.",
        "اللهم افتح لي فتوح العارفين بحكمتك، وانشر عليّ رحمتك، وذكرني ما نسيت.",
        "لا إله إلا أنت سبحانك إني كنت من الظالمين، يا حي يا قيوم برحمتك أستغيث.",
        "اللهم أخرجنا من ظلمات الوهم، وأكرمنا بنور الفهم، وافتح علينا بمعرفة العلم."
    ],
    morning: [
        "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له.",
        "اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور.",
        "يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.",
        "أعوذ بكلمات الله التامات من شر ما خلق. (3 مرات)",
        "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم. (3 مرات)",
        "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبياً. (3 مرات)",
        "اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت.",
        "سبحان الله وبحمده: عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته. (3 مرات)",
        "اللهم إني أسألك علماً نافعاً، ورزقاً طيباً، وعملاً متقبلاً."
    ],
    evening: [
        "أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له.",
        "اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.",
        "أعوذ بكلمات الله التامات من شر ما خلق. (3 مرات)",
        "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم. (3 مرات)",
        "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم. (7 مرات)",
        "اللهم ما أمسى بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.",
        "اللهم إني أعوذ بك من الهم والحزن، والعجز والكسل، والبخل والجبن، وضلع الدين، وغلبة الرجال.",
        "يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين."
    ]
};

function showRemembrance(type, event) {
    // 1. تظبيط الزراير
    const activeBtn = event.currentTarget;
    const tabs = activeBtn.closest('.remembrance-tabs');
    tabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');

    // 2. مسح الحاوية
    const container = document.getElementById('remembrance-container');
    container.innerHTML = "";

    const list = remembrances[type];

    list.forEach((duaText) => {
        // ذكاء اصطناعي بسيط: استخراج العدد من النص لو موجود
        let count = 1;
        if (duaText.includes("(3 مرات)")) count = 3;
        if (duaText.includes("(7 مرات)")) count = 7;

        const card = document.createElement('div');
        card.className = 'dua-card';
        card.dataset.required = count;
        card.dataset.current = 0;

        // هنا بنستخدم duaText مباشرة عشان مفيش undefined تاني
        card.innerHTML = `
            <p class="dua-text">${duaText}</p>
            ${count > 1 ? `<span class="count-badge">0 / ${count}</span>` : ''}
        `;

        // 3. منطق الضغط واللون الأخضر
        card.onclick = function () {
            let current = parseInt(this.dataset.current);
            let required = parseInt(this.dataset.required);

            if (current < required) {
                current++;
                this.dataset.current = current;

                const badge = this.querySelector('.count-badge');
                if (badge) badge.innerText = `${current} / ${required}`;

                if (current === required) {
                    this.classList.add('completed');
                }
            }
        };

        container.appendChild(card);
    });
}

let isPrayerLocked = false;

// دالة لمراقبة مواقيت الصلاة
function watchPrayerTimes(timings) {
    setInterval(() => {
        if (isPrayerLocked) return; // لو مقفولة أصلاً ميعملش حاجة

        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ":" +
            now.getMinutes().toString().padStart(2, '0');

        // قائمة بمواعيد الصلاة (بدون الإمساك والشروق)
        const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        prayerNames.forEach(prayer => {
            if (timings[prayer] === currentTime) {
                activateStrictMode();
            }
        });
    }, 60000); // يفحص كل دقيقة
}

function activateStrictMode() {
    isPrayerLocked = true;
    const overlay = document.getElementById('prayer-overlay');
    overlay.style.display = 'flex';

    // 1. إيقاف البومودورو فوراً (بافتراض اسم الدالة عندك pauseTimer)
    if (typeof pauseTimer === "function") {
        pauseTimer();
    }

    // 2. تشغيل عداد الـ 15 دقيقة
    let timeLeft = 15 * 60; // 15 دقيقة بالثواني
    const timerDisplay = document.getElementById('return-timer');

    const countdown = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            deactivateStrictMode();
        }
        timeLeft--;
    }, 1000);
}

function deactivateStrictMode() {
    isPrayerLocked = false;
    document.getElementById('prayer-overlay').style.display = 'none';
    alert("تقبل الله منك! يمكنك العودة للمذاكرة الآن.");
}

// دالة فحص الورد اليومي عند فتح الموقع
function checkDailyQuran() {
    const lastDate = localStorage.getItem('lastOpenDate');
    const today = new Date().toLocaleDateString('en-GB'); // تنسيق DD/MM/YYYY

    if (lastDate !== today) {
        // لو أول مرة يفتح الموقع النهاردة، نظهر شاشة الورد
        document.getElementById('quran-overlay').style.display = 'flex';
    }
}

// دالة التأكد من القراءة (التحقق الصارم)
function verifyQuran() {
    const input = document.getElementById('quranConfirm').value.trim();

    // شرط صارم: لازم يكتب أكتر من 4 حروف (عشان يكتب اسم سورة حقيقي)
    if (input.length < 4) {
        Swal.fire({
            icon: 'warning',
            title: 'تنبيه للإخلاص',
            text: 'برجاء كتابة ما قرأت بصدق (مثلاً: سورة البقرة أو من صفحة 10 لـ 15) لنسمح لك بالدخول.',
            confirmButtonColor: '#457b9d'
        });
        return;
    }

    // لو تمام، نحفظ التاريخ عشان الشاشة متظهرش تاني النهاردة
    const today = new Date().toLocaleDateString('en-GB');
    localStorage.setItem('lastOpenDate', today);
    localStorage.setItem('lastReadContent', input); // بنسجل هو قرأ إيه للتحفيز

    document.getElementById('quran-overlay').style.display = 'none';

    Swal.fire({
        icon: 'success',
        title: 'بارك الله في وردك',
        text: 'تم تسجيل وردك بنجاح. ابدأ يومك بنور العلم الآن.',
        timer: 3000,
        showConfirmButton: false
    });
}