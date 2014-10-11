//jshint browser: true
(function (root) {
  "use strict";

  root.pluginUtils = {
    init: function () {
      var config, observer, onMutation, self = this;
      if (typeof window.plugins === "undefined") {
        window.plugins = {};
      }
      // Observe addition to plugins
      Object.observe(window.plugins, function (changes) {
        changes.forEach(function (change) {
          if (change.type === 'add') {
            self.activate(change.name);
          } else if (change.type === 'delete') {
            self.deactivate(change.name);
          }
        });
      });
      Object.keys(window.plugins).forEach(function (pluginName) {
        if (window.plugins[pluginName].active) {
          this.activate(pluginName);
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
          var check, checkNode;
          checkNode = function (node, action) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
              return;
            }
            Object.keys(window.plugins).forEach(function (pluginName) {
              var pluginConf = window.plugins[pluginName];
              if (pluginConf.active) {
                if (action === 'add') {
                  pluginConf.onAdd.condition.bind(pluginConf)(node);
                }
                else if (action === 'delete') {
                  pluginConf.onDelete.condition.bind(pluginConf)(node);
                }
              }
            });
          };
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
      } else {
        setInterval(function () {
          Object.keys(window.plugins).forEach(function (pluginName) {
            var pluginConf = window.plugins[pluginName];
            if (pluginConf.active) {
              if (pluginConf.onAdd !== null) {
                if (pluginConf.onAdd.condition(document.body)) {
                  pluginConf.onAdd.action(document.body);
                }
              }
              if (pluginConf.onDelete !== null) {
                if (pluginConf.onDelete.condition(document.body)) {
                  pluginConf.onDelete.action(document.body);
                }
              }
            }
          });
        }, 200);
      }
    },
    activate: function (key) {
      var plugin, type;
      plugin = window.plugins[key];
      type = plugin.type;
      plugin.active = true;
      if (plugin.listeners !== null) {
        Object.keys(plugin.listeners).forEach(function (event) {
          window.addEventListener(event, plugin.listeners[event].bind(plugin));
        });
      }
      if (plugin.onActivate) {
        plugin.onActivate();
      }
      if (type !== null) {
        Object.keys(window.plugins).forEach(function (pluginName) {
          var pluginConf = window.plugins[pluginName];
          if (pluginName !== key) {
            if (pluginConf.type === type && pluginConf.active) {
              this.deactivate(pluginName);
            }
          }
        });
      }
    },
    deactivate: function (key) {
      var plugin = window.plugins[key];
      plugin.active = false;
      if (plugin.listeners !== null) {
        Object.keys(plugin.listeners).forEach(function (event) {
          window.removeEventListener(event, plugin.listeners[event].bind(plugin));
        });
      }
      if (plugin.onDeactivate) {
        plugin.onDeactivate();
      }
    },
    merge: function (remote) {
      Object.keys(remote).forEach(function (pluginName) {
        var pluginConf = remote[pluginName],
            local      = window.plugins[pluginName];
        if (local !== null) {
          local.active = pluginConf.active;
        } else {
          delete remote[pluginName];
        }
      });
      Object.keys(window.plugins).forEach(function (pluginName) {
        var pluginConf = window.plugins[pluginName];
        if (remote[pluginName] === null) {
          remote[pluginName] = {
            name: pluginConf.name,
            active: pluginConf.active
          };
        }
      });
    },
    load: function (url) {
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
      };
      xhr.send();
    }
  };

})(this);

