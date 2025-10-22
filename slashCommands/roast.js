const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const leetifyApi = require('../services/leetifyApi');
const cs2RoastGenerator = require('../utils/cs2RoastGenerator');
const chatGPTRoastGenerator = require('../services/chatGPTRoastGenerator');
const { getUserSteam64Id } = require('../utils/userLinksManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Get roasted based on CS2 stats instantly!')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to roast (defaults to yourself)')
        .setRequired(false)),

  // Mark as user-installable (works in DMs and guilds)
  userInstallable: true,
  guildOnly: false,

  async execute(interaction) {
    const mentionedUser = interaction.options.getUser('user');
    const targetUser = mentionedUser || interaction.user;
    const userId = targetUser.id;

    // Check if user is linked (globally or in a guild)
    const steam64Id = getUserSteam64Id(userId);

    if (!steam64Id) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Not Linked')
        .setDescription(
          targetUser.id === interaction.user.id
            ? 'You need to link your Steam account first!'
            : `${targetUser.username} needs to link their Steam account first!`,
        )
        .addFields({
          name: 'How to link',
          value: interaction.guild
            ? 'Use `/link steam64_id:YOUR_ID` in this server or in DMs with me.'
            : 'Use `/link steam64_id:YOUR_ID` to link your Steam account.',
        });
      return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    // Defer reply as fetching stats may take time
    // Always public so everyone can see the roast!
    await interaction.deferReply();

    try {
      // Fetch latest stats from Leetify
      const profileData = await leetifyApi.getProfile(steam64Id);
      const stats = cs2RoastGenerator.calculateStatsFromProfile(profileData);
      const playerName = profileData.name || targetUser.username;
      const currentMatchCount = profileData.total_matches || 0;

      // Generate roast using ChatGPT if enabled, otherwise use traditional
      let selectedRoast;

      if (chatGPTRoastGenerator.isEnabled()) {
        try {
          selectedRoast = await chatGPTRoastGenerator.getOrGenerateRoast(
            userId,
            stats,
            null, // No previous stats for instant roast
            currentMatchCount,
            playerName,
          );
          console.log('[ROAST CMD] Using ChatGPT roast');
        } catch (error) {
          console.error('[ROAST CMD] ChatGPT failed, falling back to traditional:', error);
          // Fallback to traditional roasts
          const roasts = cs2RoastGenerator.generateRoastsWithComparison(stats, null);
          selectedRoast = roasts[Math.floor(Math.random() * roasts.length)];
        }
      } else {
        // Traditional roast generation
        const roasts = cs2RoastGenerator.generateRoastsWithComparison(stats, null);
        selectedRoast = roasts[Math.floor(Math.random() * roasts.length)];
      }

      // Build roast message
      let roastMessage = `${targetUser}, ${selectedRoast}`;
      roastMessage += '\n-# [Data Provided by Leetify](<https://leetify.com/>)';
      if (steam64Id) {
        roastMessage += ` • [Steam Profile](<https://steamcommunity.com/profiles/${steam64Id}>)`;
      }

      // Send the roast
      await interaction.editReply({ content: roastMessage });

      console.log(`[ROAST] ${playerName} (${userId}) got roasted by ${interaction.user.username} ${interaction.guild ? `in guild ${interaction.guild.id}` : 'in DM'}`);
    } catch (error) {
      console.error('Error fetching stats for roast:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Error Fetching Stats')
        .setDescription(`Failed to fetch ${targetUser.id === interaction.user.id ? 'your' : targetUser.username + "'s"} CS2 stats from Leetify.`)
        .addFields({
          name: 'Error Details',
          value: error.message || 'Unknown error',
        });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
