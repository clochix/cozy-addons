//jshint browser: true, strict: false
/*global openpgp */
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
(function (root) {
  "use strict";
  var wallet;
  // level: success, info, warning, danger
  function render(txt, level) {
    var actionbar, container;
    container = document.querySelector('article.active iframe, article.active .preview').parentNode
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
    return actionbar;
  }
  /**
   * Generate a new private Key
   *
   * @returns {null} Nothing
   */
  function generate() {
    var body, win, accounts, select = '', privateKey, btnSave, btnGenerate;
    function setSizeValue() {
      win.querySelector("[name='size-value']").textContent = win.querySelector("[name='size']").value;
    }
    accounts = window.require('stores/account_store').getAll().toJS();
    Object.keys(accounts).forEach(function (key) {
      var login = accounts[key].login;
      select += '<option value="' + login + '">' + login + '</option>';
    });
    body = '<form class="form-horizontal">' +
    '<div class="form-group">' +
    '  <label class="col-sm-3 control-label" for="size">Size</label>' +
    '  <div class="col-sm-6">' +
    '    <input type="range" class="form-control" name="size" min="1024" max="4096" step="1024" value="2048" />' +
    '  </div>' +
    '  <span class="col-sm-3" name="size-value"></span>' +
    '</div>' +
    '<div class="form-group">' +
    '  <label class="col-sm-3 control-label" for="user">User</label>' +
    '  <div class="col-sm-9">' +
    '    <select name="user" />' +
    select +
    '    </select>' +
    '  </div>' +
    '</div>' +
    '<div class="form-group">' +
    '  <label class="col-sm-3 control-label" for="passphrase">Passphrase</label>' +
    '  <div class="col-sm-9">' +
    '    <input type="text" class="form-control" name="passphrase" />' +
    '  </div>' +
    '</div>' +
    '<div class="form-group">' +
    '  <button class="btn btn-cozy" name="generate">Generate</button>' +
    '  <button class="btn btn-cozy" name="save" disabled>Save</button>' +
    '</div>' +
    '<div class="form-group">' +
    '  <div class="col-sm-10">' +
    '    <pre name="key"></pre>' +
    '  </div>' +
    '</div>' +
    '</form>';
    win = window.plugins.helpers.modal({title: "Generate private key", body: body});
    document.querySelector("[name='size']").addEventListener('input', setSizeValue);
    setSizeValue();
    btnSave = win.querySelector('[name=save]');
    btnGenerate = win.querySelector('[name=generate]');
    btnSave.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      wallet.privateKeys.push(privateKey);
      alert("Key added", privateKey);
      wallet.store();
      console.log(wallet.getAllKeys());
    });
    btnGenerate.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      btnGenerate.disabled = true;
      btnGenerate.innerHTML = "<img src='images/spinner.svg' alt='spinner' className='spin' />";
      var options = {
        numBits: win.querySelector('[name=size]').value,
        userId: win.querySelector('[name=user]').value,
        passphrase: win.querySelector('[name=passphrase]').value
      };
      openpgp.key.generate(options).then(function (key) {
        console.log("key", key);
        privateKey = key;
        win.querySelector('[name=key]').textContent = key.armor();
        btnSave.disabled = false;
        btnGenerate.textContent = 'Generate';
        btnGenerate.disabled = false;
      }).catch(function (err) {
        win.querySelector('[name=key]').textContent = "Error: " + err;
        btnGenerate.textContent = 'Generate';
        btnGenerate.disabled = false;
      });
    });
  }
  window.generate = generate;
  function importKey() {
  }
  window.importKey = importKey;
  function sign(text, cb) {
    var body, win, select = '', btnSign;
    wallet.privateKeys.keys.forEach(function (key) {
      key.getUserIds().forEach(function (user) {
        select += '<option value="' + key.getKeyIds()[0].toHex() + '">' + user + '</option>';
      });
    });
    body = '<form class="form-horizontal">' +
    '<div class="form-group">' +
    '  <label class="col-sm-3 control-label" for="user">User</label>' +
    '  <div class="col-sm-9">' +
    '    <select name="key" />' +
    select +
    '    </select>' +
    '  </div>' +
    '</div>' +
    '<div class="form-group">' +
    '  <label class="col-sm-3 control-label" for="passphrase">Passphrase</label>' +
    '  <div class="col-sm-9">' +
    '    <input type="text" class="form-control" name="passphrase" />' +
    '  </div>' +
    '</div>' +
    '<div class="form-group">' +
    '  <button class="btn btn-cozy" name="sign">Sign</button>' +
    '</div>' +
    '<div class="form-group">' +
    '  <div class="col-sm-10">' +
    '    <pre name="key"></pre>' +
    '  </div>' +
    '</div>' +
    '</form>';
    win = window.plugins.helpers.modal({title: "Generate private key", body: body});
    btnSign = win.querySelector('[name=sign]');
    btnSign.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var privateKey = wallet.privateKeys.getForId(win.querySelector('[name=key]').value);
      privateKey.decrypt(win.querySelector('[name=passphrase]').value);
      openpgp.signClearMessage(privateKey, text)
      .then(function (signed) {
        window.jQuery(win).modal('hide');
        cb(signed);
      })
      .catch(function (err) {
        console.error(err);
      });
    });
  }
  function listKeys() {
    var keys = wallet.getAllKeys();
    keys.forEach(function (key) {
      console.log(key);
      //console.log('Armor', key.armor());
      //console.log('Expiration', key.getExpirationTime());
      //console.log('IDS', key.getKeyIds());
      key.getKeyIds().forEach(function (id) {
        console.log(id.toHex().substr(-8).toUpperCase());
      });
      //console.log('Algo', key.getPreferredHashAlgorithm());
      //console.log('User', key.getPrimaryUser());
      console.log('Users', key.getUserIds().join(','));
      console.log('private', key.isPrivate());
      console.log('public', key.isPublic());
      var primary = key.primaryKey;
      //console.log('algo', primary.algorithm);
      console.log('created', primary.created.toString());
      console.log('fingerprint', primary.fingerprint);
      console.log('id', primary.keyid.toHex().substr(-8).toUpperCase());
      console.log('size', primary.getBitSize());

    });
  }
  window.listKeys = listKeys;

  function doCheck(msg, key) {
    var pubKeys1 = {}, pubKeys2 = [];
    function format(pubkey) {
      var users = [];
      //debugger;
      pubkey.users.forEach(function (u) {
        if (typeof u.userId !== 'undefined' && u.userId !== null) {
          users.push(u.userId.userid);
        }
      });
      pubkey.userNames = users.join(', ');
      pubkey.getKeyIds().forEach(function (id) {
        pubKeys1[id.toHex()] = pubkey;
      });
      pubKeys2.push(pubkey);
    }
    if (typeof key === 'string') {
      openpgp.key.readArmored(key).keys.forEach(format);
    } else {
      format(key);
    }
    msg.verify(pubKeys2).forEach(function (verify) {
      var pubkeyId = verify.keyid.toHex(),
          name     = pubkeyId.substr(-8).toUpperCase() + " " + pubKeys1[pubkeyId].userNames,
          actionbar, btn;
      if (verify.valid === true) {
        actionbar = render('Good signature by key ' + name, 'success');
        btn = document.createElement('button');
        btn.setAttribute('class', 'btn btn-xs btn-success')
        btn.textContent = 'Add';
        btn.addEventListener('click', function () {
          wallet.publicKeys.importKey(key);
          //wallet.publicKeys.push(verify);
          console.log(wallet.getAllKeys());
          alert("Key " + pubkeyId + " added");
          wallet.store();
        });
        actionbar.appendChild(btn);
      } else {
        render('Wrong signature by key ' + name, 'danger');
      }
    });
  }
  function checkSignatures(msg) {
    var keys;
    try {
      keys = msg.getSigningKeyIds();
      keys.forEach(function (keyID) {
        var key, req;
        keyID = keyID.toHex();
        key = wallet.publicKeys.getForId(keyID);
        if (key === null) {
          req = new XMLHttpRequest();
          //req.open('GET', 'http://www.corsproxy.com/pgp.mit.edu/pks/lookup?op=get&search=0x' + keyID, true);
          req.open('GET', 'https://keys.whiteout.io/publickey/key/' + keyID, true);
          req.onreadystatechange = function () {
            if (req.readyState === 4) {
              if (req.status === 200) {
                try {
                  doCheck(msg, req.responseText);
                } catch (e) {
                  render('Unable to check message signature', 'warning');
                  console.log(e);
                }
              } else {
                render('Key not found', 'warning');
              }
            }
          };
          req.send(null);
        } else {
          doCheck(msg, key);
        }
      });
    } catch (e) {
      render('Unable to check message signature', 'warning');
      console.log(e);
    }
  }
  function checkMessage(message) {
    var cleartext, messageId, boundary, xhr;
    render('Checking signature', 'info');
    if (/^-----BEGIN PGP SIGNED MESSAGE/.test(message.text)) {
      cleartext = openpgp.cleartext.readArmored(message.text);
      checkSignatures(cleartext);
    } else {
      messageId = window.cozyMails.getCurrentMessage().id;
      message.headers['content-type'].split(/;\s+/).forEach(function (type) {
        if (/boundary/.test(type)) {
          boundary = type.split('=')[1].replace(/"|'/g, '')
                     // escape special chars
                     .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        }
      });
      xhr = new XMLHttpRequest();
      xhr.open('GET', 'raw/' + messageId, true);
      xhr.onload = function () {
        try {
          var re  = new RegExp("^." + boundary + ".*$", "gim"),
              raw = xhr.responseText,
              headers = {},
              res, parts, packetlist, literalDataPacket, input;
          raw.split(/^--/gim)[0].replace(/\n\s+/gim, "").split(/\n/gim).forEach(function (h) {
            var tmp = h.split(':');
            if (tmp.length === 2) {
              headers[tmp[0].toLowerCase()] = tmp[1];
            }
          });
          res = /boundary=(.)([^\1]+?)\1/.exec(headers['content-type']);
          if (res && res.length === 3) {
            boundary = res[2].replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
          }
          re = new RegExp('\r{0,1}\n^-+' + boundary + '.*[\r|\n]+', 'gim');
          parts = raw.split(re).slice(1);
          packetlist = new openpgp.packet.List();
          literalDataPacket = new openpgp.packet.Literal();
          input = openpgp.armor.decode(parts[1]).data;
          literalDataPacket.setText(parts[0]);
          packetlist.push(literalDataPacket);
          packetlist.read(input);
          checkSignatures(new openpgp.message.Message(packetlist));
        } catch (e) {
          render('Unable to check message signature', 'warning');
          console.log(e);
        }

      };
      xhr.onerror = function (e) {
        console.log("Error: ", e);
      };
      xhr.send();
      /*
      message.attachments.forEach(function (attach) {
        if (attach.contentType === 'application/pgp-signature') {

        }
      });
      */
    }
  }

  root.OpenPGP = {
    name: "OpenPGP",
    active: true,
    onActivate: function () {
      wallet = new openpgp.Keyring();
      window.wallet = wallet;
    },
    onAdd: {
      condition: function (node) {
        return node.querySelectorAll(".form-compose textarea.editor").length > 0;
      },
      action: function (node) {
        if (node.querySelector('.btn-encrypt')) {
          return;
        }
        var btnEncrypt, btnSign;
        btnEncrypt = document.createElement('button');
        btnEncrypt.setAttribute('class', 'btn btn-cozy-non-default btn-encrypt');
        btnEncrypt.textContent = 'Encrypt';
        btnEncrypt.addEventListener('click', function (e) {
          e.preventDefault();
          var keys = [];
          document.getElementById('compose-to').value.split(',').forEach(function (address) {
            var key = wallet.publicKeys.getForAddress(address.trim());
            if (key.length > 0) {
              keys = keys.concat(key);
            }
          });
          if (keys.length > 0) {
            openpgp.encryptMessage(keys, node.querySelector('textarea.editor').value).then(function (pgpMessage) {
              node.querySelector('textarea.editor').value = pgpMessage;
            }).catch(function (error) {
              console.log('error', error);
            });
          }
        });
        node.querySelector('.btn-cancel').parentNode.appendChild(btnEncrypt);
        btnSign = document.createElement('button');
        btnSign.setAttribute('class', 'btn btn-cozy-non-default btn-sign');
        btnSign.textContent = 'Sign';
        btnSign.addEventListener('click', function (e) {
          var target = node.querySelector('textarea.editor');
          e.preventDefault();
          sign(target.value, function (signed) {
            target.value = signed;
            console.log(signed, target);
          });
        });
        node.querySelector('.btn-cancel').parentNode.appendChild(btnSign);
      }
    },
    listeners: {
      'MESSAGE_LOADED': function () {
        var message = window.cozyMails.getCurrentMessage(),
            sigAttached;
        sigAttached = message.attachments.some(function (a) {
          return /pgp/.test(a.contentType);
        });
        if (/PGP/.test(message.text) || sigAttached) {
          checkMessage(message);
        }
      }
    }
  };
})(window.plugins);
if (typeof window.pluginUtils !== 'undefined') {
  window.pluginUtils.activate('OpenPGP');
}
