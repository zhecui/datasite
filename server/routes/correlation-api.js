var express = require('express');
var router = express.Router();
var simpleStats = require("./../utils/getSimpleStats")

router.post('/', function(req, res) {
  correlation(req, res);
});

function correlation(req, res) {
    simpleStats.getCorrelation(req.body.params, function(queryResults) {
      res.json(queryResults);
    });
}

module.exports = router;