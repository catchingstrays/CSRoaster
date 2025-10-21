const fs = require('fs');
const path = require('path');

const GUILD_CONFIGS_PATH = path.join(__dirname, '../data/guildConfigs.json');

// Ensure data directory exists
const dataDir = path.dirname(GUILD_CONFIGS_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load guild configurations from file
 * @returns {Object} Guild configs object
 */
function loadGuildConfigs() {
  try {
    if (!fs.existsSync(GUILD_CONFIGS_PATH)) {
      return {};
    }
    const data = fs.readFileSync(GUILD_CONFIGS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading guild configs:', error);
    return {};
  }
}

/**
 * Save guild configurations to file
 * @param {Object} configs - Guild configs object
 * @returns {boolean} Success status
 */
function saveGuildConfigs(configs) {
  try {
    fs.writeFileSync(GUILD_CONFIGS_PATH, JSON.stringify(configs, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving guild configs:', error);
    return false;
  }
}

/**
 * Get configuration for a specific guild
 * @param {string} guildId - Guild ID
 * @returns {Object|null} Guild config or null if not found
 */
function getGuildConfig(guildId) {
  const configs = loadGuildConfigs();
  return configs[guildId] || null;
}

/**
 * Set roast channel for a guild
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID
 * @returns {boolean} Success status
 */
function setRoastChannel(guildId, channelId) {
  const configs = loadGuildConfigs();

  if (!configs[guildId]) {
    configs[guildId] = {
      roastChannelId: channelId,
      setupAt: new Date().toISOString(),
    };
  } else {
    configs[guildId].roastChannelId = channelId;
    configs[guildId].lastUpdated = new Date().toISOString();
  }

  return saveGuildConfigs(configs);
}

/**
 * Delete guild configuration
 * @param {string} guildId - Guild ID
 * @returns {boolean} Success status
 */
function deleteGuildConfig(guildId) {
  const configs = loadGuildConfigs();
  delete configs[guildId];
  return saveGuildConfigs(configs);
}

/**
 * Get all guild IDs that have configurations
 * @returns {Array<string>} Array of guild IDs
 */
function getAllConfiguredGuilds() {
  const configs = loadGuildConfigs();
  return Object.keys(configs);
}

/**
 * Check if a guild is configured
 * @param {string} guildId - Guild ID
 * @returns {boolean} Whether the guild is configured
 */
function isGuildConfigured(guildId) {
  const config = getGuildConfig(guildId);
  return config !== null && config.roastChannelId !== undefined;
}

module.exports = {
  loadGuildConfigs,
  saveGuildConfigs,
  getGuildConfig,
  setRoastChannel,
  deleteGuildConfig,
  getAllConfiguredGuilds,
  isGuildConfigured,
};
