const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const leetifyApi = require('../services/leetifyApi');
const cs2RoastGenerator = require('../utils/cs2RoastGenerator');
const matchTracker = require('../services/matchTracker');
const { loadUserLinks, linkUserToGuild, isUserLinkedInGuild } = require('../utils/userLinksManager');
const { isGuildConfigured, getGuildConfig } = require('../utils/guildConfigManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link a Discord user to their Steam64 ID')
    .addStringOption(option =>
      option
        .setName('steam64_id')
        .setDescription('Your Steam64 ID (find it at steamid.io)')
        .setRequired(true))
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('(Admin only) User to link')
        .setRequired(false)),

  async execute(interaction) {
    // Check if guild is configured
    if (!isGuildConfigured(interaction.guild.id)) {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Server Not Configured')
        .setDescription('This server needs to be configured before users can link their accounts!')
        .addFields({
          name: 'Setup Required',
          value: 'An admin needs to run `/setup channel` to set the roast channel first.',
        });
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    // Check if user has Administrator permission in this server
    const isAdmin = interaction.member.permissions.has('Administrator');
    const mentionedUser = interaction.options.getUser('user');
    const steam64Id = interaction.options.getString('steam64_id');

    // Determine target user
    let targetUser;
    if (mentionedUser) {
      // User mentioned someone - must be admin
      if (!isAdmin) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Permission Denied')
          .setDescription('Only administrators can link other users!')
          .addFields({
            name: 'What you can do',
            value: 'You can only link yourself using `/link steam64_id:YOUR_ID`',
          });
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
      }
      targetUser = mentionedUser;
    } else {
      // No mention - user linking themselves
      targetUser = interaction.user;
    }

    // Validate Steam64 ID format
    if (!/^7656119\d{10}$/.test(steam64Id)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Invalid Steam64 ID')
        .setDescription('The Steam64 ID should be a 17-digit number starting with 7656119.')
        .addFields({ name: 'Find your Steam64 ID', value: '[steamid.io](https://steamid.io/)' });
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    // Check if user is already linked in this guild
    const alreadyLinked = isUserLinkedInGuild(targetUser.id, interaction.guild.id);

    // Save the link (guild-specific)
    if (!linkUserToGuild(targetUser.id, interaction.guild.id, steam64Id, targetUser.username, interaction.user.id)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Error')
        .setDescription('Failed to save the link. Please try again.');
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
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
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
      } else {
        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Already Linked')
          .setDescription(`${targetUser} is already linked to Steam64 ID: \`${steam64Id}\` in this server.`);
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
      }
    }

    // Defer reply as this will take some time
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

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
      const guildConfig = getGuildConfig(interaction.guild.id);
      const roastChannel = await interaction.guild.channels.fetch(guildConfig.roastChannelId).catch(() => null);

      if (roastChannel) {
        await roastChannel.send(roastMessage);
      } else {
        // Fallback: send to command channel if roast channel not found
        await interaction.channel.send(roastMessage);
      }

      // Update the reply with embed
      const successEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Link Successful')
        .setDescription(`Successfully linked ${targetUser} to Steam64 ID: \`${steam64Id}\``)
        .addFields(
          { name: 'Player', value: playerName },
          { name: 'Matches Tracked', value: currentMatchCount.toString() },
          { name: 'Status', value: 'Initial roast sent! Automatic tracking is now active.' },
        );
      await interaction.editReply({ embeds: [successEmbed] });

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
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
