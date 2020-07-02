// Run dotenv
require('dotenv').config();

// Import libraries
const Discord = require('discord.js');
const client = new Discord.Client();

let PREFIX = "%";
if (process.env.CMD_PREFIX) {
  PREFIX = process.env.CMD_PREFIX;
}
const ARROW_UP = "\u2b06";
const ARROW_DOWN = "\u2b07";

let destination = "Iowa";
let ratio = 2.0;

// Event listener when a user connected to the server.
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

class Vote {
  constructor(user, vote) {
    this.user = user;
    this.vote = vote;
  }
}

class Suggestion {
  constructor(user, text) {
    this.user = user;
    this.text = text;
    this.votes = new Array();
    this.votes.push(new Vote(user, true));
  }

  upvote(msg) {
    for (let i = 0; i < this.votes.length; i++) {
      if (this.votes[i].user == msg.author) {
        if (this.votes[i].vote) {
          msg.reply("You already voted for that.");
        } else {
          this.votes[i].vote = true;
          msg.reply("Changed your vote.");
        }
        return;
      }
    }
    this.votes.push(new Vote(msg.author, true));
  }

  upvotes() {
    var rtn = 0;
    for (let i = 0; i < this.votes.length; i++) {
      var vote = this.votes[i];
      if (vote.vote) {
        rtn++;
      }
    }
    return rtn;
  }

  downvote(msg) {
    for (let i = 0; i < this.votes.length; i++) {
      if (this.votes[i].user == msg.author) {
        if (!this.votes[i].vote) {
          msg.reply("You already voted for that.");
        } else {
          this.votes[i].vote = false;
          msg.reply("Changed your vote.");
        }
        return;
      }
    }
    this.votes.push(new Vote(msg.author, false));
  }

  downvotes() {
    var rtn = 0;
    for (let i = 0; i < this.votes.length; i++) {
      var vote = this.votes[i];
      if (!vote.vote) {
        rtn++;
      }
    }
    return rtn;
  }

  accept() {
    var rtn = false;
    var up = this.upvotes();
    var down = this.downvotes();
    if (down == 0) {
      down++;
    }
    if (up / down >= ratio) {
      rtn = true;
    }
    return rtn;
  }
}

var suggestions = new Array();

var status = function(msg) {
  var rtn = "\n";
  var accepted = new Array();
  for (let i = 0; i < suggestions.length; i++) {
    let suggestion = suggestions[i];
    let line = "`" + (i + 1).toString() + "`: ";
    line += "   ";
    line += ARROW_UP + " `";
    line += suggestion.upvotes();
    line += "` ";
    line += ARROW_DOWN + " `";
    line += suggestion.downvotes();
    line += "`   (" + suggestion.user.username + ")   " + suggestion.text;
    if (suggestion.accept()) {
      line = "**" + line + "**";
      accepted.push(encodeURIComponent(suggestion.text.replace(" ", "+")));
    }
    line += "\n";
    rtn += line;
  }
  let link = "https://www.google.com/maps/dir/?api=1"
  link += "&origin=";
  // link += "34.1030032,-118.41046840000001";
  link += "Current+Location";
  link += "&destination=";
  // link += "34.059808,-118.368152";
  link += encodeURIComponent(destination);
  if (accepted.length) {
    link += "&waypoints=";
    link += accepted.join("|");
    // link += "34.072213,-118.399166|34.080318,-118.405343";
  }
  // rtn += link + "\n";
  msg.reply(rtn);
  const embed = new Discord.MessageEmbed()
        .setTitle("Google Maps directions")
        .setURL(link)
        .setDescription("Driving directions from your current location to " + destination + ".")
        .setTimestamp();
  // const embed = new Discord.MessageEmbed().setTitle('Some title');
  msg.channel.send(embed);
}

var getSuggestion = function(num) {
  if (num > 0 && num <= suggestions.length) {
    return suggestions[num - 1];
  }
}

var upvote = function(msg, num) {
  let suggestion = getSuggestion(num);
  if (suggestion) {
    suggestion.upvote(msg);
  }
}

