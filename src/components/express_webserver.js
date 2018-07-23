var express = require("express");
var bodyParser = require("body-parser");
var request = require("request");

var API_CONFIG = {
  dev: { host: "http://localhost:3000" },
  qa: { host: "https://qaapi.getguru.com" },
  prod: { host: "https://api.getguru.com" }
};

var getApiHost = function() {
  return API_CONFIG[process.env.ENVIRONMENT].host;
};

module.exports = function(controller) {
  var webserver = express();
  webserver.use(bodyParser.json());
  webserver.use(bodyParser.urlencoded({ extended: true }));

  webserver.use(express.static("public"));
  getBotConfigs(function() {
    var server = webserver.listen(process.env.WEBHOOK_PORT || 3000);
    webserver.server = server;
  });

  // import all the pre-defined routes that are present in /components/routes
  var normalizedPath = require("path").join(__dirname, "routes");
  require("fs")
    .readdirSync(normalizedPath)
    .forEach(function(file) {
      require("./routes/" + file)(webserver, controller);
    });

  controller.webserver = webserver;

  return webserver;
};

var getBotConfigs = function(callback) {
  var options = {
    url: getApiHost() + "/slackbotconfiguration"
  };
  request.get(options, function(err, response, body) {
    if (err) {
      console.log(err);
    }
    if (callback) {
      //console.log("URL: ", response.request.uri.href);
      //console.log("BODY: ", response.request.body);
      //console.log("RESPONSE: ", response.request.responseContent.statusCode, response.request.responseContent.statusMessage);
      callback(body);
    }
  });
};
