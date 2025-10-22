const fs = require('fs');
const path = require('path');
const leetifyApi = require('./leetifyApi');
const cs2RoastGenerator = require('../utils/cs2RoastGenerator');
const chatGPTRoastGenerator = require('./chatGPTRoastGenerator');
const config = require('../config');
const { loadUserLinks } = require('../utils/userLinksManager');
const { getGuildConfig } = require('../utils/guildConfigManager');

const TRACKER_DATA_PATH = path.join(__dirname, '../data/matchTrackerData.json');

// Load timer configurations from environment variables (with defaults)
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES, 10) || 60;
const USER_COOLDOWN_HOURS = parseInt(process.env.USER_COOLDOWN_HOURS, 10) || 3;

const CHECK_INTERVAL = CHECK_INTERVAL_MINUTES * 60 * 1000; // Convert minutes to milliseconds
const USER_COOLDOWN = USER_COOLDOWN_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds

// Learning system constants
const LEARNING_CONSTANTS = {
  ACTIVE_HOUR_THRESHOLD: 0.3, // 30% of max count to consider hour "active"
  CONFIDENCE_MATCH_THRESHOLD: 15, // Matches needed for full confidence (1.0)
  PATTERN_RECALC_INTERVAL_MS: 24 * 60 * 60 * 1000, // Recalculate patterns daily
  MAX_RECURSION_DEPTH: 2, // Prevent infinite recursion in state machine
};

