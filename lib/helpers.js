const crypto = require("crypto");
const config = require("./config");
const querystring = require("querystring");
const https = require("https");
//helpers for various task

//container for all the hlpers

//Create SHA256 hash
const helpers = {};

helpers.hash = function(str) {
  if (typeof str == "string" && str.length > 0) {
    let hash = crypto
      .createHmac("sha256", config.hashingSecret)
      .update(str)
      .digest("hex");
    return hash;
  } else {
    return false;
  }
};

helpers.parseJSONToObject = function(str) {
  try {
    let obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};
module.exports = helpers;

//Create a string of random alphanumerica charers of given lenght
helpers.createRandomString = function(strLength) {
  strLength = typeof strLength == "number" && strLength > 0 ? strLength : false;
  if (strLength) {
    //Define all the possible character that could go into a string
    var possibleCharacter = "abcdefghijklmnopqurstuvwxyz0123456789";

    //Start the final string
    let str = "";
    for (let i = 1; i <= strLength; i++) {
      //Get a rando char
      let randomCharacter = possibleCharacter.charAt(
        Math.floor(Math.random() * possibleCharacter.length)
      );

      str += randomCharacter;
    }
    return str;
  } else {
    return false;
  }
};

//Send a SMS via TWillow

helpers.sendTwilioSms = function(phone, msg, callback) {
  //Validate prams
  phone =
    typeof phone == "string" && phone.trim().length == 10
      ? phone.trim()
      : false;
  msg =
    typeof msg == "string" && msg.trim().length > 0 && msg.trim().length <= 1600
      ? msg.trim()
      : false;
  if (phone && msg) {
    //Configure request payload (sending post api)
    let payload = {
      From: config.twilio.fromPhone,
      To: "+1" + phone,
      Body: msg
    };
    //Stringify the paylog
    let stringPayload = querystring.stringify(payload);

    //Configure the request details
    let requestDetails = {
      Protocol: "https:",
      hostname: "api.twilio.com",
      method: "POST",
      path:
        "/2010-04-01/Accounts/" + config.twilio.accountSid + "/Messages.json",
      auth: config.twilio.accountSid + ":" + config.twilio.authToken,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Lenght": Buffer.byteLength(stringPayload)
      }
    };

    //Instantiate the request object
    let req = https.request(requestDetails, function(res) {
      //Grab the status of the send request
      let status = res.statusCode;
      //Callback successfully if the request went through
      if (status == 200 || status == 201) {
        callback(false);
      }
      {
        callback("Status code returned was " + status);
      }
    });

    //Bind to the error event so it dosent get thrown
    req.on("error", function(e) {
      callback(e);
    });

    //Add the Payload
    req.write(stringPayload);

    //End the request

    req.end();
  } else {
    callback("Given input were missing or invalid");
  }
};
