/**
 * Generates roasts based on Counter-Strike 2 player statistics from Leetify
 */
class CS2RoastGenerator {
  constructor() {
    this.roastTemplates = {
      lowKD: [
        "With a K/D like that, I think you're confusing 'Counter-Strike' with 'Counter-Die'.",
        'Your K/D ratio is so low, the bots feel bad for you.',
        "I've seen Silver 1s with better K/D ratios. And they play with a trackpad.",
        "That K/D suggests you're allergic to getting kills but LOVE getting killed.",
      ],
      lowWinRate: [
        'This win rate is tragic. Have you considered playing against easier opponents... like practice bots?',
        'With a win rate like that, maybe your team IS the problem... and that problem is YOU.',
        "You lose so much, I'm surprised Steam hasn't given you a 'Professional Loser' badge.",
        'That win rate is lower than my expectations, and they were already in the Mariana Trench.',
      ],
      lowHeadshotRate: [
        "Headshot percentage so low, I'm starting to think you're aiming at their shoes.",
        'Are you aware that headshots do MORE damage? Just a friendly tip.',
        "Your crosshair placement is so bad, it could be used as a 'what NOT to do' tutorial.",
        "With aim like that, maybe try a game that doesn't require precision... like Cookie Clicker.",
      ],
      lowAccuracy: [
        'Your accuracy is so bad, stormtroopers are taking notes.',
        'Missing that many shots should be physically impossible. Congratulations on defying the odds!',
        "I think you're confusing 'spray pattern' with 'spray and pray... that something hits'.",
        'At this accuracy rate, you could stand in front of a wall and still miss it.',
      ],
      badUtility: [
        "Your utility usage is so bad, you're basically donating grenades to the enemy economy.",
        "Flash yourself one more time and I'm calling it a self-sabotage strategy.",
        'Using utilities that poorly should be considered griefing.',
        "I've seen unranked players use smokes better. At least they TRY to help the team.",
      ],
      poorPositioning: [
        'Your positioning is so bad, even the enemy team feels bad peeking you.',
        'Standing in the open like that, are you trying to win or audition for a shooting gallery?',
        "Positioning rating that low means you're basically a free kill delivery service.",
        'You have the game sense of a blind chicken with no spatial awareness.',
      ],
      lowClutch: [
        'Your clutch rate is so low, your team probably celebrates when you die first.',
        'In a 1v1, the enemy could AFK and still win against you.',
        'You choke in clutches harder than a malfunctioning vacuum cleaner.',
        "When it comes to clutching, you're about as reliable as a chocolate teapot.",
      ],
      badOpening: [
        "Your opening duel success is abysmal. Entry fragging clearly isn't your calling.",
        'You die first so often, your team should just start the round 4v5.',
        "Getting the first kill? Nah. BEING the first kill? That's your specialty!",
        'Your opening stats suggest your job is to be target practice.',
      ],
      lowRating: [
        "That Leetify rating is so low, I had to double-check it wasn't a typo.",
        "Your rating suggests you're playing a completely different game... badly.",
        "I've seen bots with higher performance ratings. At least they have an excuse.",
        "With a rating like that, maybe it's time to reconsider your career choices.",
      ],
      goodPerformance: [
        "Okay, okay... these stats aren't terrible. You're almost decent! Keep grinding!",
        "Not bad! For once, you're not the anchor dragging your team down.",
        'These numbers are actually respectable. Did someone else play on your account?',
        "Impressive! You're finally pulling your weight. Character development!",
      ],
      bottomFrag: [
        'Bottom fragging so consistently, they should rename the scoreboard position after you.',
        'Every team needs someone to carry... the participation trophy. Thanks for volunteering!',
        "You're not the carry, you're the CARRIED. And even then, you're too heavy.",
        "At least you're consistent... consistently at the bottom of the scoreboard.",
      ],
      badReactionTime: [
        "With reaction times that slow, you'd lose a draw to a sloth.",
        'Your reaction time is so bad, you see enemies from yesterday.',
        'By the time you react, the round is already over... and you lost.',
        'Are you playing on a potato or is your brain just buffering?',
      ],
      teamFlasher: [
        'You flash your team more than the enemy. Whose side are you on?',
        'Your teammates bought sunglasses just to play with you.',
        "That's not 'utility usage', that's just griefing with extra steps.",
        'Maybe check which color uniform your team is wearing?',
      ],
      badTrades: [
        'Your teammates die and you just... watch. Great teamwork!',
        'Trading kills requires you to actually GET the kill. Just FYI.',
        'Your team dies for you, and you give them nothing in return. Typical.',
        "The concept of 'trading' seems lost on you. This isn't a solo game.",
      ],
      utilityHoarder: [
        'Dying with full nades every round? Are you collecting them?',
        "Those grenades don't get a refund if you die with them, genius.",
        "It's called 'utility' because you're supposed to USE it. Novel concept, I know.",
        "Saving utility for the next match? Because you're not using it in this one.",
      ],
      badCounterStrafing: [
        "Counter-strafing isn't just a suggestion, it's how you PLAY the game.",
        "You move and shoot like you're on roller skates. Stop. Then shoot.",
        "Your movement makes it look like you're doing the cha-cha while shooting.",
        "Ever heard of the 'stop' key? It exists for a reason.",
      ],
      poorPreaim: [
        'Pre-aiming at random walls. Bold strategy, terrible execution.',
        "Your crosshair placement suggests you're playing a different game entirely.",
        "Aiming at the floor won't help unless enemies start crawling.",
        "Do you know where enemies usually peek from? Because your crosshair doesn't.",
      ],
    };

    // Stat degradation roast templates
    this.degradationRoasts = {
      aimRating: [
        'Your aim dropped {change} points from {old} to {new}. Did you switch to playing with a steering wheel?',
        'Aim fell by {change} points ({old} → {new}). Maybe consider aim training... or a new hobby?',
        'Your aim got WORSE by {change} points? {old} → {new}. That takes special talent.',
        'Lost {change} aim rating points. Are you devolving as a player?',
      ],
      positioningRating: [
        'Positioning dropped {change} points from {old} to {new}. Did you forget how to use a map?',
        'Your game sense degraded by {change} points ({old} → {new}). Impressive in the worst way.',
        'Positioning fell {change} points. Standing in worse spots than a rookie.',
        'Down {change} in positioning ({old} → {new}). Are you actively trying to get caught out?',
      ],
      utilityRating: [
        'Utility rating dropped {change} points from {old} to {new}. Forgetting which button throws nades?',
        'Down {change} in utility ({old} → {new}). Even bots use nades better than this.',
        "Utility fell {change} points. It's like you're allergic to helping the team.",
        'Your utility usage dropped {change} points. Did you rebind your grenade keys?',
      ],
      headshotRate: [
        'Headshot % fell {change}% from {old}% to {new}%. Aiming for the knees now?',
        'Lost {change}% headshot accuracy ({old}% → {new}%). Your crosshair placement is getting WORSE.',
        'Headshots dropped {change}%. Did you lower your sensitivity to 0.01?',
        "Down {change}% in headshots. At this rate, you'll be shooting the ground next match.",
      ],
      accuracy: [
        'Accuracy dropped {change}% from {old}% to {new}%. Are you closing your eyes before shooting?',
        'Your accuracy degraded by {change}%. Impressive bullet wastage!',
        'Lost {change}% accuracy ({old}% → {new}%). The walls are grateful for all your missed bullets.',
        'Down {change}% in accuracy. Did you forget how to control recoil?',
      ],
      sprayAccuracy: [
        'Spray control fell {change}% from {old}% to {new}%. Just tap instead, please.',
        'Your spray dropped {change}% ({old}% → {new}%). Is your mouse having a seizure?',
        "Spray accuracy down {change}%. You're drawing abstract art on walls now.",
        "Lost {change}% spray control. You've forgotten what spray patterns are.",
      ],
      winRate: [
        'Win rate dropped {change}% from {old}% to {new}%. Your team must LOVE queueing with you.',
        "Down {change}% in wins ({old}% → {new}%). You're not in a slump, you're in a crater.",
        "Win rate fell {change}%. Maybe it's time to admit you're the problem.",
        "Your wins fell {change}%. At this rate, you'll be in the negatives.",
      ],
      clutchDeviation: [
        'Clutch rating fell {change} from {old} to {new}. Choking more than usual?',
        'Down {change} in clutch ({old} → {new}). The pressure is clearly too much for you.',
        'Clutch dropped {change} points. Your 1v1s are becoming participation trophies.',
        "Your clutch rating fell {change}. Just ff when you're last alive.",
      ],
      openingDeviation: [
        "Opening duels down {change} ({old} → {new}). You're dying first even MORE now.",
        "Lost {change} in opening duels. Stop entry fragging, you're terrible at it.",
        "Opening rating dropped {change}. You're the team's free first blood.",
        'Down {change} in opening duels. Maybe let someone else peek first?',
      ],
      reactionTime: [
        'Reaction time got {change}ms SLOWER ({old}ms → {new}ms). Did you age 20 years?',
        'Reactions slowed by {change}ms. Are you falling asleep mid-match?',
        "Your reaction time increased {change}ms. You're not reacting, you're spectating.",
        'Reactions {change}ms slower ({old}ms → {new}ms). Time for coffee?',
      ],
      counterStrafing: [
        "Counter-strafing dropped {change}% ({old}% → {new}%). You forgot the 'counter' part.",
        'Down {change}% in counter-strafe. Just W key and pray at this point.',
        'Your movement degraded {change}%. Ice skating simulator?',
        'Lost {change}% counter-strafe accuracy. Movement mechanics abandoned.',
      ],
      ctLeetifyDeviation: [
        "CT-side fell {change} ({old} → {new}). Can't even hold angles anymore?",
        'Your CT performance dropped {change}. Defense is apparently not your thing.',
        'CT rating down {change}. Maybe just play T-side only?',
        'Lost {change} on CT. Standing still is too hard for you.',
      ],
      tLeetifyDeviation: [
        'T-side dropped {change} ({old} → {new}). Attacking is getting worse somehow.',
        "Your T performance fell {change}. Can't even execute a push?",
        'T-side down {change}. Just lurk in spawn at this point.',
        "Lost {change} on T-side. You're making your team 4v5.",
      ],
      preaim: [
        'Preaim got {change}° worse ({old}° → {new}°). Your crosshair placement is evolving... backwards.',
        'Preaim increased {change}° ({old}° → {new}°). Are you staring at the floor more now?',
        'Your preaim degraded {change}°. Crosshair on clouds strategy?',
        "Preaim up {change}° (worse). You've forgotten where enemies peek from.",
      ],
      tradeKillsSuccessPercentage: [
        'Trade success dropped {change}% ({old}% → {new}%). Your teammates die for nothing now.',
        "Down {change}% in trades. You're just watching them die?",
        'Trade kills fell {change}%. Team play is dead to you.',
        'Lost {change}% trade success. Solo queue mentality in a team game.',
      ],
    };
  }

