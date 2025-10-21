require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const config = require('./config');
const linkCommand = require('./commands/link');
const trackerCommand = require('./commands/tracker');
const statsCommand = require('./commands/stats');
const setupCommand = require('./commands/setup');
const matchTracker = require('./services/matchTracker');
const { deleteGuildConfig } = require('./utils/guildConfigManager');
const { removeGuildFromAllUsers } = require('./utils/userLinksManager');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize commands collection
client.commands = new Collection();
client.commands.set('link', linkCommand);
client.commands.set('tracker', trackerCommand);
client.commands.set('stats', statsCommand);
client.commands.set('setup', setupCommand);

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Bot is ready to roast some CS2 players!');
  client.user.setActivity('CS2 players', { type: 'WATCHING' });

  // Initialize and start automatic match tracking
  matchTracker.initialize(client);
  console.log('Automatic match tracking started - checking every 1 hour');
});

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) {
    return;
  }

  // Check if message starts with prefix
  if (!message.content.startsWith(config.prefix)) {
    return;
  }

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);

  if (!command) {
    return;
  }

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    message.reply('There was an error executing that command. Maybe I roasted myself too hard?');
  }
});

// Handle bot joining a new guild
client.on('guildCreate', async (guild) => {
  console.log(`Joined new guild: ${guild.name} (${guild.id})`);

  try {
    // Find a suitable channel to send welcome message
    const channels = await guild.channels.fetch();
    const textChannel = channels.find(
      channel => channel.isTextBased() &&
                 channel.permissionsFor(guild.members.me).has('SendMessages'),
    );

    if (!textChannel) {
      console.log(`No suitable channel found in ${guild.name} to send welcome message`);
      return;
    }

    // Send welcome embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Thanks for adding CS2 Roaster Bot!')
      .setDescription('I automatically roast CS2 players based on their match statistics.')
      .addFields(
        {
          name: 'Step 1: Setup',
          value: `An admin needs to run \`${config.prefix}setup <#channel>\` to set the channel where roasts will be posted.\n` +
                 `Example: \`${config.prefix}setup #roasts\``,
        },
        {
          name: 'Step 2: Link Accounts',
          value: `Users can link their Steam accounts using \`${config.prefix}link <steam64_id>\`\n` +
                 'Find your Steam64 ID at: https://steamid.io/',
        },
        {
          name: 'Step 3: Get Roasted!',
          value: 'After linking, when you finish a CS2 match, your stats will be automatically analyzed and roasted in the configured channel!',
        },
        {
          name: 'Other Commands',
          value: `\`${config.prefix}stats [@user]\` - View stored stats\n` +
                 `\`${config.prefix}tracker status\` - View tracker status\n` +
                 `\`${config.prefix}setup status\` - View current setup`,
        },
      );

    await textChannel.send({ embeds: [embed] });
    console.log(`Sent welcome message to ${textChannel.name} in ${guild.name}`);
  } catch (error) {
    console.error(`Error sending welcome message to ${guild.name}:`, error);
  }
});

// Handle bot being removed from a guild
client.on('guildDelete', (guild) => {
  console.log(`Removed from guild: ${guild.name} (${guild.id})`);

  try {
    // Delete guild configuration
    deleteGuildConfig(guild.id);
    console.log(`Deleted configuration for guild ${guild.id}`);

    // Remove guild from all user links
    removeGuildFromAllUsers(guild.id);
    console.log(`Removed guild ${guild.id} from all user links`);
  } catch (error) {
    console.error(`Error cleaning up data for guild ${guild.id}:`, error);
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
