var express = require('express');
var router = express.Router();
var simpleStats = require("./../utils/getSimpleStats")

router.post('/meanvar', function(req, res) {
  meanvar(req, res);
});

router.post('/range', function(req, res) {
  range(req, res);
});

router.post('/freq', function(req, res) {
  freqCount(req, res);
});

router.post('/combinefreq', function(req, res) {
  freqCombineCount(req, res);
});

function meanvar(req, res) {
    simpleStats.getMeanandVariance(req.body.params, function(queryResults) {
      res.json(queryResults);
    });
}

function range(req, res) {
	simpleStats.getRange(req.body.params, function(queryResults) {
      res.json(queryResults);
    });
}

function freqCount(req, res) {
	simpleStats.getFreq(req.body.params, function(queryResults) {
		res.json(queryResults);
	});
}

function freqCombineCount(req, res) {
	simpleStats.getCombineFreq(req.body.params, function(queryResults) {
		res.json(queryResults);
	});
}

module.exports = router;