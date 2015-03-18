//jshint browser: true
[
  "/apps/addons/lib/plugins.js", "/apps/addons/lib/activity-client.js",
  "/apps/addons/filesActivities/init.js"
].forEach(function (name) {
  "use strict";
  var s = document.createElement('script');
  s.src = name;
  document.body.appendChild(s);
});
