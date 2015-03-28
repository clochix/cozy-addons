//jshint browser: true
(function () {
  "use strict";
  function qs(sel, root) {
    root = root || document;
    return root.querySelector(sel);
  }
  function qsa(sel, root) {
    root = root || document;
    return [].slice.call(root.querySelectorAll(sel));
  }

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
  function post(url, data, cb) {
    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
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
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(data);
  }
  get('api/registered', function (err, xhr) {
    var registered = {};
    if (!err) {
      JSON.parse(xhr.responseText).map(function (reg) {
        registered[reg.app] = reg.scripts;
      });
      console.log(registered);
      get('api/addons', function (errAddons, xhrAddons) {
        var addons, target = document.getElementById('select');
        if (!errAddons) {
          addons = JSON.parse(xhrAddons.responseText);
          Object.keys(addons).forEach(function (app) {
            var template = document.getElementById('apps').cloneNode(true),
                ul = qs('ul', template);
            if (typeof registered[app] === 'undefined') {
              registered[app] = [];
            }
            template.id = undefined;
            qs('h3', template).innerHTML = app;
            addons[app].forEach(function (addon) {
              var li       = qs('#addon li').cloneNode(true),
                  checkbox = qs('input[type=checkbox]', li),
                  label    = qs('label', li);
              label.setAttribute('for', app);
              label.innerHTML  = addon.path + ' : ' + (addon.description);
              checkbox.name    = app;
              checkbox.value   = addon.path;
              checkbox.checked = registered[app].indexOf(addon.path) !== -1;
              ul.appendChild(li);
            });
            target.appendChild(template);
          });
        }
      });
    }
  });
  document.addEventListener('click', function (e) {
    var app, scripts = [];
    if (e.target.tagName === 'INPUT') {
      app = e.target.name;
      qsa("[name='" + app + "']").forEach(function (box) {
        if (box.checked) {
          scripts.push(box.value);
        }
      });
      post('api/registered/' + app, scripts);
    }
  });
}());
