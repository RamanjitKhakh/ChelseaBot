require("dotenv").config();

const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");
const qs = require("querystring");
const Botkit = require("botkit");
const debug = require("debug")("slash-command-template:index");

var memory_store = require("./memorystore.js");
const ticket = require("./ticket");
const reminder = require("./reminder.js");
const beerbot = require("./beerbot.js");
const scheduleJob = require("./scheduleJob");
const incoming_webhooks = require("./components/routes/incoming_webhooks.js");

// Create the Botkit controller, which controls all instances of the bot.
var controller = Botkit.slackbot({
  debug: false,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
});

controller.setupWebserver(process.env.WEBHOOK_PORT, function(err, webserver) {
  controller.createWebhookEndpoints(controller.webserver);
  //controller.createOauthEndpoints(controller.webserver);
  incoming_webhooks(webserver, controller);
});
// Set up an Express-powered webserver to expose oauth and webhook endpoints
//require(__dirname + "/components/express_webserver.js")(controller);

controller.startTicking();

const database = require("./database");
const app = express();

let lastSuccessfulTimestamp = Date.now();

let GlobalChannelList = [];

const TeamsList = [
  {
    value: "Sales",
    name: "sales",
    group: "@channel"
  },
  {
    value: "Marketing/Product/G&A",
    name: "marketing",
    group: "@channel"
  },
  {
    value: "Dev",
    name: "dev",
    group: "@channel"
  },
  {
    value: "CS",
    name: "cs",
    group: "@channel"
  }
];

scheduleJob.generateDefaultScheduleJobs();
reminder.generateRemindersFromTasks();
/*
 * Parse application/x-www-form-urlencoded && application/json
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send(
    "<h2>The Slash Command and Dialog app is running</h2> <p>Follow the" +
      " instructions in the README to configure the Slack App and your environment variables.</p>"
  );
});

/*
 * Endpoint to receive /helpdesk slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */
app.post("/commands", (req, res) => {
  // extract the verification token, slash command text,
  // and trigger ID from payload
  const { token, text, trigger_id } = req.body;

  // check that the verification token matches expected value
  if (token === process.env.SLACK_VERIFICATION_TOKEN) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: "Submit a new chore!",
        callback_id: "submit-ticket",
        submit_label: "Submit",
        elements: [
          {
            label: "Task Category",
            type: "text",
            name: "title",
            value: text,
            hint: "30 second summary of the problem"
          },
          {
            label: "Description of Task",
            type: "textarea",
            name: "description"
          },
          {
            label: "How often?",
            type: "select",
            name: "expire",
            options: [
              { label: "Every Week", value: "false" },
              { label: "Only once", value: "true" }
            ]
          },
          {
            label: "When to remind them?",
            type: "select",
            name: "time_interval",
            option_groups: [
              {
                label: "Seconds",
                options: [
                  { label: "every 5 seconds", value: "5s" },
                  { label: "every 10 seconds", value: "10s" },
                  { label: "every 30 seconds", value: "30s" }
                ]
              },
              {
                label: "Days",
                options: [
                  { label: "Every day", value: "1d" },
                  { label: "Every 2 days", value: "2d" },
                  { label: "Every 3 days", value: "3d" },
                  { label: "Every 4 days", value: "4d" },
                  { label: "Every 5 days", value: "5d" }
                ]
              }
            ]
          }
        ]
      })
    };

    // open the dialog by calling dialogs.open method and sending the payload
    axios
      .post("https://slack.com/api/dialog.open", qs.stringify(dialog))
      .then(result => {
        debug("dialog.open: %o", result.data);
        res.send("");
      })
      .catch(err => {
        debug("dialog.open call failed: %o", err);
        res.sendStatus(500);
      });
  } else {
    debug("Verification token mismatch");
    res.sendStatus(500);
  }
});

/*
 * Endpoint to receive the dialog submission. Checks the verification token
 * and creates a Helpdesk ticket
 */
app.post("/interactive-component", (req, res) => {
  const body = JSON.parse(req.body.payload);

  console.log("in interactive component");
  if (body.type === "interactive_message") {
    const selected = body.original_message.attachments[body.attachment_id - 1];
    database.deleteTask(selected.callback_id, () => {
      reminder.generateRemindersFromTasks();
    });
    body.original_message.attachments.splice(body.attachment_id - 1, 1);
    axios
      .post(body.response_url, {
        attachments: body.original_message.attachments
      })
      .then(result => {
        debug("sendConfirmation: %o", result.data);
      })
      .catch(err => {
        debug("sendConfirmation error: %o", err);
        console.error(err);
      });
    res.send("");
  } else if (body.token === process.env.SLACK_VERIFICATION_TOKEN) {
    debug(`Form submission received: ${body.submission.trigger_id}`);

    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send("");

    // create Helpdesk ticket
    ticket.create(body.user.id, body.submission);
  } else {
    debug("Token mismatch");
    res.sendStatus(500);
  }
});

