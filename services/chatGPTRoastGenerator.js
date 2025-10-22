const fs = require('fs');
const path = require('path');

/**
 * ChatGPT-based roast generator with caching
 * Generates personalized roasts based on CS2 stats using OpenAI's API
 */
class ChatGPTRoastGenerator {
  constructor() {
    this.cacheFilePath = path.join(__dirname, '../data/chatgptRoastCache.json');
    this.cache = this.loadCache();
    this.enabled = false;
    this.apiKey = null;
    this.model = 'gpt-4o-mini'; // Cost-effective model for roasts
  }

  /**
   * Initialize the ChatGPT roast generator
   * @param {string} apiKey - OpenAI API key
   * @param {boolean} enabled - Whether ChatGPT roasts are enabled
   */
  initialize(apiKey, enabled = false) {
    this.apiKey = apiKey;
    this.enabled = enabled && !!apiKey;

    if (this.enabled) {
      console.log('[CHATGPT] ChatGPT roast generator enabled');
    } else {
      console.log('[CHATGPT] ChatGPT roast generator disabled - using traditional roasts');
    }
  }

  /**
   * Check if ChatGPT roasts are enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled && !!this.apiKey;
  }

  /**
   * Load roast cache from disk
   * @returns {Object}
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[CHATGPT] Error loading cache:', error);
    }
    return {};
  }

  /**
   * Save roast cache to disk
   */
  saveCache() {
    try {
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('[CHATGPT] Error saving cache:', error);
    }
  }

  /**
   * Generate a cache key based on user stats
   * @param {string} steam64Id - Steam64 ID (for global caching across servers)
   * @param {Object} stats - User statistics
   * @param {number} matchCount - Total match count
   * @returns {string}
   */
  generateCacheKey(steam64Id, stats, matchCount) {
    // Cache key uses steam64Id for global caching (same roast across all servers/DMs)
    return `${steam64Id}_${matchCount}_${stats.winRate.toFixed(1)}_${stats.aimRating.toFixed(1)}`;
  }

  /**
   * Get cached roast if available
   * @param {string} cacheKey - Cache key
   * @returns {string|null}
   */
  getCachedRoast(cacheKey) {
    if (this.cache[cacheKey]) {
      const cached = this.cache[cacheKey];
      console.log(`[CHATGPT] Using cached roast for key: ${cacheKey.substring(0, 30)}...`);
      return cached.roast;
    }
    return null;
  }

  /**
   * Cache a roast
   * @param {string} cacheKey - Cache key
   * @param {string} roast - Generated roast
   */
  cacheRoast(cacheKey, roast) {
    this.cache[cacheKey] = {
      roast,
      generatedAt: new Date().toISOString(),
    };
    this.saveCache();
  }

  /**
   * Generate a ChatGPT roast based on stats
   * @param {Object} stats - User statistics
   * @param {Object} previousStats - Previous statistics (optional)
   * @param {string} playerName - Player's name
   * @returns {Promise<string>}
   */
  async generateRoast(stats, previousStats, playerName = 'this player') {
    if (!this.isEnabled()) {
      throw new Error('ChatGPT roast generator is not enabled');
    }

    try {
      const prompt = this.buildPrompt(stats, previousStats, playerName);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are the most savage, brutally honest CS2 trash-talker. Your roasts are RUTHLESS, cutting, and unforgiving. Hold NOTHING back. Destroy their ego with cold hard facts about their terrible stats. Be creative, aggressive, and absolutely merciless. Make them question why they even installed the game. IMPORTANT: Do NOT include the player\'s name in your roast - they will be tagged separately. Keep roasts under 180 characters. ALWAYS end your roast with the exact stat you\'re referencing in parentheses (e.g., "your aim is trash (Aim: 45.2)" or "you can\'t position worth a damn (Positioning: 38.1)"). Make every word COUNT. Use gaming slang to twist the knife deeper. VARIETY IS CRUCIAL: Pick a RANDOM weak stat each time - don\'t always focus on the same category. Mix between aim, positioning, utility, mechanics, clutching, opening duels, etc.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 150,
          temperature: 1.0, // High creativity while maintaining coherence
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const roast = data.choices[0]?.message?.content?.trim();

      if (!roast) {
        throw new Error('No roast generated from ChatGPT');
      }

      console.log('[CHATGPT] Generated new roast via ChatGPT API');
      return roast;
    } catch (error) {
      console.error('[CHATGPT] Error generating roast:', error);
      throw error;
    }
  }

