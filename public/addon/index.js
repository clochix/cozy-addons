/*jshint node: true, browser: true */
var pageMod = require("sdk/page-mod");
pageMod.PageMod({
  include: /.*\.cozycloud.cc\/apps\/calendar.*/,
  contentScriptFile: ["./calendar.js"],
  contentScriptWhen: "end"
});
pageMod.PageMod({
  include: /.*\.cozycloud.cc\/apps\/emails.*/,
  contentScriptFile: ["./emails.js"],
  contentScriptWhen: "end"
});
pageMod.PageMod({
  include: /.*\.cozycloud.cc\/apps\/files.*/,
  contentScriptFile: ["./files.js"],
  contentScriptWhen: "end"
});
