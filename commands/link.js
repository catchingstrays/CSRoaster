const { EmbedBuilder } = require('discord.js');
const leetifyApi = require('../services/leetifyApi');
const cs2RoastGenerator = require('../utils/cs2RoastGenerator');
const matchTracker = require('../services/matchTracker');
const { loadUserLinks, linkUserToGuild, isUserLinkedInGuild } = require('../utils/userLinksManager');
const { isGuildConfigured, getGuildConfig } = require('../utils/guildConfigManager');

module.exports = {
  name: 'link',
  description: 'Link a Discord user to their Steam64 ID',
  usage: '!link <steam64_id> OR (Admin only) !link <@user> <steam64_id>',

  async execute(message, args) {
    // Check if guild is configured
    if (!isGuildConfigured(message.guild.id)) {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Server Not Configured')
        .setDescription('This server needs to be configured before users can link their accounts!')
        .addFields({
          name: 'Setup Required',
          value: 'An admin needs to run `!setup <#channel>` to set the roast channel first.',
        });
      return message.reply({ embeds: [embed] });
    }

    const ADMIN_ID = '945415570281603103'; // Admin who can link others
    const isAdmin = message.author.id === ADMIN_ID;

    if (args.length < 1) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Missing Arguments')
        .setDescription(isAdmin
          ? 'Please provide a Steam64 ID or mention a user with their Steam64 ID!'
          : 'Please provide your Steam64 ID!')
        .addFields(
          { name: 'Usage', value: isAdmin
            ? '`!link <steam64_id>` (link yourself)\n`!link <@user> <steam64_id>` (link others)'
            : '`!link <steam64_id>`' },
          { name: 'Example', value: isAdmin
            ? '`!link 76561198123456789`\n`!link @JohnDoe 76561198123456789`'
            : '`!link 76561198123456789`' },
          { name: 'Find your Steam64 ID', value: '[steamid.io](https://steamid.io/)' },
        );
      return message.reply({ embeds: [embed] });
    }

    // Parse arguments based on whether user is admin
    let targetUser;
    let steam64Id;

    // Check if first argument is a mention (admin only)
    const mention = message.mentions.users.first();

    if (mention) {
      // User mentioned someone - must be admin
      if (!isAdmin) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Permission Denied')
          .setDescription('You can only link yourself! Just use `!link <steam64_id>`');
        return message.reply({ embeds: [embed] });
      }

      // Admin linking someone else
      if (args.length < 2) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Missing Steam64 ID')
          .setDescription('Please provide the Steam64 ID after mentioning the user!')
          .addFields({ name: 'Usage', value: '`!link <@user> <steam64_id>`' });
        return message.reply({ embeds: [embed] });
      }

      targetUser = mention;
      steam64Id = args[1];
    } else {
      // No mention - user linking themselves
      targetUser = message.author;
      steam64Id = args[0];
    }

    // Validate Steam64 ID format
    if (!/^7656119\d{10}$/.test(steam64Id)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Invalid Steam64 ID')
        .setDescription('It should be a 17-digit number starting with 7656119.')
        .addFields({ name: 'Find your Steam64 ID', value: '[steamid.io](https://steamid.io/)' });
      return message.reply({ embeds: [embed] });
    }

    // Check if user is already linked in this guild
    const alreadyLinked = isUserLinkedInGuild(targetUser.id, message.guild.id);

    // Save the link (guild-specific)
    if (!linkUserToGuild(targetUser.id, message.guild.id, steam64Id, targetUser.username, message.author.id)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Error')
        .setDescription('Failed to save the link. Please try again.');
      return message.reply({ embeds: [embed] });
    }

    // If user was already linked, just confirm
    if (alreadyLinked) {
      const userLinks = loadUserLinks();
      const userData = userLinks[targetUser.id];

      // Check if Steam ID changed
      if (userData.steam64Id !== steam64Id) {
        // Update Steam ID for all guilds
        userData.steam64Id = steam64Id;
        const { saveUserLinks } = require('../utils/userLinksManager');
        saveUserLinks(userLinks);

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Link Updated')
          .setDescription(`Updated Steam64 ID for ${targetUser} to: \`${steam64Id}\``);
        return message.reply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Already Linked')
          .setDescription(`${targetUser} is already linked to Steam64 ID: \`${steam64Id}\` in this server.`);
        return message.reply({ embeds: [embed] });
      }
    }

    // Send initial success message
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Link Successful')
      .setDescription(`Successfully linked ${targetUser} to Steam64 ID: \`${steam64Id}\``)
      .addFields({ name: 'Status', value: 'Fetching stats for initial roast...' });
    const linkMsg = await message.reply({ embeds: [embed] });

    // Fetch stats and send initial roast
    try {
      const profileData = await leetifyApi.getProfile(steam64Id);
      const stats = cs2RoastGenerator.calculateStatsFromProfile(profileData);
      const playerName = profileData.name || 'Unknown Player';
      const currentMatchCount = profileData.total_matches || 0;

      // Initialize tracking for this user immediately
      matchTracker.trackedUsers[targetUser.id] = {
        steam64Id: steam64Id,
        lastMatchCount: currentMatchCount,
        lastChecked: new Date().toISOString(),
        lastStats: stats,
        lastMatchUpdate: null, // No cooldown on initial link
      };
      matchTracker.saveTrackerData();

      // Generate roast (no previous stats for first roast)
      const roasts = cs2RoastGenerator.generateRoastsWithComparison(stats, null);
      const selectedRoast = roasts[Math.floor(Math.random() * roasts.length)];

      // Build roast message (plain text, no embed)
      let roastMessage = `${targetUser}, ${selectedRoast}`;
      roastMessage += '\n-# [Data Provided by Leetify](<https://leetify.com/>)';
      if (steam64Id) {
        roastMessage += ` • [Steam Profile](<https://steamcommunity.com/profiles/${steam64Id}>)`;
      }

      // Get the configured roast channel and send the roast there
      const guildConfig = getGuildConfig(message.guild.id);
      const roastChannel = await message.guild.channels.fetch(guildConfig.roastChannelId).catch(() => null);

      if (roastChannel) {
        await roastChannel.send(roastMessage);
      } else {
        // Fallback: send to command channel if roast channel not found
        await message.channel.send(roastMessage);
      }

      // Update the link message with embed
      const successEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Link Successful')
        .setDescription(`Successfully linked ${targetUser} to Steam64 ID: \`${steam64Id}\``)
        .addFields(
          { name: 'Player', value: playerName },
          { name: 'Matches Tracked', value: currentMatchCount.toString() },
          { name: 'Status', value: 'Initial roast sent! Automatic tracking is now active.' },
        );
      await linkMsg.edit({ embeds: [successEmbed] });

      console.log(`[LINK] Linked ${targetUser.username} (${targetUser.id}) - ${currentMatchCount} matches, stats saved`);
    } catch (error) {
      console.error('Error fetching stats for initial roast:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Link Successful (Stats Error)')
        .setDescription(`Successfully linked ${targetUser} to Steam64 ID: \`${steam64Id}\``)
        .addFields(
          { name: 'Error', value: error.message },
          { name: 'Status', value: 'Automatic tracking will start on next check cycle.' },
        );
      await linkMsg.edit({ embeds: [errorEmbed] });
    }
  },

};
