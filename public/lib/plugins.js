//jshint browser: true
/*global Promise: true */
(function (root) {
  "use strict";

  // Simplistic polyfill
  if (typeof Promise !== 'function') {
    Promise = function (p) {
      var promise = {
        resolved: false,
        rejected: false,
        value: undefined,
        then: function (onResolved, onRejected) {
          var interval = window.setInterval(function () {
            if (promise.resolved || promise.rejected) {
              window.clearInterval(interval);
              if (promise.resolved && typeof onResolved === 'function') {
                onResolved.call(this, promise.value);
              }
              if (promise.rejected && typeof onRejected === 'function') {
                onRejected.call(this, promise.value);
              }
            }
          }, 100);
        }
      };
      p(function (val) {
        promise.value = val;
        promise.resolved = true;
      }, function (val) {
        promise.value = val;
        promise.rejected = true;
      });
      return promise;
    };
  }
  root.pluginUtils = {
    init: function () {
      var config, observer, onMutation, self = this;
      if (typeof window.plugins === "undefined") {
        window.plugins = {};
      }
      // Check wether listeners apply to current mutation
      // @params {NodeElement}
      // @params {String}       action Mutation: add or delete
      function checkNode(node, action) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        Object.keys(window.plugins).forEach(function (pluginName) {
          var listeners,
              pluginConf = window.plugins[pluginName];
          if (pluginConf.active) {
            if (action === 'add') {
              listeners = pluginConf.onAdd;
            } else if (action === 'delete') {
              listeners = pluginConf.onDelete;
            }
            if (typeof listeners === 'undefined') {
              return;
            }
            if (!Array.isArray(listeners)) {
              listeners = [listeners];
            }
            listeners.forEach(function (listener) {
              if (typeof listener.condition === 'function') {
                if (listener.condition.bind(pluginConf)(node)) {
                  listener.action.bind(pluginConf)(node);
                }
              }
            });
          }
        });
      };
      // Merge plugins set by application settings
      if (typeof window.settings === 'object' && typeof window.settings.plugins === 'object') {
        self.merge(window.settings.plugins);
      }
      // Observe addition to plugins
      if (typeof Object.observe === 'function') {
        Object.observe(window.plugins, function (changes) {
          changes.forEach(function (change) {
            if (change.type === 'add') {
              self.activate(change.name);
            } else if (change.type === 'delete') {
              self.deactivate(change.name);
            }
          });
        });
      }
      Object.keys(window.plugins).forEach(function (pluginName) {
        if (typeof window.plugins[pluginName].url !== 'undefined') {
          self.loadJS(window.plugins[pluginName].url);
        } else {
          if (window.plugins[pluginName].active) {
            self.activate(pluginName);
          }
        }
      });
      if (typeof MutationObserver !== "undefined") {
        config = {
          attributes: false,
          childList: true,
          characterData: false,
          subtree: true
        };
        onMutation = function (mutations) {
          var check;
          check = function (mutation) {
            Array.prototype.slice.call(mutation.addedNodes).forEach(function (node) {
              checkNode(node, 'add');
            });
            Array.prototype.slice.call(mutation.removedNodes).forEach(function (node) {
              checkNode(node, 'del');
            });
          };
          mutations.forEach(function (mutation) {
            check(mutation);
          });
        };
        observer = new MutationObserver(onMutation);
        observer.observe(document, config);
        checkNode(document.body, 'add');
      } else {
        setInterval(function () {
          Object.keys(window.plugins).forEach(function (pluginName) {
            var pluginConf = window.plugins[pluginName];
            if (pluginConf.active) {
              if (typeof pluginConf.onAdd === "function") {
                if (pluginConf.onAdd.condition.bind(pluginConf)(document.body)) {
                  pluginConf.onAdd.action.bind(pluginConf)(document.body);
                }
              }
              if (typeof pluginConf.onDelete === "function") {
                if (pluginConf.onDelete.condition.bind(pluginConf)(document.body)) {
                  pluginConf.onDelete.action.bind(pluginConf)(document.body);
                }
              }
            }
          });
        }, 200);
      }
    },
    activate: function (key) {
      var plugin, type, activationEvent, self = this;
      plugin = window.plugins[key];
      if (plugin.activated) {
        return;
      }
      type = plugin.type;
      plugin.active = true;
      if (typeof plugin.listeners !== "undefined") {
        Object.keys(plugin.listeners).forEach(function (event) {
          window.addEventListener(event, plugin.listeners[event].bind(plugin));
        });
      }
      if (plugin.onActivate) {
        plugin.onActivate();
      }
      if (typeof type !== 'undefined') {
        Object.keys(window.plugins).forEach(function (pluginName) {
          var pluginConf = window.plugins[pluginName];
          if (pluginName !== key) {
            if (pluginConf.type === type && pluginConf.active) {
              self.deactivate(pluginName);
            }
          }
        });
      }
      activationEvent = new CustomEvent("plugin", {"detail": {action: "activate", name: key}});
      window.dispatchEvent(activationEvent);
      plugin.activated = true;
    },
    deactivate: function (key) {
      var deactivationEvent,
          plugin = window.plugins[key];
      plugin.active = false;
      if (typeof plugin.listeners !== "undefined") {
        Object.keys(plugin.listeners).forEach(function (event) {
          window.removeEventListener(event, plugin.listeners[event].bind(plugin));
        });
      }
      if (plugin.onDeactivate) {
        plugin.onDeactivate();
      }
      deactivationEvent = new CustomEvent("plugin", {"detail": {action: "deactivate", name: key}});
      window.dispatchEvent(deactivationEvent);
      plugin.activated = false;
    },
    merge: function (remote) {
      Object.keys(remote).forEach(function (pluginName) {
        var pluginConf = remote[pluginName],
            local      = window.plugins[pluginName];
        if (typeof local !== "undefined") {
          local.active = pluginConf.active;
        } else {
          if (typeof pluginConf.url === 'undefined') {
            delete remote[pluginName];
          } else {
            window.plugins[pluginName] = pluginConf;
          }
        }
      });
      Object.keys(window.plugins).forEach(function (pluginName) {
        var pluginConf = window.plugins[pluginName];
        if (typeof remote[pluginName] === "undefined") {
          remote[pluginName] = {
            name: pluginConf.name,
            active: pluginConf.active
          };
        }
      });
    },
    loadJS: function (url, onload) {
      var script = document.createElement('script');
      script.type  = 'text/javascript';
      script.async = true;
      script.src   = url;
      if (typeof onload === 'function') {
        script.onload = onload;
      }
      document.body.appendChild(script);
    },
    loadCSS: function (url, onload) {
      var link = document.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.href = url;
      if (typeof onload === 'function') {
        link.onload = onload;
      }
      document.head.appendChild(link);
    },
    load: function (url) {
      // Get absolute path of this script, allowing to load plugins relatives
      // to it
      if (!/:\/\//.test(url)) {
        try {
          throw new Error();
        } catch (e) {
          var base = e.stack.split("\n")[0].split('@')[1].split(/:\d/)[0].split('/').slice(0, -2).join('/');
          url = base + '/' + url + '/';
        }
      }
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function () {
          var parser = new DOMParser(),
              doc = parser.parseFromString(xhr.response, 'text/html');
          if (doc) {
            // Chrome doesn't like to iterate on doc.styleSheets
            Array.prototype.forEach.call(doc.querySelectorAll('style'), function (sheet) {
              var style = document.createElement('style');
              document.body.appendChild(style);
              Array.prototype.forEach.call(sheet.sheet.cssRules, function (rule, id) {
                style.sheet.insertRule(rule.cssText, id);
              });
            });
            Array.prototype.forEach.call(doc.querySelectorAll('script'), function (script) {
              var s = document.createElement('script');
              s.textContent = script.textContent;
              document.body.appendChild(s);
            });
          }
          resolve();

        };
        xhr.ontimeout = function () {
          reject();
        };
        xhr.send();
      });
    },
    loadRegistered: function () {
      var app;
      app = /\/apps\/([^\/]*)\//.exec(window.location);
      if (app !== null) {
        root.pluginUtils.loadJS('/apps/addons/api/registered/' + app[1] + '?raw=js');
        root.pluginUtils.loadCSS('/apps/addons/api/registered/' + app[1] + '?raw=css');
      }
    }
  };

  function init() {
    root.pluginUtils.init();
    root.pluginUtils.loadRegistered();
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener('load', init);
  }

})(this);
