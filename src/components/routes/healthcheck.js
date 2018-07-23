module.exports = function(webserver, controller) {

    webserver.get("/hc", function(req, res) {
        res.status(200);
        res.send('ok');
    });
};