  /**
   * Analyze player statistics and generate roasts with proof
   * @param {Object} stats - Player statistics
   * @returns {Array<string>} Array of roasts with stats
   */
  generateRoasts(stats) {
    const roasts = [];

    // Check K/D ratio
    if (stats.kdRatio > 0 && stats.kdRatio < 0.85) {
      roasts.push(this.getRandomRoastWithStat('lowKD', stats.kdRatio.toFixed(2), 'K/D'));
    }

    // Check win rate (percentage)
    if (stats.winRate > 0 && stats.winRate < 45) {
      roasts.push(this.getRandomRoastWithStat('lowWinRate', stats.winRate.toFixed(1) + '%', 'win rate'));
    }

    // Check headshot rate (percentage)
    if (stats.headshotRate > 0 && stats.headshotRate < 20) {
      roasts.push(this.getRandomRoastWithStat('lowHeadshotRate', stats.headshotRate.toFixed(1) + '%', 'headshot %'));
    }

    // Check accuracy (percentage)
    if (stats.accuracy > 0 && stats.accuracy < 25) {
      roasts.push(this.getRandomRoastWithStat('lowAccuracy', stats.accuracy.toFixed(1) + '%', 'accuracy'));
    }

    // Check spray accuracy (percentage)
    if (stats.sprayAccuracy > 0 && stats.sprayAccuracy < 30) {
      roasts.push(`Your spray control is ${stats.sprayAccuracy.toFixed(1)}%... do you spray in the shape of your rank? A circle?`);
    }

    // Check utility rating (0-100 scale, lower is worse)
    if (stats.utilityRating > 0 && stats.utilityRating < 30) {
      roasts.push(this.getRandomRoastWithStat('badUtility', stats.utilityRating.toFixed(1), 'utility'));
    }

    // Check positioning (0-100 scale, lower is worse)
    if (stats.positioningRating > 0 && stats.positioningRating < 30) {
      roasts.push(this.getRandomRoastWithStat('poorPositioning', stats.positioningRating.toFixed(1), 'positioning'));
    }

    // Check aim rating (0-100 percentile, lower is worse)
    if (stats.aimRating > 0 && stats.aimRating < 30) {
      roasts.push(`Your aim is ${stats.aimRating.toFixed(1)}... you're only better than ${stats.aimRating.toFixed(0)}% of players. Yikes.`);
    }

    // Check clutch deviation (deviation from 0, negative is bad)
    if (stats.clutchDeviation !== undefined && stats.clutchDeviation < -500) {
      roasts.push(this.getRandomRoastWithStat('lowClutch', stats.clutchDeviation.toFixed(2), 'clutch rating'));
    }

    // Check opening deviation (deviation from 0, negative is bad)
    if (stats.openingDeviation !== undefined && stats.openingDeviation < -300) {
      roasts.push(this.getRandomRoastWithStat('badOpening', stats.openingDeviation.toFixed(2), 'opening rating'));
    }

    // Check T-side and CT-side Leetify deviations
    if (stats.tLeetifyDeviation !== undefined && stats.tLeetifyDeviation < -200) {
      roasts.push(`Your T-side performance is ${stats.tLeetifyDeviation.toFixed(2)} below average. Do you forget which bomb site to go to?`);
    }

    if (stats.ctLeetifyDeviation !== undefined && stats.ctLeetifyDeviation < -200) {
      roasts.push(`Your CT-side performance is ${stats.ctLeetifyDeviation.toFixed(2)} below average. Standing still is apparently too complex.`);
    }

    // Check reaction time (ms, higher is worse)
    if (stats.reactionTime > 700) {
      roasts.push(this.getRandomRoastWithStat('badReactionTime', stats.reactionTime.toFixed(0) + 'ms', 'reaction time'));
    } else if (stats.reactionTime > 600) {
      roasts.push(`${stats.reactionTime.toFixed(0)}ms reaction time? My grandma's faster and she doesn't even play CS2.`);
    }

    // Check counter-strafing (percentage, lower is worse)
    if (stats.counterStrafing > 0 && stats.counterStrafing < 70) {
      roasts.push(this.getRandomRoastWithStat('badCounterStrafing', stats.counterStrafing.toFixed(1) + '%', 'counter-strafe accuracy'));
    }

    // Check flashbang efficiency (raw numbers: 0.35 means 0.35 enemies hit per flashbang on average)
    if (stats.flashbangHitFriendPerFlashbang > 0.3) {
      roasts.push(this.getRandomRoastWithStat('teamFlasher', stats.flashbangHitFriendPerFlashbang.toFixed(2) + ' teammates', 'blinded per flashbang'));
    }

    if (stats.flashbangHitFoePerFlashbang > 0 && stats.flashbangHitFoePerFlashbang < 0.4) {
      roasts.push(`You only blind ${stats.flashbangHitFoePerFlashbang.toFixed(2)} enemies per flashbang thrown. Are you even looking when you throw them?`);
    }

    // Check HE grenade efficiency
    if (stats.heFoesDamageAvg > 0 && stats.heFoesDamageAvg < 10) {
      roasts.push(`${stats.heFoesDamageAvg.toFixed(1)} average HE damage? Are you throwing them backwards?`);
    }

    if (stats.heFriendsDamageAvg > 2) {
      roasts.push(`You average ${stats.heFriendsDamageAvg.toFixed(1)} team damage per HE. Friendly fire isn't that friendly.`);
    }

    // Check opening duels (percentages)
    if (stats.tOpeningDuelSuccessPercentage > 0 && stats.tOpeningDuelSuccessPercentage < 40) {
      roasts.push(`${stats.tOpeningDuelSuccessPercentage.toFixed(1)}% T-side opening duel success. You're the definition of "entry fragger's nightmare."`);
    }

    if (stats.ctOpeningDuelSuccessPercentage > 0 && stats.ctOpeningDuelSuccessPercentage < 40) {
      roasts.push(`${stats.ctOpeningDuelSuccessPercentage.toFixed(1)}% CT-side opening duel success. Maybe let someone else hold the site?`);
    }

    // Check trade kill success (percentage)
    if (stats.tradeKillsSuccessPercentage > 0 && stats.tradeKillsSuccessPercentage < 40) {
      roasts.push(this.getRandomRoastWithStat('badTrades', stats.tradeKillsSuccessPercentage.toFixed(1) + '%', 'trade success'));
    }

    // Check utility on death (higher is worse - dying with nades)
    if (stats.utilityOnDeathAvg > 500) {
      roasts.push(this.getRandomRoastWithStat('utilityHoarder', '$' + stats.utilityOnDeathAvg.toFixed(0), 'avg utility on death'));
    }

    // Check preaim (degrees, higher is worse - closer to 0 is better)
    if (stats.preaim > 15) {
      roasts.push(this.getRandomRoastWithStat('poorPreaim', stats.preaim.toFixed(1) + '°', 'preaim'));
    }

    // If stats are actually good (good percentiles and positive deviations)
    if (stats.aimRating > 60 && stats.winRate > 55 &&
        (stats.ctLeetifyDeviation > 200 || stats.tLeetifyDeviation > 200)) {
      roasts.push(this.getRandomRoast('goodPerformance'));
    }

    // If no roasts triggered, they're average
    if (roasts.length === 0) {
      roasts.push("Your stats are so average, they could be used in a statistics textbook as the definition of 'median'.");
    }

    return roasts;
  }

