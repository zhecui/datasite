// Include relevant node modules
var FetchTweets = require('fetch-tweets');
var sentiment   = require('sentiment-analysis');
var removeWords = require('remove-words');
var twitterKey  = require('../config/keys').twitter;
var Tweet       = require('../models/Tweet');

module.exports = function(searchTerm, callback) {

  var format;
  if (searchTerm === '') { Tweet.getAllTweets(function(results) {
    return format(results, callback);
  });

  } else { (new FetchTweets(twitterKey)).byTopic(searchTerm, function(results) {
    return format(results, callback);
  }); }

  return format = function(results, callback) {

    // Assign Sentiments
    for (var tweet of Array.from(results)) { tweet.sentiment = sentiment(tweet.body); }

    // Assign keywords
    for (tweet of Array.from(results)) { tweet.keywords = removeWords(tweet.body); }

    // Find average sentiment
    var total =  0;
    for (tweet of Array.from(results)) { total += tweet.sentiment; }
    var averageSentiment = total / results.length;
    averageSentiment = Math.round(averageSentiment*100)/100;

    // Done, call callback with results and sentiment average
    return callback(results, averageSentiment);
  };
};