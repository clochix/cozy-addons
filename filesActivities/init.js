//jshint browser: true, strict: false
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
(function () {
  "use strict";
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
    xhr.send();
  }
  function folderTree(onOk, onKo) {
    function toDom(t, parent) {
      var ul;
      parent = parent || '';
      ul = document.createElement('ul');
      ul.style.listStyle = 'none';
      ul.style.paddingLeft = '1em';
      Object.keys(t).forEach(function (e) {
        var li = document.createElement('li'), path;
        path = parent + e;
        li.textContent = '/' + e;
        li.dataset.path = path;
        ul.appendChild(li);
        if (Object.keys(t[e]).length > 0) {
          ul.appendChild(toDom(t[e], path + '/'));
        }
      });
      return ul;
    }
    function onClose() {
      console.log('closed');
      onKo('USER CANCELED');
    }
    get('/folders/list', function (err, xhr) {
      var tree = {}, folders, treeDom, win;
      if (err) {
        console.log(err);
        onKo(err);
      } else {
        folders = JSON.parse(xhr.responseText);
        folders.forEach(function (path) {
          path.split('/').reduce(function (prev, current) {
            if (!prev[current]) {
              prev[current] = {};
            }
            return prev[current];
          }, tree);
        });
        treeDom = toDom(tree);
        treeDom.addEventListener('click', function (e) {
          window.jQuery(win).modal('hide');
          onOk(e.target.dataset.path);
        }, true);
        // Wait a little for the page to really be rendered
        setTimeout(function () {
          win = window.plugins.helpers.modal({'body': treeDom, onClose: onClose});
          console.log(win);
        }, 500);
      }
    });
  }
  function onClickHandler(e) {
    var target, xhr;
    if (!window.plugins.activities.picking) {
      return;
    }
    target = e.target.closest("[data-file-url]");
    if (target !== null) {
      e.preventDefault();
      e.stopPropagation();
      window.plugins.activities.picking = false;
      xhr = new XMLHttpRequest();
      xhr.open("GET", target.dataset.fileUrl, true);
      xhr.responseType = "blob";
      xhr.onload = function () {
        var reader;
        console.log(xhr);
        reader  = new FileReader();
        reader.onloadend = function () {
          var res = {
            name: target.dataset.fileUrl.split('/').pop(),
            data: reader.result,
            type: xhr.response.type,
            size: xhr.response.size
          };
          window.plugins.activities.message.postResult(res);
          //window.close();
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.send();
    }
  }

  window.plugins.activities = {
    name: "Activities",
    active: true,
    onAdd: {
      /**
       * Should return true if plugin applies on added subtree
       *
       * @param {DOMNode} root node of added subtree
       */
      condition: function (node) {
        return node.id === 'table-items' || node.querySelector('#table-items') !== null;
      },
      /**
       * Perform action on added subtree
       *
       * @param {DOMNode} root node of added subtree
       */
      action: function () {
        document.getElementById('table-items').addEventListener('click', onClickHandler);
      }
    },
    onDelete: {
      /**
       * Should return true if plugin applies on added subtree
       *
       * @param {DOMNode} root node of added subtree
       */
      condition: function () {
        //return node.querySelector('iframe.content') !== null;
        return false;
      },
      /**
       * Perform action on added subtree
       *
       * @param {DOMNode} root node of added subtree
       */
      action: function (node) {
        console.log('Del', node);
      }
    },
    /**
     * Called when plugin is activated
     */
    onActivate: function () {
      var manifest, options, handler;
      if (typeof window.MozActivity === 'undefined') {
        manifest = {
          "activities": {
            "save": {
              "href": null,            // default to current URL
              "disposition": 'window', // 'window' (default) or 'inline'
              "filters": {
                "type": []
              },
              "returnValue": true
            },
            "pick": {
              "href": null,            // default to current URL
              "disposition": 'window', // 'window' (default) or 'inline'
              "filters": {
                "type": []
              },
              "returnValue": true
            }
          }
        };
        options = {
          "server": window.location.protocol + "//" + window.location.hostname + ":9104/apps/acthesis",
          //"ws": "ws://cozy.clochix.net:9104/apps/acthesis",
          postMethod: "message"
        };
        new window.Acthesis(options, manifest);
      }

      handler = function (message) {
        //console.log("[provider] Handler", message);
        var data = message.source.data;
        function saveOk(path) {
          var formData, xhr, blob;

          function dataURItoBlob(dataURI) {
            var byteString, ia, i;
            if (dataURI.split(',')[0].indexOf('base64') >= 0) {
              byteString = atob(dataURI.split(',')[1]);
            } else {
              byteString = window.unescape(dataURI.split(',')[1]);
            }
            //mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
            ia = new Uint8Array(byteString.length);
            for (i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            return ia;
          }

          blob = new Blob([dataURItoBlob(data.blob)], {type: data.fileType});
          formData = new FormData();
          formData.append("name", data.fileName);
          formData.append("path", path);
          formData.append("lastModification", "");
          formData.append("overwrite", true);
          formData.append("file", blob, data.fileName);

          xhr = new XMLHttpRequest();
          xhr.open("POST", "/files");
          xhr.send(formData);

          message.postResult(path);
        }
        function saveKo(result) {
          message.postError(result);
        }
        switch (message.source.name) {
          case 'save':
            folderTree(saveOk, saveKo);
            break;
          case 'pick':
            window.plugins.activities.picking = true;
            window.plugins.activities.message = message;
            break;
          default:
            message.postError("WRANG ACTIVITY");
        }
      };
      navigator.mozSetMessageHandler('activity', handler);
      if (navigator.mozHasPendingMessage('activity')) {
        console.log("[provider] PENDING activities");
      } else {
        console.log("[provider] No pending activities");
      }

    },
    /**
     * Called when plugin is deactivated
     */
    onDeactivate: function () {
      //console.log('Plugin sample deactivated');
    }
  };
}());
