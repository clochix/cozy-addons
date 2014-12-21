//jshint browser: true, strict: false
/*global openpgp */
if (typeof window.plugins !== "object") {
  window.plugins = {};
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
            console.log(pubkey);
            pubkey.users.forEach(function (u) {
              if (typeof u.userId !== 'undefined') {
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
              console.log('Good signature by key ' + name);
            } else {
              console.log('Wrong signature by key ' + name);
            }
          });
        } else {
          console.error("Key not found");
        }
      }
    };
    req.send(null);
  });
}
function checkMessage(message) {
  var cleartext;
  if (/^-----BEGIN PGP SIGNED MESSAGE/.test(message.text)) {
    cleartext = openpgp.cleartext.readArmored(message.text);
    checkSignatures(cleartext);
  } else {
    message.attachments.forEach(function (attach) {
      if (attach.contentType === 'application/pgp-signature') {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', attach.url, true);
        xhr.onload = function (e) {
          console.log(xhr.responseText);
          var packetlist = new openpgp.packet.List(),
              literalDataPacket = new openpgp.packet.Literal(),
              input = openpgp.armor.decode(xhr.responseText).data;
          console.log(message.text);
          //@FIXME We need the raw body attachment
          literalDataPacket.setText(message.text);
          packetlist.push(literalDataPacket);
          packetlist.read(input);
          checkSignatures(new openpgp.message.Message(packetlist));
        };
        xhr.onerror = function (e) {
          // @TODO
        };
        xhr.send();

      }
    });
  }
}
(function (root) {
  root.openPGP = {
    name: "OpenPGP",
    active: true,
    listeners: {
      'MESSAGE_LOADED': function (params) {
        checkMessage(params.detail);
      }
    }
  };
})(window.plugins);
