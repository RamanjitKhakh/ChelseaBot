const axios = require("axios");
const debug = require("debug")("slash-command-template:ticket");
const database = require("./database");
const cron = require("node-cron");

const slack = require("./slackApi");

let cronJobs = [];

const createReminderFromTask = task => {
  const { cronPattern, description, frequency } = task;

  const taskCron = cron.schedule(cronPattern, () => {
    if (task.notify === "all") {
      const reminderText = `Everyone!, this is a friendly reminder to:\n*${description}*\nTo be done:\n*${frequency}*`;
      slack.postMessageToAll(reminderText);
    } else {
      database.getCurrentChoreTeam(team => {
        const { channelId, name } = team;
        const reminderText = `Dear ${name} team, this is a friendly reminder to:\n*${description}*\nTo be done:\n*${frequency}*`;
        slack.postMessageToChannel(channelId, reminderText);
      });
    }
  });

  cronJobs.push(taskCron);
};

const killAllTasks = () => {
  cronJobs.forEach(job => job.destroy());
  cronJobs = [];
};

const generateRemindersFromTasks = () => {
  killAllTasks();
  database.getAllTasks(tasks => {
    if (tasks) {
      tasks.forEach(task => {
        createReminderFromTask(task);
      });
    }
  });
};

module.exports = { createReminderFromTask, generateRemindersFromTasks };
