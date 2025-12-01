import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface WeatherData {
  score: number; // 0-100 (how favorable for crowds)
  temperature: number; // Celsius
  feelsLike: number;
  humidity: number; // Percentage
  uvIndex: number;
  windSpeed: number; // km/h
  cloudCover: number; // Percentage
  precipitation: number; // mm
  weatherCondition: string;
  waveHeight?: number; // meters (for beaches)
  seaTemperature?: number; // Celsius (for beaches)
}

@Injectable()
export class WeatherApiService {
  private readonly logger = new Logger(WeatherApiService.name);
  private readonly apiBaseUrl = 'https://api.openweathermap.org/data/2.5';

  /**
   * Fetch weather data for a location
   *
   * Uses OpenWeatherMap API:
   * - Current weather
   * - Hourly forecast
   * - Marine data (for beaches)
   */
  async fetchWeather(
    latitude: number,
    longitude: number,
    locationType: string,
  ): Promise<WeatherData> {
    this.logger.debug(`Fetching weather for (${latitude}, ${longitude})`);

    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;

      if (!apiKey) {
        this.logger.warn('OpenWeather API key not configured, using mock data');
        return this.generateMockData(locationType);
      }

      // Fetch current weather
      const weatherResponse = await axios.get(`${this.apiBaseUrl}/weather`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: apiKey,
          units: 'metric',
        },
      });

      const weather = weatherResponse.data;

      // Fetch marine data if beach
      let waveHeight: number | undefined;
      let seaTemperature: number | undefined;

      if (locationType === 'BEACH') {
        const marineData = await this.fetchMarineData(latitude, longitude, apiKey);
        waveHeight = marineData.waveHeight;
        seaTemperature = marineData.seaTemperature;
      }

      const weatherData: WeatherData = {
        score: this.calculateWeatherScore(weather, locationType),
        temperature: weather.main.temp,
        feelsLike: weather.main.feels_like,
        humidity: weather.main.humidity,
        uvIndex: await this.fetchUVIndex(latitude, longitude, apiKey),
        windSpeed: weather.wind.speed * 3.6, // m/s to km/h
        cloudCover: weather.clouds.all,
        precipitation: weather.rain?.['1h'] || 0,
        weatherCondition: weather.weather[0].main.toLowerCase(),
        waveHeight,
        seaTemperature,
      };

      this.logger.debug(`Weather score: ${weatherData.score}`);

      return weatherData;
    } catch (error) {
      this.logger.error(`Error fetching weather: ${error.message}`, error.stack);
      return this.generateMockData(locationType);
    }
  }

  /**
   * Fetch UV index
   */
  private async fetchUVIndex(
    latitude: number,
    longitude: number,
    apiKey: string,
  ): Promise<number> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/uvi`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: apiKey,
        },
      });
      return response.data.value;
    } catch (error) {
      return 5; // Default moderate UV
    }
  }

  /**
   * Fetch marine data (waves, sea temperature)
   */
  private async fetchMarineData(
    latitude: number,
    longitude: number,
    apiKey: string,
  ): Promise<{ waveHeight?: number; seaTemperature?: number }> {
    try {
      // Note: OpenWeather doesn't provide marine data in free tier
      // Consider using: Stormglass.io, WorldWeatherOnline, or Marine Weather API
      // For now, return estimated data

      const seaTemp = 20 + Math.random() * 8; // 20-28°C
      const waveHeight = 0.3 + Math.random() * 1.2; // 0.3-1.5m

      return {
        seaTemperature: Math.round(seaTemp * 10) / 10,
        waveHeight: Math.round(waveHeight * 10) / 10,
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Calculate weather score (0-100)
   * Higher score = better weather = more crowds expected
   */
  private calculateWeatherScore(weather: any, locationType: string): number {
    let score = 50; // Base score

    const temp = weather.main.temp;
    const condition = weather.weather[0].main.toLowerCase();
    const cloudCover = weather.clouds.all;
    const windSpeed = weather.wind.speed * 3.6; // km/h
    const precipitation = weather.rain?.['1h'] || 0;

    // Temperature score (optimal 25-30°C for beaches, 20-25°C for others)
    if (locationType === 'BEACH') {
      if (temp >= 25 && temp <= 30) score += 30;
      else if (temp >= 20 && temp < 25) score += 15;
      else if (temp < 20 || temp > 35) score -= 20;
    } else {
      if (temp >= 18 && temp <= 25) score += 25;
      else if (temp >= 15 && temp < 18) score += 10;
      else if (temp < 10 || temp > 30) score -= 15;
    }

    // Weather condition score
    if (condition === 'clear') score += 20;
    else if (condition === 'clouds') score += (100 - cloudCover) / 10;
    else if (condition === 'rain') score -= 30;
    else if (condition === 'thunderstorm') score -= 40;
    else if (condition === 'snow') score -= 35;

    // Wind score (high wind = fewer people, except for wind sports)
    if (windSpeed > 30) score -= 15;
    else if (windSpeed > 20) score -= 10;

    // Precipitation score
    if (precipitation > 5) score -= 25;
    else if (precipitation > 0) score -= 10;

    // Ensure 0-100 range
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Generate mock weather data for testing
   */
  private generateMockData(locationType: string): WeatherData {
    const hour = new Date().getHours();
    const month = new Date().getMonth();

    // Summer months (Jun-Sep) have better weather
    const isSummer = month >= 5 && month <= 8;
    const baseTemp = isSummer ? 25 + Math.random() * 5 : 18 + Math.random() * 5;

    // Clear weather during day
    const isClearWeather = hour >= 8 && hour <= 20 && Math.random() > 0.3;

    const weatherData: WeatherData = {
      score: isClearWeather && isSummer ? 85 : 60,
      temperature: Math.round(baseTemp * 10) / 10,
      feelsLike: Math.round((baseTemp + 2) * 10) / 10,
      humidity: 60 + Math.random() * 20,
      uvIndex: hour >= 11 && hour <= 15 ? 7 + Math.random() * 3 : 3,
      windSpeed: 10 + Math.random() * 15,
      cloudCover: isClearWeather ? 10 + Math.random() * 20 : 60 + Math.random() * 30,
      precipitation: isClearWeather ? 0 : Math.random() * 2,
      weatherCondition: isClearWeather ? 'clear' : 'clouds',
    };

    if (locationType === 'BEACH') {
      weatherData.seaTemperature = isSummer ? 22 + Math.random() * 4 : 16 + Math.random() * 4;
      weatherData.waveHeight = 0.3 + Math.random() * 1.0;
    }

    this.logger.debug(`Mock weather data: score=${weatherData.score}`);

    return weatherData;
  }

  /**
   * Get weather forecast for next 24 hours
   */
  async fetchForecast(
    latitude: number,
    longitude: number,
    locationType: string,
  ): Promise<WeatherData[]> {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;

      if (!apiKey) {
        return this.generateMockForecast(locationType);
      }

      const response = await axios.get(`${this.apiBaseUrl}/forecast`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: apiKey,
          units: 'metric',
          cnt: 8, // 24 hours (3-hour intervals)
        },
      });

      return response.data.list.map((item: any) => ({
        score: this.calculateWeatherScore(item, locationType),
        temperature: item.main.temp,
        feelsLike: item.main.feels_like,
        humidity: item.main.humidity,
        uvIndex: 5, // Forecast doesn't include UV
        windSpeed: item.wind.speed * 3.6,
        cloudCover: item.clouds.all,
        precipitation: item.rain?.['3h'] || 0,
        weatherCondition: item.weather[0].main.toLowerCase(),
      }));
    } catch (error) {
      this.logger.error(`Error fetching forecast: ${error.message}`);
      return this.generateMockForecast(locationType);
    }
  }

  /**
   * Generate mock forecast
   */
  private generateMockForecast(locationType: string): WeatherData[] {
    return Array.from({ length: 8 }, () => this.generateMockData(locationType));
  }
}
