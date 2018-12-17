//Container for all the enviroments

let environments = {};

// Staging (default) eviroment
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: "staging",
  hashingSecret: "thisIsASecret"
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: "production",
  hashingSecret: "thisIsAlsoASecret"
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
