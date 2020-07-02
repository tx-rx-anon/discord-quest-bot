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
          const quest = new QuestBot.Quest(client, {id: snowflake, user: user, description: description, message: reply});
          qm.add(quest);
        }
		  }
	  })
	  .catch(collected => {
      console.log(collected);
      embed.setTitle("~~" + embed.title + "~~ (expired)");
      reply.edit(embed);
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
        .setDescription(`${message.author} is trying to start a new task for ${user}! Voting will end in ${DURATION} seconds...`)
        .addField("Destination", `[${destination}](${google})`);
  let reply = await message.channel.send(embed);
  // Get reactions
  reply.react('👍').then(() => reply.react('👎'));
  const filter = (reaction, user) => {
	  return ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
  };
  reply.awaitReactions(filter, { max: 1, time: DURATION*1000, errors: ['time'] })
	  .then(collected => {
		  const reaction = collected.first();
		  if (reaction.emoji.name === '👍') {
			  reply.reply('you reacted with a thumbs up.');
        // let task = new QuestBot.Task(client, {id: Discord.SnowflakeUtil.generate()});
		  } else {
			  reply.reply('you reacted with a thumbs down.');
		  }
	  })
	  .catch(collected => {
		  reply.reply('you reacted with neither a thumbs up, nor a thumbs down.');
	  });
}

async function status(message, args) {
  const qm = quests.get(message.guild);
  let status = "";
  qm.cache.forEach(quest => {
    status += `  • (${quest.user}) ` + (quest.description || "???") + "\n";
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
