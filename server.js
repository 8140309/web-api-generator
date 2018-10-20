var config = require('./config.js');
const express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
const fetch = require('node-fetch');
var session = require('express-session');
var rimraf = require('rimraf');
var mongoose = require('mongoose');
var mkdirp = require('mkdirp');
const util = require('util');
var FolderZip = require('folder-zip');
var base64 = require('file-base64');
var superagent = require('superagent');
var github = require('./github');
var port = port = process.env.PORT || config.port

const writeFilePromise = util.promisify(fs.write);
const zip = new FolderZip();
const app = express();

app.set('view engine', 'ejs')
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'XASDASDA',
    resave: false,
    saveUninitialized: false
}));

app.listen(port, () => {
    console.log('Listening on ' + port);
});

app.get("/", (req, res) => {
    res.render("index", { token: token, name: login, clientId: config.clientId, appName: config.appName, defaultConnectionString: config.defaultConnectionString })
});


/*process.on('unhandledRejection', (reason, p) => {
    console.log('XXX Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
  });*/

app.post('/generateGraphQL', function (req, res) {
    if (req.body.protect)
        res.send("protect generateGraphQL " + req.body.protect);
    else
        res.send("not protect generateGraphQL " + req.body.protect);
});

app.get('/download', function (req, res) {
    res.download(config.appFolderName + ".zip");
});

var appName = null;

app.post("/generate", (req, res) => {
    var uri = req.body.uri;
    var protect = req.body.protect;
    appName = req.body.appName;
    mongoose.Promise = global.Promise;
    const connection = mongoose.connect(uri, { useNewUrlParser: true })
        .catch(err => {
            res.send("Erro ao conectar ao mongo");
        });
    mongoose.connection.on('open', function () {
        mongoose.connection.db.listCollections().toArray(function (err, names) {
            if (err) {
                console.log(err);
            } else {

                superagent.post("https://api.github.com/user/repos")
                    .set("Authorization", "token " + token)
                    .send({
                        name: appName,
                        "description": "Created with Blabla",
                        "homepage": config.homepage,
                        "auto_init": true
                    })
                    .catch(err => {
                        console.log("Repo já existe");
                    })
                    .then((re) => {
                        console.log("KKKKKKKKKKKK " + protect);

                        var api = github({
                            username: login,
                            token: token, // created here https://github.com/settings/applications#personal-access-tokens
                            reponame: appName
                        });


                        var files = [{
                            path: 'package.json',
                            content: packageContent()
                        }, {
                            path: 'server.js',
                            content: serverContent(uri, names, protect)
                        }, {
                            path: 'config.js',
                            content: configContent(uri)
                        }];

                        names.forEach(element => {
                            let name = element.name;
                            console.log(name);
                            files.push({
                                path: "api/models/" + name + "Model.js",
                                content: modelContent(name)
                            }, {
                                    path: "api/controllers/" + name + "Controller.js",
                                    content: controllerContent(name)
                                }, {
                                    path: "api/routes/" + name + "Route.js",
                                    content: routeContent(name)
                                })
                        });

                        api.commit(files, 'Initial commit')
                            .then(r => {
                                token = null;
                                res.redirect("https://github.com/" + login + "/" + appName);
                                //res.send(r);
                            })
                            .catch((err) => {
                                res.send("Commit failed");
                            }); // returns a promise



                        /* Promise.all([
                             setContentOnRepo("/", "package.json", packageContent()),
                             setContentOnRepo("/", "server.js", serverContent(uri, names)),
                             setContentOnRepo("/", "package2.json", packageContent()),
                             setContentOnRepo("/", "server2.js", serverContent(uri, names)),
                             setContentOnRepo("/", "package3.json", packageContent()),
                             setContentOnRepo("/", "server3.js", serverContent(uri, names)),
                             /*names.map(element => {
                                 var name = element.name;
                                 console.log(name);
 
                                 return new Promise((resolve, reject) => {
                                     setContentOnRepo('/api/models/', name + "Model.js", modelContent(name));
                                     setContentOnRepo('/api/controllers/', name + "Controller.js", controllerContent(name));
                                     setContentOnRepo('/api/routes/', name + "Route.js", routeContent(name));
                                     return resolve("All Saved - " + name);
                                 });
                             })
                         ]).then((v) => {
                             res.send(v);
                         }).catch(err => {
                             res.send(err);
                         });*/


                    });

                /*rimraf(config.appFolderName, () => {
                    Promise.all([
                        setContent(config.appFolderName + "/", "package.json", packageContent()),
                        setContent(config.appFolderName + "/", "server.js", serverContent(uri, names)),
                        names.map(element => {
                            var name = element.name;
                            return new Promise((resolve, reject) => {
                                setContent(config.appFolderName + '/api/models/', name + "Model.js", modelContent(name));
                                setContent(config.appFolderName + '/api/controllers/', name + "Controller.js", controllerContent(name));
                                setContent(config.appFolderName + '/api/routes/', name + "Route.js", routeContent(name));
                                return resolve("All Saved - " + name);
                            });
                        })
                    ]).then((v) => {
                        console.log(v);
                        zip.zipFolder(config.appFolderName, {}, function () {
                            zip.writeToFile(config.appFolderName + ".zip", () => {
                                res.redirect("/download");
                            });
                        });
                    });
                });*/
            }
        });
    });

});