var downvote = function(msg, num) {
  let suggestion = getSuggestion(num);
  if (suggestion) {
    suggestion.downvote(msg);
  }
}

var addPoint = function(msg, point) {
  suggestions.push(new Suggestion(msg.author, point));
  msg.reply("Added waypoint '" + point + "'");
}

var delPoint = function(msg, num) {
  let suggestion = getSuggestion(num);
  if (suggestion && suggestion.user == msg.author) {
    suggestions.splice(num - 1);
    msg.reply("Deleted point `" + num + "`.");
  }
}

var help = function(msg) {
  var help = "\n";
  help += `\`${PREFIX}ping\` - reply 'Pong!'\n`;
  help += `\`(${PREFIX}addpoint | ${PREFIX}a) POINT\` - Add waypoint \`POINT\`.\n`;
  help += `\`(${PREFIX}delpoint | ${PREFIX}b) NUMBER\` - Delete waypoint number \`NUMBER\`. You can only delete the point if you submitted it.\n`;
  help += `\`(${PREFIX}upvote | ${PREFIX}u) NUMBER\` - Upvote waypoint number \`NUMBER\`.\n`;
  help += `\`(${PREFIX}downvote | ${PREFIX}d) NUMBER\` - Downvote waypoint number \`NUMBER\`.\n`;
  help += `\`(${PREFIX}status | ${PREFIX}s)\` - Show waypoints and votes. Points with a voting ratio of 2:1 will be highlighted.\n`;
  help += `\`(${PREFIX}help | ${PREFIX}h)\` - Display this message.\n`;
  msg.reply(help);
}

var setDestination = function(msg, dest) {
  destination = dest;
  msg.reply("Setting destination to " + dest + ".");
}

var adminhelp = function(msg) {
  var help = "\n";
  help += `\`(${PREFIX}destination | ${PREFIX}x) DESTINATION\` - Set destination.\n`;
  help += `\`(${PREFIX}ratio | ${PREFIX}r) RATIO\` - Set the vote ratio for accepting a waypoint. Default is 2.0.\n`;
  help += `\`(${PREFIX}adminhelp | ${PREFIX}z)\` - Display this message.\n`;
  msg.reply(help);
}

var setRatio = function(r) {
  ratio = r;
}

var isAdmin = function(msg) {
  var rtn = false;
  if (msg.member && msg.member.roles.cache.some(role => role.name === 'Admin')) {
    rtn = true;
  }
  return rtn;
}

// Event listener when a user sends a message in the chat.
client.on('message', msg => {

  if (msg.content.startsWith(PREFIX)) {
    var args = msg.content.substring(PREFIX.length).split(' ');
    var cmd = args[0];

    args = args.splice(1);
    switch(cmd) {
    case 'ping':
      msg.reply(msg.author);
      msg.reply('Pong!');
      break;
    case 'addpoint':
    case 'a':
      var point = args.join(" ");
      addPoint(msg, point);
      break;
    case 'delpoint':
    case 'b':
      if (args.length == 1) {
        delPoint(msg, args[0]);
      }
      break;
    case 'upvote':
    case 'u':
      if (args.length == 1) {
        upvote(msg, args[0]);
      }
      break;
    case 'downvote':
    case 'd':
      if (args.length == 1) {
        downvote(msg, args[0]);
      }
      break;
    case 'status':
    case 's':
      if (args.length == 0) {
        status(msg);
      }
      break;
    case 'help':
    case 'h':
      if (args.length == 0) {
        help(msg);
      }
      break;
    ////////////////////
    // ADMIN COMMANDS //
    ////////////////////
    case 'destination':
    case 'x':
      if (isAdmin(msg)) {
        setDestination(msg, args);
      }
      break;
    case 'ratio':
    case 'r':
      if (isAdmin(msg)) {
        if (args.length == 1) {
          setRatio(args);
        }
      }
      break;
    case 'adminhelp':
    case 'z':
      if (args.length == 0) {
        adminhelp(msg);
      }
    }
  }
});

// Initialize bot by connecting to the server
client.login(process.env.DISCORD_TOKEN);
