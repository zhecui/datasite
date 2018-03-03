'use strict';

angular.module('datasite')
    .service('Feed', function ($timeout, $q, ANY, vl, cql, util, Chart, Config, Dataset, Pills, Visquery) {

        function instantiate() {
            return {
                type: '',
                title: '',
                value: null,
                attributes: [],
                // specs: [],
                limit: 3,
                spec: null,
                query: null,
                charts: null,
                chart: Chart.getChart(null),
                order: 0
            };
        }

        var Feed = {
            typeCount: {},
            types: [],
            typeOrder: [],
            components: {},
            limitByType: {},
        };

        function promiseSuccess(result) {
            var specinfo = {
                algorithm: result.algorithm,
                attribute: result.attribute,
                result: result.mean,
                spec: result.spec
            };
            Feed.update(specinfo);
            // console.log(result);
        }

        function promiseError(error) {
            console.log('error');
        }

        Feed.loaded = function () {
            console.log(Dataset.schema._fieldSchemas);
            Dataset.schema._fieldSchemas.forEach(function (attribute_x, index) {
                // console.log(attribute_x);
                if (attribute_x.type === 'quantitative') {
                    Visquery.getMeanandVariance(attribute_x.field).then(function (result) {
                        promiseSuccess(result);
                    }, function (error) {
                        promiseError(error);
                    });

                    Visquery.getRange(attribute_x.field).then(function (result) {
                        promiseSuccess(result);
                    }, function (error) {
                        promiseError(error);
                    });

                    // Visquery.getVariance(attribute_x.field).then(function(result) {
                    //   promiseSuccess(result);
                    // }, function(error) {
                    //   promiseError(error);
                    // });

                    // two attributes algorithms
                    var index_x = Dataset.schema._fieldSchemas.indexOf(attribute_x);
                    for (var i = index_x + 1; i < Dataset.schema._fieldSchemas.length; i++) {
                        var attribute_y = Dataset.schema._fieldSchemas[i];
                        if (attribute_y.field != attribute_x.field &&
                            attribute_y.type === 'quantitative') {
                            Visquery.getCorrelation(attribute_x.field, attribute_y.field)
                                .then(function (result) {
                                    promiseSuccess(result);
                                }, function (error) {
                                    promiseError(error);
                                });

                            Visquery.getLinearRegression(attribute_x.field, attribute_y.field)
                                .then(function (result) {
                                    promiseSuccess(result);
                                }, function (error) {
                                    promiseError(error);
                                });

                            // polynomial regression
                            Visquery.getPolynomialRegression(attribute_x.field, attribute_y.field)
                                .then(function (result) {
                                    promiseSuccess(result);
                                }, function (error) {
                                    promiseError(error);
                                });
                            // clustering using kmeans
                            for (var numberOfClusters = 3; numberOfClusters < 10; numberOfClusters += 2) {
                                Visquery.getKMeans(attribute_x.field, attribute_y.field, numberOfClusters)
                                    .then(function (result) {
                                        promiseSuccess(result);
                                    }, function (error) {
                                        promiseError(error);
                                    });
                            }
                            // clustering using dbscan
                            for (var numberOfPoints = 5; numberOfPoints < 20; numberOfPoints += 4) {
                                Visquery.getDBSCAN(attribute_x.field, attribute_y.field, numberOfPoints)
                                    .then(function (result) {
                                        promiseSuccess(result);
                                    }, function (error) {
                                        promiseError(error);
                                    });
                            }
                        }
                    }
                    // Dataset.schema._fieldSchemas.forEach(function(attribute_y) {
                    //   if(attribute_y.field != attribute_x.field &&
                    //     attribute_y.type === "quantitative") {
                    //     Visquery.getCorrelation(attribute_x.field, attribute_y.field)
                    //     .then(function(result) {
                    //       promiseSuccess(result);
                    //     }, function(error) {
                    //       promiseError(error);
                    //     });
                    //   }
                    // });
                } else if (attribute_x.type === 'nominal') {
                    Visquery.getMostFreq(attribute_x.field).then(function (result) {
                        promiseSuccess(result);
                    }, function (error) {
                        promiseError(error);
                    });
                    Visquery.getLeastFreq(attribute_x.field).then(function (result) {
                        promiseSuccess(result);
                    }, function (error) {
                        promiseError(error);
                    });
                    for (var i = index + 1; i < Dataset.schema._fieldSchemas.length; i++) {
                        // Dataset.schema._fieldSchemas.forEach(function (attribute_y) {
                        var attribute_y = Dataset.schema._fieldSchemas[i];
                        if (attribute_y.field != attribute_x.field &&
                            attribute_y.type === 'nominal') {
                            Visquery.getCombineFreqCount(attribute_x.field, attribute_y.field)
                                .then(function (result) {
                                    promiseSuccess(result);
                                }, function (error) {
                                    promiseError(error);
                                });
                            }
                    }
                }
            });
        };

        function scriptFormat(specinfo) {
            var algorithm = specinfo.algorithm,
                results = specinfo.result,
                attribute = specinfo.attribute;
            var sentence = null;
            if (algorithm === "Correlation") {
                // two attributes relationship scripts
                sentence = algorithm + " of " +
                    ((typeof results) == 'number' ? results.toFixed(2) :
                        results) + " was found between Attribute " + attribute[0].split('_').join(' ')
                    + ", " + attribute[1].split('_').join(' ') + ".";
            } else if (algorithm === "Most Freq. Combinations") {
                sentence = algorithm + " found between " + attribute[0].split('_').join(' ')
                    + " " + results[0] + ", and " + attribute[1].split('_').join(' ')
                    + " " + results[1];
            } else if (algorithm === "meanvar") {
                // mean and variance scripts
                sentence = "Mean " + results[0].toFixed(2)
                    + " found in Attribute " + attribute.split('_').join(' ')
                    + " with standard deviation of " + Math.sqrt(results[1]).toFixed(2);
            } else if (algorithm === "Range") {
                // other scripts
                sentence = "Attribute " + attribute.split('_').join(' ') +
                    " has Range (" + results[0] + ", " + results[1]
                    + ").";
            } else if (algorithm === "Clustering") {
                // two attributes relationship scripts
                sentence = "K-means with " + results.numOfClusters + " clusters between " +
                    attribute[0].split('_').join(' ') + " and " +
                    attribute[1].split('_').join(' ') + " has average error "
                    + Math.sqrt(results.error).toFixed(2) + ".";
            } else if (algorithm === "DBSCAN") {
                // two attributes relationship scripts
                sentence = "DBSCAN with minPts=" + results.numOfClusters + " between " +
                    attribute[0].split('_').join(' ') + " and " +
                    attribute[1].split('_').join(' ') + " is finished.";
            } else if (algorithm === "Regression") {
                // two attributes relationship scripts
                sentence = "Linear Regression between " +
                    attribute[0].split('_').join(' ') + " and " +
                    attribute[1].split('_').join(' ') + " is" +
                    " finished.";
            } else if (algorithm === "PolynomialRegression") {
                // two attributes relationship scripts
                sentence = "Polynomial Regression between " +
                    attribute[0].split('_').join(' ') + " and " +
                    attribute[1].split('_').join(' ') + " is" +
                    " finished.";
            } else {
                sentence = algorithm + " for Attribute " + attribute.split('_').join(' ') +
                    " is " + results + ".";
            }
            return sentence;
        }

        Feed.update = function (specinfo) {
            var component = instantiate();
            component.order = -1;
            component.type = specinfo.algorithm;
            component.value = getRankValue(specinfo);
            // 'value' property is used for ranking in the feed.
            if(specinfo.attribute instanceof Array) {
                component.attributes = component.attributes.concat(
                    specinfo.attribute);
            } else {
                component.attributes.push(specinfo.attribute);
            }
            component.title = scriptFormat(specinfo);
            var clusteredData = JSON.parse(JSON.stringify(specinfo.spec.data));
            if (specinfo.algorithm != 'Clustering' && specinfo.algorithm !=
            'Regression' && specinfo.algorithm != 'PolynomialRegression' && specinfo.algorithm
                != 'DBSCAN') {
                var data = {
                    formatType: undefined,
                    url: Dataset.currentDataset.url,
                };
                specinfo.spec.data = data;
            }

            component.spec = specinfo.spec;
            component.query = {
                spec: component.spec,
                groupBy: '',
                orderBy: '',
                chooseBy: '',
                config: {autoAddCount: false}
            };

            util.extend(component, {
                charts: executeQuery(component, specinfo.algorithm === 'Clustering'
                    , specinfo.algorithm === 'Regression', clusteredData)
            });
            // component.charts = executeQuery(component, 0, 0);
            component.chart = component.charts[0];
            if (Feed.typeCount[component.type] == undefined) {
                Feed.typeCount[component.type] = 1;
            } else {
                Feed.typeCount[component.type] += 1;
            }

            if (!Feed.types.includes(component.type)) {
                Feed.types.push(component.type);
                Feed.typeOrder.push({
                    type: component.type,
                    order: 0
                });
                Feed.components[component.type] = [];
                Feed.limitByType[component.type] = 3;
            }
            Feed.components[component.type].unshift(component);
        };

        Feed.filter = function(encodings) {
            var selectedEncodings = [];
            Object.keys(encodings).forEach(function(curr) {
                if(encodings[curr]!= undefined && encodings[curr].field != undefined) {
                    selectedEncodings.push(encodings[curr].field);
                }
            });

            var components = Feed.components;
            if(selectedEncodings.length > 0) {
                for (var type in components) {
                    var currTypeOrder = 0;
                    var componentsByType = components[type];
                    for(var index = 0; index < componentsByType.length; index++ ) {
                        componentsByType[index].attributes.forEach(function(attribute) {
                            if(selectedEncodings.includes(attribute)) {
                                Feed.components[type][index].order = 1;
                                for(var ind = 0; ind < Feed.typeOrder.length; ind++ ) {
                                    if(Feed.typeOrder[ind].type == type) {
                                        Feed.typeOrder[ind].order = 1;
                                    }
                                }
                            } else {
                                Feed.components[type][index].order = 0;
                            }
                        });
                    }
                }
            } else {
                for(var ind = 0; ind < Feed.typeOrder.length; ind++ ) {
                    // if(Feed.typeOrder[ind].type == type) {
                    Feed.typeOrder[ind].order = 0;
                    // }
                }
                for (var type in components) {
                    for(var ind = 0; ind < Feed.typeOrder.length; ind++ ) {
                        if(Feed.typeOrder[ind].type == type) {
                            Feed.typeOrder[ind].order = 0;
                        }
                    }
                    var componentsByType = components[type];
                    for(var index = 0; index < componentsByType.length; index++ ) {
                        Feed.components[type][index].order = 0;
                    }
                }
            }
        };

        Feed.clear = function () {
            Feed.components = {};
            Feed.types = [];
            Feed.typeOrder = [];
            Feed.typeCount = {};
        };

        function executeQuery(alternative, isClustering, isRegression, clusteredData) {
            var spec = getQuery(alternative.spec, isClustering, isRegression, clusteredData);
            // added by Zhe, trick to modify the dataset with clustered results.
            if (isClustering || isRegression) {
                Dataset.schema = cql.schema.Schema.build(clusteredData.values);
                // spec.spec.encodings[2]["legend"] = null;
            }
            var output = cql.query(spec, Dataset.schema);
            // if (isClustering) {
            //     output.result.items[0]._spec.encodings[2]["legend"] = null;
            // }
            // Don't include the specified visualization in the recommendation list
            return output.result.items.map(Chart.getChart);
        }

        function getSpecQuery(spec, isClustering, isRegression, clusteredData) {
            // if (convertFilter) {
            //     spec = util.duplicate(spec);
            //
            //
            //     // HACK convert filter manager to proper filter spec
            //     if (spec.transform && spec.transform.filter) {
            //         delete spec.transform.filter;
            //     }
            //
            //     var filter = FilterManager.getVlFilter();
            //     if (filter) {
            //         spec.transform = spec.transform || {};
            //         spec.transform.filter = filter;
            //     }
            // }

            var encodings = vg.util.keys(spec.encoding).reduce(function (encodings, channelId) {
                var encQ = vg.util.extend(
                    // Add channel
                    {channel: Pills.isAnyChannel(channelId) ? '?' : channelId},
                    // Field Def
                    spec.encoding[channelId],
                    // Remove Title
                    {title: undefined}
                );

                if (cql.enumSpec.isEnumSpec(encQ.field)) {
                    // replace the name so we should it's the field from this channelId
                    encQ.field = {
                        name: 'f' + channelId,
                        enum: encQ.field.enum
                    };
                }

                encodings.push(encQ);
                return encodings;
            }, []);
            var updatedData = {};
            if (isClustering || isRegression) {
                updatedData = clusteredData;
            } else {
                updatedData = spec.data;
            }
            // if(isRegression) {
            //     return {
            //         data: updatedData,
            //         layer: spec.layer
            //     };
            // }
            return {
                // modified by Zhe
                data: updatedData,
                // data: Config.data,
                mark: spec.mark === ANY ? '?' : spec.mark,

                // TODO: support transform enumeration
                transform: spec.transform,
                encodings: encodings,
                config: spec.config
            };
        }

        function getQuery(spec, isClustering, isRegression, clusteredData) {
            var specQuery = getSpecQuery(spec, isClustering, isRegression, clusteredData);

            var hasAnyField = false, hasAnyFn = false, hasAnyChannel = false;

            // for (var i = 0; i < specQuery.encodings.length; i++) {
            //   var encQ = specQuery.encodings[i];
            //   if (encQ.autoCount === false) continue;

            //   if (cql.enumSpec.isEnumSpec(encQ.field)) {
            //     hasAnyField = true;
            //   }

            //   if (cql.enumSpec.isEnumSpec(encQ.aggregate) ||
            //       cql.enumSpec.isEnumSpec(encQ.bin) ||
            //       cql.enumSpec.isEnumSpec(encQ.timeUnit)) {
            //     hasAnyFn = true;
            //   }

            //   if (cql.enumSpec.isEnumSpec(encQ.channel)) {
            //     hasAnyChannel = true;
            //   }
            // }

            /* jshint ignore:start */
            var groupBy = spec.groupBy;

            if (spec.groupBy === 'auto') {
                groupBy = Spec.autoGroupBy = hasAnyField ?
                    (hasAnyFn ? 'fieldTransform' : 'field') :
                    'encoding';
            }

            return {
                spec: specQuery,
                groupBy: groupBy,
                orderBy: '',
                chooseBy: '',
                // orderBy: ['fieldOrder', 'aggregationQuality', 'effectiveness'],
                // chooseBy: ['aggregationQuality', 'effectiveness'],
                config: {
                    omitTableWithOcclusion: false,
                    autoAddCount: (hasAnyField || hasAnyFn || hasAnyChannel) && spec.autoAddCount
                }
            };
            /* jshint ignore:end */
        }

        function getRankValue(spec) {
            switch(spec.algorithm) {
                case 'meanvar':
                    // based on variance, larger variance gets higher ranking
                    return -spec.result[1];
                case 'Range':
                    return spec.result[0] - spec.result[1];
                case 'Correlation':
                    return spec.result;
                case 'Clustering':
                    return spec.result.error;
                case 'Regression':
                    return spec.result;
                case 'Most Freq. Combinations':
                    return spec.result[0];
                default:
                    return spec.result;
            }
        }

        return Feed;
    });