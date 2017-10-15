var ltf = require("lambda-testing-framework")
var path = require("path");
var module_under_test = require("../lambda/index");

describe("Whois tests", function(done) {
    ltf(module_under_test.handler, path.resolve(__dirname, "./events/whois"), done);
});

describe("Family tests", function(done) {
    ltf(module_under_test.handler, path.resolve(__dirname, "./events/family"), done);
});

describe("Nickname tests", function(done) {
    ltf(module_under_test.handler, path.resolve(__dirname, "./events/nickname"), done);
});

describe("House tests", function(done) {
    ltf(module_under_test.handler, path.resolve(__dirname, "./events/house"), done);
});