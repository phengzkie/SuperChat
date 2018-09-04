const http = require('http');
var fs = require('fs'); 
const mongojs = require('mongojs');
let db = mongojs('superchatdb');
const twitter = require('twitter');
const crypto = require('crypto');
const redis = require('redis');
let client = redis.createClient();
const StaticServer = require('node-static').Server;
const file = new StaticServer('./public');
const querystring = require('querystring');
var OAuth= require('oauth').OAuth;
const sha1 = require('sha1');
const https = require('https');
const WebSocketServer = require('websocket').server;
var clients = [];

var handlers = {};
var oa = new OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	"eS4SpjqfrAf9Qaz2ETUlOhGpR",
	"eVOd3ee5ynMBxFfoBr1FFKylvN3srnWC2Hse4yxhA27V7K6tL4",
	"1.0A",
	"http://localhost:8007/auth/twitter/callback",
	"HMAC-SHA1"
);

var oauth = {};

handlers["/"] = (req, res) => {
	file.serve(req, res);
};
//signup handler
handlers["/signup"] = (req, res) => {
	if (req.method == 'POST') {
		var body = '';
		req.on('data', (data) => {
			body += data;
		});
		req.on('end', () => {
			var qs = querystring.parse(body);
			var id = crypto.randomBytes(16).toString("hex");
			let fn = qs['firstname'];
			let ln = qs['lastname'];
			let email = qs['email'];
			let un = qs['username'];
			let pw = sha1(qs['password']);
			checkUser(email, (reply) => {
				if(reply == null) {
					getUserDetails(id, un, fn+ln, email, pw);
					res.end(JSON.stringify({status: "Successful"}));
				}
				else {
					res.end(JSON.stringify({status: "Email Already been used"}));
				}
			});
		});
	}
};

// dashboard handler
handlers["/dashboard"] = (req, res) => {
	if(req.method == "GET") {
		console.log(req.url);
		file.serveFile("dashboard.html", 200, { "Content-Type" : "text/html" }, req, res);
	}
	else {
		res.end();
	}
};

//Login Handler
handlers["/login"] = (req, res) => {
	if(req.method == "GET") {
		let qs = querystring.parse(req.url);
		console.log(qs);
		let un = qs["/login?username"];
		let pw = sha1(qs["password"]);
		console.log(un + " " + pw);
		db.users.findOne({ "username" : un, "password" : pw }, (err, combiFound) => { //combiFound is nullable
			console.log(combiFound);
			if(combiFound != null && !err) { //if login successfully
				console.log(combiFound);
				startSession(un, (id) => {
					db.users.find({ "username" : un }, (err, personDetails ) => {
						let sessionid = id;
						let un = (personDetails[0].username);
						let emailAddress = (personDetails[0].email);
						let fullname = (personDetails[0].name);
						let json = JSON.stringify( { "id": sessionid, username:un, "email":emailAddress, "name":fullname, "status":"success" } );
						res.end(json);
					});
				});
			}
			else {
				let result = JSON.stringify( { "status":"error" } );
				res.end(result);
			}
		});
	}
};
//logout
handlers["/logout"] = (req, res) => {
	let qs = querystring.parse(req.url);
	let id = qs['/logout?id'];
	endSession(id, ()=> {
		console.log("Session ended: " + id);
		res.end("out");
	});
}

// from twitter login
handlers["/auth/twitter"] = (req, res) => {
	oa.getOAuthRequestToken((error, oauth_token, oauth_token_secret, results) => {
		if (error) {
			console.log(error);
			res.end("yeah no. didn't work.")
		}
		else {
			oauth.token = oauth_token;
			console.log(oauth.token);
			oauth.token_secret = oauth_token_secret;
			console.log(oauth.token_secret);
			res.writeHead(301, {Location: 'https://twitter.com/oauth/authenticate?oauth_token='+oauth_token});
			res.end();
		}
	});
};

// callback from twitter
handlers["/auth/twitter/callback"] = (req, res) => {
	let qs = querystring.parse(req.url);
	let token = qs['/auth/twitter/callback?oauth_token'];
	let verifier = qs['oauth_verifier'];
	console.log(token);
	console.log(oauth.token_secret);
	oa.getOAuthAccessToken(token,oauth.token_secret,verifier, 
	(error, oauth_access_token, oauth_access_token_secret, results) => {
		if (error){
			console.log(error);
			res.end("yeah something broke.");
		} else {
			console.log(results);
			res.end(JSON.stringify(results));
		}
	});
};

