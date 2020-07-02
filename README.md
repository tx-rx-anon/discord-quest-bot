# Setup

You need to set up a Discord bot via <https://discord.com/developers/applications> to get a token.

## Build and run Docker image

1. Replace `MY-USER-NAME` with your desired user 

       docker build -t MY-USER-NAME/discord-nav-bot .

2. Replace `BOT-TOKEN` with your bot token.

       docker run --rm -e DISCORD_TOKEN='BOT-TOKEN' MY-USER-NAME/discord-nav-bot
       
## Run outside of Docker

    cp .env.tpl .env
    echo "BOT-TOKEN" >> .env
    npm install
    node bot.js

# Methodology

  + The bot keeps a list of waypoints and a destination.
  + A Google Maps route is defined from the current location to the destination. Waypoints are included inbetween the current location and destination.
  + Users can submit and vote on waypoints.
  + Admins (users with `Admin` role) can set the destination and the upvote ratio above which waypoints are accepted into the route.

# Usage

`!help` - show help

`!adminhelp` - show admin help, only available for users with `Admin` role

# Example

As an admin, add a waypoint through Nebraska and set the ratio such that the waypoint (with one initial upvote) is accepted into the route. Show the status, which displays a Google Maps direction link.

`!ratio 1.0`

`!addpoint Nebraska`

`!status`

    discord-nav-bot
    @user, 
    1:    <up> 1 <down> 0   (user)   Nebraska
    <Google Maps link>
