const axios = require("axios");
const debug = require("debug")("slash-command-template:ticket");
const database = require("./database");
const cron = require("node-cron");

const slack = require("./slackApi");

const createReminderFromTask = task => {
  const { cronPattern, description, frequency } = task;

  cron.schedule(cronPattern, () => {
    if (task.notify === "all") {
      const reminderText = `Everyone!, this is a friendly reminder to:\n*${description}*\nTo be done:\n*${frequency}*`;
      slack.postMessageToAll(reminderText);
    } else if (task.notify === "choreTeam") {
      database.getCurrentChoreTeam(team => {
        const { channelId, name } = team;
        const reminderText = `Dear ${name} team, this is a friendly reminder to:\n*${description}*\nTo be done:\n*${frequency}*`;
        slack.postMessageToChannel(channelId, reminderText);
      });
    }
  });
};

const generateRemindersFromTasks = () => {
  database.getAllTasks(tasks => {
    if (tasks) {
      tasks.forEach(task => {
        createReminderFromTask(task);
      });
    }
  });
};

module.exports = { createReminderFromTask, generateRemindersFromTasks };
