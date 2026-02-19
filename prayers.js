const prayersList = document.getElementById("prayerlist");

const currentDate = document.querySelector(".current-date");

const timeprayers = document.querySelector(".timePrayers");

// تشغيل فحص الورد فور تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // استدعاء فحص القرآن أول حاجة
    checkDailyQuran();

    // فحص قفل الصلاة
    if (localStorage.getItem('prayerLockStart')) {
        const startTime = parseInt(localStorage.getItem('prayerLockStart'));
        const now = Date.now();
        if (now - startTime < 15 * 60 * 1000) {
            activateStrictMode();
        } else {
            localStorage.removeItem('prayerLockStart');
        }
    }
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
    const activeBtn = event.currentTarget;

    // حل المشكلة الثانية: لو التبويب نشط فعلاً، اخرج من الدالة ولا تعيد التحميل
    if (activeBtn.classList.contains('active')) return;

    const tabs = activeBtn.closest('.remembrance-tabs');
    tabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');

    const container = document.getElementById('remembrance-container');
    container.innerHTML = "";

    const list = remembrances[type];

    // استرجاع البيانات المحفوظة من المتصفح
    const savedData = JSON.parse(localStorage.getItem('remembranceProgress') || '{}');

    list.forEach((duaText) => {
        let count = 1;
        if (duaText.includes("(3 مرات)")) count = 3;
        if (duaText.includes("(7 مرات)")) count = 7;

        // معرف فريد لكل ذكر (باستخدام النص نفسه) لتمييزه في الحفظ
        const duaKey = duaText.substring(0, 30);
        const currentProgress = savedData[duaKey] || 0;

        const card = document.createElement('div');
        card.className = 'dua-card';
        if (currentProgress >= count) card.classList.add('completed');

        card.dataset.required = count;
        card.dataset.current = currentProgress;
        card.dataset.key = duaKey;

        card.innerHTML = `
            <p class="dua-text">${duaText}</p>
            ${count > 1 ? `<span class="count-badge">${currentProgress} / ${count}</span>` : ''}
        `;

        card.onclick = function () {
            let current = parseInt(this.dataset.current);
            let required = parseInt(this.dataset.required);
            const key = this.dataset.key;

            if (current < required) {
                current++;
                this.dataset.current = current;

                // تحديث الـ Badge
                const badge = this.querySelector('.count-badge');
                if (badge) badge.innerText = `${current} / ${required}`;

                if (current === required) {
                    this.classList.add('completed');
                }

                // حفظ التقدم الجديد في localStorage
                const dataToSave = JSON.parse(localStorage.getItem('remembranceProgress') || '{}');
                dataToSave[key] = current;
                localStorage.setItem('remembranceProgress', JSON.stringify(dataToSave));
            }
        };

        container.appendChild(card);
    });
}

let isPrayerLocked = false;

// دالة لمراقبة مواقيت الصلاة
function watchPrayerTimes(timings) {
    setInterval(() => {
        if (localStorage.getItem('prayerLockStart')) return; // إذا كان مقفولاً بالفعل

        const now = new Date();
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
        const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        prayerNames.forEach(prayer => {
            const [h, m] = timings[prayer].split(':');
            const prayerTimeMinutes = parseInt(h) * 60 + parseInt(m);

            // القفل يعمل إذا كنا في اللحظة المحددة أو خلال 15 دقيقة بعدها
            if (currentTimeMinutes >= prayerTimeMinutes && currentTimeMinutes < prayerTimeMinutes + 15) {
                activateStrictMode();
            }
        });
    }, 10000); // فحص كل 10 ثوانٍ
}

function activateStrictMode() {
    isPrayerLocked = true;

    // حفظ وقت بداية القفل لو مش موجود (عشان لو عمل ريفريش يفتكر بدأ امتى)
    if (!localStorage.getItem('prayerLockStart')) {
        localStorage.setItem('prayerLockStart', Date.now());
    }

    const overlay = document.getElementById('prayer-overlay');
    overlay.style.display = 'flex';

    if (typeof pauseTimer === "function") pauseTimer();

    startLockCountdown();
}

function deactivateStrictMode() {
    isPrayerLocked = false;
    localStorage.removeItem('prayerLockStart'); // مسح القيمة لضمان عدم القفل عند الريفريش
    document.getElementById('prayer-overlay').style.display = 'none';

    Swal.fire({
        icon: 'success',
        title: 'تقبل الله طاعتك',
        text: 'يمكنك الآن العودة لإكمال مهامك بنشاط.',
        confirmButtonColor: '#2ecc71'
    });
}

// دالة فحص الورد اليومي عند فتح الموقع
function checkDailyQuran() {
    const lastDate = localStorage.getItem('lastOpenDate');
    const today = new Date().toLocaleDateString('en-GB');

    if (lastDate !== today) {
        // إذا كان يوماً جديداً:
        document.getElementById('quran-overlay').style.display = 'flex';

        // تصفير الأذكار لليوم الجديد
        localStorage.removeItem('remembranceProgress');
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

function startLockCountdown() {
    const timerDisplay = document.getElementById('return-timer');

    // تنظيف أي عداد قديم لتجنب تضاعف السرعة
    if (window.prayerInterval) clearInterval(window.prayerInterval);

    window.prayerInterval = setInterval(() => {
        const startTime = parseInt(localStorage.getItem('prayerLockStart'));
        if (!startTime) {
            clearInterval(window.prayerInterval);
            return;
        }

        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const totalLockTime = 15 * 60; // 15 دقيقة
        let timeLeft = totalLockTime - elapsedSeconds;

        if (timeLeft <= 0) {
            clearInterval(window.prayerInterval);
            localStorage.removeItem('prayerLockStart');
            deactivateStrictMode();
        } else {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            if (timerDisplay) {
                timerDisplay.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            }
        }
    }, 1000);
}