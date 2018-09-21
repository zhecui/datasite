// created by Zhe Cui on Sep. 3rd, 2017
// node server for DataSite Computations and Management
var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var http = require("http");

app.use("/src", express.static(__dirname + '/src'));
app.use("/data", express.static(__dirname + '/src/data'));
// app.use(bodyParser.json());
app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

// handle different computations
app.use('/simplestats', require('./server/routes/simplestats-api'));
app.use('/correlation', require('./server/routes/correlation-api'));
app.use('/clustering', require('./server/routes/clustering-api'));
app.use('/dbscan', require('./server/routes/dbscan-api'));
app.use('/regression', require('./server/routes/regression-api'));
app.use('/polynomialregression', require('./server/routes/polynomialregression-api'));
// app.use('/api/twitter', require('./server/routes/twitter-api'));

app.get('/', function(req, res) {
	console.log('file loaded');
    res.sendfile('.tmp/serve/index.html'); // load the single view file (angular will handle the page changes on the front-end)
});

app.listen(8000);
console.log("server is listening at port 8000!")
