//jshint browser: true, maxstatements: 40
/*eslint no-use-before-define: 0 */
/*global eio, io */
/*exported Acthesis */
function ActivityOptions(name, data) {
  "use strict";
  this.name = name;
  this.data = data;
}
function ActivityHandlerDescription(name, href, disposition, returnValue, filters) {
  "use strict";
  this.name        = name;
  this.href        = href || window.location.toString().split(/[\?#]/)[0];
  this.disposition = disposition;
  this.returnValue = returnValue;
  this.filters     = filters;
}
function ActivityRequestHandler(source, postResult, postError) {
  "use strict";
  if (!source instanceof ActivityOptions) {
    console.error("source should be an ActivityOptions");
  }
  this.source     = source;
  this.postResult = postResult;
  this.postError  = postError;
}

// @src http://blog.snowfinch.net/post/3254029029/uuid-v4-js
// @licence Public domain
function uuid() {
  "use strict";
  /*jshint bitwise: false */
  var id = "", i, random;
  for (i = 0; i < 32; i++) {
    random = Math.random() * 16 | 0;
    if (i === 8 || i === 12 || i === 16 || i === 20) {
      id += "-";
    }
    id += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
  }
  return id;
}

/**
 * Create modal window
 *
 * @param {HTML} content - The HTML content of the modal window
 *
 * @return {function} - a function to close the modal window
 */
function modal(content) {
  "use strict";
  [document.children[0], document.body].forEach(function (e) {
    e.style.height  = "100%";
    e.style.width   = "100%";
    e.style.padding = "0";
    e.style.margin  = "0";
  });
  var mod  = document.createElement('div'),
      cell = document.createElement('div'),
      overlay = document.createElement('div');
  mod.setAttribute('style', 'display: inline-block; max-width: 50%; max-height: 90vh; background: white; padding: 1em; border-radius: .5em; overflow: auto; box-shadow: .5em .5em .5em #000;');
  cell.setAttribute('style', 'display:table-cell; vertical-align:middle; text-align:center');
  overlay.setAttribute('style', 'position: fixed; top: 0; left: 0;display:table; width: 100%; height: 100%; background: rgba(0,0,0,.5)');
  if (content instanceof Element) {
    mod.appendChild(content);
  } else {
    mod.innerHTML = content;
  }
  cell.appendChild(mod);
  overlay.appendChild(cell);
  document.body.appendChild(overlay);
  return function () {
    document.body.removeChild(overlay);
  };
}

function Acthesis(opt, manifest) {
  //jshint maxcomplexity: 15
  "use strict";
  var acthesis   = this,
      _options   = opt,
      _manifest  = manifest,
      handlers   = {},
      registered = {},
      selfUrl    = window.location.toString().split(/[\?#]/)[0],
      _isRegistered = false,
      reply, clientMessage, ws, socket;

  registered = {
    activity: [],
    alarm: [],
    notification: [],
    push: []
  };
  /**
   * XHR wrapper
   *
   * @param {String}   url Url.
   * @param {Function} cb  Callback.
   *
   * @returns {undefined} undefined
   */
  function get(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function () {
      if (typeof cb === 'function') {
        cb(null, xhr);
      }
    };
    xhr.onerror = function (e) {
      var err = "Request failed : " + e.target.status;
      if (typeof cb === 'function') {
        cb(err, xhr);
      }
    };
    xhr.setRequestHeader("X-Requester", selfUrl);
    xhr.send();
  }
  function post(url, data, cb) {
    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.onload = function () {
      if (typeof cb === 'function') {
        cb(null, xhr);
      }
    };
    xhr.onerror = function (e) {
      var err = "Request failed : " + e.target.status;
      if (typeof cb === 'function') {
        cb(err, xhr);
      }
    };
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.setRequestHeader("X-Requester", selfUrl);
    xhr.send(data);
  }

  // Default options values {{{
  if (_options === null || typeof _options === 'undefined') {
    _options = {};
  }
  if (typeof _options.server === 'undefined') {
    _options.server = window.location.protocol + "//" + window.location.host;
  }
  if (typeof _options.ws === 'undefined') {
    // allow to use ws for http and wss for https
    _options.ws = _options.server.replace(/^http/, 'ws');
  }
  // }}}

  // Create polyfills {{{
  function DOMRequest() {
    var request = this;
    request.readyState = 'pending';
    request.result = null;
    request.error  = null;
    request.onsuccess = undefined;
    request.onerror   = undefined;
  }
  window.MozActivity = function (options) {
    DOMRequest.call(this, options);
    var self = this, iframe, iframeContainer, targetWindow; //wait, cleared;
    options.id   = uuid();
    options.type = 'activity';
    function onResponse(response) {
      var result;//, xhr;
      if (self.readyState === 'done') {
        return;
      }
      self.readyState = 'done';
      if (iframeContainer) {
        iframeContainer.style.display = 'none';
      }
      try {
        if (typeof response === 'string') {
          result = JSON.parse(response);
        } else {
          result = response;
        }
      } catch (e) {
        console.debug("[client] INVALID response: ", response);
        self.error = "INVALID response";
        if (typeof self.onerror === 'function') {
          self.onerror.call(self);
        } else {
          console.error('Activity has no `onerror` method');
        }
        return;
      }
      //xhr = new XMLHttpRequest();
      //xhr.open('DELETE', _options.server + '/activity/pending/' + options.id, false);
      //xhr.setRequestHeader("X-Requester", options.handler);
      //xhr.send(null);
      if (result.type === 'success') {
        self.result = result.data;
        if (typeof self.onsuccess === 'function') {
          self.onsuccess.call(self);
        } else {
          console.error('Activity has no `onsuccess` method');
        }
      } else {
        self.error = result.data;
        if (typeof self.onerror === 'function') {
          self.onerror.call(self);
        } else {
          console.error('Activity has no `onerror` method');
        }
      }
    }
    function onXhr(err, xhr) {
      if (err) {
        console.error(err);
      }
      var result, doSend, form, win, btnCancel;
      function send(num) {
        if (typeof result[num] !== 'undefined') {
          options.handler = result[num].href;
          doSend = function () {
            //console.log("postMessage", options);
            targetWindow.postMessage(options, options.handler);
          };
          iframe = document.querySelector("iframe[src='" + options.handler + "']");
          if (iframe === null) {
            iframe = document.createElement('iframe');
            iframe.addEventListener('targetLoaded', doSend);
            iframe.src = options.handler;
            iframe.setAttribute("style", "position: fixed; top: 0px; left: 0px; width: 100vw; height: 100vh; padding: 1em; background: rgba(127, 127, 127, .5)");
            document.body.appendChild(iframe);
            iframeContainer = iframe;
            targetWindow = iframe.contentWindow;
          } else {
            iframeContainer = iframe;
            targetWindow = iframe.contentWindow;
            doSend();
          }
          if (result[num].disposition === 'inline') {
            iframeContainer.style.display = 'block';
          } else {
            iframeContainer.style.display = 'none';
          }
          if (typeof targetWindow === 'undefined' || targetWindow === null) {
            console.error("Unable to open target application");
            self.onerror.call(self);
          }
          // Try until response {
          /*
          wait = window.setInterval(doSend, 100);
          window.setTimeout(function () {
            window.clearInterval(wait);
            if (cleared !== true) {
              onResponse({type: 'error', data: 'NO RESPONSE'});
            }
            cleared = true;
          }, 10000);
          */
          // }
          /*
          // XHR
          post(_options.server + '/activity', options, function (errAct, xhrAct) {
            if (errAct) {
              console.error(errAct);
            }
            onResponse(xhrAct.responseText);
          });
          */
        }
      }
      try {
        result = JSON.parse(xhr.responseText);
      } catch (e) {
        console.debug("INVALID response: " + xhr.responseText);
        console.debug(xhr.responseText);
        onResponse({type: 'error', data: 'INVALID response'});
        return;
      }
      if (result.length === 0) {
        self.readyState = 'done';
        window.alert('No handler registered for this activity');
        onResponse({type: 'error', data: 'No handler registered for this activity'});
        return;
      } else {
        if (result.length > 1) {
          form = document.createElement('form');
          result.forEach(function (handler, i) {
            var button = document.createElement('button');
            button.innerHTML = handler.fullname || handler.href;
            button.style = "display: block; width: 100%;border-width: 0px;";
            button.onclick = function () {
              send(i);
              win();
            };
            form.appendChild(button);
          });
          btnCancel = document.createElement('button');
          btnCancel.innerHTML = 'Cancel';
          btnCancel.style = "display: block; width: 100%;border-width: 0px;";
          btnCancel.onclick = function () {
            send();
            win();
          };
          form.appendChild(btnCancel);
          win = modal(form);
        } else {
          send(0);
        }
      }
    }
    function onMessage(message) {
      var loadEvent, target;
      //console.log("Message Received:", message.data);
      if (message.data.action === "loaded") {
        target = document.querySelector("iframe[src='" + message.data.url.split('#')[0] + "']");
        if (target) {
          loadEvent = new CustomEvent("targetLoaded", {"detail": {action: "loaded"}});
          target.dispatchEvent(loadEvent);
        }
      } else {
        onResponse(message.data);
      }
    }
    // Activity client
    window.addEventListener("message", onMessage, false);
    post(_options.server + '/activity', options, onXhr);
  };

  // /!\ This function makes a synchroneous XHR
  navigator.mozHasPendingMessage = function (type) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', _options.server + '/activity/pending?has=true&type=' + type, false);
      xhr.setRequestHeader("X-Requester", selfUrl);
      xhr.send(null);
      if (xhr.status === 200) {
        return JSON.parse(xhr.responseText).result;
      } else {
        return false;
      }
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  navigator.mozSetMessageHandler = function (type, handler) {
    handlers[type] = handler;
    function getPending(pendingType) {
      if (_options.postMethod === 'message') {
        try {
          var xhr = new XMLHttpRequest();
          xhr.onload = function (e) {
            var activities = JSON.parse(xhr.responseText).result;
            activities.forEach(handleActivity);
          };
          xhr.onerror = function (e) {
            console.error("Error setting message handler:", e);
          };
          xhr.open('GET', _options.server + '/activity/pending?type=' + pendingType, false);
          xhr.setRequestHeader("X-Requester", selfUrl);
          xhr.send(null);
        } catch (e) {
          console.error(e);
        }
      } else {
        if (navigator.mozHasPendingMessage(pendingType)) {
          socket.send(JSON.stringify({type: 'getPending', subtype: pendingType}));
        }
      }
    }
    if (_options.postMethod === 'message' || _isRegistered) {
      getPending(type);
    } else {
      var waitRegistered = window.setInterval(function () {
        if (_isRegistered) {
          window.clearInterval(waitRegistered);
          getPending(type);
        }
      }, 100);
    }
  };

  // {{ push
  // @See https://developer.mozilla.org/en-US/docs/Web/API/Simple_Push_API
  (function () {
    function PushRegistration(url) {
      this.pushEndpoint = url;
      this.version = undefined;
    }
    var endpoints = [];
    navigator.push = {
      register: function () {
        var req = new DOMRequest();
        get(_options.server + '/push/register', function (err, xhr) {
          if (err) {
            console.error(err);
            req.error = {name: err};
            req.onerror.call(req);
          } else {
            var endpoint = JSON.parse(xhr.responseText).endpoint;
            endpoints.push(new PushRegistration(endpoint));
            req.result = endpoint;
            req.onsuccess();
          }
        });
        return req;
      },
      unregister: function (endPoint) {
        var req = new DOMRequest();
        /* @TODO
        setTimeout(function () {
          var res;
          endpoints = endpoints.filter(function (e) {
            if (e.pushEndpoint === endPoint) {
              res = e;
              return false;
            } else {
              return true;
            }
          });
          req.result = res;
          delete endpoints[endPoint];
          req.onsuccess();
        }, 1000);
        */
        return req;
      },
      registrations: function () {
        var req = new DOMRequest();
        setTimeout(function () {
          req.result = endpoints;
          req.onsuccess();
        }, 1000);
        return req;
      }
    };
  }());
  // }}

  // Alarms {{
  (function () {
    function MozAlarmManager() {

      function getAll() {
        var req = new DOMRequest();
        get(_options.server + '/alarm', function (err, xhr) {
          if (err) {
            console.error(err);
            req.error = {name: err};
            req.onerror.call(req);
          } else {
            var alarms = JSON.parse(xhr.responseText);
            req.result = alarms.data;
            req.onsuccess();
          }
        });
        return req;
      }
      function add(date, respectTimezone, data) {
        var req = new DOMRequest(),
            alarm;
        alarm = {
          date: date,
          respectTimezone: respectTimezone,
          data: data
        };
        post(_options.server + '/alarm', alarm, function (err, xhr) {
          if (err) {
            console.error(err);
          }
          req.result = JSON.parse(xhr.responseText).data;
          req.onsuccess();
        });
        return req;
      }
      function remove(id) {
      }
      return {
        getAll: getAll,
        add: add,
        remove: remove
      };
    }
    navigator.mozAlarms = new MozAlarmManager();
  }());
  // }}

  // }}}

  this.registerActivityHandler = function (description) {
    description.fullname = document.title;
    post(_options.server + '/activity/register', description, function (err, xhr) {
      if (err) {
        console.error("Error registering handler '" + description.name + "' : ", err);
      }
    });
    if (!description.disposition) {
      description.disposition = 'inline';
    }
    registered.activity.push(description);
  };

  // Register handlers
  if (_manifest && _manifest.activities) {
    Object.keys(manifest.activities).forEach(function (name) {
      var activity = manifest.activities[name];
      acthesis.registerActivityHandler(new ActivityHandlerDescription(name, activity.href, activity.disposition, activity.returnValue, activity.filters));
    });
  }
  function handleActivity(activity) {
    var arh, onsuccess, onerror;
    if (typeof handlers[activity.type] === 'undefined') {
      console.error("[provider] No handler for " + activity.type);
      reply(JSON.stringify({type: 'error', data: "No handler for " + activity.type}));
    } else {
      onsuccess = function (result) {
        //console.log("PROVIDER success", JSON.stringify(this));
        reply(JSON.stringify({type: 'success', data: result}));
      };
      onerror = function (result) {
        //console.log("PROVIDER error", JSON.stringify(this));
        reply(JSON.stringify({type: 'error', data: result}));
      };
      //options = new ActivityOptions(activity.data.name, activity.data.data);
      arh = new ActivityRequestHandler(activity, onsuccess, onerror);
      handlers[activity.type](arh);
    }
  }
  function onServerMessage(message) {
    clientMessage = message;
    //console.log('[provider]', message);
    //reply('ack');
    // If type is undefined, it's an answer
    if (typeof message.data.type !== 'undefined') {
      handleActivity(message.data);
    }
  }
  if (Object.keys(registered).length > 0) {
    if (_options.postMethod === 'message') {
      reply = function (response) {
        if (typeof clientMessage === 'undefined') {
          post(_options.server + '/activity/result', response);
        } else {
          clientMessage.source.postMessage(response, clientMessage.origin);
        }
      };
      window.addEventListener("message", onServerMessage, false);
      // Notify parent frame that we are loaded
      if (parent && parent.frames && parent.frames[0] && parent.frames[0].content &&
          typeof parent.frames[0].content.postMessage === 'function') {
        parent.frames[0].content.postMessage({ action: "loaded", url: window.location.toString()}, '*');
      } else if (parent && typeof parent.postMessage === 'function') {
        parent.postMessage({ action: "loaded", url: window.location.toString()}, '*');
      } else {
        console.error("Enable to send loaded event to parent frame");
      }
    } else {
      window.WebSocket = window.WebSocket || window.mozWebSocket || window.webkitWebSocket;
      if (typeof window.WebSocket !== 'undefined') {
        ws = new window.WebSocket(_options.ws, '/engine.io/');
        socket = {
          events: {},
          send: function (message) {
            ws.send(message);
          },
          on: function (event, cb) {
            this.events[event] = cb;
          }
        };
        ws.onopen = function () {
          socket.events.open();
        };
        ws.onmessage = function (event) {
          socket.events.message(event.data);
        };
      } else if (typeof io !== 'undefined') {
        socket = io.connect(_options.ws, '/engine.io/');
      } else if (typeof eio !== 'undefined') {
        socket = new eio.Socket(_options.ws);
      } else {
        throw "Unable to find Socket.io";
      }
      reply = function (response) {
        socket.send(response);
      };
      socket.on('open', function () {
        reply(JSON.stringify({type: 'providerUrl', data: {url: selfUrl}}));
        _isRegistered = true;
        socket.on('message', function (message) {
          var activities;
          message = JSON.parse(message);
          switch (message.type) {
          case 'activity':
            activities = message.data;
            if (!Array.isArray(activities)) {
              console.error("[provider] Activities should be an array");
              reply(JSON.stringify({type: 'error', data: "Internal error"}));
            }
            activities.forEach(handleActivity);
            break;
          case 'alarm':
            if (handlers.alarm) {
              message.data.forEach(function (alarm) {
                handlers.alarm(alarm);
                // Delete pending alarms
                var xhr = new XMLHttpRequest();
                xhr.open('DELETE', _options.server + '/activity/pending/' + alarm.id, false);
                xhr.setRequestHeader("X-Requester", selfUrl);
                xhr.send(null);
              });
            } else {
              console.log('Alarm received but no handler defined');
            }
            break;
          case 'push':
            handlers.push(message.data);
            break;
          }
        });
      });
    }
  }
}
window.Acthesis = Acthesis;
