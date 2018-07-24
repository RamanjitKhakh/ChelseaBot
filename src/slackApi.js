const axios = require("axios");
const debug = require("debug")("slash-command-template:ticket");
const qs = require("querystring");
const users = require("./users");

const postMessage = (channelId, text) => {
  axios
    .post(
      "https://slack.com/api/chat.postMessage",
      qs.stringify({
        token: process.env.SLACK_ACCESS_TOKEN,
        channel: channelId,
        text
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

module.exports = {
  postMessage
};
