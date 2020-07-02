'use strict';

const Discord = require('discord.js');

/**
 * Represents a task within a quest.
 * @extends {Discord.Base}
 */
class Task extends Discord.Base {
  /**
   * @param {Client} client The instantiating client
   * @param {Object} data The data for the task
   */
  constructor(client, data) {
    super(client);

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
    if (data.author) this.author = data.author;

    /**
     * The user on the quest
     * @type {?Discord.User}
     * @name Task#adventurer
     */
    if (data.adventurer) this.adventurer = data.adventurer;
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
   * The time the task was created at
   * @type {Date}
   * @readonly
   */
  get createdAt() {
    return new Date(this.createdTimestamp);
  }

  /**
   * Checks if the user is equal to another. It compares ID, username, discriminator, avatar, and bot flags.
   * It is recommended to compare equality by using `user.id === user2.id` unless you want to compare all properties.
   * @param {User} user User to compare with
   * @returns {boolean}
   */
  equals(user) {
    let equal =
      user &&
      this.id === user.id;

    return equal;
  }

  toJSON(...props) {
    const json = super.toJSON(
      {
        createdTimestamp: true
      },
      ...props,
    );
    return json;
  }
}

module.exports = Task;
