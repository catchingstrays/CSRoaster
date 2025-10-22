/**
 * Validate and clamp a config value to acceptable range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum acceptable value
 * @param {number} max - Maximum acceptable value
 * @param {number} defaultValue - Default if invalid
 * @returns {number} Validated value
 */
function validateConfig(value, min, max, defaultValue) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    return defaultValue;
  }
  return parsed;
}

module.exports = {
  // Discord Configuration
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,

  // Leetify API Configuration
  leetifyApiKey: process.env.LEETIFY_API_KEY,
  leetifyApiBaseUrl: process.env.LEETIFY_API_BASE_URL || 'https://api-public.cs-prod.leetify.com',

  // ChatGPT Configuration
  chatGPTEnabled: process.env.CHATGPT_ENABLED === 'true',
  chatGPTApiKey: process.env.CHATGPT_API_KEY || process.env.OPENAI_API_KEY,

  // Bot Settings
  maxGamesToAnalyze: 10,
  roastIntensity: 'medium', // low, medium, high

  // Advanced Play-Time Learning System (with validation)
  playLearningEnabled: process.env.PLAY_LEARNING_ENABLED !== 'false', // Default: true
  minMatchesForLearning: validateConfig(process.env.MIN_MATCHES_FOR_LEARNING, 1, 50, 3),
  justPlayedCheckInterval: validateConfig(process.env.JUST_PLAYED_CHECK_INTERVAL, 5, 120, 30), // minutes (5 min - 2 hours)
  justPlayedDuration: validateConfig(process.env.JUST_PLAYED_DURATION, 30, 480, 120), // minutes (30 min - 8 hours)
  activeSessionCheckInterval: validateConfig(process.env.ACTIVE_SESSION_CHECK_INTERVAL, 5, 120, 30), // minutes
  maxActiveSessionChecks: validateConfig(process.env.MAX_ACTIVE_SESSION_CHECKS, 1, 20, 4),
  inactiveCheckInterval: validateConfig(process.env.INACTIVE_CHECK_INTERVAL, 30, 1440, 180), // minutes (30 min - 24 hours)
  softResetDays: validateConfig(process.env.SOFT_RESET_DAYS, 1, 90, 7), // days (1-90)
  softResetCheckInterval: validateConfig(process.env.SOFT_RESET_CHECK_INTERVAL, 60, 10080, 1440), // minutes (1 hour - 1 week)
  patternHistorySize: validateConfig(process.env.PATTERN_HISTORY_SIZE, 5, 100, 30),
  dayPatternMinMatches: validateConfig(process.env.DAY_PATTERN_MIN_MATCHES, 1, 10, 2),
};
