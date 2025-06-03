// مدیریت دریافت موقعیت کاربر
function getUserLocation() {
    showLoading();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(successLocation, errorLocation, { timeout: 7000 });
    } else {
        showError("مرورگر شما امکان دریافت موقعیت را ندارد.");
        hideLoading();
    }
}

function errorLocation(error) {
    if (error.code === error.PERMISSION_DENIED) {
        showError("دسترسی به موقعیت مکانی داده نشد.");
        hideLoading();
    } else {
        fallbackToIP();
    }
}

function showError(message) {
    setCurrentLocationName('');
    clearWeatherData();
    document.getElementById('weather-current').innerText = message;
    document.getElementById('weather-daily').innerHTML = '';
    document.getElementById('weather-hourly').innerHTML = '';
}

function successLocation(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    setCurrentLocationName('موقعیت فعلی: موقعیت جغرافیایی شما');
    selectNearestCity(lat, lon);
    fetchWeather(lat, lon);
}

function fallbackToIP() {
    const apiKey = 'b5e7e2ecd6a94c259af4a99858193687';  // اینجا کلید API خودت را قرار بده
    const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}`;

    console.log("شروع fallbackToIP با ipgeolocation.io");
    fetch(url)
        .then(res => {
            console.log("Status پاسخ:", res.status);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log("داده دریافت شده از ipgeolocation.io:", data);
            if (data && data.latitude && data.longitude) {
                const lat = parseFloat(data.latitude);
                const lon = parseFloat(data.longitude);
                const city = data.city || 'مکان نامشخص';
                setCurrentLocationName(`موقعیت فعلی: ${city}`);
                selectNearestCity(lat, lon);
                fetchWeather(lat, lon);
            } else {
                console.error("داده‌های معتبر موقعیت دریافت نشد");
                throw new Error("Invalid location data");
            }
        })
        .catch(err => {
            console.error("خطا در fallbackToIP:", err);
            document.getElementById('weather-output').innerText = "خطا در دریافت موقعیت.";
        });
}



function setCurrentLocationName(name) {
    document.getElementById('current-location-name').innerText = name || '';
}

function selectNearestCity(lat, lon) {
    const select = document.getElementById('city-select');
    let minDist = Infinity;
    let closestIndex = -1;

    for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        if (!option.value) continue;
        const [optLat, optLon] = option.value.split(',').map(Number);
        const dist = getDistanceFromLatLonInKm(lat, lon, optLat, optLon);
        if (dist < minDist) {
            minDist = dist;
            closestIndex = i;
        }
    }

    if (closestIndex >= 0) {
        select.selectedIndex = closestIndex;
    }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function onCitySelect() {
    const select = document.getElementById('city-select');
    const val = select.value;
    if (val) {
        const parts = val.split(',');
        const lat = parts[0];
        const lon = parts[1];
        const cityName = parts.slice(2).join(',');
        setCurrentLocationName(`موقعیت فعلی: ${cityName}`);
        fetchWeather(lat, lon);
    } else {
        setCurrentLocationName('');
        clearWeatherData();
    }
}

function clearWeatherData() {
    document.getElementById('weather-current').innerHTML = '';
    document.getElementById('weather-daily').innerHTML = '';
    document.getElementById('weather-hourly').innerHTML = '';
}

function fetchWeather(lat, lon) {
    showLoading();

    // API با داده‌های current, daily و hourly
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,weathercode&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&current_weather=true&timezone=auto`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            showWeather(data);
            hideLoading();
        })
        .catch(() => {
            showError("خطا در دریافت اطلاعات هوا.");
            hideLoading();
        });
}

function showWeather(data) {
    showCurrentWeather(data.current_weather);
    showDailyWeather(data.daily);
    showHourlyWeather(data.hourly);
}

// نمایش وضعیت کنونی
function showCurrentWeather(weather) {
    const container = document.getElementById('weather-current');
    container.innerHTML = `
        <h2>وضعیت کنونی</h2>
        <p>🌡️ دما: ${weather.temperature}°C</p>
        <p>💨 سرعت باد: ${weather.windspeed} کیلومتر بر ساعت</p>
        <p>🌀 جهت باد: ${weather.winddirection} درجه</p>
        <p>🕒 ساعت گزارش: ${weather.time}</p>
    `;
}

// نمایش پیش‌بینی هفت روز
function showDailyWeather(daily) {
    const container = document.getElementById('weather-daily');
    let html = '';
    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(daily.time[i]);
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        const formattedDate = date.toLocaleDateString('fa-IR', options);

        html += `
            <div class="weather-day" title="بارش: ${daily.precipitation_sum[i]} میلی‌متر">
                <strong>${formattedDate}</strong>
                <br>دمای کمینه: ${daily.temperature_2m_min[i]}°C
                <br>دمای بیشینه: ${daily.temperature_2m_max[i]}°C
                <br>🌧️ بارش: ${daily.precipitation_sum[i]} میلی‌متر
            </div>
        `;
    }
    container.innerHTML = html;
}

// نمایش پیش‌بینی ساعتی با اسکرول افقی
function showHourlyWeather(hourly) {
    const container = document.getElementById('weather-hourly');
    let html = '';

    for (let i = 0; i < hourly.time.length; i++) {
        const date = new Date(hourly.time[i]);
        const options = { hour: '2-digit', minute: '2-digit' };
        const formattedHour = date.toLocaleTimeString('fa-IR', options);

        const temp = hourly.temperature_2m[i];
        const precip = hourly.precipitation[i];
        html += `
            <div class="weather-hour" title="دمای ${temp}°C، بارش ${precip} میلی‌متر">
                <strong>${formattedHour}</strong><br>
                🌡️ ${temp}°C<br>
                🌧️ ${precip}mm
            </div>
        `;
    }
    container.innerHTML = html;
}

// تب‌ها
function switchTab(tabName) {
    const tabs = ['current', 'daily', 'hourly'];

    tabs.forEach(name => {
        const btn = document.getElementById(`tab-btn-${name}`);
        const panel = document.getElementById(`tab-${name}`);

        if (name === tabName) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            btn.tabIndex = 0;
            panel.classList.add('active');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
            btn.tabIndex = -1;
            panel.classList.remove('active');
        }
    });
}

// لودینگ
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}
