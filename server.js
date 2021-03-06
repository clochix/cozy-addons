//jshint node: true
(function () {
  "use strict";
  var express    = require('express'),
      http       = require('http'),
      path       = require('path'),
      fs         = require('fs'),
      async      = require('async'),
      bodyParser = require('body-parser'),
      model      = require('./lib/model'),
      CleanCSS   = require('clean-css'),
      UglifyJS   = require('uglify-js'),
      request    = require('request'),
      app, port, host, router;
  process.on('uncaughtException', function (err) {
    console.error("Uncaught Exception");
    console.error(err);
    console.error(err.stack);
  });

  port = process.env.PORT || 9251;
  host = process.env.HOST || "127.0.0.1";

  app = express();

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  router = express.Router();
  app.use('/api', router);

  router.route('/addons')
    .get(function (req, res) {
      fs.readdir('public', function (errReaddir, files) {
        if (errReaddir) {
          res.send(errReaddir);
        } else {
          async.filter(files, function (file, cb) {
            fs.exists('public/' + file + '/init.js', cb);
          }, function (dirs) {
            async.map(dirs, function (addon, cb) {
              var packagePath = 'public/' + addon + '/package.json';
              fs.exists(packagePath, function (exists) {
                if (exists) {
                  fs.readFile(packagePath, function (errRead, data) {
                    var description;
                    if (errRead) {
                      cb(errRead);
                    } else {
                      description = JSON.parse(data).description;
                      cb(null, {path: addon, description: description});
                    }
                  });
                } else {
                  cb(null, {path: addon});
                }
              });
            }, function (errMap, addons) {
              var apps = {};
              addons.map(function (addon) {
                var reg = /([^A-Z]*)(.*$)/.exec(addon.path);
                if (typeof apps[reg[1]] === 'undefined') {
                  apps[reg[1]] = [];
                }
                apps[reg[1]].push(addon);
              });
              res.json(apps);
            });
          });
        }
      });
    });

  function getCode(name, cb) {
    var basePath, packagePath;
    if (name.substr(0, 4) === 'http') {
      request(name, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          cb(null, UglifyJS.minify(body, {fromString: true}).code);
        } else {
          cb(error);
        }
      });
    } else {
      basePath    = 'public/' + name + '/';
      packagePath = basePath + 'package.json';
      fs.exists(packagePath, function (exists) {
        var scripts;
        if (exists) {
          fs.readFile(packagePath, function (errRead, data) {
            if (errRead) {
              cb(errRead);
            } else {
              scripts = JSON.parse(data).scripts.map(function (script) {
                return basePath + script;
              });
              cb(null, UglifyJS.minify(scripts).code);
            }
          });
        } else {
          cb(null, UglifyJS.minify(basePath + 'init.js').code);
        }
      });
    }
  }

  function getCss(name, cb) {
    var basePath, packagePath;
    if (name.substr(0, 4) === 'http') {
      request(name, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          new CleanCSS().minify(body, cb);
        } else {
          cb(error);
        }
      });
    } else {
      basePath    = 'public/' + name + '/';
      packagePath = basePath + 'package.json';
      fs.exists(packagePath, function (exists) {
        if (exists) {
          fs.readFile(packagePath, function (errRead, data) {
            if (errRead) {
              cb(errRead);
            } else {
              new CleanCSS({root: basePath}).minify(JSON.parse(data).css, cb);
            }
          });
        } else {
          cb(null, '');
        }
      });
    }
  }

  router.route('/addons/:name')
    .get(function (req, res) {
      var name = req.params.name;
      fs.stat('public/' + name, function (errStat, stats) {
        if (errStat || typeof stats === 'undefined' || !stats.isDirectory()) {
          res.status(404).end();
        } else {
          getCode(name, function (err, code) {
            if (err) {
              console.error(err);
              res.status(500).send(err);
            }
            res.send(code);
          });
        }
      });
    });

  router.route('/registered')
    .get(function (req, res) {
      model.all(null, function (err, result) {
        if (err) {
          res.send(err);
        } else {
          res.json(result);
        }
      });
    });


  router.route('/registered/:name')
    .get(function (req, res) {
      model.request('byApp', {key: req.params.name}, function (err, result) {
        var scripts, styles = '';
        if (err) {
          res.send(err);
        } else {
          if (typeof req.query.raw !== 'undefined') {
            if (result.length === 0) {
              res.send('');
            } else {
              scripts = result[0].scripts;
              if (req.query.raw === 'css') {
                async.map(scripts, getCss, function (errScript, code) {
                  if (errScript) {
                    res.status(500).send(errScript);
                  } else {
                    code.map(function (style) {
                      if (style !== '') {
                        styles += style.styles + "\n";
                      }
                    });
                    res.type('text/css').send(styles);
                  }
                });
              } else {
                async.map(scripts, getCode, function (errScript, code) {
                  if (errScript) {
                    res.status(500).send(errScript);
                  } else {
                    res.type('text/javascript').send(code.join("\n"));
                  }
                });
              }
            }
          } else {
            if (result.length === 0) {
              res.status(404).end();
            } else {
              res.json(result[0]);
            }
          }
        }
      });
    })
    .post(function (req, res) {
      model.request('byApp', {key: req.params.name}, function (err, result) {
        if (err) {
          res.send(err);
        } else {
          if (result.length === 0) {
            model.create({app: req.params.name, scripts: req.body}, function (errCreate, resCreate) {
              if (err) {
                console.error("Error creating", errCreate);
                res.status(500).send(errCreate);
              } else {
                res.json(resCreate);
              }
            });
          } else {
            model.updateAttributes(result[0]._id, {scripts: req.body}, function (errCreate, resCreate) {
              if (err) {
                console.error("Error saving", errCreate);
                res.status(500).send(errCreate);
              } else {
                res.json(resCreate);
              }
            });
          }
        }
      });
    });

  // Enable CORS
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-Requester");
    next();
  });

  // Serve static content
  app.use(express.static(path.join(__dirname, '/public/')));

  // Starts the server
  http.createServer(app).listen(port, host, function () {
    console.log("Server listening to %s:%d within %s environment", host, port, app.get('env'));
  });
}());
