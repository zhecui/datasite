'use strict';

/**
 * @ngdoc service
 * @name datasite.visquery
 * @description
 * # query string
 * Service in the datasite.
 */

angular.module('datasite')
    .service('Visquery', function ($q, $timeout, $http, vl, Dataset) {

        var Visquery = {
            // simple statistics
            getMeanandVariance: getMeanandVariance,
            getRange: getRange,
            // getVariance: getVariance,
            getCorrelation: getCorrelation,
            getMostFreq: getMostFreq,
            getLeastFreq: getLeastFreq,
            getCombineFreqCount: getCombineFreqCount,
            getKMeans: getKMeans,
            getLinearRegression: getLinearRegression,
            average: {},
            min: {},
            max: {},
            variance: {},
            correlation: {},
            freqCombine: {},
            clustering: {},
            regression: {}

        };

        function valueStored(attr, fieldName_x, fieldName_y) {
            if (fieldName_y === undefined) {
                if (Visquery[attr] === undefined || !Visquery[attr].hasOwnProperty(fieldName_x)) {
                    return false;
                }
                return true;
            } else {
                if (Visquery[attr] === undefined || !Visquery[attr].hasOwnProperty(fieldName_x) || !Visquery[attr].fieldName_x.hasOwnProperty(fieldName_y)) {
                    return false;
                }
                return true;
            }
        }

        function getMeanandVariance(fieldName) {
            var deferred = $q.defer();
            var results = {
                algorithm: 'meanvar',
                attribute: fieldName,
                mean: [],
                spec: getSpec('statistics', fieldName),
            };

            if (valueStored('average', fieldName)) {
                results.mean = Visquery.average.fieldName;
                deferred.resolve(results);
                return deferred.promise;
            }

            var params = {
                fieldName: fieldName,
                Dataset: Dataset,
            };
            // console.log(params);
            $http.post('simplestats/meanvar', {
                params: params,
            }).then(
                function success(res) {
                    console.log(res);
                    var data = res.data;
                    results.mean.push(data.mean);
                    results.mean.push(data.variance);
                    Visquery.average.fieldName = data.mean;
                    Visquery.variance.fieldName = data.variance;
                    Visquery.min.fieldName = data.min;
                    Visquery.max.fieldName = data.max;
                    var delay_time = Math.floor(Math.random() * 5 + 3);
                            setTimeout(function () {
                                deferred.resolve(results);
                            }, delay_time * 1000);
                },
                function error(err) {
                    console.log(err);
                    deferred.reject(err);
                });
            return deferred.promise;
        }

        function getRange(fieldName) {
            var deferred = $q.defer();
            var results = {
                algorithm: 'Range',
                attribute: fieldName,
                mean: [],
                spec: getSpec('statistics', fieldName),
            };

            if (valueStored('min', fieldName) && valueStored('min', fieldName)) {
                results.mean.push(Visquery.min.fieldName);
                results.mean.push(Visquery.max.fieldName);
                deferred.resolve(results);
                return deferred.promise;
            }
            var params = {
                fieldName: fieldName,
                Dataset: Dataset,
            };
            $http.post('simplestats/range', {
                params: params,
            }).then(
                function success(res) {
                    console.log(res);
                    var data = res.data;
                    results.mean = data;
                    Visquery.min.fieldName = data[0];
                    Visquery.max.fieldName = data[1];
                    var delay_time = Math.floor(Math.random() * 5 + 3);
                            setTimeout(function () {
                                deferred.resolve(results);
                            }, delay_time * 1000);
                },
                function error(err) {
                    console.log(err);
                    deferred.reject(err);
                });
            return deferred.promise;
        }

        // Pearson correlation
        function getCorrelation(fieldName_x, fieldName_y) {
            var deferred = $q.defer();
            var results = {
                algorithm: 'Correlation',
                attribute: [fieldName_x, fieldName_y],
                mean: 0,
                spec: getSpec('correlation', fieldName_x, fieldName_y),
            };

            if (valueStored('correlation', fieldName_x, fieldName_y)) {
                results.mean = Visquery.variance.fieldName_x.fieldName_y;
                deferred.resolve(results);
                return deferred.promise;
            }

            var params = {
                fieldName_x: fieldName_x,
                fieldName_y: fieldName_y,
                Dataset: Dataset,
            };
            $http.post('correlation', {
                params: params,
            }).then(
                function success(res) {
                    console.log(res);
                    var correlation = res.data;
                    results.mean = correlation;
                    if (Visquery.correlation.fieldName_x === undefined) {
                        Visquery.correlation.fieldName_x = {};
                    }
                    Visquery.correlation.fieldName_x.fieldName_y = correlation;
                    if (Visquery.correlation.fieldName_y === undefined) {
                        Visquery.correlation.fieldName_y = {};
                    }
                    Visquery.correlation.fieldName_y.fieldName_x = correlation;
                    // deferred.resolve(results);
                    var delay_time = Math.floor(Math.random() * 10 + 10);
                    setTimeout(function () {
                        deferred.resolve(results);
                    }, delay_time * 1000);
                },
                function error(err) {
                    console.log(err);
                    deferred.reject(err);
                });
            return deferred.promise;
        }

        // K means clustering algorithm
        function getKMeans(fieldName_x, fieldName_y, numOfClusters) {
            var deferred = $q.defer();
            var results = {
                algorithm: 'Clustering',
                attribute: [fieldName_x, fieldName_y],
                mean: 0,
                spec: getSpec('clustering', fieldName_x, fieldName_y),
            };

            if (valueStored('clustering', fieldName_x, fieldName_y)) {
                results.mean = Visquery.variance.fieldName_x.fieldName_y;
                deferred.resolve(results);
                return deferred.promise;
            }

            var params = {
                fieldName_x: fieldName_x,
                fieldName_y: fieldName_y,
                Dataset: Dataset,
                numOfClusters: numOfClusters,
            };
            $http.post('clustering', {
                params: params,
            }).then(
                function success(res) {
                    console.log(res);
                    var clusteredResults = res.data;
                    var errorList = clusteredResults.centroids.map(function (res) {
                        return res.error;
                    });
                    var errorSum = errorList.reduce(function (accu, curr) {
                        return accu + curr;
                    }, 0);
                    clusteredResults.error = errorSum / errorList.length;
                    results.mean = clusteredResults;
                    getColorSpec(fieldName_x, fieldName_y, clusteredResults.clusters,
                        function success(resultSpec) {
                            results.spec = resultSpec;
                            if (Visquery.clustering.fieldName_x === undefined) {
                                Visquery.clustering.fieldName_x = {};
                            }
                            Visquery.clustering.fieldName_x.fieldName_y = clusteredResults;
                            if (Visquery.clustering.fieldName_y === undefined) {
                                Visquery.clustering.fieldName_y = {};
                            }
                            Visquery.clustering.fieldName_y.fieldName_x = clusteredResults;
                            // deferred.resolve(results);
                            var delay_time = Math.floor(Math.random() * 20 + 30);
                            setTimeout(function () {
                                deferred.resolve(results);
                            }, delay_time * 1000);
                        });
                },
                function error(err) {
                    console.log(err);
                    deferred.reject(err);
                });
            return deferred.promise;
        }

        // K means clustering algorithm
        function getLinearRegression(fieldName_x, fieldName_y) {
            var deferred = $q.defer();
            var results = {
                algorithm: 'Regression',
                attribute: [fieldName_x, fieldName_y],
                mean: 0,
                spec: getSpec('regression', fieldName_x, fieldName_y),
            };
            //
            // if (valueStored("regression", fieldName_x, fieldName_y)) {
            //     results.mean = Visquery.variance.fieldName_x.fieldName_y;
            //     deferred.resolve(results);
            //     return deferred.promise;
            // }

            var params = {
                fieldName_x: fieldName_x,
                fieldName_y: fieldName_y,
                Dataset: Dataset,
            };
            $http.post('regression', {
                params: params,
            }).then(
                function success(res) {
                    console.log(res);
                    var regressionResults = res.data;
                    results.mean = regressionResults;
                    getRegressionSpec(fieldName_x, fieldName_y, regressionResults,
                        function success(resultSpec) {
                            results.spec = resultSpec;
                            if (Visquery.regression.fieldName_x === undefined) {
                                Visquery.regression.fieldName_x = {};
                            }
                            Visquery.regression.fieldName_x.fieldName_y = regressionResults;
                            if (Visquery.regression.fieldName_y === undefined) {
                                Visquery.regression.fieldName_y = {};
                            }
                            var delay_time = Math.floor(Math.random() * 20 + 15);
                            setTimeout(function () {
                                deferred.resolve(results);
                            }, delay_time * 1000);
                        });
                },
                function error(err) {
                    console.log(err);
                    deferred.reject(err);
                });
            return deferred.promise;
        }

        // nominal/categorical attributes
        function getMostFreq(fieldName) {
            var deferred = $q.defer();
            var results = {
                algorithm: 'Most Freq. Subcategory',
                attribute: fieldName,
                mean: 0,
                spec: getSpec('frequency', fieldName),
            };

            if (valueStored('max', fieldName)) {
                results.mean = Visquery.max.fieldName;
                deferred.resolve(results);
                return deferred.promise;
            }
            var params = {
                fieldName: fieldName,
                Dataset: Dataset,
                criteria: 'most'
            };
            $http.post('simplestats/freq', {
                params: params
            }).then(
                function success(res) {
                    console.log(res);
                    var data = res.data;
                    results.mean = data.max_category;
                    Visquery.min.fieldName = data.min_category;
                    Visquery.max.fieldName = data.max_category;
                    var delay_time = Math.floor(Math.random() * 5 + 3);
                            setTimeout(function () {
                                deferred.resolve(results);
                            }, delay_time * 1000);
                },
                function error(err) {
                    console.log(err);
                    deferred.reject(err);
                });
            return deferred.promise;
        }

        function getLeastFreq(fieldName) {
            var deferred = $q.defer();
            var results = {
                algorithm: 'Least Freq. Subcategory',
                attribute: fieldName,
                mean: 0,
                spec: getSpec('frequency', fieldName),
            };

            if (valueStored('min', fieldName)) {
                results.mean = Visquery.min.fieldName;
                deferred.resolve(results);
                return deferred.promise;
            }

            var params = {
                fieldName: fieldName,
                Dataset: Dataset,
                criteria: 'least'
            };
            $http.post('simplestats/freq', {
                params: params
            }).then(
                function success(res) {
                    console.log(res);
                    var data = res.data;
                    results.mean = data.min_category;
                    Visquery.min.fieldName = data.min_category;
                    Visquery.max.fieldName = data.max_category;
                    var delay_time = Math.floor(Math.random() * 5 + 3);
                            setTimeout(function () {
                                deferred.resolve(results);
                            }, delay_time * 1000);
                },
                function error(err) {
                    console.log(err);
                    deferred.reject(err);
                });
            return deferred.promise;
        }

        function getCombineFreqCount(fieldName_x, fieldName_y) {
            var deferred = $q.defer();
            var results = {
                algorithm: 'Most Freq. Combinations',
                attribute: [fieldName_x, fieldName_y],
                mean: 0,
                spec: getSpec('heatmap', fieldName_x, fieldName_y)
            };

            if (valueStored('freqCombine', fieldName_x, fieldName_y)) {
                results.mean = Visquery.freqCombine.fieldName_x.fieldName_y;
                deferred.resolve(results);
                return deferred.promise;
            }
            var params = {
                fieldName_x: fieldName_x,
                fieldName_y: fieldName_y,
                Dataset: Dataset
            };
            $http.post('simplestats/combinefreq', {
                params: params,
            }).then(
                function success(res) {
                    console.log(res);
                    var data = res.data;
                    results.mean = data;
                    var delay_time = Math.floor(Math.random() * 10 + 5);
                            setTimeout(function () {
                                deferred.resolve(results);
                            }, delay_time * 1000);
                },
                function error(err) {
                    console.log(err);
                    deferred.reject(err);
                });
            return deferred.promise;
        }

        function getSpec(category, attribute1, attribute2) {
            var spec = {
                data: null,
                mark: 'bar',
                transform: {
                    filterInvalid: undefined
                },
                encoding: null,
            };
            if (category === 'statistics') {
                spec.mark = 'bar';
                spec.encoding = {
                    "x": {
                        "bin": {"maxbins": 10},
                        "field": attribute1,
                        "type": vl.type.Type.QUANTITATIVE
                    },
                    "y": {
                        "field": "*",
                        aggregate: vl.aggregate.AggregateOp.COUNT,
                        type: vl.type.Type.QUANTITATIVE
                    }
                };
            } else if (category === 'correlation') {
                spec.mark = "point";
                spec.encoding = {
                    "x": {
                        "field": attribute1,
                        "type": vl.type.Type.QUANTITATIVE
                    },
                    "y": {
                        "field": attribute2,
                        "type": vl.type.Type.QUANTITATIVE
                    }
                }
            } else if (category === 'frequency') {
                spec.mark = "bar";
                spec.encoding = {
                    "y": {"field": attribute1, "type": vl.type.Type.ORDINAL},
                    "x": {
                        "field": "*",
                        aggregate: vl.aggregate.AggregateOp.COUNT,
                        type: vl.type.Type.QUANTITATIVE
                    }
                };
            } else if (category === 'heatmap') {
                spec.mark = "bar";
                spec.encoding = {
                    "row": {"field": attribute1, "type": vl.type.Type.ORDINAL},
                    "column": {
                        "field": attribute2,
                        "type": vl.type.Type.ORDINAL
                    },
                    "color": {
                        "aggregate": "count",
                        "field": "*",
                        "type": vl.type.Type.QUANTITATIVE
                    }
                };
                spec.config = {"mark": {"applyColorToBackground": true}};
            } else if (category === 'clustering') {
                spec.mark = "point";
                spec.encoding = {
                    "x": {
                        "field": attribute1,
                        "type": vl.type.Type.QUANTITATIVE
                    },
                    "y": {
                        "field": attribute2,
                        "type": vl.type.Type.QUANTITATIVE
                    }
                }
            }
            return spec;
        }

        function getColorSpec(attribute1, attribute2, clusters, callback) {
            $http.get(Dataset.currentDataset.url).then(function onSuccess(response) {
                // console.log(response);
                var dataWithClusters = [];
                response.data.forEach(function (value, index) {
                    var current_value = value;
                    current_value["clusters"] = clusters[index];
                    dataWithClusters.push(current_value);
                });

                var spec = {
                    data: {"values": dataWithClusters},
                    mark: "point",
                    transform: {
                        filterInvalid: undefined
                    },
                    encoding: {
                        "x": {
                            "field": attribute1,
                            "type": vl.type.Type.QUANTITATIVE
                        },
                        "y": {
                            "field": attribute2,
                            "type": vl.type.Type.QUANTITATIVE
                        },
                        "color": {
                            "field": "clusters",
                            "type": vl.type.Type.NOMINAL,
                            "legend": {}
                        }
                    }
                };
                callback(spec);
            }, function onError(response) {
                console.log(response);
            });
        }

        function getRegressionSpec(attribute1, attribute2, regressionResults, callback) {
            $http.get(Dataset.currentDataset.url).then(function onSuccess(response) {
                var dataWithRegression = [];
                response.data.forEach(function (value, index) {
                    var current_value = value;
                    current_value['regression'] = regressionResults[attribute2][index];
                    dataWithRegression.push(current_value);
                });

                var spec = {
                    data: {"values": dataWithRegression},
                    // use layer views here to have regression lines on top
                    // layer: [
                    //     {
                    //         mark: "point",
                    //         transform: {
                    //             filterInvalid: undefined,
                    //         },
                    //         encoding: {
                    //             "x": {
                    //                 "field": attribute1,
                    //                 "type": vl.type.Type.QUANTITATIVE
                    //             },
                    //             "y": {
                    //                 "field": attribute2,
                    //                 "type": vl.type.Type.QUANTITATIVE
                    //             },
                    //         }
                        // },
                        // {
                            mark: "line",
                            transform: {
                                filterInvalid: undefined,
                            },
                            encoding: {
                                "x": {
                                    "field": attribute1,
                                    "type": vl.type.Type.QUANTITATIVE
                                },
                                "y": {
                                    "field": "regression",
                                    "type": vl.type.Type.QUANTITATIVE
                                },
                                // "color": {
                                //     "value": "red"
                                // }
                            }
                        // }

                    // ]
                };
                callback(spec);
            }, function onError(response) {
                console.log(response);
            });
            // var spec = {
            //     data: null,
            //     mark: "point",
            //     transform: {
            //         filterInvalid: undefined,
            //     },
            //     encoding: {
            // 		"x": { "field": attribute1, "type": vl.type.Type.QUANTITATIVE },
            //         "y": { "field": attribute2, "type": vl.type.Type.QUANTITATIVE },
            // 	},
            // };
            // resultsSpec = spec;
            // return spec;
        }

        return Visquery;
    });
