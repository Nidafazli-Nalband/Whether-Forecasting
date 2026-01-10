const API_KEY = "d53a2e6259bd934a4d064403b993fdfa";

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locBtn = document.getElementById("locBtn");
const forecastDiv = document.getElementById("forecast");
const errorDiv = document.getElementById("errorMessage");

function KtoC(k) {
  return (k - 273.15).toFixed(1);
}

function showError(message) {
  errorDiv.innerHTML = `<p>⚠️ ${message}</p>`;
  setTimeout(() => {
    errorDiv.innerHTML = "";
  }, 5000);
}

function updateWeatherDisplay(city, country, data) {
  const cur = data.list[0];
  const main = cur.main;
  const wind = cur.wind;
  const weather = cur.weather[0];
  const visibility = (cur.visibility / 1000).toFixed(1);

  // Update city name as heading (big on the left)
  const cityDisplay = country ? `${city}, ${country}` : `${city}`;
  document.getElementById("cityName").textContent = cityDisplay;

  // Update main weather
  document.getElementById("tempDisplay").textContent = `${KtoC(main.temp)}°C`;
  document.getElementById("descDisplay").textContent = weather.main + " - " + weather.description;
  document.getElementById("feelsLike").textContent = `${KtoC(main.feels_like)}°C`;

  // Update highlights
  document.getElementById("windVal").textContent = `${wind.speed.toFixed(1)} m/s`;
  document.getElementById("humidVal").textContent = `${main.humidity}%`;
  document.getElementById("visVal").textContent = `${visibility} km`;
  document.getElementById("pressVal").textContent = `${main.pressure} hPa`;

  // Update forecast
  forecastDiv.innerHTML = "";
  const used = [];

  data.list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if (!used.includes(date) && used.length < 5) {
      used.push(date);
      const weatherIcon = item.weather[0].main;
      const iconEmoji = getWeatherEmoji(weatherIcon);
      forecastDiv.innerHTML += `
        <div class="forecast-card">
          <div class="forecast-date">${formatDate(date)}</div>
          <div class="forecast-icon">${iconEmoji}</div>
          <div class="forecast-temp">${KtoC(item.main.temp)}°C</div>
          <div class="forecast-condition">${item.weather[0].main}</div>
        </div>
      `;
    }
  });
}

function getWeatherEmoji(condition) {
  const conditions = {
    "Clear": "☀️",
    "Clouds": "☁️",
    "Rain": "🌧️",
    "Snow": "❄️",
    "Thunderstorm": "⛈️",
    "Drizzle": "🌦️",
    "Mist": "🌫️",
    "Smoke": "💨",
    "Haze": "🌫️",
    "Dust": "🌪️",
    "Fog": "🌫️",
    "Sand": "🌪️",
    "Ash": "💨",
    "Squall": "💨",
    "Tornado": "🌪️"
  };
  return conditions[condition] || "🌤️";
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function fetchWeather(lat, lon, city, country) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
    .then(res => {
      if (!res.ok) throw new Error("Weather data unavailable");
      return res.json();
    })
    .then(data => {
      if (!data.list || data.list.length === 0) {
        throw new Error("No weather data found");
      }
      updateWeatherDisplay(city, country, data);
    })
    .catch(err => showError(err.message || "Failed to fetch weather data"));
}

searchBtn.onclick = () => {
  const city = cityInput.value.trim();
  if (!city) {
    showError("Please enter a city name");
    return;
  }

  fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`)
    .then(res => {
      if (!res.ok) throw new Error("City not found");
      return res.json();
    })
    .then(data => {
      if (data.length === 0) throw new Error("City not found");
      const { lat, lon, name, country } = data[0];
      fetchWeather(lat, lon, name, country);
      cityInput.value = "";
    })
    .catch(err => showError(err.message || "Could not find city"));
};

// Allow Enter key to search
cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

locBtn.onclick = () => {
  locBtn.disabled = true;
  locBtn.style.opacity = "0.6";
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      
      // Reverse geocoding to get city and country name
      fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`)
        .then(res => res.json())
        .then(data => {
          if (data.length > 0) {
            const { name, country } = data[0];
            fetchWeather(lat, lon, name, country);
          } else {
            fetchWeather(lat, lon, "Your Location", "");
          }
          locBtn.disabled = false;
          locBtn.style.opacity = "1";
        })
        .catch(() => {
          fetchWeather(lat, lon, "Your Location", "");
          locBtn.disabled = false;
          locBtn.style.opacity = "1";
        });
    },
    err => {
      showError("📍 Location access denied. Please search for a city instead.");
      locBtn.disabled = false;
      locBtn.style.opacity = "1";
    },
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
  );
};

// Load default location on page load - DISABLED to prevent permission prompt on refresh
// Only ask for location when user clicks the location button
window.addEventListener('load', () => {
  // Show default state instead of asking for location
  console.log("Page loaded. Location permission will only be requested when you click the 📍 button.");
});
