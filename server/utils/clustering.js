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
    };

    module.exports.getDBSCAN = function(params, callback) {
        var fieldName_x = params.fieldName_x;
        var fieldName_y = params.fieldName_y;
        var numberOfPoints = params.numOfPoints;
        var Dataset = params.Dataset;
        DBSCAN(fieldName_x, fieldName_y, Dataset, numberOfPoints, callback);
    };

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

    function DBSCAN(fieldName_x, fieldName_y, dataset, numberOfPoints, callback) {
        var DBSCAN = require('density-clustering');
        var dbscan = new DBSCAN.DBSCAN();
        var clusterData = [];
        dataset.data.forEach(function(value) {
            var attrVal_x = value[fieldName_x];
            var attrVal_y = value[fieldName_y];
            if(attrVal_x != null || attrVal_y != null) {
                clusterData.push([attrVal_x, attrVal_y]);
            }
        });
        var clusters = dbscan.run(clusterData, numberOfPoints + 5, numberOfPoints, null);
        var results = {
            numOfClusters: clusters.length
        };
        var assignedClusters = new Array(clusterData.length);
        if(dbscan.noise.length > 0) {
            results.numOfClusters += 1;
            dbscan.noise.forEach(function(curr) {
               assignedClusters[curr] = 0;
            });
        }
        for(var ind = 0; ind < clusters.length; ind++ ) {
            var currentClusterArray = clusters[ind];
            currentClusterArray.forEach(function(curr) {
                assignedClusters[curr] = ind + 1;
            });
        }
        results.clusters = assignedClusters;
        callback(results);
    }

}());
