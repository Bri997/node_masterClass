const crypto = require("crypto");
const config = require("./config");
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
