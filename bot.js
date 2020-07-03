///////////
// Setup //
///////////

// Run dotenv
require('dotenv').config();

// Import libraries
const Discord = require('discord.js');
const client = new Discord.Client();
const QuestBot = require('./lib');
const winston = require('winston');

// Command prefix
const PREFIX = process.env.CMD_PREFIX || "zzz ";

// Color
const EMBED_COLOR = 0x7F00FF;

// Voting duration
const DURATION = 60;

// Setup logger
// https://www.npmjs.com/package/winston#usage
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Quests
let quests = new Discord.Collection();

// Event listener when a user connected to the server.
client.on('ready', () => {
  logger.info(`Logged in as ${client.user.tag}!`);
  client.guilds.cache.forEach(guild => {
    logger.info(`Adding a QuestManager for ${guild.name}!`);
    quests.set(guild, new QuestBot.QuestManager(guild));
  });
});

//////////////
// Commands //
//////////////

function pong(message, args) {
  message.reply('Pong!');
}

function help(message) {
  var help = "\n";
  help += `My prefix for commands is \`${PREFIX}\`\n`;
  help += `\n`;
  help += `**User commands**\n`;
  help += `> \`${PREFIX}quest DESCRIPTION\` - Start a quest for yourself.\n`;
  help += `> \`${PREFIX}task USER LOCATION\` - Send user on a quest.\n`;
  help += `> \`${PREFIX}endtask\` - End the task you're on.\n`;
  help += `> \`${PREFIX}endquest\` - End the quest you're on.\n`;
  help += `> \`${PREFIX}status\` - Show active quests.\n`;
  // help += `\`${PREFIX}ping\` - reply 'Pong!'\n`;
  help += `> \`${PREFIX}help\` - Display this message.\n`;
  help += `\n`;
  const embed = new Discord.MessageEmbed()
        .setTitle("Nav Bot Help")
        .setDescription(help)
        .setColor(EMBED_COLOR);
  message.channel.send(embed);
}

function getUserFromMention(mention, guild) {
	const matches = mention.match(/^<@!?(\d+)>$/);
	if (!matches) return;
	const snowflake = matches[1];
	return guild.members.fetch(snowflake);
}

function getActiveQuest(user, qm) {
  let rtn = undefined;
  qm.cache.forEach(quest => {
    if (quest.user === user && quest.active) {
      rtn = quest;
    }
  });
  return rtn;
}

async function createQuest(message, args) {
  const description = args.join(' ');
  const user = message.author;
  if (!user) return;
  const qm = quests.get(message.guild);
  if (getActiveQuest(user, qm)) {
    message.reply("You already have an active quest.");
    return;
  }
  // Create embed
  const embed = new Discord.MessageEmbed()
        .setTitle(`🚶 New Quest`)
        .setColor(EMBED_COLOR)
        .setDescription(`${user} is starting a new quest!`)
        .addField("Description", description || "???")
        .addField("Agreement", `${user}, reacting to this message with a ✅ acts as consent to the terms of service of *And what about the truth* and Discord. We may quote and save your messages and may record your voice and video on this quest. You have ${DURATION} seconds to react or this quest will expire.`);
  let reply = await message.channel.send(embed);
  // Get reactions
  reply.react('✅');
  const filter = (reaction, user) => {
	  return ['✅'].includes(reaction.emoji.name) && user.id === message.author.id;
  };
  reply.awaitReactions(filter, { max: 1, time: DURATION*1000, errors: ['time'] })
	  .then(collected => {
		  const reaction = collected.first();
		  if (reaction.emoji.name === '✅') {
        if (getActiveQuest(user, qm)) {
          message.reply("You already have an active quest.");
        } else {
			    message.reply("Your quest is confirmed.");
          const snowflake = Discord.SnowflakeUtil.generate();
          qm.add({id: snowflake, user: user, description: description, message: reply});
        }
		  }
	  })
	  .catch(collected => {
      embed.setTitle("~~" + embed.title + "~~ (expired)");
      reply.edit(embed);
	  });
}

async function getTaskConfirmation(message, quester, destination) {
  const confirmation = await message.channel.send(`${quester}, will you go to ${destination}?`);
  confirmation.react('✅').then(() => confirmation.react('❌'));
  const filter = (reaction, user) => {
	  return ['✅', '❌'].includes(reaction.emoji.name) && user.id === quester.id;
  };
  confirmation.awaitReactions(filter, { max: 1, time: DURATION*1000, errors: ['time'] })
	  .then(collected => {
		  const reaction = collected.first();
		  if (reaction.emoji.name === '✅') {
        const google = "https://www.google.com/maps/dir/?api=1&destination=" + destination.replace(' ', '+');
       message.channel.send(`Open this nav link on your phone: ${google}`);
		  } else if (reaction.emoji.name === '❌') {
        message.channel.send("Pfft.");
      }
	  })
	  .catch(collected => {
      console.log(collected);
	  });
}