  /**
   * Build prompt for ChatGPT based on stats
   * @param {Object} stats - User statistics
   * @param {Object} previousStats - Previous statistics (optional)
   * @param {string} playerName - Player's name
   * @returns {string}
   */
  buildPrompt(stats, previousStats, playerName) {
    let prompt = `STATS INTERPRETATION GUIDE:
- Ratings (Aim, Positioning, Utility): 0-100 scale where 50 is average. Below 45 is BAD, below 40 is TERRIBLE.
- Deviation stats (Clutch, Opening, CT/T Leetify): Shows deviation from average (0). Negative = worse than average.
- Percentages: Higher is usually better except reaction time (lower is better) and team-damaging stats.
- Win Rate: Below 50% means losing more than winning.

Roast ${playerName} based on these CS2 stats:

=== CORE PERFORMANCE ===
Win Rate: ${stats.winRate.toFixed(1)}% ${stats.winRate < 50 ? '(LOSING PLAYER)' : ''}
Games Analyzed: ${stats.gamesAnalyzed}

=== RATINGS (0-100, 50=average) ===
Aim: ${stats.aimRating.toFixed(1)} ${stats.aimRating < 45 ? '(BELOW AVERAGE)' : stats.aimRating < 40 ? '(TERRIBLE)' : ''}
Positioning: ${stats.positioningRating.toFixed(1)} ${stats.positioningRating < 45 ? '(BELOW AVERAGE)' : stats.positioningRating < 40 ? '(TERRIBLE)' : ''}
Utility Usage: ${stats.utilityRating.toFixed(1)} ${stats.utilityRating < 45 ? '(BELOW AVERAGE)' : stats.utilityRating < 40 ? '(TERRIBLE)' : ''}

=== ACCURACY & MECHANICS ===
Headshot Rate: ${stats.headshotRate.toFixed(1)}% ${stats.headshotRate < 40 ? '(BODY SHOT BOT)' : ''}
Accuracy (Enemy Spotted): ${stats.accuracy.toFixed(1)}%
Spray Accuracy: ${stats.sprayAccuracy.toFixed(1)}%
Counter-Strafing Good Shots: ${stats.counterStrafing.toFixed(1)}%
Preaim: ${stats.preaim.toFixed(1)}° ${stats.preaim > 20 ? '(HORRIBLE CROSSHAIR PLACEMENT)' : ''}
Reaction Time: ${stats.reactionTime.toFixed(0)}ms ${stats.reactionTime > 250 ? '(SLOW AF)' : stats.reactionTime > 200 ? '(SLUGGISH)' : ''}

=== PERFORMANCE DEVIATIONS (negative = worse than average) ===
Clutch: ${stats.clutchDeviation >= 0 ? '+' : ''}${stats.clutchDeviation.toFixed(2)} ${stats.clutchDeviation < -5 ? '(CLUTCH CHOKER)' : ''}
Opening Duels: ${stats.openingDeviation >= 0 ? '+' : ''}${stats.openingDeviation.toFixed(2)} ${stats.openingDeviation < -5 ? '(LOSES FIGHTS)' : ''}
CT Side Leetify: ${stats.ctLeetifyDeviation >= 0 ? '+' : ''}${stats.ctLeetifyDeviation.toFixed(2)}
T Side Leetify: ${stats.tLeetifyDeviation >= 0 ? '+' : ''}${stats.tLeetifyDeviation.toFixed(2)}

=== TEAM PLAY ===
Trade Kills Success: ${stats.tradeKillsSuccessPercentage.toFixed(1)}% ${stats.tradeKillsSuccessPercentage < 50 ? '(BAD TEAMMATE)' : ''}
Traded Deaths Success: ${stats.tradedDeathsSuccessPercentage.toFixed(1)}%
Flashbang Enemies Hit Per Flash: ${stats.flashbangHitFoePerFlashbang.toFixed(2)}
Flashbang Teammates Hit Per Flash: ${stats.flashbangHitFriendPerFlashbang.toFixed(2)} ${stats.flashbangHitFriendPerFlashbang > 0.3 ? '(TEAM FLASHER)' : ''}
Utility Left on Death: ${stats.utilityOnDeathAvg.toFixed(1)} ${stats.utilityOnDeathAvg > 200 ? '(NADE HOARDER)' : ''}

=== OPENING DUELS ===
CT Opening Success: ${stats.ctOpeningDuelSuccessPercentage.toFixed(1)}%
T Opening Success: ${stats.tOpeningDuelSuccessPercentage.toFixed(1)}%${previousStats ? `

=== CHANGES FROM LAST MATCH ===` : ''}`;

    // Comparison with previous stats
    if (previousStats) {
      const changes = [
        { name: 'Win Rate', current: stats.winRate, prev: previousStats.winRate, suffix: '%' },
        { name: 'Aim', current: stats.aimRating, prev: previousStats.aimRating },
        { name: 'Headshot Rate', current: stats.headshotRate, prev: previousStats.headshotRate, suffix: '%' },
        { name: 'Positioning', current: stats.positioningRating, prev: previousStats.positioningRating },
        { name: 'Utility', current: stats.utilityRating, prev: previousStats.utilityRating },
        { name: 'Clutch', current: stats.clutchDeviation, prev: previousStats.clutchDeviation },
        { name: 'Opening', current: stats.openingDeviation, prev: previousStats.openingDeviation },
      ];

      const significantChanges = changes.filter(c => Math.abs(c.current - c.prev) > 1);
      if (significantChanges.length > 0) {
        significantChanges.forEach(change => {
          const diff = change.current - change.prev;
          const direction = diff >= 0 ? 'UP' : 'DOWN';
          const emoji = diff < 0 ? '📉' : '📈';
          prompt += `\n${change.name}: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${change.suffix || ''} ${emoji} (${direction})`;
        });
      } else {
        prompt += '\nNo significant changes (still trash)';
      }
    }

    // Add randomness instruction
    const categories = [
      'their terrible aim and shooting mechanics',
      'their horrible positioning and game sense',
      'their pathetic utility usage',
      'their abysmal clutch performance',
      'their inability to win opening duels',
      'their laughable win rate',
      'their team-damaging mistakes',
      'their crosshair placement and preaim',
      'their slow reaction time',
      'their headshot percentage',
    ];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    prompt += `\n\nGenerate ONE brutal, savage roast focusing on ${randomCategory}. Pick any weak stat from that category. Reference the specific stat value at the end in parentheses. Be creative and VARY your roasts - never use the same angle twice.`;

    return prompt;
  }