app.post("/chores", (req, res) => {
  console.log(req.body);
  // check that the verification token matches expected value
  if (req.body.token === process.env.SLACK_VERIFICATION_TOKEN) {
    debug(`Form submission received: ${req.body.trigger_id}`);
  }
  database.getAllTasks(tasks => res.send(tasks));
  // res.send("");
});

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}!`);
});

var spawnIndividualBot = function() {
  var botStoreConfig = {
    token: process.env.SLACK_ACCESS_TOKEN,
    apiToken: process.env.SLACK_VERIFICATION_TOKEN,
    teamId: "TBW7T6BFZ"
  };
  var bot = controller.spawn(botStoreConfig);
  bot.team_info = {
    id: botStoreConfig.teamId,
    apiToken: botStoreConfig.apiToken
  };

  var botkitStorageConfig = {
    id: botStoreConfig.teamId,
    apiToken: process.env.SLACK_VERIFICATION_TOKEN,
    accessToken: process.env.SLACK_ACCESS_TOKEN,
    bot: {
      token: process.env.SLACK_BOT_TOKEN,
      user_id: "",
      name: "default"
    }
  };

  controller.storage.teams.save(botkitStorageConfig, function(err) {
    console.log(err);
  });
};

const main = () => {
  axios
    .post(
      "https://slack.com/api/channels.list",
      qs.stringify({
        token: process.env.SLACK_ACCESS_TOKEN
      })
    )
    .then(result => {
      console.log("success");
      GlobalChannelList = result.data.channels;
    })
    .catch(err => {
      debug("sendConfirmation error: %o", err);
      console.error(err);
    });
  spawnIndividualBot();

  controller.hears("^help", "direct_message", (bot, message) => {
    const botkitThreadMessage = {
      user: message.user,
      channel: message.channel,
      team: message.team,
      ts: message.ts
    };
    bot.reply(
      botkitThreadMessage,
      "Here is a list of commands\n `order beer` - view the current listing and submit beers to order\n `view tasks` - to view all task for this week.\n `view beers` - to view all beers that have been requested"
    );
  });

  controller.hears("^clear beers", "direct_message", (bot, message) => {
    const botkitThreadMessage = {
      user: message.user,
      channel: message.channel,
      team: message.team,
      ts: message.ts
    };
    database.clearAllBeers();
    bot.startConversation(botkitThreadMessage, (err, convo) => {
      convo.say("deleted all beer entries...");
    });
  });

  controller.hears("^view beers", "direct_message", (bot, message) => {
    database.getAllBeers(beers => {
      const attachments = beers.map(elem => {
        return {
          title: elem.response
        };
      });

      attachments.push({
        title: "Orders can be placed at 215-627-6465"
      });

      axios
        .post(
          "https://slack.com/api/chat.postMessage",
          qs.stringify({
            token: process.env.SLACK_ACCESS_TOKEN,
            channel: message.channel,
            attachments: JSON.stringify(attachments)
          })
        )
        .then(result => {
          debug("sendConfirmation: %o", result.data);
        })
        .catch(err => {
          debug("sendConfirmation error: %o", err);
          console.error(err);
        });
    });
  });

  controller.hears("^unacceptable", "direct_message", (bot, message) => {
    const generalChannel = GlobalChannelList.filter(elem => {
      return elem.name === "general";
    });

    axios
      .post(
        "https://slack.com/api/chat.postMessage",
        qs.stringify({
          token: process.env.SLACK_ACCESS_TOKEN,
          channel: generalChannel[0].id,
          text: "https://www.youtube.com/watch?v=T2DTsS7cmMw"
        })
      )
      .then(result => {
        console.log(result.data);
        debug("sendConfirmation: %o", result.data);
      })
      .catch(err => {
        debug("sendConfirmation error: %o", err);
        console.error(err);
      });
  });

  controller.hears("^view task", "direct_message", (bot, message) => {
    const botkitThreadMessage = {
      user: message.user,
      channel: message.channel,
      team: message.team,
      ts: message.ts
    };
    database.getAllTasks(tasks => {
      const renderTasksAttachments = tasks.map(elem => {
        return {
          title: elem.category,
          text: elem.description,
          footer: elem.frequency,
          callback_id: elem.id,
          actions: [
            {
              name: "delete",
              type: "button",
              text: "delete",
              value: "delete",
              style: "danger"
            }
          ]
        };
      });

      axios
        .post(
          "https://slack.com/api/chat.postMessage",
          qs.stringify({
            token: process.env.SLACK_ACCESS_TOKEN,
            channel: message.channel,
            attachments: JSON.stringify(renderTasksAttachments)
          })
        )
        .then(result => {
          debug("sendConfirmation: %o", result.data);
        })
        .catch(err => {
          debug("sendConfirmation error: %o", err);
          console.error(err);
        });
    });
  });

  controller.hears("^order beer", "direct_message", (bot, message) => {
    beerbot(message.channel, () => {
      const botkitThreadMessage = {
        user: message.user,
        channel: message.channel,
        team: message.team,
        ts: message.ts
      };
      bot.startConversation(botkitThreadMessage, (err, convo) => {
        convo.on("end", convo => {
          if (convo.status === "completed") {
            const res = convo.extractResponses();
            const beerResponse = res["beer_response"];
            if (beerResponse.toLowerCase() === "cancel") {
              bot.reply(convo.source_message, "Cancelling action...");
              return;
            }
            bot.reply(convo.source_message, "Your response has been added");
            database.addBeer(beerResponse, message.user);
          }
        });
        convo.ask(
          "Please type a list of beer you want. (type `cancel` to cancel this prompt)",
          function(response, convo) {
            convo.next();
          },
          { key: "beer_response" }
        );
      });
    });
  });
};

main();
