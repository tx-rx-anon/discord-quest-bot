'use strict';

const Discord = require('discord.js');
const Quest = require('./Quest');

/**
 * Represents a task within a quest.
 * @extends {Discord.Base}
 */
class Task extends Discord.Base {
  /**
   * @param {Client} client The instantiating client
   * @param {Object} data The data for the task
   */
  constructor(client, data, quest) {
    super(client);

    /**
     * The quest that this task is part of
     * @type {Quest}
     */
    this.quest = Quest;

    /**
     * Whether this task is active
     * @type {boolean}
     */
    this.active = true;

    /**
     * The ID of the task
     * @type {Snowflake}
     */
    this.id = data.id;

    this._patch(data);
  }

  _patch(data) {
    /**
     * The user that suggested the task
     * @type {?Discord.User}
     * @name Task#author
     */
    this.author = data.author;

    /**
     * The destination of the task
     * @type {string}
     */
    this.destination = data.destination;

    /**
     * The message that announced the quest
     * @type {Discord.Message}
     */
    this.message = data.message;
  }

  /**
   * The timestamp the task was created at
   * @type {number}
   * @readonly
   */
  get createdTimestamp() {
    return Snowflake.deconstruct(this.id).timestamp;
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

module.exports = Task;
