const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Deploy global slash commands with user install support
 * @returns {Promise<boolean>} Success status
 */
async function deployGlobalCommands() {
  try {
    const commands = [];
    const commandsPath = path.join(__dirname, '../slashCommands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    // Load all slash command data
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if ('data' in command && 'execute' in command) {
        const commandData = command.data.toJSON();

        // Add integration_types and contexts for user-installable apps
        // Since Discord.js builders don't support this yet, we add it manually

        // Determine if command should be user-installable based on metadata
        const isUserInstallable = command.userInstallable !== false; // Default to true unless explicitly disabled
        const isGuildOnly = command.guildOnly === true; // Default to false unless explicitly enabled

        if (isGuildOnly) {
          // Guild-only commands (like setup)
          commandData.integration_types = [0]; // GUILD_INSTALL only
          commandData.contexts = [0]; // GUILD only
        } else if (isUserInstallable) {
          // Hybrid commands (works in both guild and user install)
          commandData.integration_types = [0, 1]; // GUILD_INSTALL and USER_INSTALL
          commandData.contexts = [0, 1, 2]; // GUILD, BOT_DM, PRIVATE_CHANNEL
        } else {
          // Default to guild install only
          commandData.integration_types = [0]; // GUILD_INSTALL only
          commandData.contexts = [0]; // GUILD only
        }

        commands.push(commandData);
        console.log(`[GLOBAL DEPLOY] Loaded command: ${commandData.name} (Integration: ${commandData.integration_types}, Contexts: ${commandData.contexts})`);
      } else {
        console.log(`[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
      }
    }

    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(config.token);

    console.log(`[GLOBAL DEPLOY] Started refreshing ${commands.length} global application (/) commands.`);

    // Deploy commands globally
    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );

    console.log(`[GLOBAL DEPLOY] Successfully reloaded ${data.length} global application (/) commands.`);
    console.log(`[GLOBAL DEPLOY] Commands are now available for both guild and user installation.`);
    return true;
  } catch (error) {
    console.error(`[GLOBAL DEPLOY ERROR] Failed to deploy global commands:`, error);
    return false;
  }
}

/**
 * Remove all global slash commands
 * @returns {Promise<boolean>} Success status
 */
async function removeGlobalCommands() {
  try {
    const rest = new REST().setToken(config.token);

    console.log(`[GLOBAL DEPLOY] Removing all global application (/) commands.`);

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: [] },
    );

    console.log(`[GLOBAL DEPLOY] Successfully removed all global commands.`);
    return true;
  } catch (error) {
    console.error(`[GLOBAL DEPLOY ERROR] Failed to remove global commands:`, error);
    return false;
  }
}

module.exports = {
  deployGlobalCommands,
  removeGlobalCommands,
};
