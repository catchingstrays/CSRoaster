const { EmbedBuilder } = require('discord.js');
const matchTracker = require('../services/matchTracker');
const { getUsersInGuild } = require('../utils/userLinksManager');

module.exports = {
  name: 'stats',
  description: 'View stored stats for a player',
  usage: '!stats [@user]',

  async execute(message, args) {
    let targetUserId;
    let targetUser;

    if (args.length > 0) {
      // Check mentioned user
      const mention = message.mentions.users.first();
      if (!mention) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Invalid Mention')
          .setDescription('Please mention a valid user or use without arguments to check yourself!');
        return message.reply({ embeds: [embed] });
      }
      targetUserId = mention.id;
      targetUser = mention;
    } else {
      // Check the message author
      targetUserId = message.author.id;
      targetUser = message.author;
    }

    const guildUsers = getUsersInGuild(message.guild.id);
    const linkData = guildUsers[targetUserId];

    if (!linkData) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('User Not Linked')
        .setDescription('This user is not linked in this server! Use `!link` first.');
      return message.reply({ embeds: [embed] });
    }

    const trackingStatus = matchTracker.getTrackingStatus();
    const trackedData = trackingStatus.trackedUsers[targetUserId];

    if (!trackedData || !trackedData.lastStats) {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('No Stats Available')
        .setDescription('No stats available yet. Wait for the tracker to collect data!');
      return message.reply({ embeds: [embed] });
    }

    const stats = trackedData.lastStats;
    const lastChecked = new Date(trackedData.lastChecked).toLocaleString();
    const steam64Id = linkData.steam64Id;

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

    message.reply({ embeds: [embed] });
  },
};
