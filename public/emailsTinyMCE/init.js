//jshint browser: true
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
window.plugins.tinymceeditor = {
  name: "tinymce-editor",
  type: "editor",
  active: false,
  onActivate: function () {
    "use strict";
    var script = document.createElement('script');
    script.type  = 'text/javascript';
    script.async = true;
    script.src   = "//tinymce.cachefly.net/4.1/tinymce.min.js";
    document.body.appendChild(script);
  },
  onAdd: {
    condition: function (node) {
      "use strict";
      return node.querySelector('.rt-editor') !== null;
    },
    action: function (node) {
      "use strict";
      function initEditor() {
        window.tinymce.init({
          selector: ".rt-editor",
          inline: true,
          menubar: false,
          statusbar: true,
          toolbar: "undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
          skin: ''
        });
      }
      if (typeof window.tinymce !== 'undefined') {
        initEditor();
      } else {
        var wait = window.setInterval(function () {
          if (typeof window.tinymce !== 'undefined') {
            window.clearInterval(wait);
            initEditor();
          }
        }, 5000);
      }
    }
  }
};
