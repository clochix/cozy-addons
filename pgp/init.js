//jshint browser: true, strict: false
/*global openpgp */
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
(function (root) {
  root.openPGP = {
    name: "OpenPGP",
    active: true,
    onAdd: {
      condition: function (node) {
        return node.querySelector('.signed-message') !== null;
      },
      /**
       * Perform action on added subtree
       *
       * @param {DOMNode} node node of added subtree
       */
      action: function (node) {
        var message, cleartext, keys;
        message = node.querySelector('.signed-message').textContent;
        cleartext = openpgp.cleartext.readArmored(message);
        keys = cleartext.getSigningKeyIds();
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
                    users.push(u.userId.userid);
                  });
                  pubkey.userNames = users.join(', ');
                  pubKeys1[keyID.toHex()] = pubkey;
                  pubKeys2.push(pubkey);
                });
                cleartext.verify(pubKeys2).forEach(function (verify) {
                  var pubkeyId = verify.keyid.toHex(),
                      name = pubkeyId + " " + pubKeys1[pubkeyId].userNames;
                  console.log(verify);
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
    },
    /**
     * Called when plugin is activated
     */
    onActivate: function () {
      if (this.onAdd.condition(document.body)) {
        this.onAdd.action(document.body);
      }
    },
    /**
     * Called when plugin is deactivated
     */
    onDeactivate: function () {
    },
    listeners: {
    }
  };
})(window.plugins);
