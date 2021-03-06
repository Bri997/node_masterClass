/*
Library for storing and rotating logs
*/
//Dependencies
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

//Container for the module
let lib = {};

//Base directory of the log folder
lib.baseDir = path.join(__dirname, "/../.logs/");

// Append a string to a file. Create the file if it does not exist
lib.append = function(file, str, callback) {
  // Open the file for appending
  fs.open(lib.baseDir + file + ".log", "a", function(err, fileDescriptor) {
    if (!err && fileDescriptor) {
      // Append to file and close it
      fs.appendFile(fileDescriptor, str + "\n", function(err) {
        if (!err) {
          fs.close(fileDescriptor, function(err) {
            if (!err) {
              callback(false);
            } else {
              callback("Error closing file that was being appended");
            }
          });
        } else {
          callback("Error appending to file");
        }
      });
    } else {
      callback("Could open file for appending");
    }
  });
};

//Export
module.exports = lib;
