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
  function fillForm() {
    var target = document.getElementById('select');
    target.innerHTML = '';
    get('api/registered', function (err, xhr) {
      var result, registered = {};
      if (!err) {
        result = JSON.parse(xhr.responseText);
        if (Array.isArray(result)) {
          result.map(function (reg) {
            registered[reg.app] = reg.scripts;
          });
        }
        get('api/addons', function (errAddons, xhrAddons) {
          var addons;
          if (!errAddons) {
            addons = JSON.parse(xhrAddons.responseText);
            Object.keys(addons).forEach(function (app) {
              var template = document.getElementById('apps').cloneNode(true),
                  ul = qs('ul', template);
              if (typeof registered[app] === 'undefined') {
                registered[app] = [];
              }
              qs('.remoteAdd', ul).name = app;
              template.removeAttribute('id');
              qs('h3', template).innerHTML = app;
              addons[app].forEach(function (addon) {
                var li       = qs('#addon li').cloneNode(true),
                    checkbox = qs('input[type=checkbox]', li),
                    label    = qs('label', li);
                label.setAttribute('for', app);
                label.innerHTML  = addon.path + ' : ' + (addon.description || '');
                checkbox.name    = app;
                checkbox.value   = addon.path;
                checkbox.checked = registered[app].indexOf(addon.path) !== -1;
                ul.insertBefore(li, ul.lastElementChild);
              });
              registered[app].forEach(function (addon) {
                if (qs('input[value="' + addon + '"]', ul)) {
                  return;
                }
                var li       = qs('#addon li').cloneNode(true),
                    checkbox = qs('input[type=checkbox]', li),
                    label    = qs('label', li);
                label.setAttribute('for', app);
                label.innerHTML  = addon;
                checkbox.name    = app;
                checkbox.value   = addon;
                checkbox.checked = true;
                ul.insertBefore(li, ul.lastElementChild);
              });
              target.appendChild(template);
              target.scrollIntoView();
            });
          }
        });
      }
    });
  }
  document.addEventListener('click', function (e) {
    var app, scr, input;
    function getScripts(a) {
      var scripts = [];
      qsa("[name='" + a + "']").forEach(function (box) {
        if (box.checked) {
          scripts.push(box.value);
        }
      });
      return scripts;
    }
    if (e.target.classList.contains('checkAddon')) {
      app = e.target.name;
      post('api/registered/' + app, getScripts(app), fillForm);
    } else if (e.target.classList.contains('remoteAdd')) {
      app = e.target.name;
      scr = getScripts(app);
      input = qs('.remoteInput', e.target.parentNode);
      scr.push(input.value);
      input.value = '';
      post('api/registered/' + app, scr, fillForm);
    }
  });

  fillForm();

}());
