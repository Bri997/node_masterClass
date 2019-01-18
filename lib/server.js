//Server related tasks

//Dependencies
const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const fs = require("fs");
const _data = require("./data");
const handlers = require("./handlers");
const helpers = require("./helpers");
const path = require("path");

//Instantiate there server module object
let server = {};

server.httpServer = http.createServer(function(req, res) {
  server.unifiedServer(req, res);
});

//Instantiate the https server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem"))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function(
  req,
  res
) {
  server.unifiedServer(req, res);
});

// Server logic for both http and https
server.unifiedServer = (req, res) => {
  //Get the URL and parse it
  let parsedUrl = url.parse(req.url, true);

  //Get he path
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g, "");

  //Get the the query sing as an object
  let queryStringObject = parsedUrl.query;

  //Get the HTTP Method
  let method = req.method.toLowerCase();

  //Get the headers as an object
  let headers = req.headers;

  // Get the payload if any
  let decoder = new StringDecoder("utf-8");
  // This is placeholder for the string
  let buffer = "";
  req.on("data", function(data) {
    buffer += decoder.write(data);
  });

  req.on("end", function() {
    buffer += decoder.end();

    //Choose the handler this request should go to if not go to 404

    let chosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

    let data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJSONToObject(buffer)
    };

    // Route the request specified in the router

    chosenHandler(data, function(statusCode, payload) {
      //use the status called by the handler or default to 200

      statusCode = typeof statusCode == "number" ? statusCode : 200;

      // Use the payload called back by the header or default a empty object
      payload = typeof payload == "object" ? payload : {};

      //Convert the payload to string

      let payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);

      res.end(payloadString);

      //Log the request path
      console.log("Return this response ", statusCode, payloadString);
    });
  });
};

//Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};

//Initi server script
server.init = function() {
  //Start the HTTP Server

  server.httpServer.listen(config.httpPort, function() {
    console.log(
      `The server is listening on ${config.httpPort} in ${config.envName} mode`
    );
  });

  //Start the HTTPS Server

  server.httpsServer.listen(config.httpsPort, function() {
    console.log(
      `The server is listening on ${config.httpsPort} in ${config.envName} mode`
    );
  });
};

//Export server
module.exports = server;
