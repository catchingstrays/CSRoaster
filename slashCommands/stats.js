const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const matchTracker = require('../services/matchTracker');
const { getUsersInGuild, getUserSteam64Id } = require('../utils/userLinksManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View stored stats for a player')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check stats for (defaults to yourself)')
        .setRequired(false)),

  // Mark as user-installable (works in DMs and guilds)
  userInstallable: true,
  guildOnly: false,

  async execute(interaction) {
    const isGuildContext = !!interaction.guild;
    const mentionedUser = interaction.options.getUser('user');
    const targetUser = mentionedUser || interaction.user;

    // Universal stats display - works in both DMs and guilds
    return this.showStats(interaction, targetUser, isGuildContext);
  },

  async showStats(interaction, targetUser, isGuildContext) {
    const targetUserId = targetUser.id;
    let steam64Id;

    // Try to get Steam64 ID from guild link first, then global link
    if (isGuildContext) {
      const guildUsers = getUsersInGuild(interaction.guild.id);
      const linkData = guildUsers[targetUserId];
      if (linkData) {
        steam64Id = linkData.steam64Id;
      }
    }

    // Fall back to global link if no guild link found
    if (!steam64Id) {
      steam64Id = getUserSteam64Id(targetUserId);
    }

    if (!steam64Id) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('User Not Linked')
        .setDescription(
          targetUser.id === interaction.user.id
            ? 'You need to link your account first! Use `/link steam64_id:YOUR_ID`'
            : `${targetUser.username} is not linked${isGuildContext ? ' in this server' : ''}! They need to use \`/link\` first.`
        )
        .addFields({
          name: 'Find your Steam64 ID',
          value: '[steamid.io](https://steamid.io/)',
        });
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    const trackingStatus = matchTracker.getTrackingStatus();
    const trackedData = trackingStatus.trackedUsers[targetUserId];

    if (!trackedData || !trackedData.lastStats) {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('No Stats Available')
        .setDescription('No stats available yet. Wait for the tracker to collect data!');
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    const stats = trackedData.lastStats;
    const lastChecked = new Date(trackedData.lastChecked).toLocaleString();

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Stats for ${targetUser.username}`)
      .setDescription(`**Last updated:** ${lastChecked}\n**Total matches:** ${trackedData.lastMatchCount}`)
      .addFields(
        {
          name: 'Aim & Shooting',
          value: `Aim: ${stats.aimRating.toFixed(1)}\n` +
                 `Accuracy (Head): ${stats.headshotRate.toFixed(1)}%\n` +
                 `Accuracy (Enemy Spotted): ${stats.accuracy.toFixed(1)}%\n` +
                 `Spray Accuracy: ${stats.sprayAccuracy.toFixed(1)}%\n` +
                 `Preaim: ${stats.preaim.toFixed(1)}°\n` +
                 `Reaction Time: ${stats.reactionTime.toFixed(0)}ms`,
          inline: false,
        },
        {
          name: 'Game Sense',
          value: `Positioning: ${stats.positioningRating.toFixed(1)}\n` +
                 `Utility: ${stats.utilityRating.toFixed(1)}\n` +
                 `Counter Strafing Good Shots Ratio: ${stats.counterStrafing.toFixed(1)}%`,
          inline: false,
        },
        {
          name: 'Performance',
          value: `Winrate: ${stats.winRate.toFixed(1)}%\n` +
                 `Clutch: ${stats.clutchDeviation >= 0 ? '+' : ''}${stats.clutchDeviation.toFixed(2)}\n` +
                 `Opening: ${stats.openingDeviation >= 0 ? '+' : ''}${stats.openingDeviation.toFixed(2)}\n` +
                 `CT Leetify: ${stats.ctLeetifyDeviation >= 0 ? '+' : ''}${stats.ctLeetifyDeviation.toFixed(2)}\n` +
                 `T Leetify: ${stats.tLeetifyDeviation >= 0 ? '+' : ''}${stats.tLeetifyDeviation.toFixed(2)}`,
          inline: false,
        },
        {
          name: 'Team Play',
          value: `Trade Kills Success Percentage: ${stats.tradeKillsSuccessPercentage.toFixed(1)}%\n` +
                 `Flashbang Hit Foe Per Flashbang: ${stats.flashbangHitFoePerFlashbang.toFixed(2)}\n` +
                 `Flashbang Hit Friend Per Flashbang: ${stats.flashbangHitFriendPerFlashbang.toFixed(2)}`,
          inline: false,
        },
        {
          name: '\u200b',
          value: `**[View on Leetify](https://leetify.com/app/profile/${steam64Id})**`,
          inline: false,
        },
      );

    // Public message (not ephemeral) so everyone can see the stats
    interaction.reply({ embeds: [embed] });
  },
};
