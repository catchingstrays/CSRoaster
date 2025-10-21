const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setRoastChannel, getGuildConfig } = require('../utils/guildConfigManager');

module.exports = {
  name: 'setup',
  description: 'Configure the bot for this server (Admin only)',
  usage: '!setup <#channel> OR !setup status',

  async execute(message, args) {
    // Check if user has MANAGE_GUILD permission
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Permission Denied')
        .setDescription('You need the **Manage Server** permission to use this command.');
      return message.reply({ embeds: [embed] });
    }

    // Check subcommand
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'status') {
      return this.showStatus(message);
    }

    // Check if channel is mentioned
    const channelMention = message.mentions.channels.first();

    if (!channelMention) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Missing Arguments')
        .setDescription('Please mention a channel to set as the roast channel!')
        .addFields(
          { name: 'Usage', value: '`!setup <#channel>`' },
          { name: 'Example', value: '`!setup #roasts`' },
          { name: 'Check Status', value: '`!setup status`' }
        );
      return message.reply({ embeds: [embed] });
    }

    // Verify bot has permission to send messages in the channel
    const botPermissions = channelMention.permissionsFor(message.guild.members.me);
    if (!botPermissions.has(PermissionFlagsBits.SendMessages)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Missing Permissions')
        .setDescription(`I don't have permission to send messages in ${channelMention}!`)
        .addFields({
          name: 'Required Permissions',
          value: 'I need **Send Messages** permission in that channel.'
        });
      return message.reply({ embeds: [embed] });
    }

    // Save the roast channel configuration
    const success = setRoastChannel(message.guild.id, channelMention.id);

    if (!success) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Error')
        .setDescription('Failed to save the configuration. Please try again.');
      return message.reply({ embeds: [embed] });
    }

    // Send success message
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Setup Complete')
      .setDescription(`Roast channel has been set to ${channelMention}!`)
      .addFields(
        { name: 'Next Steps', value: 'Users can now use `!link <steam64_id>` to link their accounts.' },
        { name: 'Automatic Roasts', value: 'When linked users finish a match, roasts will be posted automatically in this channel.' }
      );

    await message.reply({ embeds: [embed] });

    // Send a test message to the roast channel
    const testEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('CS2 Roaster Bot Ready')
      .setDescription('This channel has been configured for automatic roasts!')
      .addFields(
        { name: 'How it works', value: 'When linked players finish CS2 matches, their stats will be analyzed and roasted here.' },
        { name: 'Get Started', value: 'Use `!link <steam64_id>` to link your Steam account and start getting roasted!' }
      );

    await channelMention.send({ embeds: [testEmbed] });
  },

  async showStatus(message) {
    const config = getGuildConfig(message.guild.id);

    if (!config || !config.roastChannelId) {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Setup Status')
        .setDescription('This server is not configured yet!')
        .addFields({
          name: 'Setup Required',
          value: 'Use `!setup <#channel>` to set the roast channel.'
        });
      return message.reply({ embeds: [embed] });
    }

    const channel = await message.guild.channels.fetch(config.roastChannelId).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Setup Status')
      .setDescription('This server is configured!')
      .addFields(
        {
          name: 'Roast Channel',
          value: channel ? `${channel}` : `<#${config.roastChannelId}> (channel not found)`
        },
        {
          name: 'Setup Date',
          value: new Date(config.setupAt).toLocaleString()
        }
      );

    if (config.lastUpdated) {
      embed.addFields({
        name: 'Last Updated',
        value: new Date(config.lastUpdated).toLocaleString()
      });
    }

    message.reply({ embeds: [embed] });
  },
};
