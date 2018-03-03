/**
 * Created by Zhe Cui on 3/3/2018.
 */
// dbscan clustering routes api.

var express = require('express');
var router = express.Router();
var clustering = require("./../utils/clustering");

router.post('/', function(req, res) {
    DBSCAN(req, res);
});

function DBSCAN(req, res) {
    clustering.getDBSCAN(req.body.params, function(queryResults) {
        res.json(queryResults);
    });
}

module.exports = router;
