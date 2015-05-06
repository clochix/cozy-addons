//jshint browser: true, strict: false
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
(function (root) {
  "use strict";
  // level: success, info, warning, danger
  function render(id, txt, level) {
    var actionbar, container;
    container = document.querySelector('article[data-id="' + id + '"] iframe, article[data-id="' + id + '"] .preview');
    if (container) {
      container = container.parentNode;
      actionbar = container.querySelector('.signature');
      if (actionbar) {
        actionbar.textContent = txt;
        actionbar.setAttribute('class', 'signature alert-' + (level || 'info'));
      } else {
        actionbar = document.createElement('div');
        actionbar.setAttribute('class', 'signature alert-' + (level || 'info'));
        actionbar.textContent = txt;
        container.insertBefore(actionbar, container.firstChild);
      }
    }
    return actionbar;
  }

  function sendActivity(name, data, cb) {
    var activity = new window.MozActivity({
      name: name,
      data: data
    });
    activity.onsuccess = function () {
      console.log('[client]', this.result);
      cb(null, this.result);
    };
    activity.onerror = function () {
      var auth;
      if (this.error.code === 401) {
        auth = new window.MozActivity({
          name: 'pgpkeys',
          data: {
            'type': 'passphrase'
          }
        });
        auth.onsuccess = function () {
          sendActivity(name, data, cb);
        };
        auth.onerror = function () {
          console.error("[client] unable to auth: " + this.error);
          console.error(this.error);
          cb(this.error);
        };
      } else {
        console.error("[client] The activity got an error: " + this.error);
        console.error(this.error);
        cb(this.error);
      }
    };
  }

  function checkSignature(message) {
    sendActivity('pgp', {type: 'verify', data: message}, function (err, res) {
      var actionbar, btn;
      if (err) {
        actionbar = render(message.id, err.message, 'danger');
      } else {
        actionbar = render(message.id, res.message, res.level);
        if (actionbar && typeof res.key !== 'undefined') {
          btn = document.createElement('button');
          btn.setAttribute('class', 'btn btn-xs btn-success');
          btn.textContent = 'Add';
          btn.addEventListener('click', function () {
            sendActivity('pgpkeys', {type: 'importKey', data: res.key}, function (errAdd, resAdd) {
              console.log(errAdd, resAdd);
            });
          });
          actionbar.appendChild(btn);
        }
      }
    });
  }

  root.OpenPGP = {
    name: "OpenPGP",
    active: true,
    onActivate: function () {
      // Deactivate compose in HTML
      window.cozyMails.setSetting('composeInHTML', false);
      //window.cozyMails.setSetting('messageDisplayHTML', false);
      window.cozyMails.setSetting('autosaveDraft', false);
    },
    onAdd: [
      // { Add buttons to compose form
      {
        condition: function (node) {
          return node.querySelectorAll(".form-compose textarea.editor").length > 0;
        },
        action: function (node) {
          if (node.querySelector('.btn-encrypt')) {
            return;
          }
          function getDests() {
            var dests = [];
            function search(comp, name, cb) {
              Object.keys(comp.refs).forEach(function (child) {
                if (child === name) {
                  cb(comp.refs[child]);
                }
                if (comp.refs[child].refs) {
                  search(comp.refs[child], name, cb);
                }
              });
            }
            function onDest(comp) {
              comp.state.known.map(function (address) {
                dests.push(address.address);
              });
            }
            search(window.rootComponent, 'to', onDest);
            search(window.rootComponent, 'cc', onDest);
            search(window.rootComponent, 'bcc', onDest);
            return dests;
          }
          var btnPGP;
          btnPGP = document.createElement('button');
          btnPGP.setAttribute('class', 'btn btn-cozy-non-default btn-encrypt');
          btnPGP.textContent = 'PGP';
          btnPGP.addEventListener('click', function (e) {
            e.preventDefault();
            var target = node.querySelector('textarea.editor');
            sendActivity('pgpkeys', {type: 'sign', data: {text: target.value, dest: getDests()}}, function (err, res) {
              if (err) {
                console.error(err);
                window.cozyMails.notify(err);
              } else {
                target.value = res;
                target.dispatchEvent(new Event('input', {bubbles: true}));
              }
            });
          });
          node.querySelector('.btn-cancel').parentNode.appendChild(btnPGP);
        }
      },
      // Add buttons to compose form }
      // { Add buttons in message tolbar
      {
        condition: function (node) {
          return node.querySelectorAll('article.message.active header .toolbar').length > 0;
        },
        action: function (node) {
          if (node.querySelector('.btn-decrypt')) {
            return;
          }
          var btnPGP;
          btnPGP = document.createElement('button');
          btnPGP.setAttribute('class', 'btn btn-default fa fa-unlock-alt');
          btnPGP.addEventListener('click', function (e) {
            var messageID, xhr;
            e.preventDefault();
            messageID = window.cozyMails.getCurrentMessage().id;
            xhr = new XMLHttpRequest();
            xhr.open('GET', 'raw/' + messageID, true);
            xhr.onload = function () {
              var msg, parts;
              msg = xhr.responseText;
              parts = msg.split(/(^-----(BEGIN|END).*$)/gm);
              if (parts.length === 7) {
                msg = parts[1] + parts[3] + parts[4];
              }
              sendActivity('pgpkeys', {type: 'decrypt', data: {text: msg}}, function (err, res) {
                if (err) {
                  console.error(err);
                  window.cozyMails.notify(err);
                } else {
                  res = '<div class="textOnly">' + res + '</div>';
                  document.querySelector('article.message.active iframe.content').contentDocument.body.innerHTML = res;
                }
              });
            };
            xhr.onerror = function (xhrError) {
              console.error("Error: ", xhrError);
            };
            xhr.send();
          });
          node.querySelector('article.message.active header .toolbar').appendChild(btnPGP);
        }
      }
      // Add buttons in message tolbar }
    ],
    listeners: {
      'MESSAGE_LOADED': function (event) {
        var message = window.cozyMails.getMessage(event.detail),
            sigAttached, messageID, xhr;
        sigAttached = message.attachments.some(function (a) {
          return /pgp/.test(a.contentType);
        });
        if (/PGP/.test(message.text) || sigAttached) {
          render(message.id, 'Checking signature', 'info');
          if (/^-----BEGIN PGP SIGNED MESSAGE/.test(message.text)) {
            checkSignature(message);
          } else if (/^-----BEGIN PGP MESSAGE/.test(message.text)) {
            sendActivity('pgpkeys', {type: 'decrypt', data: {text: message.text}}, function (err, res) {
              console.log(err, res);
            });
          } else {
            messageID = window.cozyMails.getCurrentMessage().id;
            xhr = new XMLHttpRequest();
            xhr.open('GET', 'raw/' + messageID, true);
            xhr.onload = function () {
              message.raw = xhr.responseText;
              checkSignature(message);
            };
            xhr.onerror = function (e) {
              console.error("Error: ", e);
            };
            xhr.send();
          }
        }
      }
    }
  };
})(window.plugins);
if (typeof window.pluginUtils !== 'undefined') {
  window.pluginUtils.activate('OpenPGP');
}
