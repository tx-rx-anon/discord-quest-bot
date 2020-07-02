'use strict';

const Discord = require('discord.js');

/**
 * Represents a quest.
 * @extends {Discord.Base}
 */
class Quest extends Discord.Base {
  /**
   * @param {Client} client The instantiating client
   * @param {Object} data The data for the quest
   */
  constructor(client, data) {
    super(client);

    /**
     * Whether this quest is active
     * @type {boolean}
     */
    this.active = true;

    if (data) this._patch(data);
  }

  _patch(data) {
    /**
     * The ID of the quest
     * @type {Discord.Snowflake}
     */
    this.id = data.id;

    /**
     * The user on the quest
     * @type {Discord.User}
     */
    this.user = data.user;

    /**
     * The description of the quest
     * @type {Discord.User}
     */
    this.descritption = data.description;

    /**
     * The message that announced the quest
     * @type {Discord.Message}
     */
    this.message = data.message;
  }
}

module.exports = Quest;
