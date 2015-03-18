//jshint browser: true
[
  "/apps/addons/lib/plugins.js", "/apps/addons/lib/activity-client.js",
  "/apps/addons/emailsActivities/init.js",
  "/apps/addons/emailsCalendar/ical.js",
  "/apps/addons/emailsCalendar/init.js",
  "/apps/addons/emailsOpenPGP/lib/openpgp.js",
  "/apps/addons/emailsOpenPGP/init.js"
].forEach(function (name) {
  "use strict";
  var s = document.createElement('script');
  s.src = name;
  document.body.appendChild(s);
});