async function sendUserOnTask(message, args) {
  // Create embed
  const mention = args[0];
  if (!mention) return;
  const user = await getUserFromMention(mention, message.guild);
  if (!user) return;
  const destination = args.splice(1).join(' ');
  if (!destination) return;
  const google = "https://maps.google.com?q=" + destination.replace(' ', '+');
  const embed = new Discord.MessageEmbed()
        .setTitle(`☑️ New Task`)
        .setColor(EMBED_COLOR)
        .setDescription(`${message.author} is trying to start a new task for ${user}!`)
        .addField("Destination", `[${destination}](${google})`)
        .addField("Voting", `Vote by reacting with 👍 and 👎, voting will end in ${DURATION} seconds...`);
  let reply = await message.channel.send(embed);
  // Get reactions
  reply.react('👍').then(() => reply.react('👎'));
  setTimeout(function(){
    let ratio = 1;
    let u = 1;
    let d = 1;
    reply.reactions.cache.forEach(reaction => {
      if (reaction.emoji.name === '👍') {
        u = reaction.count;
      } else if (reaction.emoji.name === '👎') {
        d = reaction.count;
      }
    });
    ratio = u / d;
    if (ratio >= 2.0) {
      message.channel.send("The community is in favor.");
      getTaskConfirmation(message, user, destination);
    } else {
      message.channel.send("Not enough upvotes.");
    }
  }, 5*1000);
}

async function endTask(message, args) {
  const user = message.author;
  if (!user) return;
  const qm = quests.get(message.guild);
  const quest = getActiveQuest(user, qm);
  if (!quest) {
    message.reply("You don't have an active quest.");
    return;
  } else {
    const embed = new Discord.MessageEmbed()
          .setTitle(`Ended Task`)
          .setColor(EMBED_COLOR)
          .setDescription(`${user} just ended their task. Was it a success? React to let us know. Give them something else to do.`)
          .addField("Route", `  • \n  • \n[Google Maps](https://maps.google.com)`);
    let reply = await message.channel.send(embed);
    reply.react('👍').then(() => reply.react('👎'));
  }
}

async function endQuest(message, args) {
  const user = message.author;
  if (!user) return;
  const qm = quests.get(message.guild);
  const quest = getActiveQuest(user, qm);
  if (!quest) {
    message.reply("You don't have an active quest.");
    return;
  } else {
    const embed = new Discord.MessageEmbed()
          .setTitle(`Ended Quest`)
          .setColor(EMBED_COLOR)
          .setDescription(`${user} just ended their quest. Was it a success? React to let us know.`)
          .addField("Route", `  • \n  • \n[Google Maps](https://maps.google.com)`);
    let reply = await message.channel.send(embed);
    reply.react('👍').then(() => reply.react('👎'));
  }
}

async function status(message, args) {
  const qm = quests.get(message.guild);
  let status = "";
  qm.cache.forEach(quest => {
    status += `  • ${quest.user}   ` + (quest.description || "???") + "\n";
  });
  if (status === "") status = "*No active quests.*";
  const embed = new Discord.MessageEmbed()
        .setTitle(`Active Quests`)
        .setColor(EMBED_COLOR)
        .setDescription(status);
  message.channel.send(embed);
}

// Event listener when a user sends a message in the chat.
client.on('message', message => {

  if (!message.content.startsWith(PREFIX)) return;

  var args = message.content.substring(PREFIX.length).split(' ');
  var cmd = args[0];
  args = args.splice(1);

  switch(cmd) {
  case 'ping':
    pong(message, args);
    break;
  case 'quest':
  case 'q':
    createQuest(message, args);
    break;
  case 'task':
  case 't':
    sendUserOnTask(message, args);
    break;
  case 'endtask':
  case 'e':
    endTask(message, args);
    break;
  case 'endquest':
  case 'f':
    endQuest(message, args);
    break;
  case 'status':
  case 's':
    status(message, args);
    break;
  case 'help':
  case 'h':
    help(message);
    break;
  }
});

// Initialize bot by connecting to the server
client.login(process.env.DISCORD_TOKEN);
