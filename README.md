# CS2 Roast Bot

A Discord bot that automatically tracks CS2 players and roasts them based on their match statistics.

## Installation Links

**[Add to Server](https://discord.com/oauth2/authorize?scope=bot+applications.commands&client_id=1430077771920441387)** - Enable automatic roasting in your server

**[Install to Account](https://discord.com/oauth2/authorize?scope=applications.commands&client_id=1430077771920441387&integration_type=1)** - Use commands in DMs and anywhere

## Features

- Automatic match tracking and roasting
- Works in servers, DMs, and group DMs
- Global and per-server account linking
- Slash commands with autocomplete
- Multi-server support with independent configuration
- Smart API caching and cooldown system
- Automatic onboarding for new servers

## Quick Start

### For Servers

1. Add the bot to your server
2. Run `/setup channel #roasts` to configure the roast channel
3. Run `/link steam64_id:YOUR_ID` to link your Steam account
4. Get roasted automatically after matches

### For Personal Use

1. Install the bot to your account
2. Run `/link steam64_id:YOUR_ID` in DMs
3. Use `/stats`, `/roast`, and `/tracker check` anywhere

Find your Steam64 ID at [steamid.io](https://steamid.io/)

## DM Notifications

### Automatic DM Roasts

When you link your account with `/link`, the bot will send you a test message to confirm it can DM you. If successful:
- ✅ You'll receive roasts in DMs when new matches are detected
- ✅ You'll also get roasted in server channels (if you're linked there)
- ✅ Immediate notifications even when away from servers

**Note:** Make sure your Discord DMs are open:
- Settings → Privacy & Safety → Allow direct messages from server members

### Opting Out

Don't want DM roasts? Use `/optout dm_roasts` to disable them.
- You'll still get roasted in servers
- Re-run `/link` to re-enable DM notifications

### Admin-Linked Users

If a server admin links your account, you'll only receive DMs if:
1. You have the bot installed to your account, AND
2. Your DMs are open

Otherwise, you'll only be roasted in that server's channels.

## Commands

### Available Everywhere

- `/link steam64_id:YOUR_ID` - Link your Steam account
- `/stats` - View your stats
- `/stats user:@username` - View someone else's stats
- `/roast` - Roast yourself
- `/roast user:@username` - Roast someone else
- `/tracker check` - Manually check for new matches
- `/optout dm_roasts` - Disable DM roast notifications

### Server Only

- `/setup channel #channel` - Configure roast channel (Admin)
- `/setup status` - View server configuration
- `/tracker status` - View tracking status
- `/link steam64_id:ID user:@username` - Link another user (Admin)

## How It Works

### Automatic Roasting

- Bot intelligently checks for new matches based on learned play patterns
- When a match is detected, stats are fetched and analyzed
- A roast is generated based on performance
- The roast is posted in configured server channels

### Intelligent Match Detection System

⚠️ **IMPORTANT: Universal Timezone** - The bot uses **UTC timezone** for all users globally. This is intentional to ensure consistent behavior across all regions. The bot will still learn your play patterns correctly regardless of your actual timezone.

The bot uses **advanced machine learning** to optimize API usage and detection speed:

**Learning Algorithm:**
- Tracks when each player typically plays (day-of-week + hour-of-day patterns)
- Learns from as few as 3 matches
- Adapts to individual play schedules automatically
- No manual configuration needed

**Dynamic Checking States:**
- **JUST_PLAYED** (after match detected): Check every 30 minutes for 2 hours to catch consecutive games
- **ACTIVE_SESSION** (during learned play hours): Check every 30 minutes up to 4 times
- **INACTIVE** (outside play hours): Check every 3 hours to save API calls
- **SOFT_RESET** (inactive >7 days): Check once per day until player returns

**Benefits:**
- 50-60% fewer API calls compared to fixed-interval checking
- 2x faster match detection during active play times
- Minimal API waste for inactive players
- Automatically adapts to schedule changes

**Example:** If the bot learns you play Monday/Wednesday/Friday 6-10pm (in your local time), it will:
- Check every 30 min during those hours
- Check every 3 hours outside those hours
- After detecting a match, check every 30 min for 2 hours (you might play another game)

### Multi-Server Support

- Link once, roast everywhere
- Each server has independent configuration
- API called once per user, roast sent to all servers
- Data automatically cleaned up when bot leaves

## Development Setup

### Requirements

- Node.js v16.9.0+
- Discord bot token
- Leetify API key from [api-public-docs.cs-prod.leetify.com](https://api-public-docs.cs-prod.leetify.com)

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```bash
# Required
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
LEETIFY_API_KEY=your_leetify_api_key
LEETIFY_API_BASE_URL=https://api-public.cs-prod.leetify.com

# Legacy settings (kept for backward compatibility)
CHECK_INTERVAL_MINUTES=60
USER_COOLDOWN_HOURS=3

# Intelligent Learning System (Optional - defaults shown)
PLAY_LEARNING_ENABLED=true
MIN_MATCHES_FOR_LEARNING=3
JUST_PLAYED_CHECK_INTERVAL=30
JUST_PLAYED_DURATION=120
ACTIVE_SESSION_CHECK_INTERVAL=30
MAX_ACTIVE_SESSION_CHECKS=4
INACTIVE_CHECK_INTERVAL=180
SOFT_RESET_DAYS=7
SOFT_RESET_CHECK_INTERVAL=1440

# ChatGPT Integration (Optional)
CHATGPT_ENABLED=false
CHATGPT_API_KEY=your_openai_api_key
```

### ChatGPT Roasts (Optional)

Enable AI-generated roasts using OpenAI's ChatGPT:

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Set `CHATGPT_ENABLED=true` in your `.env` file
3. Add your `CHATGPT_API_KEY`

**Features:**
- Personalized roasts based on player stats
- Automatic caching (same roast for same match count)
- Fallback to traditional roasts if API fails
- Uses GPT-4o-mini for cost efficiency

**Note:** ChatGPT API usage incurs costs. Traditional roasts are free and always available as fallback.

### Run

```bash
npm start
```

## Attribution

Powered by Leetify. All player statistics are sourced from [Leetify](https://leetify.com). This is an independent application and is not officially endorsed by Leetify.

![Powered by Leetify](assets/Leetify%20Badge%20White%20Small.png)

## License

MIT
