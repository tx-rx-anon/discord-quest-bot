'use strict';

const Discord = require('discord.js');
const Quest = require('./Quest');

class QuestManager extends Discord.BaseManager {
  constructor(guild, iterable) {
    super(guild.client, iterable, Quest);
    /**
     * The guild belonging to this manager
     * @type {Guild}
     */
    this.guild = guild;
  }

  /**
   * The quest cache of this manager
   * @type {Collection<Snowflake, Quest>}
   * @name QuestManager#cache
   */

  add(data, cache) {
    const existing = this.cache.get(data.id);
    return existing ? existing.patch(data) : super.add(data, cache, { id: data.id });
  }

  /**
   * Obtains one or more quests from Discord, or the quest cache if they're already available.
   * @param {Snowflake} [id] ID or IDs of the quest(s)
   * @param {boolean} [cache=true] Whether to cache the new quests objects if it weren't already
   * @returns {Promise<Quest|QuestManager>}
   */
  async fetch(id, cache = true) {
    if (id) {
      const existing = this.cache.get(id);
      if (existing) return existing;
    }
  }
}

module.exports = QuestManager;