//var extend = require('lodash/object/assign');


const setContentOnRepo = function (path, name, content) {
    return new Promise((resolve, reject) => {
        superagent.put("https://api.github.com/repos/" + login + "/" + appName + "/contents" + path + name)
            .set("Authorization", "token " + token)
            .send({
                "message": "my commit message",
                "content": Buffer.from(content).toString('base64')
            })
            .then(r => {
                return resolve("Saved - " + name);
            })
            .catch(err => {
                return reject(err);
                //return reject("Erro ao criar ficheiro " + name);
            });
    });
}

const setContent = function (path, name, content) {
    return new Promise((resolve, reject) => {
        mkdirp(path, function (error) {
            if (error) return reject(err);
            else {
                fs.writeFile(path + name, content, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve("Saved - " + name);
                });
            }
        });
    });
}

function configContent(uri) {
    let user = uri.split("//")[1].split("@")[0].split(":");
    let username = user[0];
    let password = user[1];
    console.log(user);
    return "var config = {};" +
        "\n" +
        "\n config.adminUsername = '" + username + "';" +
        "\n config.adminPassword = '" + password + "';" +
        "\n" +
        "\n config.port = 3000;" +
        "\n" +
        "\n config.tokenSecretKey = 'super_secret';" +
        "\n /** Expressed in seconds or a string describing a time span [zeit/ms](https://github.com/zeit/ms.js).  Eg: 60, '2 days', '10h', '7d' */" +
        "\n config.tokenExireTime = '1h';" +
        "\n" +
        "\n module.exports = config;";
}





