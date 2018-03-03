/**
 * Created by fs on 3/3/2018.
 */
var express = require('express');
var router = express.Router();
var regression = require("./../utils/regression");

router.post('/', function(req, res) {
  polynomialRegression(req, res);
});

function polynomialRegression(req, res) {
    regression.polynomialRegression(req.body.params, function(queryResults) {
      res.json(queryResults);
    });
}

module.exports = router;