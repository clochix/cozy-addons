//jshint node: true
var cozydb  = require('cozydb'),
    modelOptions, Addons, emit;

modelOptions = {
  app: String,
  scripts: [String]
};

Addons = cozydb.getModel('Addons', modelOptions);

Addons.defineRequest('all', cozydb.defaultRequests.all, function (err) {
  "use strict";
  if (err) {
    console.log("Error defining request:", err);
  }
});

Addons.defineRequest('byApp', function (doc) {
  "use strict";
  emit(doc.app, doc);
}, function (err) {
  "use strict";
  if (err) {
    console.log("Error defining request:", err);
  }
});

module.exports = Addons;
