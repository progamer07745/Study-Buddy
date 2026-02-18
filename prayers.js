const prayersList = document.getElementById("prayerlist");

const currentDate = document.querySelector(".current-date");

const timeprayers = document.querySelector(".timePrayers");

async function fetchPrayers(lat, long) {
    const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${long}&method=5`);
    const data = await response.json();
    console.log(data);
    let time = data.data.timings;
    console.log(time);


    for (let pTime in time) {
        let prayerTime = time[pTime].split(":");
        let minutes = prayerTime[1];
        console.log(prayerTime);
        let correct_num = Number(prayerTime[0]);
        if (correct_num > 12) {
            correct_num -= 12;
        }

        let Hour = correct_num.toString()
        // console.log(Hour);
        let finalTime = Hour + ":" + minutes;
        console.log(finalTime)
        time[pTime] = finalTime;
    }


    prayersList.innerHTML = `
    <div class="current-date" dir="rtl"> تاريخ اليوم : "${data.data.date.hijri.date}"</div>
                    <table class="prayers-list" dir="rtl">
                        <tbody dir="rtl">
                            <tr>
                                <td>الفجر</td>
                                <td dir="ltr" class="timePrayer">${time.Fajr} AM</td>
                            </tr>
                            <tr>
                                <td>الظهر</td>
                                <td dir="ltr" class="timePrayer">${time.Dhuhr} PM</td>
                            </tr>
                            <tr>
                                <td>العصر</td>
                                <td dir="ltr" class="timePrayer">${time.Asr} PM</td>
                            </tr>
                            <tr>
                                <td>المغرب</td>
                                <td dir="ltr" class="timePrayer">${time.Maghrib}PM</td>
                            </tr>
                            <tr>
                                <td>العشاء</td>
                                <td dir="ltr" class="timePrayer">${time.Isha} PM</td>
                            </tr>
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