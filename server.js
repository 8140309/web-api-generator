var config = require('./config.js');
const express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var session = require('express-session');
var mongoose = require('mongoose');
var mkdirp = require('mkdirp');
var superagent = require('superagent');
var github = require('./github');

const app = express();

app.set('view engine', 'ejs')
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: config.sessionSecret }));


var server = app.listen(config.port, () => {
    console.log('Listening on ' + server.address().port);
});

app.get("/", (req, res) => {
    res.render("index", { token: req.session.token, name: req.session.login, clientId: config.clientId, appName: config.appName, defaultConnectionString: config.defaultConnectionString })
});

var crypto = require('crypto');

app.get("/d", (req, res) => {
    console.log("DEPLOY " + process.env.DEPLOY);
    res.send(process.env.DEPLOY);
});

app.get('/dd', function(req, res){
    if(req.session.page_views){
       req.session.page_views++;
       res.send("You visited this page " + req.session.page_views + " times");
    } else {
       req.session.page_views = 1;
       res.send("Welcome to this page for the first time!");
    }
 });

/*process.on('unhandledRejection', (reason, p) => {
    console.log('XXX Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
  });*/

app.post('/generateGraphQL', function (req, res) {
    res.send("Coming soon!");
});

app.get('/download', function (req, res) {
    res.download(config.appFolderName + ".zip");
});

var appName = null;


app.get("/home", (req, res) => {
    res.render("home");
});

app.post("/test", (req, res) => {
    console.log(req.body.name);
    res.redirect("https://www.google.com");
});

