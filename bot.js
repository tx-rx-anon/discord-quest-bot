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
  help += `> \`${PREFIX}(quest | q) DESCRIPTION\` - Start a quest for yourself.\n`;
  help += `> \`${PREFIX}(task | t) [USER] LOCATION\` - Send user on a quest.\n`;
  help += `> \`${PREFIX}(showquests | sq)\` - Show active quests.\n`;
  help += `> \`${PREFIX}(showtasks | st) [USER]\` - Show active tasks.\n`;
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
  var rtn = null;
  qm.cache.forEach(quest => {
    if (quest.user.id === user.id && quest.active) {
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
          logger.info(reply);
        }
		  }
	  })
	  .catch(collected => {
      embed.setTitle("~~" + embed.title + "~~ (expired)");
      reply.edit(embed);
	  });
}

async function getTaskConfirmation(message, quest, task) {
  const confirmation = await message.channel.send(`${quest.user}, will you go to **${task.destination}**? React in ${DURATION} seconds.`);
  confirmation.react('✅').then(() => confirmation.react('❌'));
  const filter = (reaction, reactingUser) => {
	  return ['✅', '❌'].includes(reaction.emoji.name) && reactingUser.id === quest.user.id;
  };
  confirmation.awaitReactions(filter, { max: 1, time: DURATION*1000, errors: ['time'] })
	  .then(collected => {
		  const reaction = collected.first();
		  if (reaction.emoji.name === '✅') {
        const google = "https://www.google.com/maps/dir/?api=1&destination=" + task.destination.replace(/ /g, '+');
        message.channel.send(`${quest.user}, Open this nav link on your phone: ${google}`);
		  } else if (reaction.emoji.name === '❌') {
        message.channel.send("Pfft.");
      }
	  })
	  .catch(collected => {
	  });
}

async function createTask(message, args) {
  // Create embed
  const mention = args[0];
  if (!mention) return;
  const matches = mention.match(/^<@!?(\d+)>$/);
  let destination = undefined;
  let user = undefined;
	if (matches) {
    user = await getUserFromMention(mention, message.guild);
    destination = args.splice(1).join(' ');
  } else {
    user = message.author;
    destination = args.join(' ');
  }
  if (!user) return;
  if (!destination) return;
  const qm = quests.get(message.guild);
  const quest = getActiveQuest(user, qm);
  if (!quest) {
    if (user === message.author) {
      message.reply("You don't have an active quest.");
    } else {
      message.reply("That user doesn't have an active quest.");
    }
    return;
  }
  const google = "https://maps.google.com?q=" + destination.replace(/ /g, '+');
  const embed = new Discord.MessageEmbed()
        .setTitle(`☑️ New Task`)
        .setColor(EMBED_COLOR)
        .setDescription(`${message.author} is trying to start a new task for ${user}!`)
        .addField("Destination", `[${destination}](${google})`)
        .setFooter(`Vote by reacting with 👍 and 👎. Voting will end in ${DURATION} seconds.`);
  let reply = await message.channel.send(embed);
  const snowflake = Discord.SnowflakeUtil.generate();
  const task = quest.tasks.add({id: snowflake, author: message.author, destination: destination, message: reply});
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
      getTaskConfirmation(message, quest, task);
    } else {
      message.channel.send("Not enough upvotes.");
      task.end();
    }
    logger.info(reply);
  }, DURATION*1000);
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

async function showQuests(message, args) {
  const qm = quests.get(message.guild);
  if (qm.cache.size === 0) {
    message.reply("No active quests.");
    return;
  }
  qm.cache.forEach(quest => {
    if (!quest.active) return;
    const embed = new Discord.MessageEmbed()
          .setTitle(`🚶 Quest`)
          .setColor(EMBED_COLOR)
          .addField("User", quest.user)
          .addField("Description", quest.description || "???");
    const filter = (reaction, reactingUser) => {
	    return ['✅', '❌'].includes(reaction.emoji.name) && reactingUser.id === quest.user.id;
    };
    message.channel.send(embed).then((questMessage) => {
      questMessage.react('✅').then(() => questMessage.react('❌')).then(() => {
        questMessage.awaitReactions(filter, { max: 1 })
	        .then(collected => {
		        const reaction = collected.first();
		        if (reaction.emoji.name === '✅') {
              quest.complete();
              message.channel.send(`${quest.user} finished their quest!`);
		        } else if (reaction.emoji.name === '❌') {
              quest.stop();
              message.channel.send(`${quest.user} bailed on their quest.`);
            }
	        });
      });
    });
  });
}

async function showTasks(message, args) {
  const qm = quests.get(message.guild);
  var user = undefined;
  const mention = args[0];
  if (mention) {
    user = await getUserFromMention(mention, message.guild);
  } else {
    user = message.author;
  }
  if (!user) return;
  let quest = getActiveQuest(user, qm);
  if (!quest) {
    if (user === message.author) {
      message.reply("You don't have an active quest.");
    } else {
      message.reply("That user doesn't have an active quest.");
    }
    return;
  }
  if (quest.tasks.cache.size === 0) {
    if (user === message.author) {
      message.reply("You don't have any active tasks.");
    } else {
      message.reply("That user doesn't have any active tasks.");
    }
    return;
  }
  quest.tasks.cache.forEach(task => {
    if (!task.active) return;
    const google = "https://www.google.com/maps/dir/?api=1&destination=" + task.destination.replace(/ /g, '+');
    const embed = new Discord.MessageEmbed()
          .setTitle(`☑️ Task`)
          .setColor(EMBED_COLOR)
          .addField("Destination", `[${task.destination}](${google})`);
    const filter = (reaction, reactingUser) => {
	    return ['✅', '❌'].includes(reaction.emoji.name) && reactingUser.id === user.id;
    };
    message.channel.send(embed).then((taskMessage) => {
      taskMessage.react('✅').then(() => taskMessage.react('❌')).then(() => {
        taskMessage.awaitReactions(filter, { max: 1 })
	        .then(collected => {
		        const reaction = collected.first();
		        if (reaction.emoji.name === '✅') {
              task.complete();
		        } else if (reaction.emoji.name === '❌') {
              task.stop();
            }
	        });
      });
    });
  });
}

// Event listener when a user sends a message in the chat.
client.on('message', async message => {

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
    createTask(message, args);
    break;
  case 'showquests':
  case 'sq':
    showQuests(message, args);
    break;
  case 'showtasks':
  case 'st':
    showTasks(message, args);
    break;
  case 'help':
  case 'h':
    help(message);
    break;
  // case 'join':
  // case 'j':
  //   if (message.member.voice.channel) {
  //     const connection = await message.member.voice.channel.join();
  //   } else {
  //     message.reply('You need to join a voice channel first!');
  //   }
  //   break;
  }
});

// Initialize bot by connecting to the server
client.login(process.env.DISCORD_TOKEN);
