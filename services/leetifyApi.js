const axios = require('axios');
const config = require('../config');

class LeetifyAPI {
  constructor() {
    this.baseUrl = config.leetifyApiBaseUrl;
    this.apiKey = config.leetifyApiKey;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        '_leetify_key': this.apiKey,
      },
    });
  }

  /**
   * Validate API key
   * @returns {Promise<boolean>} Whether the API key is valid
   */
  async validateApiKey() {
    try {
      const response = await this.axiosInstance.get('/api-key/validate');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get player profile by Steam64 ID
   * @param {string} steam64Id - Player's Steam64 ID
   * @returns {Promise<Object>} Player profile data
   */
  async getProfile(steam64Id) {
    try {
      console.log(`Fetching profile for Steam64 ID: ${steam64Id}`);
      console.log(`Full URL: ${this.baseUrl}/v3/profile?steam64_id=${steam64Id}`);

      const response = await this.axiosInstance.get('/v3/profile', {
        params: { steam64_id: steam64Id },
      });

      console.log(`Profile response status: ${response.status}`);
      console.log(`Player name: ${response.data?.name}`);
      console.log(`Privacy mode: ${response.data?.privacy_mode}`);
      console.log(`Total matches: ${response.data?.total_matches}`);

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'fetching profile');
    }
  }

  /**
   * Get match history for a player
   * @param {string} steam64Id - Player's Steam64 ID
   * @returns {Promise<Object>} Match history data
   */
  async getMatchHistory(steam64Id) {
    try {
      console.log(`Fetching match history for Steam64 ID: ${steam64Id}`);
      console.log(`Full URL: ${this.baseUrl}/v3/profile/matches?steam64_id=${steam64Id}`);

      const response = await this.axiosInstance.get('/v3/profile/matches', {
        params: { steam64_id: steam64Id },
      });

      console.log(`Match history response status: ${response.status}`);
      console.log(`Matches found: ${response.data?.length || 0}`);

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'fetching match history');
    }
  }

  /**
   * Get detailed match information
   * @param {string} gameId - The game/match ID
   * @returns {Promise<Object>} Match details
   */
  async getMatchDetails(gameId) {
    try {
      const response = await this.axiosInstance.get(`/v2/matches/${gameId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'fetching match details');
    }
  }

  /**
   * Convert Steam profile URL or various ID formats to Steam64 ID
   * @param {string} input - Steam profile URL, Steam64 ID, or Steam ID
   * @returns {string} Steam64 ID or the input if already valid
   */
  parseSteamId(input) {
    // If it's already a Steam64 ID (17 digits starting with 7656119)
    if (/^7656119\d{10}$/.test(input)) {
      return input;
    }

    // If it's a Steam profile URL
    const urlMatch = input.match(/steamcommunity\.com\/(?:profiles\/|id\/)([^\/]+)/);
    if (urlMatch) {
      const identifier = urlMatch[1];
      // If the URL contains a Steam64 ID
      if (/^7656119\d{10}$/.test(identifier)) {
        return identifier;
      }
      // For custom URLs, we can't convert without additional API calls
      throw new Error(
        'Custom Steam URLs are not supported. Please provide a Steam64 ID (17 digits) instead.\n' +
        'You can find your Steam64 ID at: https://steamid.io/'
      );
    }

    // If nothing matched, assume it might be a Steam64 ID
    return input;
  }

  /**
   * Handle API errors
   * @param {Error} error - The error object
   * @param {string} action - The action being performed
   * @returns {Error} Formatted error
   */
  handleError(error, action) {
    // Log the full error for debugging
    console.error(`Leetify API Error (${action}):`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      params: error.config?.params,
      fullURL: error.config?.baseURL + error.config?.url,
      headers: error.config?.headers,
    });

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.data?.error;

      switch (status) {
        case 404:
          return new Error(
            `Player not found. Make sure you're using a valid Steam64 ID.\n` +
            `Find your Steam64 ID at: https://steamid.io/\n` +
            `Note: The player must have their Steam account linked to Leetify and have played CS2 matches.`
          );
        case 429:
          return new Error(`Rate limited! Too many requests. Try again in a moment.`);
        case 401:
        case 403:
          return new Error(`Invalid API key. Please check your Leetify API key configuration.`);
        case 400:
          return new Error(`Invalid request: ${message || 'Bad parameters'}`);
        default:
          return new Error(`Error ${action}: ${message || 'Unknown error (HTTP ' + status + ')'}`);
      }
    }
    return new Error(`Network error while ${action}. Please try again later.\nDetails: ${error.message}`);
  }
}

module.exports = new LeetifyAPI();
