const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");

// Request handers

//Define handlers
let handlers = {};

handlers.users = (data, callback) => {
  let acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

//Container for the user submethods

handlers._users = {};

//Users- post
//Required data: firstName, lastName, phone, password, tosAgreement
//Optional data : none

handlers._users.post = function(data, callback) {
  //Check that all required fields are filled out
  let firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  let lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  let phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  let password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  let tosAgreement =
    typeof data.payload.tosAgreement == "boolean" &&
    data.payload.tosAgreement == true
      ? true
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    //Make sure that the user dosent already exist
    _data.read("users", phone, function(err, data) {
      if (err) {
        //Hash password
        let hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          let userObject = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            hashedPassword: hashedPassword,
            tosAgreement: true
          };

          //Store the user
          _data.create("users", phone, userObject, function(err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: "could not create new user" });
            }
          });
        } else {
          callback(500, { Error: "Could not hash the user's password" });
        }

        //Create the user object
      } else {
        //User already exists
        callback(400, {
          Error: "A user with that phone number already exisit"
        });
      }
    });
  } else callback(400, { Error: "Missing require fields" });
};

// Users - get
// Required data: phone
//Optional data: none
handlers._users.get = function(data, callback) {
  //check that the phone number is valid
  let phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    // get the token from the headers

    let token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    //Verify that give token if valid
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (tokenIsValid) {
        //Look up the user
        _data.read("users", phone, function(err, data) {
          if (!err && data) {
            // removed the hashed password from user object before returning it to the requestor
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header or token is not valid"
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//Users - put
// Required data: phone
//Optional data: firstName, lastName, password
handlers._users.put = function(data, callback) {
  //Check for the required field
  let phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;

  //Check of the optional fields

  let firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  let lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;

  let password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  //Err is if the phone is invalid
  if (phone) {
    if (firstName || lastName || password) {
      let token =
        typeof data.headers.token == "string" ? data.headers.token : false;
      handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
        if (tokenIsValid) {
          _data.read("users", phone, function(err, userData) {
            if (!err && userData) {
              //Update the feilds necessary
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              //Store the new updates

              _data.update("users", phone, userData, function(err) {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: "Could not update the user" });
                }
              });
            } else {
              callback(400, { Error: "This specified user does not exisit" });
            }
          });
        } else {
          callback(403, {
            Error: "Missing required token in header or token is not valid"
          });
        }
      });
    } else {
      callback(400, { Error: "Mssing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required feild" });
  }
};

//User Delete
//Reuqired field : phone
handlers._users.delete = function(data, callback) {
  //Check the phone number is valid
  let phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    let token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (tokenIsValid) {
        _data.read("users", phone, function(err, userData) {
          if (!err && userData) {
            _data.delete("users", phone, function(err) {
              if (!err) {
                //Delte each of the checks assoiciated with the user
                let userChecks =
                  typeof userData.checks == "object" &&
                  userData.checks instanceof Array
                    ? userData.checks
                    : [];

                let checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  let checksDeleted = 0;
                  let deletionError = false;
                  //Loop through the checks
                  userChecks.forEach(function(checkId) {
                    //Delete the checks
                    _data.delete("checks", checkId, function(err) {
                      if (err) {
                        deletionError = true;
                      }
                      checksDeleted++;
                      if (checksDeleted == checksToDelete) {
                        if (!deletionError) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error:
                              "Erors encounted while attempting to delete all of the users checks. All checks may not have been deleted"
                          });
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: "Could not delete user" });
              }
            });
          } else {
            callback(400, { Error: "Cound not find the user" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header or token is not valid"
        });
      }
    });
    //Look up the user
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//Tokens
handlers.tokens = (data, callback) => {
  let acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

//Container for all the token methods
handlers._tokens = {};

//Tokens -post
//Required data: phone, password
//OPtional Data: none
handlers._tokens.post = function(data, callback) {
  let phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  let password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone && password) {
    //Look up ther user who matched that phone number
    _data.read("users", phone, function(err, userData) {
      if (!err) {
        //Hash the sent password and compair it to the user object
        let hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          //If valid, create new token with rando name with 1hour time
          let tokenID = helpers.createRandomString(20);

          let expires = Date.now() + 1000 * 60 * 60;
          let tokenObject = {
            phone: phone,
            id: tokenID,
            expires: expires
          };
          _data.create("tokens", tokenID, tokenObject, function(err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: "Could not create the token " });
            }
          });
        } else {
          callback(400, {
            Error: "Password did not macth the users stored password"
          });
        }
      } else {
        callback(400, { Error: "Could not find the user" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

//Tokens -get
//Required Data : ID
//Option data: none
handlers._tokens.get = function(data, callback) {
  //Check if the id is valid

  let id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    _data.read("tokens", id, function(err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
}; //Tokens -put
//Require fields: id, extend
//Optional data : none
handlers._tokens.put = function(data, callback) {
  let id =
    typeof data.payload.id == "string" && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;

  let extend =
    typeof data.payload.extend == "boolean" && data.payload.extend == true
      ? data.payload.extend
      : false;

  if (id && extend) {
    _data.read("tokens", id, function(err, tokenData) {
      if (!err && tokenData) {
        //Check to make sure the token isnt expired
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          _data.update("tokens", id, tokenData, function(err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                Error: "Could not update the token's expiration"
              });
            }
          });
        } else {
          callback(400, {
            Error: "The token has already expired can not extend"
          });
        }
      } else {
        callback(400, { Error: "Spefied token does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing fields or fields are invalid" });
  }
};
//Tokens -delete
//Required data : id
//Optional data : none
handlers._tokens.delete = function(data, callback) {
  //Check the id is valid
  let id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    //Look up the token
    _data.read("tokens", id, function(err, data) {
      if (!err && data) {
        _data.delete("tokens", id, function(err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete token" });
          }
        });
      } else {
        callback(400, { Error: "Cound not find the token" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//Verfiy if a given token id is currently valid of the given users
handlers._tokens.verifyToken = function(id, phone, callback) {
  _data.read("tokens", id, function(err, tokenData) {
    if (!err && tokenData) {
      //Check that toke is for the given user and not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

//checks
handlers.checks = (data, callback) => {
  let acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

//Container for checks
handlers._checks = {};

//Checks post
//Required data: protocol, url, method, sucessCode, timoutSeconds

handlers._checks.post = function(data, callback) {
  //Validate the inputs
  let protocol =
    typeof data.payload.protocol == "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;

  let url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url
      : false;
  let method =
    typeof data.payload.method == "string" &&
    ["get", "post", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;
  let successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  let timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    //Get the token from the headers

    let token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    //Look up the user by reading the token

    _data.read("tokens", token, function(err, tokenData) {
      if (!err && tokenData) {
        let userPhone = tokenData.phone;

        //Look up the user

        _data.read("users", userPhone, function(err, userData) {
          if (!err && userData) {
            let userChecks =
              typeof userData.checks == "object" &&
              userData.checks instanceof Array
                ? userData.checks
                : [];
            //Verify that the user has less than max-checks
            if (userChecks.length < config.maxChecks) {
              //Create a random id for the check
              var checkId = helpers.createRandomString(20);

              //create the check object and include the user's phone
              let checkObject = {
                id: checkId,
                userPhone: userPhone,
                protocol: protocol,
                url: url,
                method: method,
                successCodes: successCodes,
                timeoutSeconds: timeoutSeconds
              };
              _data.create("checks", checkId, checkObject, function(err) {
                if (!err) {
                  //Add the check id to tuser's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  //Save the new user data

                  _data.update("users", userPhone, userData, function(err) {
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        Error: "Cound not update the user with the new check"
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Could not creat the new check" });
                }
              });
            } else {
              callback(400, {
                Error: "The user has already the maxium of checks"(
                  `${config.maxChecks}`
                )
              });
            }
          } else {
            callback(403, { Error: "Not authorized" });
          }
        });
      } else {
        callback(403, { Error: "Not authorized" });
      }
    });
  } else {
    callback(400, { Error: "Missing required inputs or inputs are invalid" });
  }
};

//Checks - get
//Required data : id
//Optional data none

handlers._checks.get = function(data, callback) {
  //check that the is valid
  let id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    // get the token from the headers
    //look up the check

    _data.read("checks", id, function(err, checkData) {
      if (!err && checkData) {
        let token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        //Verify that give token if valid and belongs to the user that requested the check
        handlers._tokens.verifyToken(token, checkData.userPhone, function(
          tokenIsValid
        ) {
          if (tokenIsValid) {
            //Return the check data
            callback(200, checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//Checks -put
//Required data : id
//Optional data : protocol, url, method, sucessCodes, timeoutSeconds (one must be sent)
handlers._checks.put = function(data, callback) {
  //Check for required and optional field
  let id =
    typeof data.payload.id == "string" && data.payload.id.length == 20
      ? data.payload.id.trim()
      : false;
  //Optional fields
  let protocol =
    typeof data.payload.protocol == "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;

  let url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url
      : false;
  let method =
    typeof data.payload.method == "string" &&
    ["get", "post", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;
  let successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  let timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  //Check make sure the id is valid
  if (id) {
    //Check to make sure one or more optional fields have been sent
    if (protocol || url || method || successCodes || timeoutSeconds) {
      _data.read("checks", id, function(err, checkData) {
        if (!err && checkData) {
          let token =
            typeof data.headers.token == "string" ? data.headers.token : false;
          //Verify that give token if valid and belongs to the user that requested the check
          handlers._tokens.verifyToken(token, checkData.userPhone, function(
            tokenIsValid
          ) {
            if (tokenIsValid) {
              //Update the check where necessary
              if (protocol) {
                checkData.protocol = protocol;
              }
              if (url) {
                checkData.url = url;
              }
              if (method) {
                checkData.method = method;
              }
              if (successCodes) {
                checkData.successCodes = successCodes;
              }
              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }

              //store the new updates

              _data.update("checks", id, checkData, function(err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: "Could not update check data" });
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(40, { Error: "Check ID did not exist" });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//Checks -delete
//Required Data : id
//Optional data : None

handlers._checks.delete = function(data, callback) {
  let id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    //Look up the check
    _data.read("checks", id, function(err, checkData) {
      if (!err && checkData) {
        let token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        handlers._tokens.verifyToken(token, checkData.userPhone, function(
          tokenIsValid
        ) {
          if (tokenIsValid) {
            //Delete the check data
            _data.delete("checks", id, function(err) {
              if (!err) {
                _data.read("users", checkData.userPhone, function(
                  err,
                  userData
                ) {
                  if (!err && userData) {
                    // remoeved the deleted check from list of the check
                    let userChecks =
                      typeof userData.checks == "object" &&
                      userData.checks instanceof Array
                        ? userData.checks
                        : [];

                    let checkPosition = userChecks.indexOf(id);

                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);
                      //Re Save the user's data
                      _data.update(
                        "users",
                        checkData.userPhone,
                        userData,
                        function(err) {
                          if (!err) {
                            callback(200);
                          } else {
                            callback(500, { Error: "Could not update user" });
                          }
                        }
                      );
                    } else {
                      callback(500, {
                        Error:
                          "Could not find the check on the user object could not remove it"
                      });
                    }
                  } else {
                    callback(500, {
                      Error: "Cound not find the user who created the check"
                    });
                  }
                });
              } else {
                callback(500, { Error: "Could not delete the check data" });
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { Error: "The specified check ID does not exist" });
      }
    });

    //Look up the user
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//Ping handler
handlers.ping = (data, callback) => {
  callback(200);
};

//Not found
handlers.notFound = function(data, callback) {
  callback(404);
};

module.exports = handlers;
