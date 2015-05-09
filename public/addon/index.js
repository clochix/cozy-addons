/*jshint node: true, browser: true */
var pageMod = require("sdk/page-mod"),
    domains = require('sdk/simple-prefs').prefs.domains,
    includes;
includes = domains.split(',').map(function (domain) {
  "use strict";
  return new RegExp(domain.trim() + '/apps/.*/');
});
pageMod.PageMod({
  include: includes,
  contentScriptFile: ["./load.js"],
  contentScriptWhen: "end"
});
//pageMod.PageMod({
//  include: /.*\.cozycloud.cc\/apps\/calendar.*/,
//  contentScriptFile: ["./calendar.js"],
//  contentScriptWhen: "end"
//});
//pageMod.PageMod({
//  include: /.*\.cozycloud.cc\/apps\/emails.*/,
//  contentScriptFile: ["./emails.js"],
//  contentScriptWhen: "end"
//});
//pageMod.PageMod({
//  include: /.*\.cozycloud.cc\/apps\/files.*/,
//  contentScriptFile: ["./files.js"],
//  contentScriptWhen: "end"
//});
