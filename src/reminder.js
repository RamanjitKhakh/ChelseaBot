const axios = require("axios");
const debug = require("debug")("slash-command-template:ticket");
const qs = require("querystring");
const database = require("./database");
const cron = require("node-cron");

const sendReminder = (channeld, reminderText) => {
  axios
    .post(
      "https://hooks.slack.com/services/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",
      {
        token: process.env.SLACK_ACCESS_TOKEN,
        channel: channeld,
        text: reminderText
      }
    )
    .then(result => {
      debug("sendConfirmation: %o", result.data);
    })
    .catch(err => {
      debug("sendConfirmation error: %o", err);
      console.error(err);
    });
};

const generateReminders = () => {
  database.getAllTasks(tasks => {
    tasks.forEach(task => {
      console.log(task);
      const { cronPattern, description, frequency } = task;
      const reminderText = `Dear Dev team, this is a friendly reminder to:\n*${description}*\nTo be done:\n*${frequency}*`;

      cron.schedule(cronPattern, () => {
        const channelId = "CBVASD22H";
        sendReminder(channelId, reminderText);
      });
    });
  });
};

module.exports = { generateReminders };
