//jshint browser: true, strict: false
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
(function () {
  "use strict";
  window.plugins.activity = {
    name: "Web Activities",
    active: true,
    onActivate: function () {
      if (typeof window.MozActivity === 'undefined' && typeof window.Acthesis !== 'undefined') {
        var manifest, options;
        options = {
          postMethod: 'message'
        };
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          options.server = 'http://localhost:9250';
        } else {
          options.server =  window.location.protocol + "//" + window.location.hostname + "/apps/acthesis";
        }
        manifest = {
          "activities": {
            "share": {
              "disposition": 'window',
              "filters": {
                "type": []
              },
              "returnValue": false
            }
          }
        };
        window.Acthesis(options, manifest);
      }
      function handler(message) {
        var wait, editor;
        function share() {
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
        switch (message.source.name) {
          case 'share':
            share();
            break;
          default:
            message.postError("WRONG ACTIVITY");
        }
      }
      navigator.mozSetMessageHandler('activity', handler);
    },
    onAdd: {
      condition: function (node) {
        return node.querySelectorAll("[data-file-url], .file-picker").length > 0;
      },
      action: function (node) {
        var attachments, pickers;
        attachments = node.querySelectorAll("[data-file-url]");
        Array.prototype.forEach.call(attachments, function (elmt) {
          var icon = document.createElement('a');
          icon.style.paddingLeft = '.5em';
          icon.innerHTML = "<i class='fa fa-cloud-upload' data-gallery></i>";
          icon.addEventListener('click', function (event) {
            event.stopPropagation();
            event.preventDefault();
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

            };
            xhr.send();
          });
          elmt.parentNode.querySelector('.file-actions').appendChild(icon);

        });
        pickers = node.querySelectorAll(".file-picker");
        Array.prototype.forEach.call(pickers, function (elmt) {
          if (!elmt.querySelector('.file-wrapper') || elmt.querySelector('.files-activity')) {
            return;
          }
          var icon = document.createElement('a');
          icon.classList.add('clickable');
          icon.style.paddingLeft = '.5em';
          icon.innerHTML = "<i class='fa fa-cloud-download files-activity'></i>";
          icon.addEventListener('click', function () {
            var activity;
            activity = new window.MozActivity({
              name: "pick",
              data: { }
            });
            activity.onsuccess = function () {
              console.log("[client] Activity successfuly handled");
              console.log('[client]', this.result);
              function dataURItoBlob(dataURI) {
                var byteString, mimeString, ia, i;
                if (dataURI.split(',')[0].indexOf('base64') >= 0) {
                  byteString = atob(dataURI.split(',')[1]);
                } else {
                  byteString = window.unescape(dataURI.split(',')[1]);
                }
                mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
                console.log(mimeString);
                ia = new Uint8Array(byteString.length);
                for (i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                return ia;
              }

              var component = window.rootComponent.refs.compose.refs.attachments,
                  blob      = new Blob([dataURItoBlob(this.result.data), {type: this.result.type}]);
              blob.name = this.result.name;
              component.addFiles([component._fromDOM(blob)]);
            };
            activity.onerror = function () {
              console.error("[client] The activity got an error: " + this.error);
              console.log(this.error);
            };
          });
          elmt.appendChild(icon);

        });
      }
    }
  };
}());
if (typeof window.pluginUtils !== 'undefined') {
  window.pluginUtils.activate('activity');
}
