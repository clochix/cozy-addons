//jshint browser: true, strict: false
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
(function (root) {
  "use strict";
  var ICAL = root.ICAL;
  function render(txt) {
    var actionbar, container;
    container = document.querySelector('.messageToolbox + .row');
    actionbar = container.querySelector('.signature');
    if (actionbar) {
      actionbar.textContent = txt;
    } else {
      actionbar = document.createElement('div');
      actionbar.classList.add('content-action');
      actionbar.classList.add('signature');
      actionbar.textContent = txt;
      container.insertBefore(actionbar, container.firstChild);
    }
    return actionbar;
  }
  window.plugins.calendar = {
    name: "Calendar",
    active: true,
    onActivate: function () {
      if (typeof window.MozActivity === 'undefined' && typeof window.Acthesis !== 'undefined') {
        var manifest, options;
        options = {
          postMethod: 'message',
          server: 'http://127.0.0.1:9250',
          ws: 'ws://127.0.0.1:9250'
        };
        manifest = { };
        window.Acthesis(options, manifest);
      }
    },
    listeners: {
      'MESSAGE_LOADED': function () {
        var message = window.cozyMails.getCurrentMessage();
        console.log(message);
        if (Array.isArray(message.alternatives) && message.alternatives.length > 0) {
          message.alternatives.forEach(function (alternative) {
            var jcalData, comp, isInvite, isReply, method, actionbar, btn;
            jcalData = ICAL.parse(alternative.content);
            console.log(jcalData);
            comp = new ICAL.Component(jcalData);
            console.log(comp);
            isInvite = false;
            isReply  = false;
            comp.getAllProperties().forEach(function (prop) {
              console.log(prop.name, prop.getFirstValue());
              if (prop.name === 'method') {
                method = prop.getFirstValue();
                if (method === 'REQUEST') {
                  actionbar = render('This is an invite');
                  isInvite = true;
                } else if (method === 'REPLY') {
                  actionbar = render('This is a reply');
                  isReply = true;
                } else {
                  actionbar = render("This is an event of type " + method);
                }
                if (typeof actionbar !== 'undefined') {
                  btn = document.createElement('button');
                  btn.textContent = 'Add';
                  btn.addEventListener('click', function () {
                    var activity = new window.MozActivity({
                      name: "save",
                      data: {
                        type: 'ical',
                        value: alternative.content
                      }
                    });
                    activity.onsuccess = function () {
                      console.log("[client] Activity successfuly handled");
                      console.log('[client]', this.result);
                      if (this.result === 'OK') {
                        window.cozyMails.notify('This event has been added to your calendar');
                      }
                    };
                    activity.onerror = function () {
                      console.error("[client] The activity got an error: " + this.error);
                      console.log(this.error);
                    };
                  });
                  actionbar.appendChild(btn);
                }
              }
            });
            console.log(isInvite, isReply);
          });
        }
        //console.log('Got View action', params.detail);
      }
    }
  };
}(window));
