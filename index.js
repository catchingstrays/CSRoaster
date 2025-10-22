require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const matchTracker = require('./services/matchTracker');
const { deleteGuildConfig } = require('./utils/guildConfigManager');
const { removeGuildFromAllUsers } = require('./utils/userLinksManager');
const { deployCommandsToGuild, removeCommandsFromGuild } = require('./utils/commandDeployer');
const {
  trackGuild,
  markCommandsDeployed,
  markOnboardingComplete,
  untrackGuild,
  detectNewGuilds,
  getGuildsNeedingOnboarding,
} = require('./utils/guildTracker');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize slash commands collection
client.slashCommands = new Collection();

// Load slash commands from slashCommands directory
const slashCommandsPath = path.join(__dirname, 'slashCommands');
const slashCommandFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));

for (const file of slashCommandFiles) {
  const filePath = path.join(slashCommandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.slashCommands.set(command.data.name, command);
    console.log(`[COMMAND] Loaded slash command: ${command.data.name}`);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
  }
}

/**
 * Send onboarding/welcome message to a guild
 * @param {Guild} guild - Discord guild object
 */
async function sendOnboardingMessage(guild) {
  try {
    // Find a suitable channel to send welcome message
    const channels = await guild.channels.fetch();
    const textChannel = channels.find(
      channel => channel.isTextBased() &&
                 channel.permissionsFor(guild.members.me).has('SendMessages'),
    );

    if (!textChannel) {
      console.log(`[ONBOARDING] No suitable channel found in ${guild.name} to send welcome message`);
      return false;
    }

    // Send welcome embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Thanks for adding CS2 Roaster Bot!')
      .setDescription('I automatically roast CS2 players based on their match statistics.')
      .addFields(
        {
          name: 'Step 1: Setup',
          value: 'An admin needs to run `/setup channel` to set the channel where roasts will be posted.\n' +
                 'Example: `/setup channel #roasts`',
        },
        {
          name: 'Step 2: Link Accounts',
          value: 'Users can link their Steam accounts using `/link`\n' +
                 'Find your Steam64 ID at: https://steamid.io/',
        },
        {
          name: 'Step 3: Get Roasted!',
          value: 'After linking, when you finish a CS2 match, your stats will be automatically analyzed and roasted in the configured channel!',
        },
        {
          name: 'Other Commands',
          value: '`/stats [@user]` - View stored stats\n' +
                 '`/tracker status` - View tracker status\n' +
                 '`/setup status` - View current setup',
        },
      );

    await textChannel.send({ embeds: [embed] });
    console.log(`[ONBOARDING] Sent welcome message to ${textChannel.name} in ${guild.name}`);

    // Mark onboarding as complete
    markOnboardingComplete(guild.id);
    return true;
  } catch (error) {
    console.error(`[ONBOARDING ERROR] Failed to send welcome message to ${guild.name}:`, error);
    return false;
  }
}

/**
 * Process guilds that need onboarding
 * @param {Client} client - Discord client instance
 */
async function processOnboarding(client) {
  const guildsNeedingOnboarding = getGuildsNeedingOnboarding();

  if (guildsNeedingOnboarding.length === 0) {
    return;
  }

  console.log(`[ONBOARDING] Processing ${guildsNeedingOnboarding.length} guild(s) needing onboarding...`);

  for (const guildId of guildsNeedingOnboarding) {
    try {
      const guild = await client.guilds.fetch(guildId);
      await sendOnboardingMessage(guild);
    } catch (error) {
      console.error(`[ONBOARDING ERROR] Failed to process onboarding for guild ${guildId}:`, error);
    }
  }
}

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Bot is ready to roast some CS2 players!');
  client.user.setActivity('CS2 players', { type: 'WATCHING' });

  // Detect new guilds that joined while bot was offline
  console.log('[STARTUP] Checking for new guilds joined while offline...');
  const newGuilds = await detectNewGuilds(client);

  if (newGuilds.length > 0) {
    console.log(`[STARTUP] Detected ${newGuilds.length} new guild(s) joined while offline:`);
    for (const guild of newGuilds) {
      console.log(`  - ${guild.name} (${guild.id})`);
    }

    // Deploy commands to new guilds
    for (const guild of newGuilds) {
      console.log(`[STARTUP] Deploying commands to new guild: ${guild.name}`);
      const success = await deployCommandsToGuild(guild.id);
      if (success) {
        markCommandsDeployed(guild.id);
      }
    }
  } else {
    console.log('[STARTUP] No new guilds detected.');
  }

  // Process any guilds that need onboarding
  await processOnboarding(client);

  // Initialize and start automatic match tracking
  matchTracker.initialize(client);
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = client.slashCommands.get(interaction.commandName);

  if (!command) {
    console.error(`[ERROR] No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[ERROR] Error executing command ${interaction.commandName}:`, error);

    const errorMessage = {
      content: 'There was an error executing that command. Maybe I roasted myself too hard?',
      flags: [MessageFlags.Ephemeral],
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Handle bot joining a new guild
client.on('guildCreate', async (guild) => {
  console.log(`[GUILD JOIN] Joined new guild: ${guild.name} (${guild.id})`);

  // Track the guild
  trackGuild(guild.id, guild.name, true);

  // Deploy slash commands to the new guild
  console.log(`[GUILD JOIN] Deploying slash commands to ${guild.name}...`);
  const success = await deployCommandsToGuild(guild.id);

  if (success) {
    markCommandsDeployed(guild.id);
    console.log(`[GUILD JOIN] Commands deployed successfully to ${guild.name}`);

    // Send onboarding message
    await sendOnboardingMessage(guild);
  } else {
    console.error(`[GUILD JOIN] Failed to deploy commands to ${guild.name}`);
  }
});

// Handle bot being removed from a guild
client.on('guildDelete', async (guild) => {
  console.log(`[GUILD LEAVE] Removed from guild: ${guild.name} (${guild.id})`);

  try {
    // Remove slash commands from the guild (cleanup)
    await removeCommandsFromGuild(guild.id);

    // Delete guild configuration
    deleteGuildConfig(guild.id);
    console.log(`[GUILD LEAVE] Deleted configuration for guild ${guild.id}`);

    // Remove guild from all user links
    removeGuildFromAllUsers(guild.id);
    console.log(`[GUILD LEAVE] Removed guild ${guild.id} from all user links`);

    // Untrack the guild
    untrackGuild(guild.id);
    console.log(`[GUILD LEAVE] Untracked guild ${guild.id}`);
  } catch (error) {
    console.error(`[GUILD LEAVE ERROR] Error cleaning up data for guild ${guild.id}:`, error);
  }
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  matchTracker.stopTracking();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  matchTracker.stopTracking();
  client.destroy();
  process.exit(0);
});

// Login to Discord
client.login(config.token).catch((error) => {
  console.error('Failed to login to Discord:', error);
  process.exit(1);
});
