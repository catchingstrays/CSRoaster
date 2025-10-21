module.exports = {
  // Discord Configuration
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  prefix: process.env.PREFIX || '!',

  // Leetify API Configuration
  leetifyApiKey: process.env.LEETIFY_API_KEY,
  leetifyApiBaseUrl: process.env.LEETIFY_API_BASE_URL || 'https://api-public.cs-prod.leetify.com',

  // Bot Settings
  maxGamesToAnalyze: 10,
  roastIntensity: 'medium', // low, medium, high
};
