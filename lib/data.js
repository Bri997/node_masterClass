//Libary for storing and editing data

//Dependencies

let fs = require("fs");
let path = require("path");
let helpers = require("./helpers");

//Container for the module to be exported
let lib = {};

//Define the base director for the data folder
lib.baseDir = path.join(__dirname, "/../.data/");

//Wire data to a file takes 3 params
lib.create = function(dir, file, data, callback) {
  //Open the file for writing
  fs.open(lib.baseDir + dir + "/" + file + ".json", "wx", function(
    err,
    fileDescriptor
  ) {
    if (!err && fileDescriptor) {
      //Conver data to string putting to JOSN
      let stringData = JSON.stringify(data);

      //Write to file and close it
      fs.writeFile(fileDescriptor, stringData, function(err) {
        if (!err) {
          //Need to close file
          fs.close(fileDescriptor, function(err) {
            if (!err) {
              callback(false);
            } else {
              callback("Error closing new file");
            }
          });
        } else callback("Error wrting to new file");
      });
    } else {
      callback("Could not create new file, it may already exist");
    }
  });
};

//Read data from a file
lib.read = function(dir, file, callback) {
  fs.readFile(lib.baseDir + dir + "/" + file + ".json", "utf8", function(
    err,
    data
  ) {
    if (!err && data) {
      let parsedData = helpers.parseJSONToObject(data);
      callback(false, parsedData);
    } else callback(err, data);
  });
};

//Update data inside a file
lib.update = function(dir, file, data, callback) {
  //Open the file for writing
  fs.open(lib.baseDir + dir + "/" + file + ".json", "r+", function(
    err,
    fileDescriptor
  ) {
    if (!err && fileDescriptor) {
      // Conver data to string
      let stringData = JSON.stringify(data);

      //Truncate the file
      fs.truncate(fileDescriptor, function(err) {
        if (!err) {
          //Write to the file and close it
          fs.writeFile(fileDescriptor, stringData, function(err) {
            if (!err) {
              fs.close(fileDescriptor, function(err) {
                if (!err) {
                  callback(false);
                } else {
                  callback("Error closing the file");
                }
              });
            } else {
              callback("Error writing to exsiting file");
            }
          });
        } else {
          callback("Error truncating file");
        }
      });
    } else {
      callback("Could not open the file for updating, it my not exisit yet");
    }
  });
};

//Delete a file

lib.delete = function(dir, file, callback) {
  //Unlinkthe file
  fs.unlink(lib.baseDir + dir + "/" + file + ".json", function(err) {
    if (!err) {
      callback(false);
    } else {
      callback("Error deleting file");
    }
  });
};

module.exports = lib;