function serverContent(uri, collections, protect) {
    var c = "\n var jwt = require('jsonwebtoken');" +
        "\n" +
        "\n app.post('/login', (req, res) => {" +
        "\n\t const user = { username, password } = req.body;" +
        "\n\t if (username === config.adminUsername && password === config.adminPassword) {" +
        "\n\t\t jwt.sign({ user }, config.tokenSecretKey, { expiresIn: config.tokenExireTime }, (err, token) => {" +
        "\n\t\t\t res.json({" +
        "\n\t\t\t\t message: 'Authenticated! Use this token in the Authorization header'," +
        "\n\t\t\t\t token: token" +
        "\n\t\t\t });" +
        "\n\t\t });" +
        "\n\t } else {" +
        "\n\t\t res.status(401).send('Wrong username and/or password');" +
        "\n\t }" +
        "\n});" +
        "\n" +
        "\n app.all('/api/*', ensureToken, (req, res, next) => {" +
        "\n\t jwt.verify(req.token, config.tokenSecretKey, function (err, data) {" +
        "\n\t\t if (err) {" +
        "\n\t\t\t res.sendStatus(403);" +
        "\n\t\t } else {" +
        "\n\t\t\t console.log('User: ' + data.user.username);" +
        "\n\t\t\tnext();" +
        "\n\t\t }" +
        "\n\t });" +
        "\n });" +
        "\n" +
        "\n function ensureToken(req, res, next) {" +
        "\n\t const bearerHeader = req.headers['authorization'];" +
        "\n\t if (typeof bearerHeader !== 'undefined') {" +
        "\n\t\t const bearer = bearerHeader.split(' ');" +
        "\n\t\t const bearerToken = bearer[1];" +
        "\n\t\t req.token = bearerToken;" +
        "\n\t\t next();" +
        "\n\t } else {" +
        "\n\t\t res.sendStatus(403);" +
        "\n\t }" +
        "\n }";


    var code = "";
    collections.forEach(element => {
        code +=
            "\n var " + element.name + "Model = require('./api/models/" + element.name + "Model');" +
            "\n var " + element.name + "Route = require('./api/routes/" + element.name + "Route');" +
            "\n " + element.name + "Route(app);";
    });

    return "var config = require('./config.js');" +
        "\n var express = require('express')," +
        "\n\t app = express()," +
        "\n\t port = process.env.PORT || config.port," +
        "\n\t mongoose = require('mongoose')," +
        "\n\t bodyParser = require('body-parser');" +
        "\n" +
        "\n app.use(bodyParser.urlencoded({ extended: true }));" +
        "\n app.use(bodyParser.json());" +
        "\n" +
        (protect ? c : "") +
        "\n" +
        code +
        "\n" +
        "\n mongoose.Promise = global.Promise;" +
        "\n const connection = mongoose.connect('" + uri + "', { useNewUrlParser: true });" +
        "\n" +
        "\n app.listen(port);" +
        "\n console.log('RESTful API server started on: ' + port);" +
        "\n" +
        "\n app.use(function (req, res) {" +
        "\n\t res.status(404).send({ url: req.originalUrl + ' not found' })" +
        "\n });"
}

function routeContent(name) {
    return "'use strict';" +
        "\n module.exports = function(app) {" +
        "\n\t var controller = require('../controllers/" + name + "Controller');" +
        "\n" +
        "\n\t app.route('/api/" + name + "')" +
        "\n\t\t .get(controller.list)" +
        "\n\t\t .post(controller.create);" +
        "\n" +
        "\n\t  app.route('/api/" + name + "/:id')" +
        "\n\t\t .get(controller.read)" +
        "\n\t\t .put(controller.update)" +
        "\n\t\t .delete(controller.delete);" +
        "\n};";
}

function controllerContent(name) {
    return "'use strict';" +
        "\n var mongoose = require('mongoose');" +
        "\n var Model = mongoose.model('" + name + "');" +
        "\n" +
        "\n exports.list = function(req, res) {" +
        "\n\t Model.find({}, function (err, data) {" +
        "\n\t\t if (err)" +
        "\n\t\t\t res.send(err);" +
        "\n\t\t res.json(data);" +
        "\n\t });" +
        "\n };" +
        "\n" +
        "\n exports.create = function(req, res) {" +
        "\n\t var new_model = new Model(req.body);" +
        "\n\t new_model.save(function(err, data) {" +
        "\n\t\t if (err)" +
        "\n\t\t\t res.send(err);" +
        "\n\t\t res.json(data);" +
        "\n\t });" +
        "\n };" +
        "\n" +
        "\n exports.read = function(req, res) {" +
        "\n\t Model.findById(req.params.id, function(err, data) {" +
        "\n\t\t if (err)" +
        "\n\t\t\t res.send(err);" +
        "\n\t\t res.json(data);" +
        "\n\t });" +
        "\n };" +
        "\n" +
        "\n exports.update = function(req, res) {" +
        "\n\t Model.findOneAndUpdate({_id: req.params.id}, req.body, {new: true}, function(err, data) {" +
        "\n\t\t if (err)" +
        "\n\t\t\t res.send(err);" +
        "\n\t\t res.json(data);" +
        "\n\t});" +
        "\n };" +
        "\n" +
        "\n exports.delete = function(req, res) {" +
        "\n\t Model.remove({" +
        "\n\t\t _id: req.params.id" +
        "\n\t }, function(err, data) {" +
        "\n\t\t if (err)" +
        "\n\t\t\t res.send(err);" +
        "\n\t\t res.json({ message: 'Successfully deleted' });" +
        "\n\t });" +
        "\n };"
}

