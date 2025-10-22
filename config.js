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
};
