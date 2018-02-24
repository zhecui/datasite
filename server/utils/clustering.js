// created by Zhe on Sep. 7th, 2017
// nodejs server side modules
// module name: clustering

(function() {
    module.exports.getKMeans = function(params, callback) {
        var fieldName_x = params.fieldName_x;
        var fieldName_y = params.fieldName_y;
        var numberOfClusters = params.numOfClusters;
        var Dataset = params.Dataset;
        kMeans(fieldName_x, fieldName_y, Dataset, numberOfClusters, callback);
    }
    function kMeans(fieldName_x, fieldName_y, dataset, numberOfClusters, callback) {
        var kmeans = require('ml-kmeans');
        var clusterData = [];
        dataset.data.forEach(function(value) {
            var attrVal_x = value[fieldName_x];
            var attrVal_y = value[fieldName_y];
            if(attrVal_x != null || attrVal_y != null) {
                clusterData.push([attrVal_x, attrVal_y]);
            }
        });
        var results = kmeans(clusterData, numberOfClusters, {initialization: 'mostDistant'});
        results.numOfClusters = numberOfClusters;
        callback(results);
    }

}());
