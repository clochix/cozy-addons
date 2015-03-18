//jshint browser: true, strict: false
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
(function () {
  "use strict";
  window.plugins.activity = {
    name: "Web Activities",
    active: true,
    onActivate: function () {
      function handler(message) {
        console.log('HANDLER', message);
        function save(data) {
          var blob, formData, xhr;
          blob = new Blob([data.value], {type: 'text/calendar'});
          formData = new FormData();
          //formData.append("name", 'file');
          //formData.append("filename", 'calendar.ics');
          formData.append("file", blob, data.fileName);

          xhr = new XMLHttpRequest();
          xhr.open("POST", "import/ical");
          xhr.onload = function () {
            var imported, toImport;
            imported = JSON.parse(xhr.responseText);
            if (Array.isArray(imported.events)) {
              toImport = imported.events.length;
              imported.events.forEach(function (event) {
                var xhrConfirm = new XMLHttpRequest();
                event.import = true;
                event.id     = null;
                xhrConfirm.open('POST', 'events?sendMails=false');
                xhrConfirm.onload = function () {
                  toImport--;
                  if (toImport === 0) {
                    message.postResult('OK');
                  }
                };
                xhrConfirm.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                xhrConfirm.send(JSON.stringify(event));
              });
            }
          };
          xhr.onerror = function (res) {
            console.log("ERROR", res);
            message.postError("ERROR IMPORTING EVENT");
          };
          xhr.send(formData);
        }
        switch (message.source.name) {
          case 'save':
            save(message.source.data);
            break;
          default:
            message.postError("WRONG ACTIVITY");
        }
      }
      if (typeof window.MozActivity === 'undefined' && typeof window.Acthesis !== 'undefined') {
        var manifest, options;
        options = {
          postMethod: 'message'
        };
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          options.server = 'http://localhost:9250';
        } else {
          options.server =  window.location.protocol + "//" + window.location.hostname + "/apps/acthesis";
        }
        manifest = {
          "activities": {
            "save": {
              "disposition": 'hidden',
              "filters": {
                "type": ['ical']
              },
              "returnValue": true
            }
          }
        };
        window.Acthesis(options, manifest);
        navigator.mozSetMessageHandler('activity', handler);
        if (navigator.mozHasPendingMessage('activity')) {
          console.log("[provider] PENDING activities");
        } else {
          console.log("[provider] No pending activities");
        }
      }
    },
    listeners: {
    }
  };
}());
window.pluginUtils.activate('activity');
