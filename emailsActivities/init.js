//jshint browser: true, strict: false
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
window.plugins.activity = {
  name: "Web Activities",
  active: true,
  /**
   * Called when plugin is activated
   */
  onActivate: function () {
    //console.log('Plugin sample activated');
    if (typeof window.MozActivity === 'undefined') {
      var manifest, options;
      options = {
        postMethod: 'message',
        server: 'http://127.0.0.1:9250',
        ws: 'ws://127.0.0.1:9250'
      };
      manifest = {
        "activities": {
          "share": {
            "href": null,        // default to current URL
            "disposition": null, // 'window' (default) or 'inline'
            "filters": {
              "type": []         // @TODO
            },
            "returnValue": false
          }
        }
      };
      window.Acthesis(options, manifest);
    }
    function handler(message) {
      "use strict";
      var wait, editor;
      window.cozyMails.messageNew();
      editor = document.querySelector("#email-compose .editor, #email-compose .rt-editor");
      if (!editor) {
        wait = window.setInterval(function () {
          editor = document.querySelector("#email-compose .editor, #email-compose .rt-editor");
          if (editor) {
            window.clearInterval(wait);
            editor.innerHTML = message.source.url;
          }
        }, 100);
      } else {
        editor.innerHTML = message.source.url;
      }
    }
    navigator.mozSetMessageHandler('share', handler);
  },
  /**
   * Called when plugin is deactivated
   */
  onDeactivate: function () {
    //console.log('Plugin sample deactivated');
  },
  listeners: {
    'VIEW_ACTION': function (params) {
    }
  },
  onAdd: {
    condition: function (node) {
      return node.querySelectorAll("[data-file-url]").length > 0;
    },
    action: function (node) {
      var attachments = node.querySelectorAll("[data-file-url]");
      Array.prototype.forEach.call(attachments, function (elmt, idx) {
        var icon = document.createElement('a');
        icon.style.paddingLeft = '.5em';
        icon.innerHTML = "<i class='fa fa-cloud-upload' data-gallery></i>";
        icon.addEventListener('click', function () {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", elmt.dataset.fileUrl, true);
          xhr.responseType = "blob";
          xhr.onload = function () {
            var activity, reader;
            reader  = new FileReader();
            reader.onloadend = function () {
              activity = new window.MozActivity({
                name: "save",
                data: {
                  url: elmt.dataset.fileUrl,
                  fileName: elmt.dataset.fileName,
                  fileType: elmt.dataset.fileType,
                  blob: reader.result
                }
              });
              activity.onsuccess = function () {
                console.log("[client] Activity successfuly handled");
                console.log('[client]', this.result);
              };
              activity.onerror = function () {
                console.error("[client] The activity got an error: " + this.error);
                console.log(this.error);
              };
            };
            reader.readAsDataURL(xhr.response);

            //blob = new Blob([xhr.response], {type: elmt.dataset.fileType});
          };
          xhr.send();
        });
        elmt.parentNode.querySelector('.file-actions').appendChild(icon);

      });
    }
  }
};