class MatchTracker {
  constructor() {
    this.client = null;
    this.checkInterval = null;
    this.trackedUsers = {};
    this.roastCache = {}; // Cache for roasts by user and timestamp

    // Ensure data directory exists
    const dataDir = path.dirname(TRACKER_DATA_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.loadTrackerData();
  }

  /**
   * Load tracked user data from file
   */
  loadTrackerData() {
    try {
      if (fs.existsSync(TRACKER_DATA_PATH)) {
        const data = fs.readFileSync(TRACKER_DATA_PATH, 'utf8');
        this.trackedUsers = JSON.parse(data);
        const userCount = Object.keys(this.trackedUsers).length;
        console.log(`[STATE] Restored tracking data for ${userCount} user${userCount !== 1 ? 's' : ''}`);

        // Log each restored user's state
        for (const [userId, userData] of Object.entries(this.trackedUsers)) {
          const inCooldown = userData.lastMatchUpdate &&
            (Date.now() - new Date(userData.lastMatchUpdate).getTime() < USER_COOLDOWN);
          const cooldownStatus = inCooldown ? ' [IN COOLDOWN]' : '';
          console.log(`  - User ${userId}: ${userData.lastMatchCount} matches${cooldownStatus}`);
        }
      } else {
        this.trackedUsers = {};
        console.log('[STATE] No previous tracking data found - starting fresh');
      }
    } catch (error) {
      console.error('Error loading tracker data:', error);
      this.trackedUsers = {};
    }
  }

  /**
   * Save tracked user data to file
   */
  saveTrackerData() {
    try {
      fs.writeFileSync(TRACKER_DATA_PATH, JSON.stringify(this.trackedUsers, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving tracker data:', error);
      return false;
    }
  }

  /**
   * Initialize the tracker with Discord client
   * @param {Client} discordClient - Discord.js client instance
   */
  initialize(discordClient) {
    this.client = discordClient;
    console.log('Match tracker initialized');

    // Initialize ChatGPT roast generator
    chatGPTRoastGenerator.initialize(config.chatGPTApiKey, config.chatGPTEnabled);

    // Start tracking when bot is ready
    if (this.client.isReady()) {
      this.startTracking();
    } else {
      this.client.once('clientReady', () => {
        this.startTracking();
      });
    }
  }

  /**
   * Start the automatic tracking interval
   */
  startTracking() {
    console.log(`Starting match tracker - checking every ${CHECK_INTERVAL_MINUTES} minute${CHECK_INTERVAL_MINUTES !== 1 ? 's' : ''} (cooldown: ${USER_COOLDOWN_HOURS} hour${USER_COOLDOWN_HOURS !== 1 ? 's' : ''})`);

    // Run initial check
    this.checkAllUsers();

    // Set up interval for continuous checking
    this.checkInterval = setInterval(() => {
      this.checkAllUsers();
    }, CHECK_INTERVAL);
  }

  /**
   * Stop the tracking interval
   */
  stopTracking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Match tracker stopped');
    }
  }

  /**
   * Check all linked users for new matches
   */
  async checkAllUsers() {
    const userLinks = loadUserLinks();
    const userIds = Object.keys(userLinks);

    if (userIds.length === 0) {
      console.log('No linked users to track');
      return;
    }

    console.log(`[${new Date().toISOString()}] Checking ${userIds.length} users for new matches...`);

    const now = Date.now();
    let checkedCount = 0;
    let skippedCount = 0;

    for (const discordUserId of userIds) {
      const linkData = userLinks[discordUserId];
      const steam64Id = linkData.steam64Id;
      const user = this.trackedUsers[discordUserId];

      // Initialize user tracking data if missing (for existing users before learning system)
      if (user && !user.checkingState) {
        const nowDate = new Date();
        user.playTimePattern = {
          matchDetectionTimes: [],
          dayOfWeekPatterns: {},
          overallActiveHours: [],
          confidenceScore: 0,
          lastMatchDetectedAt: user.lastMatchUpdate || null,
          daysSinceLastMatch: 0,
        };
        user.checkingState = {
          currentState: 'INACTIVE',
          stateEnteredAt: nowDate.toISOString(),
          consecutiveNoMatchChecks: 0,
          lastChecked: nowDate.toISOString(),
          nextCheckAt: new Date(now + config.inactiveCheckInterval * 60 * 1000).toISOString(),
        };
      }

      // Skip if not time to check yet (using new nextCheckAt-based scheduling)
      if (user?.checkingState?.nextCheckAt) {
        const nextCheck = new Date(user.checkingState.nextCheckAt).getTime();
        if (now < nextCheck) {
          const remainingMin = Math.round((nextCheck - now) / 60000);
          console.log(`Skipping ${linkData.username} - next check in ${remainingMin}min (State: ${user.checkingState.currentState})`);
          skippedCount++;
          continue;
        }
      } else if (this.isUserInCooldown(discordUserId)) {
        // Fallback to legacy cooldown for users without new system
        const cooldownRemaining = this.getCooldownRemaining(discordUserId);
        console.log(`Skipping ${linkData.username} - cooldown active (${Math.ceil(cooldownRemaining / 60000)} min remaining)`);
        skippedCount++;
        continue;
      }

      try {
        await this.checkUserMatches(discordUserId, steam64Id);
        checkedCount++;
      } catch (error) {
        console.error(`Error checking matches for ${linkData.username} (${discordUserId}):`, error.message);
      }

      // Small delay between API calls to avoid rate limiting
      await this.sleep(1000);
    }

    console.log(`Finished checking: ${checkedCount} checked, ${skippedCount} skipped`);
  }

  /**
   * Check if a user is in cooldown
   * @param {string} discordUserId - Discord user ID
   * @returns {boolean} Whether user is in cooldown
   */
  isUserInCooldown(discordUserId) {
    const userData = this.trackedUsers[discordUserId];
    if (!userData || !userData.lastMatchUpdate) {
      return false;
    }

    const timeSinceUpdate = Date.now() - new Date(userData.lastMatchUpdate).getTime();
    return timeSinceUpdate < USER_COOLDOWN;
  }

  /**
   * Get remaining cooldown time for a user in milliseconds
   * @param {string} discordUserId - Discord user ID
   * @returns {number} Remaining cooldown in milliseconds
   */
  getCooldownRemaining(discordUserId) {
    const userData = this.trackedUsers[discordUserId];
    if (!userData || !userData.lastMatchUpdate) {
      return 0;
    }

    const timeSinceUpdate = Date.now() - new Date(userData.lastMatchUpdate).getTime();
    const remaining = USER_COOLDOWN - timeSinceUpdate;
    return Math.max(0, remaining);
  }

  /**
   * Check a specific user for new matches
   * @param {string} discordUserId - Discord user ID
   * @param {string} steam64Id - Steam64 ID
   */
  async checkUserMatches(discordUserId, steam64Id) {
    try {
      // Fetch current profile data
      const profileData = await leetifyApi.getProfile(steam64Id);
      const currentMatchCount = profileData.total_matches || 0;

      // Calculate current stats
      const currentStats = cs2RoastGenerator.calculateStatsFromProfile(profileData);

      // Initialize tracking for this user if not exists
      if (!this.trackedUsers[discordUserId]) {
        const now = new Date();
        this.trackedUsers[discordUserId] = {
          steam64Id: steam64Id,
          lastMatchCount: currentMatchCount,
          lastChecked: now.toISOString(),
          lastStats: currentStats,
          lastMatchUpdate: null, // Legacy field
          playTimePattern: {
            matchDetectionTimes: [],
            dayOfWeekPatterns: {},
            overallActiveHours: [],
            confidenceScore: 0,
            lastMatchDetectedAt: null,
            daysSinceLastMatch: 0,
          },
          checkingState: {
            currentState: 'INACTIVE',
            stateEnteredAt: now.toISOString(),
            consecutiveNoMatchChecks: 0,
            lastChecked: now.toISOString(),
            nextCheckAt: new Date(Date.now() + config.inactiveCheckInterval * 60 * 1000).toISOString(),
          },
        };
        this.saveTrackerData();
        console.log(`Started tracking ${profileData.name} - Current matches: ${currentMatchCount}`);
        return;
      }

      const user = this.trackedUsers[discordUserId];
      const lastMatchCount = user.lastMatchCount;
      const previousStats = user.lastStats || null;

      // Check if match count increased
      if (currentMatchCount > lastMatchCount) {
        // MATCH DETECTED!
        const newMatches = currentMatchCount - lastMatchCount;
        const now = new Date();

        console.log(`[MATCH] ${profileData.name} played ${newMatches} new match(es)!`);

        // Record detection time with day-of-week
        user.playTimePattern.matchDetectionTimes.push({
          timestamp: now.toISOString(),
          dayOfWeek: now.getUTCDay(),
          hour: now.getUTCHours(),
        });

        // Keep only last N detections
        if (user.playTimePattern.matchDetectionTimes.length > config.patternHistorySize) {
          user.playTimePattern.matchDetectionTimes = user.playTimePattern.matchDetectionTimes.slice(-config.patternHistorySize);
        }

        user.playTimePattern.lastMatchDetectedAt = now.toISOString();
        user.playTimePattern.daysSinceLastMatch = 0;

        // Recalculate pattern if enough data
        if (config.playLearningEnabled && user.playTimePattern.matchDetectionTimes.length >= config.minMatchesForLearning) {
          const newPattern = this.calculatePlayTimePattern(discordUserId);
          if (newPattern) {
            Object.assign(user.playTimePattern, newPattern);
            console.log(`[LEARNING] Updated play-time pattern for ${profileData.name} (confidence: ${newPattern.confidenceScore.toFixed(2)})`);
          }
        }

        // Send roast
        await this.sendRoastMessage(discordUserId, steam64Id, profileData, currentStats, previousStats);

        // Update state
        user.lastMatchCount = currentMatchCount;
        user.lastStats = currentStats;
        user.checkingState.currentState = 'JUST_PLAYED';
        user.checkingState.stateEnteredAt = now.toISOString();
        user.checkingState.consecutiveNoMatchChecks = 0;

        // Calculate next check
        const cooldown = config.playLearningEnabled ? this.getDynamicCooldown(discordUserId) : (config.justPlayedCheckInterval * 60 * 1000);
        user.checkingState.nextCheckAt = new Date(Date.now() + cooldown).toISOString();
        user.checkingState.lastChecked = now.toISOString();

        this.saveTrackerData();

        const nextCheckMin = Math.round(cooldown / 60000);
        console.log(`[STATE] ${profileData.name} → JUST_PLAYED (next check in ${nextCheckMin}min)`);

      } else {
        // NO MATCH FOUND
        user.checkingState.consecutiveNoMatchChecks++;

        // Calculate next check based on current state
        const cooldown = config.playLearningEnabled ? this.getDynamicCooldown(discordUserId) : (config.inactiveCheckInterval * 60 * 1000);
        user.checkingState.nextCheckAt = new Date(Date.now() + cooldown).toISOString();
        user.checkingState.lastChecked = new Date().toISOString();

        this.saveTrackerData();

        const cooldownMin = Math.round(cooldown / 60000);
        console.log(`[NO MATCH] ${profileData.name} - State: ${user.checkingState.currentState}, Next check in ${cooldownMin}min`);
      }
    } catch (error) {
      console.error(`Error checking matches for user ${discordUserId}:`, error.message);
    }
  }

  /**
   * Send a roast message to all guilds where user is linked
   * @param {string} discordUserId - Discord user ID
   * @param {string} steam64Id - Steam64 ID
   * @param {Object} profileData - Leetify profile data
   * @param {Object} currentStats - Current calculated stats
   * @param {Object} previousStats - Previous stats (optional)
   */
  async sendRoastMessage(discordUserId, steam64Id, profileData, currentStats, previousStats = null) {
    try {
      const userLinks = loadUserLinks();
      const userData = userLinks[discordUserId];

      if (!userData || !userData.guilds || userData.guilds.length === 0) {
        console.log(`User ${discordUserId} has no guild associations`);
        return;
      }

      const playerName = profileData.name || 'Unknown Player';
      const currentMatchCount = profileData.total_matches || 0;

      // Generate roast once (cached for all guilds) - ensures same roast for same user
      const cacheKey = `${discordUserId}-${Date.now()}`;
      let selectedRoast;

      if (!this.roastCache[cacheKey]) {
        // Use ChatGPT if enabled, otherwise use traditional roasts
        if (chatGPTRoastGenerator.isEnabled()) {
          try {
            selectedRoast = await chatGPTRoastGenerator.getOrGenerateRoast(
              steam64Id,
              currentStats,
              previousStats,
              currentMatchCount,
              playerName,
            );
            console.log(`[CHATGPT] Generated roast for ${playerName}`);
          } catch (error) {
            console.error('[CHATGPT] Failed to generate roast, falling back to traditional:', error);
            // Fallback to traditional roasts
            const roasts = cs2RoastGenerator.generateRoastsWithComparison(currentStats, previousStats);
            selectedRoast = roasts[Math.floor(Math.random() * roasts.length)];
          }
        } else {
          // Traditional roast generation
          const roasts = cs2RoastGenerator.generateRoastsWithComparison(currentStats, previousStats);
          selectedRoast = roasts[Math.floor(Math.random() * roasts.length)];
        }

        this.roastCache[cacheKey] = selectedRoast;

        // Clear old cache entries (keep only last 100)
        const cacheKeys = Object.keys(this.roastCache);
        if (cacheKeys.length > 100) {
          const oldKeys = cacheKeys.slice(0, cacheKeys.length - 100);
          oldKeys.forEach(key => delete this.roastCache[key]);
        }
      } else {
        selectedRoast = this.roastCache[cacheKey];
      }

      // Send roast to each guild where user is linked
      let successCount = 0;
      for (const guildId of userData.guilds) {
        try {
          const guildConfig = getGuildConfig(guildId);

          if (!guildConfig || !guildConfig.roastChannelId) {
            console.log(`Guild ${guildId} is not configured - skipping`);
            continue;
          }

          const guild = await this.client.guilds.fetch(guildId).catch(() => null);
          if (!guild) {
            console.log(`Guild ${guildId} not found - bot may have been removed`);
            continue;
          }

          const channel = await guild.channels.fetch(guildConfig.roastChannelId).catch(() => null);
          if (!channel) {
            console.log(`Channel ${guildConfig.roastChannelId} not found in guild ${guild.name}`);
            continue;
          }

          // Check if bot has permission to send messages
          const botPermissions = channel.permissionsFor(this.client.user);
          if (!botPermissions || !botPermissions.has('SendMessages')) {
            console.log(`No permission to send messages in ${channel.name} (${guild.name})`);
            continue;
          }

          // Build roast message
          let roastMessage = `<@${discordUserId}>, ${selectedRoast}`;
          roastMessage += '\n-# [Data Provided by Leetify](<https://leetify.com/>)';
          if (steam64Id) {
            roastMessage += ` • [Steam Profile](<https://steamcommunity.com/profiles/${steam64Id}>)`;
          }

          // Send the roast
          await channel.send(roastMessage);
          successCount++;
          console.log(`Sent auto-roast to ${channel.name} in ${guild.name} for ${playerName}`);
        } catch (error) {
          console.error(`Error sending roast to guild ${guildId}:`, error.message);
        }
      }

      console.log(`Roast sent to ${successCount}/${userData.guilds.length} guilds for ${playerName}${previousStats ? ' (with stat comparison)' : ''}`);
    } catch (error) {
      console.error('Error sending roast messages:', error);
    }
  }

  /**
   * Get rank display from profile data
   * @param {Object} profileData - Profile data from Leetify
   * @returns {string} Rank display string
   */
  getRankDisplay(profileData) {
    const csRating = profileData.cs_rating;
    if (!csRating) {
      return 'Unranked';
    }

    const rank = csRating.rank_name || 'Unknown';
    const rating = csRating.rating || 0;

    return `${rank} (${rating})`;
  }

  /**
   * Transition user state and update metadata
   * @param {Object} user - User tracking object
   * @param {string} newState - New state to transition to
   * @param {boolean} resetConsecutiveChecks - Whether to reset consecutive check counter
   */
  transitionState(user, newState, resetConsecutiveChecks = true) {
    const oldState = user.checkingState.currentState;
    user.checkingState.currentState = newState;
    user.checkingState.stateEnteredAt = new Date().toISOString();

    if (resetConsecutiveChecks) {
      user.checkingState.consecutiveNoMatchChecks = 0;
    }

    console.log(`[STATE TRANSITION] ${oldState} → ${newState}`);
  }

  /**
   * Calculate play-time patterns from match detection history
   * @param {string} discordUserId - Discord user ID
   * @returns {Object} Pattern data with day-of-week analysis
   */
  calculatePlayTimePattern(discordUserId) {
    const user = this.trackedUsers[discordUserId];
    const detections = user.playTimePattern?.matchDetectionTimes || [];

    if (detections.length < config.minMatchesForLearning) {
      return null; // Not enough data
    }

    // Optimization: Skip recalculation if pattern was recently updated
    const lastRecalc = user.playTimePattern?.lastRecalculated;
    if (lastRecalc) {
      const timeSinceRecalc = Date.now() - new Date(lastRecalc).getTime();
      if (timeSinceRecalc < LEARNING_CONSTANTS.PATTERN_RECALC_INTERVAL_MS) {
        return null; // Skip recalculation (patterns don't change that quickly)
      }
    }

    // Initialize day-of-week patterns
    const dayPatterns = {};
    for (let day = 0; day < 7; day++) {
      dayPatterns[day] = { hourCounts: new Array(24).fill(0), matchCount: 0 };
    }

    // Analyze each detection with recency weighting
    detections.forEach((detection, index) => {
      const date = new Date(detection.timestamp);
      const dayOfWeek = date.getUTCDay();
      const hour = date.getUTCHours();
      const weight = (index + 1) / detections.length; // Recent = higher weight

      dayPatterns[dayOfWeek].hourCounts[hour] += weight;
      dayPatterns[dayOfWeek].matchCount++;
    });

    // For each day, identify active hours
    const result = { dayOfWeekPatterns: {}, overallActiveHours: [] };
    const allHourCounts = new Array(24).fill(0);

    for (let day = 0; day < 7; day++) {
      const pattern = dayPatterns[day];

      if (pattern.matchCount === 0) {
        result.dayOfWeekPatterns[day] = { activeHours: [], matchCount: 0 };
        continue;
      }

      // Find active hours for this day using defined threshold constant
      const maxCount = Math.max(...pattern.hourCounts);
      const threshold = maxCount * LEARNING_CONSTANTS.ACTIVE_HOUR_THRESHOLD;
      const activeHours = pattern.hourCounts
        .map((count, hour) => (count >= threshold ? hour : null))
        .filter(h => h !== null);

      // Expand to include adjacent hours (players play multiple games)
      const expandedHours = new Set(activeHours);
      activeHours.forEach(hour => {
        expandedHours.add((hour - 1 + 24) % 24);
        expandedHours.add((hour + 1) % 24);
      });

      result.dayOfWeekPatterns[day] = {
        activeHours: Array.from(expandedHours).sort((a, b) => a - b),
        matchCount: pattern.matchCount,
      };

      // Accumulate for overall pattern
      pattern.hourCounts.forEach((count, hour) => {
        allHourCounts[hour] += count;
      });
    }

    // Calculate overall active hours (fallback when day pattern confidence is low)
    const overallMax = Math.max(...allHourCounts);
    const overallThreshold = overallMax * LEARNING_CONSTANTS.ACTIVE_HOUR_THRESHOLD;
    result.overallActiveHours = allHourCounts
      .map((count, hour) => (count >= overallThreshold ? hour : null))
      .filter(h => h !== null);

    // Calculate confidence using defined threshold constant
    result.confidenceScore = Math.min(1.0, detections.length / LEARNING_CONSTANTS.CONFIDENCE_MATCH_THRESHOLD);
    result.lastRecalculated = new Date().toISOString();

    return result;
  }

  /**
   * Get dynamic cooldown based on user's play-time pattern and current state
   * @param {string} discordUserId - Discord user ID
   * @param {number} _recursionDepth - Internal recursion guard (do not use)
   * @returns {number} Cooldown in milliseconds
   */
  getDynamicCooldown(discordUserId, _recursionDepth = 0) {
    // Recursion guard to prevent infinite loops
    if (_recursionDepth >= LEARNING_CONSTANTS.MAX_RECURSION_DEPTH) {
      console.error(`[ERROR] Max recursion depth reached for user ${discordUserId}, using fallback`);
      return config.inactiveCheckInterval * 60 * 1000;
    }

    const user = this.trackedUsers[discordUserId];
    const pattern = user.playTimePattern;
    const state = user.checkingState;

    // Calculate days since last match for soft-reset logic
    if (pattern?.lastMatchDetectedAt) {
      const daysSince = (Date.now() - new Date(pattern.lastMatchDetectedAt).getTime()) / (24 * 60 * 60 * 1000);
      pattern.daysSinceLastMatch = daysSince;

      // SOFT-RESET: No match in >7 days
      if (daysSince > config.softResetDays && state.currentState !== 'SOFT_RESET') {
        console.log(`[SOFT-RESET] User ${discordUserId} hasn't played in ${daysSince.toFixed(1)} days - switching to daily checks`);
        this.transitionState(user, 'SOFT_RESET');
      }
    }

    // Not enough data - use default 3 hours
    if (!pattern || !pattern.matchDetectionTimes || pattern.matchDetectionTimes.length < config.minMatchesForLearning) {
      return config.inactiveCheckInterval * 60 * 1000;
    }

    const now = new Date();
    const currentDayOfWeek = now.getUTCDay(); // NOTE: Using UTC timezone
    const currentHour = now.getUTCHours(); // NOTE: Using UTC timezone

    // Get today's active hours (or fall back to overall pattern)
    const todayPattern = pattern.dayOfWeekPatterns?.[currentDayOfWeek];
    const activeHours = todayPattern?.matchCount >= config.dayPatternMinMatches
      ? todayPattern.activeHours
      : pattern.overallActiveHours || [];

    const isActiveHour = activeHours.includes(currentHour);

    switch (state.currentState) {
    case 'SOFT_RESET':
      // Player inactive >7 days - check once per day
      return config.softResetCheckInterval * 60 * 1000;

    case 'JUST_PLAYED': {
      // Just detected match - aggressive 30min checking for 2 hours
      const timeSinceMatch = Date.now() - new Date(state.stateEnteredAt).getTime();
      if (timeSinceMatch < config.justPlayedDuration * 60 * 1000) {
        return config.justPlayedCheckInterval * 60 * 1000;
      }
      // After 2 hours, transition to appropriate state based on current time
      const nextState = isActiveHour ? 'ACTIVE_SESSION' : 'INACTIVE';
      this.transitionState(user, nextState);
      // Calculate cooldown for new state without recursion
      return isActiveHour
        ? config.activeSessionCheckInterval * 60 * 1000
        : config.inactiveCheckInterval * 60 * 1000;
    }

    case 'ACTIVE_SESSION':
      // In active hours - check every 30min for up to 4 checks
      if (state.consecutiveNoMatchChecks < config.maxActiveSessionChecks) {
        return config.activeSessionCheckInterval * 60 * 1000;
      }
      // After 4 failed checks, back off to cooldown
      this.transitionState(user, 'COOLDOWN', false);
      return config.inactiveCheckInterval * 60 * 1000;

    case 'COOLDOWN':
      // Backed off during active hours - check if we've left active window
      if (!isActiveHour) {
        this.transitionState(user, 'INACTIVE');
      }
      return config.inactiveCheckInterval * 60 * 1000;

    case 'INACTIVE':
    default:
      // Outside active hours - check if we've entered active window
      if (isActiveHour) {
        this.transitionState(user, 'ACTIVE_SESSION');
        return config.activeSessionCheckInterval * 60 * 1000;
      }
      return config.inactiveCheckInterval * 60 * 1000;
    }
  }

  /**
   * Sleep utility function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manually trigger a check for a specific user
   * @param {string} discordUserId - Discord user ID
   */
  async manualCheck(discordUserId) {
    const userLinks = loadUserLinks();
    const linkData = userLinks[discordUserId];

    if (!linkData) {
      throw new Error('User not linked');
    }

    await this.checkUserMatches(discordUserId, linkData.steam64Id);
  }

  /**
   * Get tracking status for all users
   * @returns {Object} Tracking status
   */
  getTrackingStatus() {
    return {
      isTracking: this.checkInterval !== null,
      trackedUserCount: Object.keys(this.trackedUsers).length,
      checkInterval: CHECK_INTERVAL / 1000 / 60 + ' minutes',
      trackedUsers: this.trackedUsers,
    };
  }
}

module.exports = new MatchTracker();
