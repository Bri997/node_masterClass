const _data = require("./data");
const helpers = require("./helpers");

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
//@TODO Only let auth user access thier own data
handlers._users.get = function(data, callback) {
  //check that the phone number is valid
  let phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
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
    callback(400, { Error: "Missing required field" });
  }
};

//Users - put
// Required data: phone
//Optional data: firstName, lastName, password
//@todo Only let and auth user update thier own object
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
          //Store the new uddates

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
      callback(400, { Error: "Mssing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required feild" });
  }
};

//User Delete
//Reuqired field : phone
//@ToDO Only let an Auth user to delte their object
//@TODO clean(delete)any other data files associalt with this user
handlers._users.delete = function(data, callback) {
  //Check the phone number is valid
  let phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    //Look up the user
    _data.read("users", phone, function(err, data) {
      if (!err && data) {
        _data.delete("users", phone, function(err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete user" });
          }
        });
      } else {
        callback(400, { Error: "Cound not find the user" });
      }
    });
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
