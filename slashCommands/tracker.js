const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const matchTracker = require('../services/matchTracker');
const { getUsersInGuild, getUserSteam64Id } = require('../utils/userLinksManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tracker')
    .setDescription('Manage and view match tracker status')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Show tracking status'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Manually check for new matches')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to check (defaults to yourself)')
            .setRequired(false))),

  // Mark as user-installable (works in DMs and guilds)
  userInstallable: true,
  guildOnly: false,

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
    case 'status':
      await this.showStatus(interaction);
      break;

    case 'check':
      await this.manualCheck(interaction);
      break;

    default: {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Unknown Command')
        .setDescription('Available tracker commands:')
        .addFields(
          { name: '/tracker status', value: 'Show tracking status' },
          { name: '/tracker check [@user]', value: 'Manually check for new matches' },
        );
      interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }
    }
  },

  async showStatus(interaction) {
    // Guild-only command
    if (!interaction.guild) {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Server Only')
        .setDescription('This command only works in servers!')
        .addFields({
          name: 'Available in DMs',
          value: 'Use `/tracker check` to check for new matches.',
        });
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    const status = matchTracker.getTrackingStatus();
    const guildUsers = getUsersInGuild(interaction.guild.id);
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

      // Discord embeds have a 1024 character limit per field
      if (usersList.length > 1024) {
        usersList = usersList.substring(0, 1021) + '...';
      }

      embed.addFields({ name: 'Linked Users in This Server', value: usersList || 'None' });
    } else {
      embed.addFields({ name: 'Linked Users in This Server', value: 'No users linked in this server. Use `/link` to get started.' });
    }

    interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async manualCheck(interaction) {
    const isGuildContext = !!interaction.guild;
    const mentionedUser = interaction.options.getUser('user');
    const targetUser = mentionedUser || interaction.user;
    const targetUserId = targetUser.id;

    // Check if user is linked (works for both global and guild links)
    let steam64Id;
    if (isGuildContext) {
      const guildUsers = getUsersInGuild(interaction.guild.id);
      const linkData = guildUsers[targetUserId];
      if (!linkData) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('User Not Linked')
          .setDescription('This user is not linked in this server! Use `/link` first.');
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
      }
      steam64Id = linkData.steam64Id;
    } else {
      steam64Id = getUserSteam64Id(targetUserId);
      if (!steam64Id) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Not Linked')
          .setDescription('You need to link your account first! Use `/link steam64_id:YOUR_ID`')
          .addFields({
            name: 'Find your Steam64 ID',
            value: '[steamid.io](https://steamid.io/)',
          });
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
      }
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
        .setDescription(`${isGuildContext ? `<@${targetUserId}>` : 'You'} ${isGuildContext ? 'is' : 'are'} on cooldown for ${hours}h ${minutes}m.`)
        .addFields(
          { name: 'Reason', value: 'This prevents spamming the API after a match is detected.' },
          { name: 'Reset', value: 'Cooldown resets 3 hours after each new match.' },
        );
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    // Defer reply as this may take some time
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
      await matchTracker.manualCheck(targetUserId);
      const successEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Check Complete')
        .setDescription(`Check complete for ${isGuildContext ? `<@${targetUserId}>` : 'you'}!`);
      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Error')
        .setDescription(`Error checking matches: ${error.message}`);
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
