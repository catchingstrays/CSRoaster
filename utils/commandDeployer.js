const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Deploy slash commands to a specific guild
 * @param {string} guildId - Guild ID to deploy commands to
 * @returns {Promise<boolean>} Success status
 */
async function deployCommandsToGuild(guildId) {
  try {
    const commands = [];
    const commandsPath = path.join(__dirname, '../slashCommands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    // Load all slash command data
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      } else {
        console.log(`[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
      }
    }

    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(config.token);

    console.log(`[DEPLOY] Started refreshing ${commands.length} application (/) commands for guild ${guildId}.`);

    // Deploy commands to the specific guild
    const data = await rest.put(
      Routes.applicationGuildCommands(config.clientId, guildId),
      { body: commands },
    );

    console.log(`[DEPLOY] Successfully reloaded ${data.length} application (/) commands for guild ${guildId}.`);
    return true;
  } catch (error) {
    console.error(`[DEPLOY ERROR] Failed to deploy commands to guild ${guildId}:`, error);
    return false;
  }
}

/**
 * Deploy slash commands to all guilds the bot is in
 * @param {Client} client - Discord client instance
 * @returns {Promise<Object>} Statistics about deployment
 */
async function deployCommandsToAllGuilds(client) {
  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    guilds: [],
  };

  try {
    const guilds = await client.guilds.fetch();
    stats.total = guilds.size;

    console.log(`[DEPLOY] Deploying commands to ${guilds.size} guild(s)...`);

    for (const [guildId, guild] of guilds) {
      const success = await deployCommandsToGuild(guildId);

      if (success) {
        stats.success++;
        stats.guilds.push({ id: guildId, name: guild.name, status: 'success' });
      } else {
        stats.failed++;
        stats.guilds.push({ id: guildId, name: guild.name, status: 'failed' });
      }
    }

    console.log(`[DEPLOY] Deployment complete: ${stats.success} succeeded, ${stats.failed} failed`);
    return stats;
  } catch (error) {
    console.error('[DEPLOY ERROR] Failed to deploy commands to all guilds:', error);
    return stats;
  }
}

/**
 * Remove all slash commands from a specific guild
 * @param {string} guildId - Guild ID to remove commands from
 * @returns {Promise<boolean>} Success status
 */
async function removeCommandsFromGuild(guildId) {
  try {
    const rest = new REST().setToken(config.token);

    console.log(`[DEPLOY] Removing all application (/) commands from guild ${guildId}.`);

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, guildId),
      { body: [] },
    );

    console.log(`[DEPLOY] Successfully removed all commands from guild ${guildId}.`);
    return true;
  } catch (error) {
    console.error(`[DEPLOY ERROR] Failed to remove commands from guild ${guildId}:`, error);
    return false;
  }
}

module.exports = {
  deployCommandsToGuild,
  deployCommandsToAllGuilds,
  removeCommandsFromGuild,
};
