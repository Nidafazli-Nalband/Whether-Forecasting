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
  // Ensure the main weather card is visible on smaller screens
  const mainWeather = document.getElementById("currentWeather");
  if (mainWeather) mainWeather.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // Prefer API-reported city name (matches forecast lat/lon); fall back to reverse-geocoded/passed city
  const apiCity = (data.city && data.city.name) ? data.city.name : city;
  const apiCountry = (data.city && data.city.country) ? data.city.country : country;
  const cityDisplay = apiCountry ? `${apiCity}, ${apiCountry}` : `${apiCity}`;
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

// Try navigator geolocation first, and fall back to IP-based lookup if needed
function fetchIPLocationAndWeather() {
  return fetch('https://ipapi.co/json/')
    .then(res => {
      if (!res.ok) throw new Error('IP lookup failed');
      return res.json();
    })
    .then(data => {
      const lat = data.latitude || data.lat;
      const lon = data.longitude || data.lon;
      const city = data.city || "Your Location";
      const country = data.country_code || data.country || "";
      if (lat && lon) {
        fetchWeather(lat, lon, city, country);
        return true;
      } else {
        throw new Error('IP location not found');
      }
    });
}

function getAndFetchLocation(auto = false) {
  if (!navigator.geolocation) {
    if (auto) {
      fetchIPLocationAndWeather().catch(() => showError("Could not determine your location automatically"));
    } else {
      showError("Geolocation is not supported by your browser");
      locBtn.disabled = false;
      locBtn.style.opacity = "1";
    }
    return;
  }

  if (!auto) {
    locBtn.disabled = true;
    locBtn.style.opacity = "0.6";
  }

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
        })
        .catch(() => {
          fetchWeather(lat, lon, "Your Location", "");
        })
        .finally(() => {
          if (!auto) {
            locBtn.disabled = false;
            locBtn.style.opacity = "1";
          }
        });
    },
    err => {
      if (auto) {
        // If automatic attempt failed (permission denied or unavailable), try IP fallback
        fetchIPLocationAndWeather().catch(() => showError("Could not determine your location automatically"));
      } else {
        // User denied or geolocation failed during a manual click — try IP fallback automatically
        fetchIPLocationAndWeather()
          .catch(() => showError("📍 Location access denied. Please search for a city instead."))
          .finally(() => {
            locBtn.disabled = false;
            locBtn.style.opacity = "1";
          });
      }
    },
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
  );
}

// Use the shared function when the user clicks the location button
locBtn.onclick = () => getAndFetchLocation(false);

// On page load, attempt to get location and show weather automatically (falls back to IP-based lookup)
window.addEventListener('load', () => {
  console.log("Attempting to determine your location to show local weather...");
  getAndFetchLocation(true);
});
