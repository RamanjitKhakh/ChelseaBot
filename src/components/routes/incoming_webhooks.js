module.exports = function(webserver, controller) {

    webserver.post("/slack/receive", function(req, res) {
        // NOTE: we should enforce the token check here
        //console.log("got event:", req.body);

        // respond to Slack that the webhook has been received.
        res.status(200);

        // Now, pass the webhook into be processed
        controller.handleWebhookPayload(req, res);
        if (!res.headersSent) {
          res.send('');
        }

    });
};
