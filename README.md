# Setup

You need to set up a Discord bot via <https://discord.com/developers/applications> to get a token.

## Build and run Docker image

1. Replace `MY-USER-NAME` with your desired user

       docker build -t MY-USER-NAME/discord-quest-bot .

     Note that a Docker build for `awatt/discord-quest-bot` is triggered automatically on pushes to `develop`. You can pull the image from there.

2. Replace `BOT-TOKEN` with your bot token.

       docker run --rm -e DISCORD_TOKEN='BOT-TOKEN' MY-USER-NAME/discord-nav-bot
       
     You can also add the clause `-e CMD_PREFIX='MY-PREFIX'` to set the command prefix. Default is `zzz `.

## Run outside of Docker

    cp .env.tpl .env
    echo "BOT-TOKEN" >> .env
    npm install
    node bot.js

# Methodology

  + For each server the bot is on, a list of quests is kept.
  + A user can start a quest for themself.
  + Any user can suggest a *task* for any user on a quest.

# Usage

`zzz help` - show help

# Example

`zzz quest Drive to the lake`

`zzz task @user Beer shop, 123 Main Street, Madison WI`