// from facebook login
handlers["/fbloginresult"] = (req, res) => {
	let code = req.url.split("=")[1];
	let option = {
		host: "graph.facebook.com",
		path: "/v3.0/oauth/access_token?client_id=443184979483980&redirect_uri=http://"+ req.headers['host']+"/fbloginresult&client_secret=d239aa67da48d68240640936059d46ea&code="+code
	};
	var userDetails = {};
	https.request(option, (response) => {
		let body = "";
		response.on('data', (data) => {
			body += data;
		});
		response.on('end', () => {
			let parse = JSON.parse(body);
			let access_token = parse.access_token;
			let link = {
				host: "graph.facebook.com",
				path: "/me?fields=id%2Cfirst_name%2Cname%2Cemail&access_token="+access_token
			};
			https.request(link, (response) => {
				let details = "";
				response.on('data', (data) => {
					details += data;
				});
				response.on('end', () => {
					let parse = JSON.parse(details);
					console.log(parse);
					userDetails.id = parse.id;
					userDetails.firstname = parse.first_name;
					userDetails.name = parse.name;
					userDetails.email = parse.email;
					checkUser(userDetails.email, (reply) => {
						var sessionid;
						if(reply == null) {
							getUserDetails(userDetails.id, userDetails.firstname, userDetails.name, userDetails.email, '');
						}
						startSession(userDetails.firstname, (id) => {
							sessionid = id;
							res.redirect("/dashboard?sessionid="+sessionid+"&firstname="+userDetails.firstname+"&name="+userDetails.name+"&email="+userDetails.email);
							res.end();
						});
					});
				});
			}).end();
		});
	}).end();
};

function getLoggedUser(callback) {
	db.loggeduser.find((err, reply) => {
		callback(reply);
	});
}

function checkUser(email, callback) {
	db.users.findOne({ "email" : email }, (err, reply) => {
		callback(reply);
	});
};

function getUserDetails(id, un, name, email, pw) {
	db.users.insert({ "id" : id, "username" : un, "name" : name, "email" : email, "password" : pw });
};

function startSession(un, callback) {
	var id = crypto.randomBytes(16).toString("hex");
	client.set(id, un, () => {
		callback(id);
	});
};

function doesSessionExist(id, callback) {
	client.exists(id, (err, reply) => {
		callback(reply);
	});
};

function endSession(sessionid, callback) {
	client.del(sessionid, (err, reply) => {
		callback();
	});
};

//HTTPSERVER
var server = http.createServer((req, res) => {
	res.redirect = (text) => {
		res.writeHead(301, { Location : text });
	};
	if(handlers[req.url]) {
		handlers[req.url](req, res);
	}
	else {
		if(req.url.includes("?")) {
			let url = req.url.split("?");
			handlers[url[0]](req, res);
		}
		else {
			file.serve(req, res, (err, result) => {
				if(err) {
					res.writeHead(404, { "Content-Type" : "text/html" });
					res.end("404 not found");
				}
			});
		}
	}
});

server.listen(8007);
console.log("Server is running..");

//WEBSOCKER SERVER
var wsServer = new WebSocketServer({ httpServer: server });
wsServer.on('request', function(request) {
	console.log("pumasok sa wss server");
	var connection = request.accept(null, request.origin); 
	var index = clients.push(connection) - 1; //we need to know client index to remove them on 'close' event
	var userName = false;
	var userColor = false;
	connection.on('message', function(message) { //user sent some message
		if (message.type === 'utf8') { //accept only text
			var json = JSON.parse(message.utf8Data); //broadcast message  to all clients
			console.log(json);
			for (var i=0; i < clients.length; i++) {
				clients[i].sendUTF(json.user + " : " + json.chat);
			}
		}
		console.log(message);
		//console.log("eto yung message na chat: "+message.utf8Data);
	});

	connection.on('close', function(connection) { //user disconnected
		clients.splice(index, 1);
	});
});
