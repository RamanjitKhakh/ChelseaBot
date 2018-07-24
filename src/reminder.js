const axios = require("axios");
const debug = require("debug")("slash-command-template:ticket");
const database = require("./database");
const cron = require("node-cron");

const slack = require("./slackApi");

const createReminderFromTask = task => {
  const { cronPattern, description, frequency } = task;

  cron.schedule(cronPattern, () => {
    database.getCurrentChoreTeam(team => {
      const { channelId, name } = team;
      const reminderText = `Dear ${name} team, this is a friendly reminder to:\n*${description}*\nTo be done:\n*${frequency}*`;
      slack.postMessage(channelId, reminderText);
    });
  });
};

const generateRemindersFromTasks = () => {
  database.getAllTasks(tasks => {
    tasks.forEach(task => {
      createReminderFromTask(task);
    });
  });
};

module.exports = { createReminderFromTask, generateRemindersFromTasks };
