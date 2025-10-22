const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setRoastChannel, getGuildConfig } = require('../utils/guildConfigManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the bot for this server (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('channel')
        .setDescription('Set the roast channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel where roasts will be posted')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View current setup configuration')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'status') {
      return this.showStatus(interaction);
    }

    if (subcommand === 'channel') {
      return this.setupChannel(interaction);
    }
  },

  async setupChannel(interaction) {
    const channel = interaction.options.getChannel('channel');

    // Verify bot has permission to send messages in the channel
    const botPermissions = channel.permissionsFor(interaction.guild.members.me);
    if (!botPermissions.has(PermissionFlagsBits.SendMessages)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Missing Permissions')
        .setDescription(`I don't have permission to send messages in ${channel}!`)
        .addFields({
          name: 'Required Permissions',
          value: 'I need **Send Messages** permission in that channel.',
        });
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    // Save the roast channel configuration
    const success = setRoastChannel(interaction.guild.id, channel.id);

    if (!success) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Error')
        .setDescription('Failed to save the configuration. Please try again.');
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    // Send success message
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Setup Complete')
      .setDescription(`Roast channel has been set to ${channel}!`)
      .addFields(
        { name: 'Next Steps', value: 'Users can now use `/link` to link their accounts.' },
        { name: 'Automatic Roasts', value: 'When linked users finish a match, roasts will be posted automatically in this channel.' },
      );

    await interaction.reply({ embeds: [embed] });

    // Send a test message to the roast channel
    const testEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('CS2 Roaster Bot Ready')
      .setDescription('This channel has been configured for automatic roasts!')
      .addFields(
        { name: 'How it works', value: 'When linked players finish CS2 matches, their stats will be analyzed and roasted here.' },
        { name: 'Get Started', value: 'Use `/link` to link your Steam account and start getting roasted!' },
      );

    await channel.send({ embeds: [testEmbed] });
  },

  async showStatus(interaction) {
    const config = getGuildConfig(interaction.guild.id);

    if (!config || !config.roastChannelId) {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Setup Status')
        .setDescription('This server is not configured yet!')
        .addFields({
          name: 'Setup Required',
          value: 'Use `/setup channel` to set the roast channel.',
        });
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    const channel = await interaction.guild.channels.fetch(config.roastChannelId).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Setup Status')
      .setDescription('This server is configured!')
      .addFields(
        {
          name: 'Roast Channel',
          value: channel ? `${channel}` : `<#${config.roastChannelId}> (channel not found)`,
        },
        {
          name: 'Setup Date',
          value: new Date(config.setupAt).toLocaleString(),
        },
      );

    if (config.lastUpdated) {
      embed.addFields({
        name: 'Last Updated',
        value: new Date(config.lastUpdated).toLocaleString(),
      });
    }

    interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
  },
};
