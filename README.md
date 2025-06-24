## Setup Instructions

### 1. Get API Key
To use this application, you need a free API key from OpenWeatherMap:

1. Go to [OpenWeatherMap](https://openweathermap.org/)
2. Sign up for a free account
3. Navigate to "API keys" section
4. Copy your API key

### 2. Configure the Application
1. Open `script.js`
2. Replace `'YOUR_API_KEY'` on line 3 with your actual API key:
   ```javascript
   this.apiKey = 'your_actual_api_key_here';
   ```

### 3. Run the Application
1. Open `index.html` in your web browser
2. Or serve the files using a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   ```

## Usage

### Searching by Location
1. Enter a city name in the search box
2. Click the search button or press Enter
3. View current weather and 5-day forecast

### Using Current Location
1. Click the location arrow button
2. Allow location access when prompted by your browser
3. View weather information for your current location
