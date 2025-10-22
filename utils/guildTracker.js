const fs = require('fs');
const path = require('path');

const GUILD_TRACKER_PATH = path.join(__dirname, '../data/guilds.json');

/**
 * Ensure the guild tracker file exists
 */
function ensureGuildTrackerFile() {
  const dataDir = path.dirname(GUILD_TRACKER_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(GUILD_TRACKER_PATH)) {
    fs.writeFileSync(GUILD_TRACKER_PATH, JSON.stringify({ guilds: {} }, null, 2));
  }
}

/**
 * Load guild tracker data
 * @returns {Object} Guild tracker data
 */
function loadGuildTracker() {
  try {
    ensureGuildTrackerFile();
    const data = fs.readFileSync(GUILD_TRACKER_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading guild tracker:', error);
    return { guilds: {} };
  }
}

/**
 * Save guild tracker data
 * @param {Object} data - Guild tracker data to save
 * @returns {boolean} Success status
 */
function saveGuildTracker(data) {
  try {
    ensureGuildTrackerFile();
    fs.writeFileSync(GUILD_TRACKER_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving guild tracker:', error);
    return false;
  }
}

/**
 * Add or update a guild in the tracker
 * @param {string} guildId - Guild ID
 * @param {string} guildName - Guild name
 * @param {boolean} isNew - Whether this is a new guild
 * @returns {boolean} Success status
 */
function trackGuild(guildId, guildName, isNew = false) {
  try {
    const data = loadGuildTracker();

    if (!data.guilds[guildId]) {
      data.guilds[guildId] = {
        id: guildId,
        name: guildName,
        joinedAt: new Date().toISOString(),
        commandsDeployed: false,
        onboardingComplete: false,
      };
    } else {
      // Update guild name if it changed
      data.guilds[guildId].name = guildName;
      data.guilds[guildId].lastSeen = new Date().toISOString();
    }

    if (isNew) {
      data.guilds[guildId].isNew = true;
    }

    saveGuildTracker(data);
    return true;
  } catch (error) {
    console.error('Error tracking guild:', error);
    return false;
  }
}

/**
 * Mark guild commands as deployed
 * @param {string} guildId - Guild ID
 * @returns {boolean} Success status
 */
function markCommandsDeployed(guildId) {
  try {
    const data = loadGuildTracker();

    if (data.guilds[guildId]) {
      data.guilds[guildId].commandsDeployed = true;
      data.guilds[guildId].commandsDeployedAt = new Date().toISOString();
      saveGuildTracker(data);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error marking commands deployed:', error);
    return false;
  }
}

/**
 * Mark guild onboarding as complete
 * @param {string} guildId - Guild ID
 * @returns {boolean} Success status
 */
function markOnboardingComplete(guildId) {
  try {
    const data = loadGuildTracker();

    if (data.guilds[guildId]) {
      data.guilds[guildId].onboardingComplete = true;
      data.guilds[guildId].onboardingCompletedAt = new Date().toISOString();
      delete data.guilds[guildId].isNew; // Remove new flag
      saveGuildTracker(data);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error marking onboarding complete:', error);
    return false;
  }
}

/**
 * Remove a guild from the tracker
 * @param {string} guildId - Guild ID
 * @returns {boolean} Success status
 */
function untrackGuild(guildId) {
  try {
    const data = loadGuildTracker();

    if (data.guilds[guildId]) {
      delete data.guilds[guildId];
      saveGuildTracker(data);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error untracking guild:', error);
    return false;
  }
}

/**
 * Get all tracked guilds
 * @returns {Object} All tracked guilds
 */
function getAllTrackedGuilds() {
  const data = loadGuildTracker();
  return data.guilds;
}

/**
 * Get guilds that need command deployment
 * @returns {Array} Array of guild IDs that need commands deployed
 */
function getGuildsNeedingCommands() {
  const data = loadGuildTracker();
  const needingCommands = [];

  for (const [guildId, guildData] of Object.entries(data.guilds)) {
    if (!guildData.commandsDeployed) {
      needingCommands.push(guildId);
    }
  }

  return needingCommands;
}

/**
 * Get guilds that need onboarding
 * @returns {Array} Array of guild IDs that need onboarding
 */
function getGuildsNeedingOnboarding() {
  const data = loadGuildTracker();
  const needingOnboarding = [];

  for (const [guildId, guildData] of Object.entries(data.guilds)) {
    if (guildData.isNew && !guildData.onboardingComplete) {
      needingOnboarding.push(guildId);
    }
  }

  return needingOnboarding;
}

/**
 * Detect new guilds that bot joined while offline
 * @param {Client} client - Discord client instance
 * @returns {Array} Array of new guild IDs
 */
async function detectNewGuilds(client) {
  try {
    const trackedGuilds = getAllTrackedGuilds();
    const currentGuilds = await client.guilds.fetch();
    const newGuilds = [];

    for (const [guildId, guild] of currentGuilds) {
      if (!trackedGuilds[guildId]) {
        newGuilds.push({
          id: guildId,
          name: guild.name,
        });
        // Track the guild as new
        trackGuild(guildId, guild.name, true);
      } else {
        // Update last seen and name
        trackGuild(guildId, guild.name, false);
      }
    }

    return newGuilds;
  } catch (error) {
    console.error('Error detecting new guilds:', error);
    return [];
  }
}

module.exports = {
  trackGuild,
  markCommandsDeployed,
  markOnboardingComplete,
  untrackGuild,
  getAllTrackedGuilds,
  getGuildsNeedingCommands,
  getGuildsNeedingOnboarding,
  detectNewGuilds,
};
