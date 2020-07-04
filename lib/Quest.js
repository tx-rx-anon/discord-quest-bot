'use strict';

const Discord = require('discord.js');
const TaskManager = require('./TaskManager');

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

    /**
     * A manager of the tasks belonging to this quest
     * @type {TaskManager}
     */
    this.tasks = new TaskManager(this);
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
    this.description = data.description;

    /**
     * The message that announced the quest
     * @type {Discord.Message}
     */
    this.message = data.message;

    if (data.tasks) {
      this.tasks.cache.clear();
      for (const task of data.tasks) this.tasks.add(task);
    }
  }

  /**
   * Complete the task.
   * @returns {Promise<Task>}
   */
  complete() {
    this.active = false;
  }

  /**
   * Stop the task.
   * @returns {Promise<Quest>}
   */
  stop() {
    this.active = false;
  }
}

module.exports = Quest;
