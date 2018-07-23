const axios = require("axios");
const debug = require("debug")("slash-command-template:ticket");
const qs = require("querystring");

/*
 *  Send ticket creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendReminder = channel => {
  console.log("sending reminder");
  axios
    .post(
      "https://slack.com/api/chat.postMessage",
      qs.stringify({
        token: process.env.SLACK_ACCESS_TOKEN,
        channel: channel.id,
        text: "Reminder! It is your chore week!"
      })
    )
    .then(result => {
      debug("sendConfirmation: %o", result.data);
    })
    .catch(err => {
      debug("sendConfirmation error: %o", err);
      console.error(err);
    });
};

module.exports = { sendReminder };
