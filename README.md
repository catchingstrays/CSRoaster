# CS2 Roast Bot

A Discord bot that automatically tracks CS2 players and roasts them based on their match statistics.

## Add to Your Server

**[Add CS2 Roast Bot to Your Discord Server](https://discord.com/oauth2/authorize?scope=bot+applications.commands&client_id=1430077771920441387)**

## Features

- **Multi-Server Support**: Works across unlimited Discord servers
- **Per-Server Configuration**: Each server sets its own roast channel
- **Fully Automated Match Tracking**: Checks all linked players every hour
- **Cross-Server User Support**: Users can link in multiple servers
- **Smart API Caching**: Fetches Leetify data once, sends to all relevant servers
- **Stat Comparison**: Compares performance between matches
- **Performance-Based Roasts**: Roasts based on stat degradation
- **Cooldown System**: 3-hour cooldown per user after match detection
- **Auto-Cleanup**: Removes all data when bot leaves a server
- **State Persistence**: Restores previous state on startup

## Installation

1. Install dependencies
```bash
npm install
```

2. Create `.env` file

3. Run the bot

## Initial Setup (Server Admins)

### 1. Configure the Bot
After adding the bot to your server, an admin must set up the roast channel:
```
!setup #roasts
```

This sets where automatic roasts will be posted.

### 2. Check Setup Status
```
!setup status
```

## Commands

### User Commands

**Link your Steam account:**
```
!link <steam64_id>
```
Find your Steam64 ID at [steamid.io](https://steamid.io/)

**View your stats:**
```
!stats
!stats @user
```

**Check tracker status:**
```
!tracker status
!tracker check [@user]
```

### Admin Commands

**Setup roast channel (requires Manage Server permission):**
```
!setup #channel
!setup status
```

**Link other users (admin only):**
```
!link @user <steam64_id>
```

## Multi-Server Behavior

- Users can link their account in multiple servers
- Each server has its own configured roast channel
- When a user finishes a match, the **same roast** is sent to all servers where they're linked
- API is called only **once per user**, not once per server (efficient!)
- When bot leaves a server, all data for that server is automatically deleted
- Users linked in other servers remain unaffected

## Configuration

Edit `services/matchTracker.js` to adjust timing:

```javascript
const CHECK_INTERVAL = 60 * 60 * 1000; // How often to check for new matches
const USER_COOLDOWN = 3 * 60 * 60 * 1000; // Cooldown after detecting a match
```

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
