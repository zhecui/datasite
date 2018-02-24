var MakeSummarySentences = (function() {
  var findAv = undefined;
  var getAverageSentiments = undefined;
  var getOverallSentimentName = undefined;
  var makeTxtStyle = undefined;
  var makeGlobeSentence = undefined;
  var makeMapSentences = undefined;
  MakeSummarySentences = class MakeSummarySentences {
    static initClass() {
  
      // Finds the average value for an array of numbers
      findAv = function(arr) {
        var t = 0;
        for (var i of Array.from(arr)) { t += i; }
        return t/arr.length;
      };
  
      // Finds average positive, negative and overall sentiment from list of tweets
      getAverageSentiments = function(tweetObjects) {
        var posSent = [];
        var negSent = [];
        var neuSent = [];
  
        for (var item of Array.from(tweetObjects)) {
          if (item.sentiment > 0) { posSent.push(item.sentiment);
          } else if (item.sentiment < 0) { negSent.push(item.sentiment);
          } else { neuSent.push(0); }
        }
  
        return {
          avPositive:  Math.round(findAv(posSent) * 100),
          avNegative:  Math.round(findAv(negSent) * -100),
          avSentiment: Math.round(findAv(posSent.concat(negSent).concat(neuSent))*100),
          totalPositive: posSent.length,
          totalNegative: negSent.length
        };
      };
  
      // Determines if the overall sentiment is "Positive", "Negative" or "Neutral"
      getOverallSentimentName = function(avSentiment) {
        if (avSentiment > 0) { return "Positive";
        } else if (avSentiment < 0) { return "Negative";
        } else { return "Neutral"; }
      };
  
      makeTxtStyle = function(sentiment) {
        var col =
          (sentiment > 0) || (sentiment === 'Positive') ? 'green'
          : (sentiment < 0) || (sentiment === 'Negative') ? 'darkred'
          : 'gray';
        return ` style='font-weight: bold; color: ${col}' `;
      };
  
  
      makeGlobeSentence = function(tweetObjects, relTo, averages, overallSent) {
        var numRes = `<b><span id='numRes'>${tweetObjects.length}</span></b>`;
        var overallSentTxt = `<span ${makeTxtStyle(overallSent)} >${overallSent}`;
        overallSentTxt += `(${averages.avSentiment}%)</span>`;
        var positivePercent = `<span ${makeTxtStyle(1)}>${averages.avPositive}%</span>`;
        var negativePercent = `<span ${makeTxtStyle(-1)}>${averages.avNegative}%</span>`;
        var s = `Globe displaying ${numRes} sentiment values calculated `;
        s += `from Twitter results ${relTo} `;
        s += `the overall sentiment is ${overallSentTxt}.`;
        s += "<br><br>";
        s += `${averages.totalPositive} Tweets are positive `;
        s += `with an average sentiment of ${positivePercent} `;
        s += `and ${averages.totalNegative} Tweets are negative `;
        s += `with an average sentiment of ${negativePercent}.`;
        return s;
      };
  
  
      makeMapSentences = function(tweetObjects, averages, overallSent, relTo) {
        var numRes = `<b><span id='numRes'>${tweetObjects.length}</span></b>`;
        var mapShowing = `Map showing ${numRes} `;
        mapShowing += `of the latest Twitter results ${relTo}<br>`;
        mapShowing += "Overall sentiment is: ";
        mapShowing += `<span ${makeTxtStyle(overallSent)} >${overallSent} `;
        mapShowing += `(${averages.avSentiment}%)</span>`;
  
        var p = makeTxtStyle(1);
        var n = makeTxtStyle(-1);
  
        var sentimentSummary=`Average positive: <b ${p}>${averages.avPositive}%</b>.<br>`;
        sentimentSummary+=`Average negative: <b ${n}>${averages.avNegative}%</b>.`;
  
        return {
          mapShowing: mapShowing,
          sentimentSummary: sentimentSummary
        };
      };
    }

    constructor(tweetObjects, searchTerm) {
      this.tweetObjects = tweetObjects;
      if (searchTerm == null) { searchTerm = null; }
      this.searchTerm = searchTerm;
    }


    // Makes the sentences for the map
    makeMapSentences() {
      var averages = getAverageSentiments(this.tweetObjects);
      var overallSent = getOverallSentimentName(averages.avSentiment);
      var relTo = (this.searchTerm != null) ? `relating to <b>${this.searchTerm}</b>` : "";

      var mapSentences = makeMapSentences(this.tweetObjects, averages, overallSent, relTo);
      return {
        mapShowing: mapSentences.mapShowing,
        sentimentSummary: mapSentences.sentimentSummary,
        globeSentence: makeGlobeSentence(this.tweetObjects, relTo, averages, overallSent),
        searchTerm: this.searchTerm ? this.searchTerm : ''
      };
    }
  };
  MakeSummarySentences.initClass();
  return MakeSummarySentences;
})();


module.exports = MakeSummarySentences;