function modelContent(name) {
    //const upper = name.replace(/^\w/, c => c.toUpperCase());
    return "'use strict';" +
        "\n var mongoose = require('mongoose');" +
        "\n var Schema = mongoose.Schema; " +
        "\n" +
        "\n var " + name + "Schema = new Schema({" +
        "\n\t name: {" +
        "\n\t\t type: String," +
        "\n\t\t required: 'Please enter the name'" +
        "\n\t }," +
        "\n\t Created_date: {" +
        "\n\t\t type: Date," +
        "\n\t\tdefault: Date.now" +
        "\n\t}," +
        "\n\tstatus: {" +
        "\n\t\ttype: [{" +
        "\n\t\t\t type: String," +
        "\n\t\t\t enum: ['pending', 'ongoing', 'completed']" +
        "\n\t\t}]," +
        "\n\t\t default:  ['pending']" +
        "\n\t}" +
        "\n}, { strict: false });" +
        "\n" +
        "\n module.exports = mongoose.model('" + name + "', " + name + "Schema); ";
}

function packageContent() {
    return "{" +
        "\n\t \"name\": \"RESTfulAPI\"," +
        "\n\t \"version\": \"1.0.0\"," +
        "\n\t \"description\": \"\"," +
        "\n\t \"main\": \"server.js\"," +
        "\n\t \"scripts\": {" +
        "\n\t\t \"test\": \"echo \\\"Error: no test specified\\\" && exit 1\"," +
        "\n\t\t \"start\": \"node server.js\"" +
        "\n\t }," +
        "\n\t \"keywords\": []," +
        "\n\t \"author\": \"API Generator by Fernando Sousa a.k.a Elkin\"," +
        "\n\t \"license\": \"\"," +
        "\n\t \"devDependencies\": {" +
        "\n\t\t \"nodemon\": \"^1.18.3\"" +
        "\n\t }," +
        "\n\t \"dependencies\": {" +
        "\n\t\t \"body-parser\": \"^1.18.3\"," +
        "\n\t\t \"express\": \"^4.16.3\"," +
        "\n\t\t \"jsonwebtoken\": \"^8.3.0\"," +
        "\n\t\t \"mongoose\": \"^5.2.9\"" +
        "\n\t }" +
        "\n }"
}


var token = null;
var login = null;

app.get('/callback', (req, res) => { //Validade to token e outras validacoes
    const { appFolderName } = config;
    console.log("HERE" + appFolderName);
    //res.end();

    /* var body = {
         client_id: config.clientId,
         client_secret: config.clientSecret,
         code: req.query.code
     };
 
     fetch('https://github.com/login/oauth/access_token', {
         method: 'POST',
         headers: { 'Accept': 'application/json' },
         body: JSON.stringify(body)
     }).then(res => res.json())
         .then(json => console.log(json));*/



    superagent.post('https://github.com/login/oauth/access_token')
        .set("Accept", "application/json")
        .send({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: req.query.code
        })
        .then(function (result) {
            token = result.body.access_token;
            superagent.get('https://api.github.com/user')
                .set("Authorization", "token " + token)
                .then((r) => {
                    login = r.body.login;
                    res.redirect("/");
                }).catch(err => res.send(err));
            //req.session.token = result.body.access_token;
            //res.send(req.session);
        })

    /* superagent.post("https://api.github.com/user/repos")
         .set("Authorization", "token " + token)
         .send({
             name: config.repoName,
             "description": "Created with Blabla",
             "homepage": "https://localhost:8080"
         })
         .catch(err => {
             res.send("Repo já existe");
             res.send("ADASA")
         })
         .then((re) => {
             console.log("KKKKKKKKKKKK");
             superagent.put("https://api.github.com/repos/8140309/" + config.repoName + "/contents/test2.txt")
                 .set("Authorization", "token " + token)
                 .send({
                     "message": "my commit message",
                     "content": Buffer.from("Hello Mundo").toString('base64')
                 })
                 .then(r => {
                     res.send(r.body);
                 })
                 .catch(err => {
                     res.end("Erro ao criar ficheiro no repo");
                 });

         });
 });*/
});

