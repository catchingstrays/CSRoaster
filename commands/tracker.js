const { EmbedBuilder } = require('discord.js');
const matchTracker = require('../services/matchTracker');
const { getUsersInGuild } = require('../utils/userLinksManager');

module.exports = {
  name: 'tracker',
  description: 'Manage and view match tracker status',
  usage: '!tracker [status|check]',

  async execute(message, args) {
    const subcommand = args[0]?.toLowerCase() || 'status';

    switch (subcommand) {
    case 'status':
      await this.showStatus(message);
      break;

    case 'check':
      await this.manualCheck(message, args);
      break;

    default: {
      const helpEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Unknown Command')
        .setDescription('Available tracker commands:')
        .addFields(
          { name: '!tracker status', value: 'Show tracking status' },
          { name: '!tracker check [@user]', value: 'Manually check for new matches' },
        );
      message.reply({ embeds: [helpEmbed] });
    }
    }
  },

  async showStatus(message) {
    const status = matchTracker.getTrackingStatus();
    const guildUsers = getUsersInGuild(message.guild.id);
    const guildUserCount = Object.keys(guildUsers).length;

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Match Tracker Status')
      .addFields(
        { name: 'Tracking Active', value: status.isTracking ? 'Yes' : 'No', inline: true },
        { name: 'Check Interval', value: status.checkInterval, inline: true },
        { name: 'User Cooldown', value: '3 hours after match', inline: true },
        { name: 'Linked Users (This Server)', value: guildUserCount.toString(), inline: true },
        { name: 'Total Tracked Users (All Servers)', value: status.trackedUserCount.toString(), inline: true },
      );

    if (guildUserCount > 0) {
      let usersList = '';
      for (const [discordId, linkData] of Object.entries(guildUsers)) {
        const trackedData = status.trackedUsers[discordId];
        const username = linkData.username || 'Unknown';

        if (trackedData) {
          const lastChecked = new Date(trackedData.lastChecked).toLocaleString();

          // Check if user is in cooldown
          const isInCooldown = matchTracker.isUserInCooldown(discordId);
          let cooldownInfo = '';
          if (isInCooldown) {
            const remainingMs = matchTracker.getCooldownRemaining(discordId);
            const hours = Math.floor(remainingMs / (60 * 60 * 1000));
            const minutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / 60000);
            cooldownInfo = ` [COOLDOWN: ${hours}h ${minutes}m]`;
          }

          usersList += `<@${discordId}> (${username}): ${trackedData.lastMatchCount} matches${cooldownInfo}\n`;
          usersList += `└ Last checked: ${lastChecked}\n\n`;
        } else {
          usersList += `<@${discordId}> (${username}): Not yet tracked\n\n`;
        }
      }

      embed.addFields({ name: 'Linked Users in This Server', value: usersList || 'None' });
    } else {
      embed.addFields({ name: 'Linked Users in This Server', value: 'No users linked in this server. Use `!link` to get started.' });
    }

    message.reply({ embeds: [embed] });
  },

  async manualCheck(message, args) {
    let targetUserId;

    if (args.length > 1) {
      // Check mentioned user
      const mention = message.mentions.users.first();
      if (!mention) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Invalid Mention')
          .setDescription('Please mention a valid user!');
        return message.reply({ embeds: [embed] });
      }
      targetUserId = mention.id;
    } else {
      // Check the message author
      targetUserId = message.author.id;
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

    // Check if user is in cooldown
    const isInCooldown = matchTracker.isUserInCooldown(targetUserId);
    if (isInCooldown) {
      const remainingMs = matchTracker.getCooldownRemaining(targetUserId);
      const hours = Math.floor(remainingMs / (60 * 60 * 1000));
      const minutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / 60000);
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('User in Cooldown')
        .setDescription(`<@${targetUserId}> is on cooldown for ${hours}h ${minutes}m.`)
        .addFields(
          { name: 'Reason', value: 'This prevents spamming the API after a match is detected.' },
          { name: 'Reset', value: 'Cooldown resets 3 hours after each new match.' },
        );
      return message.reply({ embeds: [embed] });
    }

    const checkingEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Checking Matches')
      .setDescription(`Checking for new matches for <@${targetUserId}>...`);
    const checkMsg = await message.reply({ embeds: [checkingEmbed] });

    try {
      await matchTracker.manualCheck(targetUserId);
      const successEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Check Complete')
        .setDescription(`Check complete for <@${targetUserId}>!`);
      await checkMsg.edit({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Error')
        .setDescription(`Error checking matches: ${error.message}`);
      await checkMsg.edit({ embeds: [errorEmbed] });
    }
  },
};
