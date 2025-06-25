class WeatherApp {
  constructor() {
    this.apiKey = "53a902c6608e30c342cea72f6c231bac";
    this.baseUrl = "https://api.openweathermap.org/data/2.5";
    this.localStorageKey = "weatherAppRecentCities"; // Key for local storage
    this.maxRecentCities = 5; // Max number of recent cities to store
    this.elements = {
      locationInput: document.getElementById("locationInput"),
      searchBtn: document.getElementById("searchBtn"),
      currentLocationBtn: document.getElementById("currentLocationBtn"),
      forecastGrid: document.getElementById("forecastGrid"),
      loading: document.getElementById("loading"),
      recentCitiesDropdown: document.getElementById("recentCitiesDropdown"), // New
    };
    this.recentlySearchedCities = []; // Array to hold recent cities
    this.dropdownTimeout = null; // To manage blur event delay for dropdown clicks
    this.suppressDropdown = false; // Prevent dropdown flash on selection
    this.loadRecentlySearchedCities(); // Load cities on app initialization
    this.bindEvents();
    this.hideLoading();
    this.renderDropdown(); // Render dropdown initially (will be hidden if empty)
  }
  bindEvents() {
    this.elements.searchBtn.addEventListener("click", () => this.searchWeather());
    this.elements.currentLocationBtn.addEventListener("click", () => {
      this.elements.currentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      this.elements.currentLocationBtn.disabled = true;
      this.getCurrentLocation();
    });
    this.elements.locationInput.addEventListener("keypress", (e) => {
      // Prevent non-alphabetic characters (block numbers and special chars)
      if (!/^[a-zA-Z\s]$/.test(e.key)) {
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        this.searchWeather();
      }
    });
    // Enable/disable search button dynamically
    this.elements.locationInput.addEventListener("input", () => {
      const value = this.elements.locationInput.value.trim();
      const isValid = /^[a-zA-Z\s]*$/.test(value);
      this.elements.searchBtn.disabled = value === "" || !isValid;
    });
    // New: Event listeners for dropdown visibility
    this.elements.locationInput.addEventListener("focus", () => this.showDropdown());
    this.elements.locationInput.addEventListener("blur", () => {
      // Delay hiding to allow clicks on dropdown items
      this.dropdownTimeout = setTimeout(() => this.hideDropdown(), 150);
    });
    // Prevent dropdown from hiding immediately if a click happens inside it
    this.elements.recentCitiesDropdown.addEventListener("mousedown", (e) => {
      e.preventDefault(); // Prevents input blur from firing before click on item
    });
  }
  async searchWeather() {
    const location = this.elements.locationInput.value.trim();
    if (!location) {
      window.alert("Please enter a city name.");
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(location)) {
      window.alert("Please enter a valid city name using letters only.");
      return;
    }
    this.showLoading();
    this.hideDropdown(); // Hide dropdown immediately when search begins
    try {
      const weatherData = await this.getWeatherData(location);
      const forecastData = await this.getForecastData(location);
      this.displayCurrentWeather(weatherData);
      this.displayForecast(forecastData);
      this.addCityToRecent(weatherData.name);
      // Explicitly blur the input after a successful search
      this.elements.locationInput.blur();
    } catch (error) {
      window.alert("City not found. Please check your input.");
    } finally {
      this.hideLoading();
    }
  }
  async getCurrentLocation() {
    if (!navigator.geolocation) {
      window.alert("Geolocation is not supported by your browser.");
      this.resetLocationButton();
      return;
    }
    this.showLoading();
    this.hideDropdown(); // Hide dropdown immediately when current location search begins
    try {
      const position = await this.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const weatherData = await this.getWeatherDataByCoords(latitude, longitude);
      const forecastData = await this.getForecastDataByCoords(latitude, longitude);
      this.displayCurrentWeather(weatherData);
      this.displayForecast(forecastData);
      const cityName = await this.getCityNameFromCoords(latitude, longitude);
      this.elements.locationInput.value = cityName;
      this.addCityToRecent(cityName); // Add current location city name to recents
      // Explicitly blur the input after a successful current location lookup
      this.elements.locationInput.blur();
    } catch (error) {
      let errorMessage = "Unable to get your location. ";
      if (error.code === 1) errorMessage += "Please allow location access.";
      else if (error.code === 2) errorMessage += "Location unavailable.";
      else if (error.code === 3) errorMessage += "Request timed out.";
      else errorMessage += "Please check your permissions.";
      window.alert(errorMessage);
    } finally {
      this.hideLoading();
      this.resetLocationButton();
    }
  }
  // --- Recent Cities Dropdown Methods ---
  loadRecentlySearchedCities() {
    try {
      const storedCities = localStorage.getItem(this.localStorageKey);
      this.recentlySearchedCities = storedCities ? JSON.parse(storedCities) : [];
    } catch (e) {
      console.error("Error loading recent cities from localStorage:", e);
      this.recentlySearchedCities = [];
    }
  }
  saveRecentlySearchedCities() {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.recentlySearchedCities));
    } catch (e) {
      console.error("Error saving recent cities to localStorage:", e);
    }
  }
  addCityToRecent(cityName) {
    const normalizedCity = cityName.trim().toLowerCase();
    const existingIndex = this.recentlySearchedCities.findIndex(
      (city) => city.toLowerCase() === normalizedCity
    );
    if (existingIndex !== -1) {
      // Remove existing entry to move it to the top
      this.recentlySearchedCities.splice(existingIndex, 1);
    }
    // Add new city to the beginning
    this.recentlySearchedCities.unshift(cityName);
    // Limit the number of recent cities
    if (this.recentlySearchedCities.length > this.maxRecentCities) {
      this.recentlySearchedCities = this.recentlySearchedCities.slice(0, this.maxRecentCities);
    }
    this.saveRecentlySearchedCities();
    this.renderDropdown();
  }
  renderDropdown() {
    this.elements.recentCitiesDropdown.innerHTML = ""; // Clear previous items
    if (this.recentlySearchedCities.length === 0) {
      this.hideDropdown();
      return;
    }
    this.recentlySearchedCities.forEach((city) => {
      const cityItem = document.createElement("div");
      cityItem.classList.add("recent-city-item");
      cityItem.textContent = city;
      cityItem.addEventListener("click", () => this.selectRecentCity(city));
      this.elements.recentCitiesDropdown.appendChild(cityItem);
    });
    // If input is currently focused, ensure dropdown is visible
    if (document.activeElement === this.elements.locationInput && !this.suppressDropdown) {
      this.showDropdown();
    } else {
      this.hideDropdown(); // Keep it hidden if input is not focused or suppressed
    }
    this.suppressDropdown = false; // Reset flag after render
  }
  selectRecentCity(city) {
    clearTimeout(this.dropdownTimeout); // Prevent delayed hide
    this.hideDropdown();
    this.suppressDropdown = true; // Prevent dropdown from showing in renderDropdown
    this.elements.locationInput.value = city;
    this.searchWeather();
    // searchWeather will now handle hiding the dropdown and blurring the input
  }
  showDropdown() {
    if (this.recentlySearchedCities.length > 0) {
      clearTimeout(this.dropdownTimeout); // Clear any pending hide timeouts
      this.elements.recentCitiesDropdown.style.display = "block";
    }
  }
  hideDropdown() {
    this.elements.recentCitiesDropdown.style.display = "none";
  }
  resetLocationButton() {
    this.elements.currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
    this.elements.currentLocationBtn.disabled = false;
  }
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      });
    });
  }
  async getWeatherData(location) {
    const response = await fetch(
      `${this.baseUrl}/weather?q=${encodeURIComponent(location)}&appid=${this.apiKey}&units=metric`
    );
    if (!response.ok) throw new Error("Weather data not found");
    return await response.json();
  }
  async getWeatherDataByCoords(lat, lon) {
    const response = await fetch(
      `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
    );
    if (!response.ok) throw new Error("Weather data not found");
    return await response.json();
  }
  async getForecastData(location) {
    const response = await fetch(
      `${this.baseUrl}/forecast?q=${encodeURIComponent(location)}&appid=${this.apiKey}&units=metric`
    );
    if (!response.ok) throw new Error("Forecast data not found");
    return await response.json();
  }
  async getCityNameFromCoords(lat, lon) {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.apiKey}`
    );
    if (!response.ok) throw new Error("Failed to get city name");
    const data = await response.json();
    return data[0]?.name || "Unknown location";
  }
  async getForecastDataByCoords(lat, lon) {
    const response = await fetch(
      `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
    );
    if (!response.ok) throw new Error("Forecast data not found");
    return await response.json();
  }
  displayCurrentWeather(data) {
    const {
      name,
      main: { temp, feels_like, humidity },
      weather: [{ description, icon }],
      wind: { speed },
      visibility,
    } = data;
    document.getElementById("cityName").textContent = name;
    document.getElementById("temperature").textContent = Math.round(temp);
    document.getElementById("weatherDescription").textContent = description;
    document.getElementById("feelsLike").textContent = Math.round(feels_like);
    document.getElementById("humidity").textContent = humidity;
    document.getElementById("windSpeed").textContent = Math.round(speed * 3.6);
    document.getElementById("visibility").textContent = Math.round(visibility / 1000);
    document.getElementById("weatherIcon").className = this.getWeatherIcon(icon, description);
  }
  displayForecast(data) {
    const dailyData = this.processForecastData(data.list);
    this.elements.forecastGrid.innerHTML = "";
    dailyData.forEach((day) => {
      const forecastCard = this.createForecastCard(day);
      this.elements.forecastGrid.appendChild(forecastCard);
    });
  }
  processForecastData(forecastList) {
    const dailyData = [];
    const seenDates = new Set();
    forecastList.forEach((item) => {
      const date = new Date(item.dt * 1000);
      const dateStr = date.toDateString();
      if (!seenDates.has(dateStr) && dailyData.length < 5) {
        seenDates.add(dateStr);
        dailyData.push({
          date: date,
          temp: Math.round(item.main.temp),
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: Math.round(item.wind.speed * 3.6),
        });
      }
    });
    return dailyData;
  }
  createForecastCard(day) {
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <div class="forecast-date">${day.date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}</div>
      <div class="forecast-icon"><i class="${this.getWeatherIcon(day.icon, day.description)}"></i></div>
      <div class="forecast-temp">${day.temp}°C</div>
      <div class="forecast-description">${day.description}</div>
      <div class="forecast-details">
        <div>Humidity: ${day.humidity}%</div>
        <div>Wind: ${day.windSpeed} km/h</div>
      </div>
    `;
    return card;
  }
  getWeatherIcon(iconCode, description = "") {
    const iconMap = {
      "01d": "fas fa-sun",
      "01n": "fas fa-moon",
      "02d": "fas fa-cloud-sun",
      "02n": "fas fa-cloud-moon",
      "03d": "fas fa-cloud",
      "03n": "fas fa-cloud",
      "04d": "fas fa-cloud",
      "04n": "fas fa-cloud",
      "09d": "fas fa-cloud-showers-heavy",
      "09n": "fas fa-cloud-showers-heavy",
      "10d": "fas fa-cloud-sun-rain",
      "10n": "fas fa-cloud-moon-rain",
      "11d": "fas fa-bolt",
      "11n": "fas fa-bolt",
      "13d": "fas fa-snowflake",
      "13n": "fas fa-snowflake",
      "50d": "fas fa-smog",
      "50n": "fas fa-smog",
    };
    if (iconMap[iconCode]) return iconMap[iconCode];
    const desc = description.toLowerCase();
    if (desc.includes("clear")) return "fas fa-sun";
    if (desc.includes("cloud")) return "fas fa-cloud";
    if (desc.includes("rain") || desc.includes("drizzle")) return "fas fa-cloud-showers-heavy";
    if (desc.includes("snow")) return "fas fa-snowflake";
    if (desc.includes("storm")) return "fas fa-bolt";
    if (desc.includes("mist") || desc.includes("fog") || desc.includes("haze")) return "fas fa-smog";
    return "fas fa-question-circle";
  }
  showLoading() {
    this.elements.loading.style.display = "flex";
  }
  hideLoading() {
    this.elements.loading.style.display = "none";
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const app = new WeatherApp();
});