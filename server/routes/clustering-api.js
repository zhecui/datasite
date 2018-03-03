/**
 * Created by Zhe Cui on 9/7/2017.
 */
// kmeans clustering routes api.

var express = require('express');
var router = express.Router();
var clustering = require("./../utils/clustering");

router.post('/', function(req, res) {
  kMeans(req, res);
});

function kMeans(req, res) {
    clustering.getKMeans(req.body.params, function(queryResults) {
      res.json(queryResults);
    });
}

module.exports = router;