  /**
   * Get a random roast from a category with stat proof
   * @param {string} category - Roast category
   * @param {string} statValue - The stat value to display
   * @param {string} statName - The name of the stat
   * @returns {string} Random roast with stat
   */
  getRandomRoastWithStat(category, statValue, statName) {
    const roast = this.getRandomRoast(category);
    return `${roast} (${statValue} ${statName})`;
  }

  /**
   * Get a random roast from a category
   * @param {string} category - Roast category
   * @returns {string} Random roast
   */
  getRandomRoast(category) {
    const roasts = this.roastTemplates[category];
    return roasts[Math.floor(Math.random() * roasts.length)];
  }

  /**
   * Compare two stat objects and generate roasts based on degradation
   * @param {Object} oldStats - Previous statistics
   * @param {Object} newStats - Current statistics
   * @returns {Array<string>} Array of degradation roasts
   */
  compareStatsAndRoast(oldStats, newStats) {
    const degradationRoasts = [];

    // Define stats to compare and their thresholds for "significant" degradation
    const statsToCompare = [
      { key: 'aimRating', threshold: 3, format: (val) => val.toFixed(1) },
      { key: 'positioningRating', threshold: 3, format: (val) => val.toFixed(1) },
      { key: 'utilityRating', threshold: 3, format: (val) => val.toFixed(1) },
      { key: 'headshotRate', threshold: 2, format: (val) => val.toFixed(1) },
      { key: 'accuracy', threshold: 2, format: (val) => val.toFixed(1) },
      { key: 'sprayAccuracy', threshold: 2, format: (val) => val.toFixed(1) },
      { key: 'winRate', threshold: 3, format: (val) => val.toFixed(1) },
      { key: 'clutchDeviation', threshold: 200, format: (val) => val.toFixed(2), reverse: true },
      { key: 'openingDeviation', threshold: 150, format: (val) => val.toFixed(2), reverse: true },
      { key: 'reactionTime', threshold: 30, format: (val) => val.toFixed(0), reverse: true },
      { key: 'counterStrafing', threshold: 3, format: (val) => val.toFixed(1) },
      { key: 'ctLeetifyDeviation', threshold: 100, format: (val) => val.toFixed(2), reverse: true },
      { key: 'tLeetifyDeviation', threshold: 100, format: (val) => val.toFixed(2), reverse: true },
      { key: 'preaim', threshold: 2, format: (val) => val.toFixed(1), reverse: true }, // Higher degrees is worse
      { key: 'tradeKillsSuccessPercentage', threshold: 3, format: (val) => val.toFixed(1) },
    ];

    // Find stats that got worse
    for (const statConfig of statsToCompare) {
      const { key, threshold, format, reverse } = statConfig;
      const oldValue = oldStats[key];
      const newValue = newStats[key];

      // Skip if either value is missing or 0
      if (!oldValue || !newValue || oldValue === 0 || newValue === 0) {
        continue;
      }

      // Calculate degradation
      let degradation;
      if (reverse) {
        // For reverse stats (like reaction time), higher is worse
        degradation = newValue - oldValue;
      } else {
        // For normal stats, lower is worse
        degradation = oldValue - newValue;
      }

      // If degradation is significant, add a roast
      if (degradation >= threshold) {
        const roastTemplate = this.getRandomDegradationRoast(key);
        if (roastTemplate) {
          const roast = roastTemplate
            .replace('{old}', format(oldValue))
            .replace('{new}', format(newValue))
            .replace('{change}', format(Math.abs(degradation)));
          degradationRoasts.push(roast);
        }
      }
    }

    return degradationRoasts;
  }

