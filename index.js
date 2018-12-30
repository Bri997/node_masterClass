/*
Primary file for the API

*/

const server = require("./lib/server");
const workers = require("./lib/workers");

//Declare the app

let app = {};

//Init function
app.init = function() {
  //Start server
  server.init();

  // Start workers
  workers.init();
};

//Execute that function

app.init();

module.exports = app;
