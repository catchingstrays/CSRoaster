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

  // Advanced Play-Time Learning System
  playLearningEnabled: process.env.PLAY_LEARNING_ENABLED !== 'false', // Default: true
  minMatchesForLearning: parseInt(process.env.MIN_MATCHES_FOR_LEARNING, 10) || 3,
  justPlayedCheckInterval: parseInt(process.env.JUST_PLAYED_CHECK_INTERVAL, 10) || 30, // minutes
  justPlayedDuration: parseInt(process.env.JUST_PLAYED_DURATION, 10) || 120, // minutes
  activeSessionCheckInterval: parseInt(process.env.ACTIVE_SESSION_CHECK_INTERVAL, 10) || 30, // minutes
  maxActiveSessionChecks: parseInt(process.env.MAX_ACTIVE_SESSION_CHECKS, 10) || 4,
  inactiveCheckInterval: parseInt(process.env.INACTIVE_CHECK_INTERVAL, 10) || 180, // minutes
  softResetDays: parseInt(process.env.SOFT_RESET_DAYS, 10) || 7,
  softResetCheckInterval: parseInt(process.env.SOFT_RESET_CHECK_INTERVAL, 10) || 1440, // minutes (24 hours)
  patternHistorySize: parseInt(process.env.PATTERN_HISTORY_SIZE, 10) || 30,
  dayPatternMinMatches: parseInt(process.env.DAY_PATTERN_MIN_MATCHES, 10) || 2,
};