  /**
   * Get a random degradation roast for a specific stat
   * @param {string} statKey - The stat key
   * @returns {string|null} Random degradation roast template
   */
  getRandomDegradationRoast(statKey) {
    const roasts = this.degradationRoasts[statKey];
    if (!roasts || roasts.length === 0) {
      return null;
    }
    return roasts[Math.floor(Math.random() * roasts.length)];
  }

  /**
   * Generate roasts prioritizing stat degradation
   * @param {Object} currentStats - Current statistics
   * @param {Object} previousStats - Previous statistics (optional)
   * @returns {Array<string>} Array of roasts
   */
  generateRoastsWithComparison(currentStats, previousStats = null) {
    let roasts = [];

    // If we have previous stats, prioritize degradation roasts
    if (previousStats) {
      const degradationRoasts = this.compareStatsAndRoast(previousStats, currentStats);

      if (degradationRoasts.length > 0) {
        // Add 1-3 degradation roasts
        const numRoasts = Math.min(3, degradationRoasts.length);
        for (let i = 0; i < numRoasts; i++) {
          const randomIndex = Math.floor(Math.random() * degradationRoasts.length);
          roasts.push(degradationRoasts.splice(randomIndex, 1)[0]);
        }
      }
    }

    // If we don't have enough roasts, add general roasts
    if (roasts.length === 0) {
      const generalRoasts = this.generateRoasts(currentStats);
      roasts = roasts.concat(generalRoasts);
    }

    return roasts;
  }

