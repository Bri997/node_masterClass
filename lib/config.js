//Container for all the enviroments

let environments = {};

// Staging (default) eviroment
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: "staging",
  hashingSecret: "thisIsASecret",
  maxChecks: 5,
  twilio: {
    accountSid: "ACb32d411ad7fe886aac54c665d25e5c5d",
    authToken: "9455e3eb3109edc12e3d8c92768f7a67",
    fromPhone: "+15005550006"
  }
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: "production",
  hashingSecret: "thisIsAlsoASecret",
  maxChecks: 5,
  twilio: {
    accountSid: "",
    authToken: "",
    fromPhone: ""
  }
};

// Determine which enviroment was passed as a command-line argument
let currentEnvironments =
  typeof process.env.NODE_ENV == "string"
    ? process.env.NODE_ENV.toLowerCase()
    : "";

//Check that the current enviroment is one of the eviroments above if not go to default

let environmentsToExport =
  typeof environments[currentEnvironments] == "object"
    ? environments[currentEnvironments]
    : environments.staging;

//Export the module

module.exports = environmentsToExport;