  /**
   * Get or generate a roast with caching
   * @param {string} steam64Id - Steam64 ID (for global caching)
   * @param {Object} stats - User statistics
   * @param {Object} previousStats - Previous statistics (optional)
   * @param {number} matchCount - Total match count
   * @param {string} playerName - Player's name
   * @returns {Promise<string>}
   */
  async getOrGenerateRoast(steam64Id, stats, previousStats, matchCount, playerName = 'this player') {
    if (!this.isEnabled()) {
      throw new Error('ChatGPT roast generator is not enabled');
    }

    const cacheKey = this.generateCacheKey(steam64Id, stats, matchCount);

    // Check cache first
    const cachedRoast = this.getCachedRoast(cacheKey);
    if (cachedRoast) {
      return cachedRoast;
    }

    // Generate new roast
    const roast = await this.generateRoast(stats, previousStats, playerName);

    // Cache it
    this.cacheRoast(cacheKey, roast);

    return roast;
  }

  /**
   * Clear old cache entries (optional cleanup)
   * @param {number} daysToKeep - Number of days to keep cache entries
   */
  clearOldCache(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let clearedCount = 0;
    for (const [key, value] of Object.entries(this.cache)) {
      const generatedDate = new Date(value.generatedAt);
      if (generatedDate < cutoffDate) {
        delete this.cache[key];
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      this.saveCache();
      console.log(`[CHATGPT] Cleared ${clearedCount} old cache entries`);
    }
  }
}

// Singleton instance
const chatGPTRoastGenerator = new ChatGPTRoastGenerator();

module.exports = chatGPTRoastGenerator;