  /**
   * Calculate statistics from Leetify profile data
   * @param {Object} profileData - Profile data from Leetify API
   * @returns {Object} Calculated statistics
   */
  calculateStatsFromProfile(profileData) {
    const stats = profileData.stats || {};
    const rating = profileData.rating || {};

    return {
      gamesAnalyzed: profileData.total_matches || 0,
      kdRatio: 0, // Not available in profile stats
      averageKills: 0,
      averageDeaths: 0,

      // Stats - all are percentages
      headshotRate: stats.accuracy_head || 0,
      accuracy: stats.accuracy_enemy_spotted || 0,
      sprayAccuracy: stats.spray_accuracy || 0,
      counterStrafing: stats.counter_strafing_good_shots_ratio || 0,
      flashbangEfficiency: stats.flashbang_hit_foe_per_flashbang || 0,
      tradeKillSuccess: stats.trade_kills_success_percentage || 0,
      reactionTime: stats.reaction_time_ms || 0, // ms value, not percentage
      preaim: stats.preaim || 0,

      // Flashbang stats
      flashbangHitFoeAvgDuration: stats.flashbang_hit_foe_avg_duration || 0,
      flashbangHitFoePerFlashbang: stats.flashbang_hit_foe_per_flashbang || 0,
      flashbangHitFriendPerFlashbang: stats.flashbang_hit_friend_per_flashbang || 0,
      flashbangLeadingToKill: stats.flashbang_leading_to_kill || 0,
      flashbangThrown: stats.flashbang_thrown || 0,

      // HE grenade stats
      heFoesDamageAvg: stats.he_foes_damage_avg || 0,
      heFriendsDamageAvg: stats.he_friends_damage_avg || 0,

      // Opening duel stats (percentages)
      ctOpeningAggressionSuccessRate: stats.ct_opening_aggression_success_rate || 0,
      ctOpeningDuelSuccessPercentage: stats.ct_opening_duel_success_percentage || 0,
      tOpeningAggressionSuccessRate: stats.t_opening_aggression_success_rate || 0,
      tOpeningDuelSuccessPercentage: stats.t_opening_duel_success_percentage || 0,

      // Trade stats (percentages)
      tradedDeathsSuccessPercentage: stats.traded_deaths_success_percentage || 0,
      tradeKillOpportunitiesPerRound: stats.trade_kill_opportunities_per_round || 0,
      tradeKillsSuccessPercentage: stats.trade_kills_success_percentage || 0,

      // Utility on death
      utilityOnDeathAvg: stats.utility_on_death_avg || 0,

      // Rating - percentile scores (0-100)
      aimRating: rating.aim || 0,
      positioningRating: rating.positioning || 0,
      utilityRating: rating.utility || 0,

      // Rating - deviation from 0 (average), multiply by 100 for display
      clutchDeviation: (rating.clutch || 0) * 100,
      openingDeviation: (rating.opening || 0) * 100,
      ctLeetifyDeviation: (rating.ct_leetify || 0) * 100,
      tLeetifyDeviation: (rating.t_leetify || 0) * 100,

      // Win rate (already in percentage format 0-1, multiply by 100)
      winRate: (profileData.winrate || 0) * 100,
    };
  }