app.post("/generate", (req, res) => {

    var uri = req.body.uri;
    var protect = req.body.protect;
    appName = req.body.appName;
    mongoose.Promise = global.Promise;
    var db = mongoose.createConnection(uri, { useNewUrlParser: true })
        .once("open", () => {
            console.log("GENERATE " + req.url);
            db.then(connection => {
                connection.db.listCollections().toArray(function (err, names) {
                    if (err) {
                        console.log(err);
                    } else {
                        if (names.length > 0) {
                            superagent.post("https://api.github.com/user/repos")
                                .set("Authorization", "token " + req.session.token)
                                .send({
                                    name: appName,
                                    "description": "Created with Web API Generator",
                                    "homepage": config.homepage,
                                    "auto_init": true,
                                   // "private": true
                                })

                                .then((re) => {

                                    var api = github({
                                        username: req.session.login,
                                        token: req.session.token, // created here https://github.com/settings/applications#personal-access-tokens
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
                                    }, {
                                        path: 'README.md',
                                        content: readmeContent(appName, protect, names)
                                    }];

                                    /*  if (protect) {
                                          let name = "users";
                                          files.push(
                                              {
                                                  path: "api/models/" + name + "Model.js",
                                                  content: modelContent(name)
                                              }, {
                                                  path: "api/controllers/" + name + "Controller.js",
                                                  content: controllerContent(name)
                                              }, {
                                                  path: "api/routes/" + name + "Route.js",
                                                  content: routeContent(name)
                                              });
                                      }*/

                                    names.forEach(element => {
                                        let name = element.name;
                                        files.push(
                                            {
                                                path: "api/models/" + name + "Model.js",
                                                content: modelContent(name)
                                            }, {
                                                path: "api/controllers/" + name + "Controller.js",
                                                content: controllerContent(name)
                                            }, {
                                                path: "api/routes/" + name + "Route.js",
                                                content: routeContent(name)
                                            }
                                        )
                                    });

                                    api.commit(files, 'Initial commit')
                                        .then(r => {
                                            /*var conn = mongoose.connect("mongodb+srv://fernando:654321aA@cluster0-sejql.gcp.mongodb.net/web-api-generator-stats?retryWrites=true", { useNewUrlParser: true })
                                                .catch(err => {
                                                    res.send("Error connecting to mongo");
                                                });
                                            mongoose.connection.collection('generates').insertOne({ name: "fernando" }).then((x) => {
                                                console.log(x.insertedId);
                                                res.redirect("https://github.com/" + login + "/" + appName);
                                            }).catch(erro => {
                                                console.log("X " + erro);
                                                res.send(erro);
                                            });
                                            //res.send(r);*/

                                            var db2 = mongoose.createConnection("mongodb+srv://fernando:654321aA@cluster0-sejql.gcp.mongodb.net/web-api-generator-stats?retryWrites=true", { useNewUrlParser: true });
                                            db2.then(c2 => {
                                                c2.db.collection("generates").findOneAndUpdate({ name: req.session.login }, { $inc: { 'count': 1 } }, { upsert: true });
                                                res.redirect("https://github.com/" + req.session.login + "/" + appName);
                                            });

                                        }).catch((err) => {
                                            console.log(err);
                                            res.end("Commit error");
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


                                }).catch(err => {
                                    console.log(err);
                                    res.end("Repository name already exists");
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
                        } else {
                            res.send("The database doesnt exist or has no collection");
                        }
                    }
                });
            })



        }).catch(err => {
            console.log(err);
            res.end("Error connecting to mongo");
        });

});

//var extend = require('lodash/object/assign');


const setContentOnRepo = function (path, name, content) {
    return new Promise((resolve, reject) => {
        superagent.put("https://api.github.com/repos/" + req.session.login + "/" + appName + "/contents" + path + name)
            .set("Authorization", "token " + req.session.token)
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

function readmeContent(appName, protect, names) {
    var capitalizedNames = names.map(element => {
        let name = element.name
        return name.charAt(0).toUpperCase() + name.slice(1);
    });
    return "# " + appName +
        "\n This is a genererated Web API wich runs on a Node.js server and uses MongoDB data." +
        "\n" +
        "\n WARNING: Before proceeding to [Instalation](#Instalation) check the [config.js](config.js) file located in the root of the project." +
        "\n" +
        "\n ## Table of Contents" +
        "\n * [Instalation](#Instalation)" +
        "\n * [Usage](#Usage)" +
        (protect ? "\n\t * [Token](#Token)" : "") +
        capitalizedNames.map(element => "\n\t * [" + element + "](#" + element + ")").join("") +
        "\n" +
        "\n ## Instalation" +
        "\n Install the modules" +
        "\n ```" +
        "\n npm install" +
        "\n ```" +
        "\n Start the server" +
        "\n ```" +
        "\n npm start" +
        "\n ```" +
        "\n" +
        "\n ## Usage" +
        "\n" +
        (protect ?
            "\n #### Token" +
            "\n Authenticate using the following endpoint with credentials set in [config.js](config.js) file." +
            "\n ``` " +
            "\n POST /login " +
            "\n ```" +
            "\n You will get a bearer token to use in the Authorization header for API requests." +
            "\n " : "") +
        capitalizedNames.map(element =>
            "\n #### " + element +
            "\n |HTTP Method|Path | Path Params | Query Params | Body Params |" +
            "\n |:-------------:|-------------|:-------------:|:-------------:|:-----:|" +
            "\n |GET| /api/" + element.toLowerCase() + "|None|None|None|" +
            "\n |GET| /api/" + element.toLowerCase() + "/{id}|Id|None|None|" +
            "\n |POST| /api/" + element.toLowerCase() + "|None|None|Collection Schema|" +
            "\n |PUT| /api/" + element.toLowerCase() + "/{id}|Id|None|Collection Schema|" +
            "\n |DELETE| /api/" + element.toLowerCase() + "/{id}|Id|None|None|"
        ).join("");
}

function configContent(uri) {
    let user = uri.split("//")[1].split("@")[0].split(":");
    let username = user[0];
    let password = user[1];
    console.log(user);
    return "module.exports = {" +
        "\n port: process.env.PORT || 3000," +
        "\n" +
        "\n /** WARNING: For security reasons put the next 3 properties in environment variables */" +
        "\n adminUsername: process.env.ADMIN_USERNAME || '" + username + "'," +
        "\n adminPassword: process.env.ADMIN_PASSWORD || '" + password + "'," +
        "\n tokenSecretKey: process.env.SECRET_KEY || 'super_secret'," +
        "\n" +
        "\n /** @property Expressed in seconds or a string describing a time span [zeit/ms](https://github.com/zeit/ms.js).  Eg: 60, '2 days', '10h', '7d' */" +
        "\n tokenExireTime: '1h'" +
        "\n }";
}



function serverContent(uri, collections, protect) {
    var c = "\n var jwt = require('jsonwebtoken');" +
        "\n" +
        "\n app.post('/login', (req, res) => {" +
        "\n\t const user = { username, password } = req.body;" +
        "\n\t if (username === config.adminUsername && password === config.adminPassword) {" +
        "\n\t\t jwt.sign({ user }, config.tokenSecretKey, { expiresIn: config.tokenExireTime }, (err, token) => {" +
        "\n\t\t\t res.json({" +
        "\n\t\t\t\t message: 'Authenticated! Use this token in the Authorization header', Example: 'Authorization : Bearer cn389ncoiwuencr...'," +
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
        "\n var server = app.listen(config.port, () => {" +
        "\n\t console.log('Listening on ' + server.address().port);" +
        "\n });" +
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
        "\n var " + name + "Schema = new Schema({}, { strict: false });" +
        "\n" +
        "\n module.exports = mongoose.model('" + name + "', " + name + "Schema); ";
}

function packageContent() {
    return "{" +
        "\n\t \"name\": \"web-api\"," +
        "\n\t \"version\": \"1.0.0\"," +
        "\n\t \"description\": \"\"," +
        "\n\t \"main\": \"server.js\"," +
        "\n\t \"scripts\": {" +
        "\n\t\t \"test\": \"echo \\\"Error: no test specified\\\" && exit 1\"," +
        "\n\t\t \"start\": \"node server.js\"" +
        "\n\t }," +
        "\n\t \"keywords\": []," +
        "\n\t \"author\": \"Code generated by Web API Generator at https://web-api-generator.herokuapp.com/\"," +
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


//var req.session.token = null;
//var req.session.login = null;

app.get('/callback', (req, res) => { //Validade to token e outras validacoes
    const { appFolderName } = config;
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
            req.session.token = result.body.access_token;
            superagent.get('https://api.github.com/user')
                .set("Authorization", "token " + req.session.token)
                .then((r) => {
                    req.session.login = r.body.login;
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

