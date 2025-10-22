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

    let checkedCount = 0;
    let skippedCount = 0;

    for (const discordUserId of userIds) {
      const linkData = userLinks[discordUserId];
      const steam64Id = linkData.steam64Id;

      // Check if user is in cooldown
      if (this.isUserInCooldown(discordUserId)) {
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

    console.log(`Finished checking: ${checkedCount} checked, ${skippedCount} skipped (cooldown)`);
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
        this.trackedUsers[discordUserId] = {
          steam64Id: steam64Id,
          lastMatchCount: currentMatchCount,
          lastChecked: new Date().toISOString(),
          lastStats: currentStats, // Store the current stats
          lastMatchUpdate: null, // No match update yet
        };
        this.saveTrackerData();
        console.log(`Started tracking ${profileData.name} - Current matches: ${currentMatchCount}`);
        return;
      }

      const lastMatchCount = this.trackedUsers[discordUserId].lastMatchCount;
      const previousStats = this.trackedUsers[discordUserId].lastStats || null;

      // Check if match count increased
      if (currentMatchCount > lastMatchCount) {
        const newMatches = currentMatchCount - lastMatchCount;
        console.log(`[MATCH] New match detected for ${profileData.name}! (${newMatches} new match${newMatches > 1 ? 'es' : ''})`);

        // Send roast message with stat comparison
        await this.sendRoastMessage(discordUserId, steam64Id, profileData, currentStats, previousStats);

        // Update tracked data with new stats - NO cooldown (they might play more games)
        this.trackedUsers[discordUserId].lastMatchCount = currentMatchCount;
        this.trackedUsers[discordUserId].lastChecked = new Date().toISOString();
        this.trackedUsers[discordUserId].lastStats = currentStats; // Update stored stats
        this.trackedUsers[discordUserId].lastMatchUpdate = null; // Clear cooldown - they might play another game
        this.saveTrackerData();

        console.log(`[NO COOLDOWN] ${profileData.name} - no cooldown applied (might play more games)`);
      } else {
        // No new match - apply cooldown to avoid spamming API
        this.trackedUsers[discordUserId].lastChecked = new Date().toISOString();
        this.trackedUsers[discordUserId].lastMatchUpdate = new Date().toISOString(); // Start 3-hour cooldown
        this.saveTrackerData();
        console.log(`[COOLDOWN] ${profileData.name} - no new match, cooldown applied for 3 hours`);
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