  /**
   * Calculate statistics from Leetify match history data
   * @param {Array} matchHistory - Array of match data from Leetify API
   * @param {string} steam64Id - Player's Steam64 ID
   * @returns {Object} Calculated statistics
   */
  calculateStatsFromMatches(matchHistory, steam64Id) {
    // Calculate stats from matches
    let totalKills = 0;
    let totalDeaths = 0;
    let totalHeadshots = 0;
    let totalShots = 0;
    let totalHits = 0;
    let totalLeetifyRating = 0;
    let wins = 0;
    let totalTradeKillSuccess = 0;
    let totalTradeKillAttempts = 0;
    let validRatingCount = 0;

    matchHistory.forEach((match) => {
      // Find player's stats in this match
      const playerStats = match.stats?.find(s => s.steam64_id === steam64Id);

      if (playerStats) {
        totalKills += playerStats.total_kills || 0;
        totalDeaths += playerStats.total_deaths || 0;
        totalHeadshots += playerStats.total_hs_kills || 0;
        totalShots += playerStats.shots_fired || 0;
        totalHits += playerStats.shots_hit_foe || 0;

        // Leetify rating (convert from decimal to percentage)
        if (playerStats.leetify_rating) {
          totalLeetifyRating += playerStats.leetify_rating * 100;
          validRatingCount++;
        }

        // Trade kills
        if (playerStats.trade_kills_succeed !== undefined) {
          totalTradeKillSuccess += playerStats.trade_kills_succeed;
          totalTradeKillAttempts += playerStats.trade_kill_attempts || 0;
        }

        // Check if player won (compare their team's score vs opponent)
        const playerTeam = playerStats.initial_team_number;
        const teamScore = match.team_scores?.find(t => t.team_number === playerTeam)?.score || 0;
        const opponentScore = match.team_scores?.find(t => t.team_number !== playerTeam)?.score || 0;

        if (teamScore > opponentScore) {
          wins++;
        }
      }
    });

    const gamesPlayed = matchHistory.length || 1;

    return {
      gamesAnalyzed: gamesPlayed,
      kdRatio: totalDeaths > 0 ? (totalKills / totalDeaths) : totalKills,
      averageKills: (totalKills / gamesPlayed).toFixed(1),
      averageDeaths: (totalDeaths / gamesPlayed).toFixed(1),
      headshotRate: totalKills > 0 ? ((totalHeadshots / totalKills) * 100).toFixed(1) : 0,
      accuracy: totalShots > 0 ? ((totalHits / totalShots) * 100).toFixed(1) : 0,
      winRate: ((wins / gamesPlayed) * 100).toFixed(1),
      clutchSuccess: 0, // Not available in basic match data
      openingSuccess: totalTradeKillAttempts > 0 ? ((totalTradeKillSuccess / totalTradeKillAttempts) * 100).toFixed(1) : 0,
      aimRating: 0, // Not available without profile endpoint
      positioningRating: 0, // Not available without profile endpoint
      utilityRating: 0, // Not available without profile endpoint
      leetifyRating: validRatingCount > 0 ? (totalLeetifyRating / validRatingCount).toFixed(1) : 0,
    };
  }

  /**
   * Format the complete roast message
   * @param {string} playerName - Player's name
   * @param {Object} stats - Player statistics
   * @param {string} rank - Player's rank
   * @param {boolean} isPrivate - Whether the account is private
   * @param {string} discordMention - Optional Discord user mention
   * @param {string} steam64Id - Steam64 ID for profile link
   * @returns {string} Formatted roast message
   */
  formatRoastMessage(playerName, stats, rank, _isPrivate = false, discordMention = null, steam64Id = null) {
    const roasts = this.generateRoasts(stats);
    // Pick one random roast
    const selectedRoast = roasts[Math.floor(Math.random() * roasts.length)];

    // Address the player directly
    const target = discordMention || `**${playerName}**`;

    // Build the message
    let message = `${target}, ${selectedRoast}`;

    // Add footer with source and Steam profile link
    message += '\n-# [Data Provided by Leetify](<https://leetify.com/>)';
    if (steam64Id) {
      message += ` • [Steam Profile](<https://steamcommunity.com/profiles/${steam64Id}>)`;
    }

    return message;
  }
}

module.exports = new CS2RoastGenerator();
