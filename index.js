const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./lib/config");
const fs = require("fs");
const _data = require("./lib/data");
const handlers = require("./lib/handlers");
const helpers = require("./lib/helpers");

//Testing

// _data.create("test", "newFile", { foo: "bar" }, function(err) {
//   console.log(`this was the error ` + err);
// });

// _data.read("test", "newFile", function(err, data) {
//   console.log("this was the err", err, "and this was the data", data);
// });

// _data.update("test", "newfile", { fizz: "buzz" }, function(err) {
//   console.log("this was teh error", err);
// });

// _data.delete("test", "newfile", function(err) {
//   console.log("this was the err", err);
// });

//Instatntating the HTTP Server
let httpServer = http.createServer(function(req, res) {
  unifiedServer(req, res);
});

httpServer.listen(config.httpPort, function() {
  console.log(
    `The server is listening on ${config.httpPort} in ${config.envName} mode`
  );
});

//Instantate the https server
let httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem")
};

let httpsServer = https.createServer(httpsServerOptions, function(req, res) {
  unifiedServer(req, res);
});

httpsServer.listen(config.httpsPort, function() {
  console.log(
    `The server is listening on ${config.httpsPort} in ${config.envName} mode`
  );
});
// Server logc for both http and https
let unifiedServer = (req, res) => {
  //Get the URL and parse it
  let parsedUrl = url.parse(req.url, true);

  //Get he path
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g, "");

  //Get the the query sing as an object
  let queryStringObject = parsedUrl.query;

  //Get the HTTP Method
  let method = req.method.toLowerCase();

  //Get the headaers as an object
  let headers = req.headers;

  // Get the paylod if any
  let decoder = new StringDecoder("utf-8");
  // This is placeholder for the string
  let buffer = "";
  req.on("data", function(data) {
    buffer += decoder.write(data);
  });

  req.on("end", function() {
    buffer += decoder.end();

    //Choose the handleer this reuqest should go to if not go to 404

    let chosenHandler =
      typeof router[trimmedPath] !== "undefined"
        ? router[trimmedPath]
        : handlers.notFound;

    let data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJSONToObject(buffer)
    };

    // Route the request specifed in the router

    chosenHandler(data, function(statusCode, payload) {
      //use the status called by the handler or default to 200

      statusCode = typeof statusCode == "number" ? statusCode : 200;

      // Use the payload called back by the heander or default a empty object
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
let router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens
};
