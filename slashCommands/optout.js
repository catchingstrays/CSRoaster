const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { disableDMRoasts, isDMRoastsEnabled } = require('../utils/userPreferencesManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('optout')
    .setDescription('Opt out of DM roast notifications')
    .addSubcommand(subcommand =>
      subcommand
        .setName('dm_roasts')
        .setDescription('Stop receiving roasts in DMs')),

  // Mark as user-installable (works in DMs and guilds)
  userInstallable: true,
  guildOnly: false,

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'dm_roasts') {
      return this.handleDMRoastsOptOut(interaction);
    }
  },

  async handleDMRoastsOptOut(interaction) {
    const userId = interaction.user.id;

    // Check if already opted out
    if (!isDMRoastsEnabled(userId)) {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Already Opted Out')
        .setDescription('You\'re not currently receiving roasts in DMs.')
        .addFields({
          name: 'Want to opt back in?',
          value: 'Run `/link` again with your Steam64 ID to re-enable DM notifications.',
        });
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    // Disable DM roasts
    if (!disableDMRoasts(userId)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Error')
        .setDescription('Failed to opt out. Please try again.');
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Opted Out Successfully')
      .setDescription('✅ You will no longer receive roasts in DMs.')
      .addFields(
        {
          name: 'Server Roasts',
          value: 'You\'ll still get roasted in servers where you\'re linked.',
        },
        {
          name: 'Re-enable DM Notifications',
          value: 'Run `/link` again with your Steam64 ID to opt back in.',
        },
      );

    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    console.log(`[OPTOUT] User ${interaction.user.username} (${userId}) opted out of DM roasts`);
  },
};
