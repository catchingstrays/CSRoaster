# CS2 Roast Bot

A Discord bot that automatically tracks CS2 players and roasts them based on their match statistics.

## Add to Your Server

**[Add CS2 Roast Bot to Your Discord Server](https://discord.com/oauth2/authorize?scope=bot+applications.commands&client_id=1430077771920441387)**

## Features

- **Slash Commands**: Modern Discord UI with autocomplete and inline help
- **Automatic Command Deployment**: Commands automatically register per server
- **Multi-Server Support**: Works across unlimited Discord servers
- **Auto-Onboarding**: Automatically sets up new servers with welcome messages
- **Per-Server Configuration**: Each server sets its own roast channel
- **Fully Automated Match Tracking**: Checks all linked players every hour
- **Cross-Server User Support**: Users can link in multiple servers
- **Smart API Caching**: Fetches Leetify data once, sends to all relevant servers
- **Stat Comparison**: Compares performance between matches
- **Performance-Based Roasts**: Roasts based on stat degradation
- **Intelligent Cooldown**: Only applies when no new matches detected (allows consecutive games)
- **Offline Guild Detection**: Detects servers joined while bot was offline
- **Auto-Cleanup**: Removes all data when bot leaves a server
- **State Persistence**: Restores previous state on startup
- **Configurable Timers**: Adjust check intervals via environment variables

## Installation

1. Install dependencies
```bash
npm install
```

2. Create `.env` file

3. Run the bot

## Initial Setup (Server Admins)

### 1. Add the Bot
When you add the bot to your server, it will:
- Automatically deploy slash commands
- Send a welcome message with setup instructions
- Be ready to use immediately

### 2. Configure the Bot
An admin must set up the roast channel using:
```
/setup channel #roasts
```

This sets where automatic roasts will be posted.

### 3. Check Setup Status
```
/setup status
```

## Commands

All commands are **slash commands** - start typing `/` in Discord to see them with autocomplete!

### User Commands

**Link your Steam account:**
```
/link steam64_id:76561198123456789
```
Find your Steam64 ID at [steamid.io](https://steamid.io/)

**View your stats:**
```
/stats
/stats user:@username
```

**Check tracker status:**
```
/tracker status
/tracker check
/tracker check user:@username
```

### Admin Commands

**Setup roast channel (requires Manage Server permission):**
```
/setup channel #roasts
/setup status
```

**Link other users (requires Administrator permission):**
```
/link steam64_id:76561198123456789 user:@username
```

## Multi-Server Behavior

- Users can link their account in multiple servers
- Each server has its own configured roast channel
- When a user finishes a match, the **same roast** is sent to all servers where they're linked
- API is called only **once per user**, not once per server (efficient!)
- When bot leaves a server, all data for that server is automatically deleted
- Users linked in other servers remain unaffected
- Commands are automatically deployed per server when bot joins
- If bot was offline when added to a server, it detects and deploys commands on startup

## Cooldown System

The bot uses an intelligent cooldown system:
- **Match detected**: No cooldown applied (allows players to play consecutive games)
- **No match detected**: 3-hour cooldown applied (prevents API spam for inactive players)

This means players can play multiple CS2 games in a row and get roasted after each one!

## Configuration

Create a `.env` file with the following variables:

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# Leetify API Configuration
LEETIFY_API_KEY=your_leetify_api_key_here
LEETIFY_API_BASE_URL=https://api-public.cs-prod.leetify.com

# Match Tracker Settings
CHECK_INTERVAL_MINUTES=60  # How often to check for new matches (default: 60 minutes)
USER_COOLDOWN_HOURS=3      # Cooldown period after no new match detected (default: 3 hours)
```

You can adjust the timing by changing the environment variables in `.env`.

## Requirements

- Node.js v16.9.0+
- Discord bot token
- Leetify API key

## Get Leetify API Key

Visit [Leetify API Docs](https://api-public-docs.cs-prod.leetify.com)

## Attribution

This application uses data **Powered by Leetify**. CS2 Roast Bot is an independent application and is not an official Leetify app or endorsed by Leetify.

- All player statistics are sourced from Leetify
- Visit [Leetify](https://leetify.com) for detailed CS2 player analytics

![Powered by Leetify](assets/Leetify%20Badge%20White%20Small.png)

## License

MIT
