//jshint browser: true, strict: false
/*global openpgp */
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
function render(txt) {
  var container = document.querySelector('.messageToolbox + .row'),
      actionbar = document.createElement('div');
  actionbar.classList.add('content-action');
  actionbar.textContent = txt;
  container.insertBefore(actionbar, container.firstChild);
}
function checkSignatures(msg) {
  var keys;
  keys = msg.getSigningKeyIds();
  keys.forEach(function (keyID) {
    var req = new XMLHttpRequest();
    req.open('GET', 'http://www.corsproxy.com/pgp.mit.edu/pks/lookup?op=get&search=0x' + keyID.toHex(), true);
    req.onreadystatechange = function (aEvt) {
      var pubKeys1 = {}, pubKeys2 = [];
      if (req.readyState === 4) {
        if (req.status === 200) {
          openpgp.key.readArmored(req.responseText).keys.forEach(function (pubkey) {
            var users = [];
            pubkey.users.forEach(function (u) {
              if (typeof u.userId !== 'undefined' && u.userId !== null) {
                users.push(u.userId.userid);
              }
            });
            pubkey.userNames = users.join(', ');
            pubKeys1[keyID.toHex()] = pubkey;
            pubKeys2.push(pubkey);
          });
          msg.verify(pubKeys2).forEach(function (verify) {
            var pubkeyId = verify.keyid.toHex(),
            name = pubkeyId + " " + pubKeys1[pubkeyId].userNames;
            if (verify.valid === true) {
              render('Good signature by key ' + name);
            } else {
              render('Wrong signature by key ' + name);
            }
          });
        } else {
          render("Key not found");
        }
      }
    };
    req.send(null);
  });
}
function checkMessage(message) {
  var cleartext, mailboxId, messageId, boundary, xhr;
  if (/^-----BEGIN PGP SIGNED MESSAGE/.test(message.text)) {
    cleartext = openpgp.cleartext.readArmored(message.text);
    checkSignatures(cleartext);
  } else {
    mailboxId = window.cozyMails.getCurrentMailbox().id;
    messageId = message.mailboxIDs[mailboxId];
    message.headers['content-type'].split(/;\s+/).forEach(function (type) {
      if (/boundary/.test(type)) {
        boundary = type.split('=')[1].replace(/"|'/g, '');
      }
    });
    xhr = new XMLHttpRequest();
    xhr.open('GET', 'raw/' + mailboxId + '/' + messageId, true);
    xhr.onload = function (e) {
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
      res = /boundary=(.)([^\1]+)\1/.exec(headers['content-type']);
      if (res && res.length === 3) {
        boundary = res[2];
      }
      re = new RegExp('\r{0,1}\n^-+' + boundary + '-*[\r|\n]+', 'gim');
      parts = raw.split(re).slice(1);
      packetlist = new openpgp.packet.List();
      literalDataPacket = new openpgp.packet.Literal();
      input = openpgp.armor.decode(parts[1]).data;
      literalDataPacket.setText(parts[0]);
      packetlist.push(literalDataPacket);
      packetlist.read(input);
      checkSignatures(new openpgp.message.Message(packetlist));
    };
    xhr.onerror = function (e) {
      // @TODO
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
(function (root) {
  root.openPGP = {
    name: "OpenPGP",
    active: true,
    listeners: {
      'MESSAGE_LOADED': function (params) {
        var message = params.detail;
        if (/PGP/.test(message.text) ||
            message.attachments.some(function (a) {
              return /pgp/.test(a.contentType);
            })
           ) {
              checkMessage(message);
            }
        }
    }
  };
      })(window.plugins);
