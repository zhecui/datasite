/**
 * Created by Zhe Cui on 9/9/2017.
 */
// linear regression routes api.

var express = require('express');
var router = express.Router();
var regression = require("./../utils/regression")

router.post('/', function(req, res) {
  linearRegression(req, res);
});

function linearRegression(req, res) {
    regression.linearRegression(req.body.params, function(queryResults) {
      res.json(queryResults);
    });
}

module.exports = router;