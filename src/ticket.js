const axios = require("axios");
const debug = require("debug")("slash-command-template:ticket");
const qs = require("querystring");
const users = require("./users");
const database = require("./database");
const reminder = require("./reminder");

/*
 *  Send ticket creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendConfirmation = ticket => {
  axios
    .post(
      "https://slack.com/api/chat.postMessage",
      qs.stringify({
        token: process.env.SLACK_ACCESS_TOKEN,
        channel: ticket.userId,
        text: "Chore created!",
        attachments: JSON.stringify([
          {
            title: `Chore created by ${ticket.userEmail}`,
            text: ticket.text,
            fields: [
              {
                title: "Title",
                value: ticket.title
              },
              {
                title: "Description",
                value: ticket.description || "None provided"
              },
              {
                title: "Status",
                value: "Open",
                short: true
              },
              {
                title: "Urgency",
                value: ticket["time_interval"],
                short: true
              }
            ]
          }
        ])
      })
    )
    .then(result => {
      const expire = ticket.expire;
      const interval = ticket["time_interval"];
      const cronOffset = interval.split("").pop() === "d" ? 2 : 0;
      let cronString =
        interval.split("").pop() === "d" ? "0 9 * * *" : "* * * * *";
      const intervalValue = interval.substring(0, interval.length - 1);
      cronString = cronString.split(" ");
      cronString[cronOffset] = cronString[cronOffset] + "/" + intervalValue;
      cronString = cronString.join(" ");
      const task = {
        category: ticket.title,
        description: ticket.description,
        cronPattern: cronString,
        shouldExpire: expire === "true"
      };
      database.addTask(task, () => {
        reminder.generateRemindersFromTasks();
      });

      debug("sendConfirmation: %o", result.data);
    })
    .catch(err => {
      debug("sendConfirmation error: %o", err);
      console.error(err);
    });
};

// Create helpdesk ticket. Call users.find to get the user's email address
// from their user ID
const create = (userId, submission) => {
  const ticket = {};

  const fetchUserEmail = new Promise((resolve, reject) => {
    users
      .find(userId)
      .then(result => {
        debug(`Find user: ${userId}`);
        resolve(result.data.user.profile.email);
      })
      .catch(err => {
        reject(err);
      });
  });
  fetchUserEmail
    .then(result => {
      ticket.userId = userId;
      ticket.userEmail = result;
      ticket.title = submission.title;
      ticket.description = submission.description;
      ticket["time_interval"] = submission["time_interval"];
      ticket.expire = submission.expire;
      sendConfirmation(ticket);

      return ticket;
    })
    .catch(err => {
      console.error(err);
    });
};

module.exports = { create, sendConfirmation };
