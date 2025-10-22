const fs = require('fs');
const path = require('path');

const USER_PREFERENCES_PATH = path.join(__dirname, '../data/userPreferences.json');

// Ensure data directory exists
const dataDir = path.dirname(USER_PREFERENCES_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load user preferences from file
 * @returns {Object} User preferences object
 */
function loadUserPreferences() {
  try {
    if (!fs.existsSync(USER_PREFERENCES_PATH)) {
      return {};
    }
    const data = fs.readFileSync(USER_PREFERENCES_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return {};
  }
}

/**
 * Save user preferences to file
 * @param {Object} preferences - User preferences object
 * @returns {boolean} Success status
 */
function saveUserPreferences(preferences) {
  try {
    fs.writeFileSync(USER_PREFERENCES_PATH, JSON.stringify(preferences, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return false;
  }
}

/**
 * Enable DM roasts for a user
 * @param {string} discordUserId - Discord user ID
 * @returns {boolean} Success status
 */
function enableDMRoasts(discordUserId) {
  const preferences = loadUserPreferences();

  if (!preferences[discordUserId]) {
    preferences[discordUserId] = {};
  }

  preferences[discordUserId].dmRoastsEnabled = true;
  preferences[discordUserId].dmEnabledAt = new Date().toISOString();

  return saveUserPreferences(preferences);
}

/**
 * Disable DM roasts for a user
 * @param {string} discordUserId - Discord user ID
 * @returns {boolean} Success status
 */
function disableDMRoasts(discordUserId) {
  const preferences = loadUserPreferences();

  if (!preferences[discordUserId]) {
    preferences[discordUserId] = {};
  }

  preferences[discordUserId].dmRoastsEnabled = false;
  preferences[discordUserId].dmDisabledAt = new Date().toISOString();

  return saveUserPreferences(preferences);
}

/**
 * Check if DM roasts are enabled for a user
 * @param {string} discordUserId - Discord user ID
 * @returns {boolean} Whether DM roasts are enabled
 */
function isDMRoastsEnabled(discordUserId) {
  const preferences = loadUserPreferences();
  const userPrefs = preferences[discordUserId];

  if (!userPrefs) {
    return false;
  }

  return userPrefs.dmRoastsEnabled === true;
}

/**
 * Get user preferences
 * @param {string} discordUserId - Discord user ID
 * @returns {Object|null} User preferences or null if not found
 */
function getUserPreferences(discordUserId) {
  const preferences = loadUserPreferences();
  return preferences[discordUserId] || null;
}

module.exports = {
  loadUserPreferences,
  saveUserPreferences,
  enableDMRoasts,
  disableDMRoasts,
  isDMRoastsEnabled,
  getUserPreferences,
};
