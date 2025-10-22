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

## Commands

### Available Everywhere

- `/link steam64_id:YOUR_ID` - Link your Steam account
- `/stats` - View your stats
- `/stats user:@username` - View someone else's stats
- `/roast` - Roast yourself
- `/roast user:@username` - Roast someone else
- `/tracker check` - Manually check for new matches

### Server Only

- `/setup channel #channel` - Configure roast channel (Admin)
- `/setup status` - View server configuration
- `/tracker status` - View tracking status
- `/link steam64_id:ID user:@username` - Link another user (Admin)

## How It Works

### Automatic Roasting

- Bot checks for new matches every hour
- When a match is detected, stats are fetched and analyzed
- A roast is generated based on performance
- The roast is posted in configured server channels

### Cooldown System

- No cooldown when matches are detected
- 3-hour cooldown when no new matches found
- Prevents API spam while allowing consecutive games

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
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
LEETIFY_API_KEY=your_leetify_api_key
LEETIFY_API_BASE_URL=https://api-public.cs-prod.leetify.com
CHECK_INTERVAL_MINUTES=60
USER_COOLDOWN_HOURS=3

# Optional: ChatGPT Integration
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
