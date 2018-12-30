// Worker-related tasks

// Dependencies
const path = require("path");
const fs = require("fs");
const _data = require("./data");
const http = require("http");
const https = require("https");
const helpers = require("./helpers");
const url = require("url");

// Instatiate the worker object
let workers = {};

//Look up all the checks, get thier data, send to a validator
workers.gatherAllChecks = function() {
  //Get all checks
  _data.list("checks", function(err, checks) {
    if (!err && checks && checks.length > 0) {
      checks.forEach(function(check) {
        //Read in thecks data
        _data.read("checks", check, function(err, originalCheckData) {
          if (!err && originalCheckData) {
            //If there is data pass it to the check validator, and let that function contiune or pass to the err
            workers.validateCheckData(originalCheckData);
          } else {
            console.log("Error reading one of the check's data");
          }
        });
      });
    } else {
      console.log("Error: Could not find any checks to process");
    }
  });
};
//Sanity-Check the check-data
workers.validateCheckData = function(originalCheckData) {
  (originalCheckData == typeof originalCheckData) == "object" &&
  originalCheckData !== null
    ? originalCheckData
    : {};
  (originalCheckData.id == typeof originalCheckData.id) == "string" &&
  originalCheckData.id.trim().length == 20
    ? originalCheckData.id.trim()
    : false;
  (originalCheckData.userPhone == typeof originalCheckData.userPhone) ==
    "string" && originalCheckData.userPhone.trim().length == 10
    ? originalCheckData.userPhone.trim()
    : false;
  (originalCheckData.protocol == typeof originalCheckData.protocol) ==
    "string" && ["http", "https"].indexOf(originalCheckData.protocol) > -1
    ? originalCheckData.protocol
    : false;
  (originalCheckData.url == typeof originalCheckData.url) == "string" &&
  originalCheckData.url.trim().length > 0
    ? originalCheckData.url.trim()
    : false;
  (originalCheckData.method == typeof originalCheckData.method) == "string" &&
  ["post", "get", "put", "delete"].indexOf(originalCheckData.method) > -1
    ? originalCheckData.method
    : false;
  (originalCheckData.successCodes == typeof originalCheckData.successCodes) ==
    "object" &&
  originalCheckData.successCodes instanceof Array &&
  originalCheckData.successCodes.length > 0
    ? originalCheckData.successCodes
    : false;
  (originalCheckData.timeoutSeconds ==
    typeof originalCheckData.timeoutSeconds) ==
    "number" &&
  originalCheckData.timeoutSeconds % 1 === 0 &&
  originalCheckData.timeoutSeconds >= 1 &&
  originalCheckData.timeoutSeconds <= 5
    ? originalCheckData.timeoutSeconds
    : false;

  //Set the keys that may not be set if the workers have never see this work before
  originalCheckData.state =
    (originalCheckData.state == typeof originalCheckData.state) == "string" &&
    ["up", "down"].indexOf(originalCheckData.state) > -1
      ? originalCheckData.state
      : "down";
  (originalCheckData.lastChecked == typeof originalCheckData.lastChecked) ==
    "number" && originalCheckData.lastChecked > 0
    ? originalCheckData.lastChecked
    : false;

  // If all the ckecs pass, pass the data along to the next step of the process
  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    console.log(
      "Error: One of the check is not properly formatted. Skipping it !"
    );
  }
};

//Perfor the check, send the orginal checkcdata and the outcome of the check process to the next step in the process
workers.performCheck = function(originalCheckData) {
  //Prepare the initial check outcome
  let checkOutcome = {
    error: false,
    responseCode: false
  };

  //Mark that the coutome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the orginal check data
  let parsedUrl = url.parse(
    originalCheckData.protocol + "://" + originalCheckData.url,
    true
  );
  let hostName = parsedUrl.hostName;
  let path = parsedUrl.path; // Using path not "pathname" because we want the query string

  //Construct the request
  let requestDetails = {
    protocol: originalCheckData.protocol + ":",
    hostName: hostName,
    method: originalCheckData.method.toUpperCase(),
    path: path,
    timeout: originalCheckData.timeoutSeconds * 1000
  };

  //Instantiate the request object Using the the http or https module
  let _moduleToUse = originalCheckData.protocol == "http" ? http : https;
  let req = _moduleToUse.request(requestDetails, function(res) {
    //Grab the status of the sent request
    let status = res.statusCode;

    //Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.procesCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  //Bind to the error event so it dosen't get thronw
  req.on("error", function(e) {
    //Upadate the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: e
    };
    if (!outcomeSent) {
      workers.procesCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  //Bind to timeout event
  req.on("timeout", function(e) {
    //Upadate the checkOutcome and pass the data along
    checkOutcome.error = {
      Error: true,
      value: "timeout"
    };
    if (!outcomeSent) {
      workers.procesCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  //end the request
  req.end();
};

//Process the check outcome, update the check datat as needed, treigger an aler to the user
//Special logic of accomodating cehck that never been test before (dont want to alert on that we dont need the user to see that the status went form down to up)
workers.procesCheckOutcome = function(originalCheckData, checkOutcome) {
  //Decide if the check is up or down
  let state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? "up"
      : "down";

  //Decide if an alert is warrented
  let alertWarrented =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  // Upadate theck data

  let newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  //Save the updates
  _data.update("checks", newCheckData.id, newCheckData, function(err) {
    if (!err) {
      //Send the new check date the next pase in thprocess if needed
      if (alertWarrented) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log("Check outcome has not changed, no alert needed");
      }
    } else {
      console.log("Error trying to save update to one of the checks");
    }
  });
};

//Alert the yser as to a change in thier check status
workers.alertUserToStatusChange = function(newCheckData) {
  let msg =
    "Alert: Your check for " +
    newCheckData.method.toUpperCase() +
    " " +
    newCheckData.protocol +
    "://" +
    newCheckData.url +
    " is currently " +
    newCheckData.state;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err) {
    if (!err) {
      console.log(
        "Success: User was laerted to status change in thier check via SMS",
        msg
      );
    } else {
      console.log(
        "Error: Could not send SMS alert to user had a state change in their check"
      );
    }
  });
};

//Timer to execute the worker-process once per minute
workers.loop = function() {
  setInterval(function() {
    workers.gatherAllChecks();
  }, 1000 * 6);
};

//Init script
workers.init = function() {
  //Execute all the check immediately
  workers.gatherAllChecks();
  //Call the loop so the check will execute later on
  workers.loop();
};

//Export the module
module.exports = workers;
