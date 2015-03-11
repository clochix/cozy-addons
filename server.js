//jshint node: true
var express    = require('express'),
    http       = require('http'),
    path       = require('path'),
    app, port, host;
process.on('uncaughtException', function (err) {
  "use strict";
  console.error("Uncaught Exception");
  console.error(err);
  console.error(err.stack);
});

port = process.env.PORT || 9251;
host = process.env.HOST || "127.0.0.1";

app = express();

// Serve static content
app.use(express.static(path.join(__dirname, '/public/')));

// Starts the server
http.createServer(app).listen(port, host, function () {
  "use strict";
  console.log("Server listening to %s:%d within %s environment", host, port, app.get('env'));
});
