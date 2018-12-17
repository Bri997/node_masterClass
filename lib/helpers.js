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
