const fs = require('fs');
const path = require('path');

const USER_LINKS_PATH = path.join(__dirname, '../data/userLinks.json');

// Ensure data directory exists
const dataDir = path.dirname(USER_LINKS_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load user links from file
 * @returns {Object} User links object
 */
function loadUserLinks() {
  try {
    if (!fs.existsSync(USER_LINKS_PATH)) {
      return {};
    }
    const data = fs.readFileSync(USER_LINKS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading user links:', error);
    return {};
  }
}

/**
 * Save user links to file
 * @param {Object} links - User links object
 * @returns {boolean} Success status
 */
function saveUserLinks(links) {
  try {
    fs.writeFileSync(USER_LINKS_PATH, JSON.stringify(links, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving user links:', error);
    return false;
  }
}

/**
 * Link a user to a guild
 * @param {string} discordUserId - Discord user ID
 * @param {string} guildId - Guild ID
 * @param {string} steam64Id - Steam64 ID
 * @param {string} username - Discord username
 * @param {string} linkedBy - Discord ID of who linked them
 * @returns {boolean} Success status
 */
function linkUserToGuild(discordUserId, guildId, steam64Id, username, linkedBy) {
  const userLinks = loadUserLinks();

  // Initialize user data if not exists
  if (!userLinks[discordUserId]) {
    userLinks[discordUserId] = {
      steam64Id: steam64Id,
      username: username,
      guilds: [],
      linkedAt: new Date().toISOString(),
      linkedBy: linkedBy,
    };
  }

  // Add guild to user's guilds array if not already present
  if (!userLinks[discordUserId].guilds.includes(guildId)) {
    userLinks[discordUserId].guilds.push(guildId);
  }

  // Update username in case it changed
  userLinks[discordUserId].username = username;

  return saveUserLinks(userLinks);
}

/**
 * Unlink a user from a specific guild
 * @param {string} discordUserId - Discord user ID
 * @param {string} guildId - Guild ID
 * @returns {boolean} Success status
 */
function unlinkUserFromGuild(discordUserId, guildId) {
  const userLinks = loadUserLinks();

  if (!userLinks[discordUserId]) {
    return true; // Nothing to unlink
  }

  // Remove guild from user's guilds array
  userLinks[discordUserId].guilds = userLinks[discordUserId].guilds.filter(
    id => id !== guildId,
  );

  // If user has no more guilds, delete the entire user entry
  if (userLinks[discordUserId].guilds.length === 0) {
    delete userLinks[discordUserId];
  }

  return saveUserLinks(userLinks);
}

/**
 * Remove a guild from all user links
 * @param {string} guildId - Guild ID to remove
 * @returns {boolean} Success status
 */
function removeGuildFromAllUsers(guildId) {
  const userLinks = loadUserLinks();
  let modified = false;

  for (const [userId, userData] of Object.entries(userLinks)) {
    if (userData.guilds && userData.guilds.includes(guildId)) {
      userData.guilds = userData.guilds.filter(id => id !== guildId);
      modified = true;

      // If user has no more guilds, delete the entire user entry
      if (userData.guilds.length === 0) {
        delete userLinks[userId];
      }
    }
  }

  return modified ? saveUserLinks(userLinks) : true;
}

/**
 * Get all users linked in a specific guild
 * @param {string} guildId - Guild ID
 * @returns {Object} Users linked in this guild
 */
function getUsersInGuild(guildId) {
  const userLinks = loadUserLinks();
  const guildUsers = {};

  for (const [userId, userData] of Object.entries(userLinks)) {
    if (userData.guilds && userData.guilds.includes(guildId)) {
      guildUsers[userId] = userData;
    }
  }

  return guildUsers;
}

/**
 * Check if a user is linked in a specific guild
 * @param {string} discordUserId - Discord user ID
 * @param {string} guildId - Guild ID
 * @returns {boolean} Whether user is linked in this guild
 */
function isUserLinkedInGuild(discordUserId, guildId) {
  const userLinks = loadUserLinks();
  const userData = userLinks[discordUserId];

  if (!userData || !userData.guilds) {
    return false;
  }

  return userData.guilds.includes(guildId);
}

/**
 * Get all guilds where a user is linked
 * @param {string} discordUserId - Discord user ID
 * @returns {Array<string>} Array of guild IDs
 */
function getUserGuilds(discordUserId) {
  const userLinks = loadUserLinks();
  const userData = userLinks[discordUserId];

  if (!userData || !userData.guilds) {
    return [];
  }

  return userData.guilds;
}

/**
 * Link a user globally (no guild association)
 * Used for user-install context (DMs)
 * @param {string} discordUserId - Discord user ID
 * @param {string} steam64Id - Steam64 ID
 * @param {string} username - Discord username
 * @returns {boolean} Success status
 */
function linkUserGlobally(discordUserId, steam64Id, username) {
  const userLinks = loadUserLinks();

  // Initialize user data if not exists
  if (!userLinks[discordUserId]) {
    userLinks[discordUserId] = {
      steam64Id: steam64Id,
      username: username,
      guilds: [],
      linkedAt: new Date().toISOString(),
      linkedBy: discordUserId, // Self-linked in DM
      globalLink: true,
    };
  } else {
    // Update existing user data
    userLinks[discordUserId].steam64Id = steam64Id;
    userLinks[discordUserId].username = username;
    userLinks[discordUserId].globalLink = true;
    userLinks[discordUserId].globalLinkedAt = new Date().toISOString();
  }

  return saveUserLinks(userLinks);
}

/**
 * Check if a user has a global link
 * @param {string} discordUserId - Discord user ID
 * @returns {boolean} Whether user has global link
 */
function isUserLinkedGlobally(discordUserId) {
  const userLinks = loadUserLinks();
  const userData = userLinks[discordUserId];

  if (!userData) {
    return false;
  }

  // User is globally linked if they have globalLink flag OR have a steam64Id
  return userData.globalLink === true || !!userData.steam64Id;
}

/**
 * Get user's Steam64 ID (works for both global and guild links)
 * @param {string} discordUserId - Discord user ID
 * @returns {string|null} Steam64 ID or null if not linked
 */
function getUserSteam64Id(discordUserId) {
  const userLinks = loadUserLinks();
  const userData = userLinks[discordUserId];

  if (!userData) {
    return null;
  }

  return userData.steam64Id || null;
}

module.exports = {
  loadUserLinks,
  saveUserLinks,
  linkUserToGuild,
  unlinkUserFromGuild,
  removeGuildFromAllUsers,
  getUsersInGuild,
  isUserLinkedInGuild,
  getUserGuilds,
  linkUserGlobally,
  isUserLinkedGlobally,
  getUserSteam64Id,
};
