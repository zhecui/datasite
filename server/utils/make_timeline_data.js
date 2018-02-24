/*
 * Created in May 2017 by Zhe Cui
 * Originated from:
 * https://github.com/Lissy93/twitter-sentiment-visualisation
 * changed and modified from CoffeeScript to JavaScript
 * format data for various twitter visualizations
 */

// Require necessary modules, API keys and instantiate objects

var sentimentAnalysis = require('sentiment-analysis');
var FetchTweets = require('fetch-tweets');
var MakeSummarySentences = require('../utils/make-summary-sentences')
var removeWords = require('remove-words');
var twitterKey = require('../config/keys').twitter;
var fetchTweets = new FetchTweets(twitterKey);
var entityExtraction = require('haven-entity-extraction');
var hpKey = require('../config/keys').hp;

(function() {

    // get sentiment tweets info, for gauge and hexagon charts info
    function getSentimentForGauge(results) {
        var total = 0;
        results.forEach(function(tweet, ind) {
            // Assign Sentiments
            tweet.sentiment = sentimentAnalysis(tweet.body);
            // Assign Keywords
            tweet.keywords = removeWords(tweet.body);
            // Find average sentiment
            total += tweet.sentiment;
        });

        var averageSentiment = total / results.length;
        averageSentiment = Math.round(averageSentiment * 100) / 100;

        // Done, call callback with results and sentiment average
        return {data: results, averageSentiment: averageSentiment};
    }

    // Converts Tweet objects into the right format
    function formatResultsForGaugeHexagon(tweetArr) {
        var results = {};
        // Add keywords list
        var wrdsjs = findTopWords(formatResultsForCloud(tweetArr, true));
        var topData = wrdsjs.topPositive.concat(wrdsjs.topNegative, wrdsjs.topNeutral);
        topData = topData.sort(function(a, b) {
            return parseFloat(b.freq) - parseFloat(a.freq); });
        topData = topData.splice(0, 10);
        results.keywordData = (topData = topData.sort(function() {
            return 0.5 - Math.random(); }));

        // Find average sentiment
        var totalSentiment = 0;
        var pieChart = { positive: 0, neutral: 0, negative: 0 };
        tweetArr.forEach(function(tweet, ind) {
            totalSentiment += tweet.sentiment;
            // Find percentage positive, negative and neutral
            if (tweet.sentiment > 0) {
                pieChart.positive += 1;
            } else if (tweet.sentiment < 0) {
                pieChart.negative += 1;
            } else { pieChart.neutral += 1; }
        });
        results.averageSentiment = totalSentiment / tweetArr.length;

        results.pieChart = pieChart;
        results.tweets = tweetArr;
        console.log(tweetArr.length);
        return results;
    }

    // Converts ordinary Tweet array to suitable form for word cloud
    function formatResultsForCloud(twitterResults, allWords) {
        if (allWords == null) { allWords = false; }
        var results = [];
        var tweetWords = makeTweetWords(twitterResults);
        tweetWords.forEach(function(word, ind) {
            var sent = sentimentAnalysis(word);
            if (allWords || (sent !== 0)) {
                var f = results.filter(function(item) {
                    return item.text === word;
                });
                if (f.length === 0) {
                    results.push({ text: word, sentiment: sent, freq: 1 });
                } else {
                    results.forEach(function(res, ind) {
                        if (res.text === word) {
                            res.freq++;
                        }
                    });
                }
            }
        });
        return results;
    }

    function findTopWords(cloudWords) {
        var posData = cloudWords.filter(function(cw) {
            return cw.sentiment > 0;
        });
        var negData = cloudWords.filter(function(cw) {
            return cw.sentiment < 0;
        });
        var neutData = cloudWords.filter(function(cw) {
            return cw.sentiment === 0;
        });

        posData.sort(function(a, b) {
            return parseFloat(a.freq) - parseFloat(b.freq);
        });
        posData = posData.reverse().slice(0, 5);
        negData.sort(function(a, b) {
            return parseFloat(a.freq) - parseFloat(b.freq);
        });
        negData = negData.reverse().slice(0, 5);
        neutData.sort(function(a, b) {
            return parseFloat(a.freq) - parseFloat(b.freq);
        });
        neutData = neutData.reverse().slice(0, 5);

        return { topPositive: posData, topNegative: negData, topNeutral: neutData };
    }

    function findTrendingWords(cloudWords) {
        cloudWords.sort(function(a, b) {
            return parseFloat(a.freq) - parseFloat(b.freq);
        });
        return cloudWords = cloudWords.reverse().slice(0, 10);
    }


    // Make a paragraph of keywords
    function makeTweetWords(twitterResults) {
        var para = '';
        twitterResults.forEach(function(tweet, ind) {
            para += tweet.body + ' ';
        });
        return removeWords(para, false);
    }

    // Make sentence description for map
    function makeSentence(data, searchTerm) {
        return (new MakeSummarySentences(data, searchTerm)).makeMapSentences();
    }

    // function formatResultsForTimeLine(twitterResults) {
    //     // Create result structures
    //     var results = { posData: [], negData: [] };
    //     var posTotals = {
    //         7: [],
    //         8: [],
    //         9: [],
    //         10: [],
    //         11: [],
    //         12: [],
    //         13: [],
    //         14: [],
    //         15: [],
    //         16: [],
    //         17: [],
    //         18: [],
    //         19: [],
    //         20: [],
    //         21: [],
    //         22: [],
    //         23: []
    //     };
    //     var negTotals = {
    //         7: [],
    //         8: [],
    //         9: [],
    //         10: [],
    //         11: [],
    //         12: [],
    //         13: [],
    //         14: [],
    //         15: [],
    //         16: [],
    //         17: [],
    //         18: [],
    //         19: [],
    //         20: [],
    //         21: [],
    //         22: [],
    //         23: []
    //     };
    //     var twitterObjResults = [];
    //     twitterResults.forEach(function(current, index) {
    //         twitterObjResults.push(makeTweetObj(current));
    //     });

    //     // Populate array of list of sentiments for each hour in pos and neg totals
    //     for (var i = 0; i < twitterObjResults.length; i++) {
    //         let tweetObj = twitterObjResults[i];
    //         var tweetHour = new Date(tweetObj.dateTime).getHours();
    //         if (tweetObj.sentiment > 0) {
    //             if (posTotals[tweetHour]) {
    //                 posTotals[tweetHour].push(tweetObj.sentiment);
    //             }
    //         } else if (tweetObj.sentiment < 0) {
    //             if (negTotals[tweetHour]) {
    //                 negTotals[tweetHour].push(tweetObj.sentiment);
    //             }
    //         }
    //     }

    //     // Find the average of pos and neg totals, and assign the value to results
    //     for (var key in posTotals) {
    //         if (posTotals.hasOwnProperty(key)) {
    //             var av = findAv(posTotals[key]);
    //             if (av != 0) {
    //                 results.posData.push({ x: key, y: av });
    //             }
    //         }
    //     }
    //     for (var key in negTotals) {
    //         if (negTotals.hasOwnProperty(key)) {
    //             var av = findAv(negTotals[key]);
    //             if (av != 0) {
    //                 results.negData.push({ x: key, y: Math.abs(av) });
    //             }
    //         }
    //     }

    //     // Done :) return populated results object
    //     return results;
    // }

    function formatResultsForSentimentScatterChart(twitterResults) {
        var results = [];
        // Create result structures
        var twitterObjResults = [];
        twitterResults.forEach(function(current, index) {
            twitterObjResults.push(makeTweetObj(current));
        });

        // format the data to nvd3 plot format for scatter chart
        results.push({
            key: 'Positive',
            values: []
        });
        results.push({
            key: 'Negative',
            values: []
        });
        // Populate array of list of sentiments for each hour in pos and neg totals
        for (var i = 0; i < twitterObjResults.length; i++) {
            let tweetObj = twitterObjResults[i];
            let timeObj = new Date(tweetObj.dateTime);
            let tweetHour = timeObj.getHours();
            let tweetMinute = timeObj.getMinutes();
            let formattedObj = {
                x: tweetHour * 60 + tweetMinute,
                y: tweetObj.sentiment,
            };
            if (tweetObj.sentiment >= 0) {
                results[0].values.push(formattedObj);
            } else {
                results[1].values.push(formattedObj);
            }
            // tweetObj.time = tweetHour * 60 + tweetMinute;
            // results.push(tweetObj);
        }

        // Done :) return populated results object
        return results;
    }

    // Formats tweets into a massive tweet body for entity extraction
    function formatEntityExtractionTweets(twitterResults) {
        var results = "";
        for (var i = 0; i < twitterResults.length; i++) {
            var tweet = twitterResults[i];
            results += tweet.body + " ";
        }
        results = results.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
        results = results.replace(/[^A-Za-z0-9 ]/g, '');
        return results = results.substring(0, 5000);
    };

    function makeSankeyData(startNode, data) {
        var results = { links: [], nodes: [] };

        results.nodes.push({ name: startNode });

        for (var key in data) {
            var nodeName = key.charAt(0).toUpperCase() + key.split('_')[0].slice(1);
            results.nodes.push({ name: nodeName });
            results.links.push({
                source: startNode,
                target: nodeName,
                value: data[key].length
            });

            data[key].forEach(function(entity, entity_index) {
                var entityName = entity.normalized_text;
                results.nodes.push({ name: entityName });
                results.links.push({
                    source: nodeName,
                    target: entityName,
                    value: entity.matches.length
                });

                entity.matches.forEach(function(match, match_index) {
                    var canInsert = true;
                    results.nodes.forEach(function(m, m_index) {
                        if (m.name === match) { canInsert = false; }
                    });
                    if (canInsert) {
                        results.nodes.push({ name: match });
                        results.links.push({ source: entityName, target: match, value: 0.5 });
                    } else {
                        results.links.forEach(function(l, links_index) {
                            if (l.target === match) { l.value += 0.5; }
                        });
                    }
                });
            });
        }
        return results;
    };

    // Func to find the positive average of all number elements in a list
    function findAv(arr) {
        var total = 0,
            ans = 0;
        arr.forEach(function(current, index) {
            total += current;
        });
        if (total != 0) {
            ans = total / arr.length;
        }
        return Math.round(ans * 100) / 100;
    }

    // Merge two sets of results
    function mergeResults(res1, res2) {
        return res1.concat(res2);
    }

    function makeTweetObj(data) {
        return {
            body: data.body,
            dateTime: data.date,
            sentiment: sentimentAnalysis(data.body)
        };
    };

    // Calls methods to fetch fresh Twitter, sentiment, and place data

    module.exports.getFreshData = function(searchTerm, cb) {
        // the default language is Engilish if not specified.
        let lang = 'en';
        if (searchTerm.hasOwnProperty('Language')) {
            lang = searchTerm['Language'];
        }
        let queryOptions = {
            q: searchTerm.text,
            lang: lang,
            count: 40,
            result_type: 'popular'
        };
        fetchTweets.byTopic(queryOptions, function(webTweets) {
            // TODO: fetch tweets in database
            // cb(formatResultsForTimeLine(data, true));
            var results = {
                scatter: formatResultsForSentimentScatterChart(webTweets)
            };

            // word cloud scatter plots
            var cloudData = formatResultsForCloud(webTweets, true);
            var sentence = makeSentence(webTweets, searchTerm.text);
            sentence.topWords = findTopWords(cloudData);
            sentence.trending = findTrendingWords(cloudData);
            results.wordScatter = {
                cloudData: cloudData,
                sentence: sentence
            };

            // gauge pie chart and hexagon charts
            console.log('webtweets is ' + webTweets.length);
            var ghCharts = getSentimentForGauge(webTweets);
            var ghSummary = formatResultsForGaugeHexagon(ghCharts.data);

            results.gaugeHexagon = {
                data: ghSummary,
                average: ghCharts.averageSentiment
            };
            // entity sankey diagram data
            entityExtraction(formatEntityExtractionTweets(webTweets), hpKey, function(extracted) {
                results.entity = makeSankeyData(queryOptions.q, extracted);
                cb(results);
            });
        });
    };

    // TODO: module.exports.getDbData
    // Calls methods to fetch and format Tweets from the database
}());
