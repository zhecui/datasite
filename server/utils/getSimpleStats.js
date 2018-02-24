// created by Zhe on Sep. 3rd, 2017
// nodejs server side modules
// module name: getSimpleStats

(function() {
    module.exports.getMeanandVariance = function(params, callback) {
        var fieldName = params.fieldName;
        var Dataset = params.Dataset;
        var average_results = averageVariance(fieldName, Dataset);

        var results = {
            mean: average_results.mean,
            variance: average_results.variance,
            min: average_results.min,
            max: average_results.max,
        };
        callback(results);
    }

    module.exports.getRange = function(params, callback) {
        var fieldName = params.fieldName;
        var Dataset = params.Dataset;
        callback(range(fieldName, Dataset));
    }

    module.exports.getCorrelation = function(params, callback) {
        var fieldName_x = params.fieldName_x;
        var fieldName_y = params.fieldName_y;
        var Dataset = params.Dataset;
        callback(correlation(fieldName_x, fieldName_y, Dataset));
    }

    module.exports.getFreq = function(params, callback) {
        var fieldName = params.fieldName;
        var Dataset = params.Dataset;
        var criteria = params.criteria;
        callback(freqCount(fieldName, Dataset, criteria));
    }

    module.exports.getCombineFreq = function(params, callback) {
        var fieldName_x = params.fieldName_x;
        var fieldName_y = params.fieldName_y;
        var Dataset = params.Dataset;
        callback(combineFreqCount(fieldName_x, fieldName_y, Dataset));
    }


    // internal functions

    function averageVariance(fieldName, dataset) {
        var sum = 0,
            count = 0,
            mean = 0,
            variance = 0;       
        var min = Number.MAX_VALUE,
            max = Number.MIN_VALUE;
        if (fieldName in dataset.schema._fieldSchemaIndex) {
            dataset.data.forEach(function(value) {
                var attrVal = value[fieldName];
                if(attrVal != null) {
                    sum += attrVal;
                    min = Math.min(min, attrVal);
                    max = Math.max(max, attrVal);
                    count += 1;
                }
            });
            mean = sum * 1.0 / count;
        }
        dataset.data.forEach(function(value) {
            var attrVal = value[fieldName];
            if(attrVal != null) {
                variance += Math.pow(mean - attrVal, 2);
            }
        });
        variance /= count;
        return {mean: mean, min: min, max: max, variance: variance};
    }

    function range(fieldName, dataset) {
        var min = Number.MAX_VALUE,
            max = Number.MIN_VALUE;
        if (fieldName in dataset.schema._fieldSchemaIndex) {
            dataset.data.forEach(function(value) {
                var attrVal = value[fieldName];
                min = Math.min(min, attrVal);
                max = Math.max(max, attrVal);
            });
        }
        return [min, max];
    }


    function correlation(fieldName_x, fieldName_y, dataset) {
        var sum = 0, sum_x = 0, sum_y = 0,
            count = 0, correlation = 0, mean_xy = 0;

        var mean_x = 0, 
        mean_y = 0,
        var_x = 0,
        var_y = 0;

        // compute mean for x*y
        if (fieldName_x in dataset.schema._fieldSchemaIndex &&
            fieldName_y in dataset.schema._fieldSchemaIndex) {
            // check if average is already computed before.
            dataset.data.forEach(function(value) {
                if(value[fieldName_x] != null || value[fieldName_y] != null) {
                var attrVal = value[fieldName_x] * value[fieldName_y];
                    sum += attrVal;
                    sum_x += value[fieldName_x];
                    sum_y += value[fieldName_y];
                    count += 1;
                }
            });
            mean_xy = sum * 1.0 / count;
            mean_x = sum_x * 1.0 / count;
            mean_y = sum_y * 1.0 / count;

            dataset.data.forEach(function(value) {
                var attrVal_x = value[fieldName_x];
                var attrVal_y = value[fieldName_y];
                if(attrVal_x != null || attrVal_y != null) {
                    var_x += Math.pow(mean_x - attrVal_x, 2);
                    var_y += Math.pow(mean_y - attrVal_y, 2);
                }
            });
            var_x /= count;
            var_y /= count;

            correlation = (mean_xy - mean_x * mean_y) / 
            (Math.sqrt(var_x) * Math.sqrt(var_y));
        }
        
        return correlation;
    }

    function freqCount(fieldName, dataset, criteria) {
        var min = Number.MAX_VALUE, // least freq categories
        max = 0; // most freq categories
        var counts = {}, min_category = null, max_category = null;
        if (fieldName in dataset.schema._fieldSchemaIndex) {
            dataset.data.forEach(function(value) {
                var attrVal = value[fieldName];
                if(counts[attrVal] == undefined) {
                    counts[attrVal] = 1;
                } else {
                    counts[attrVal] += 1;
                }
            });
            Object.keys(counts).forEach(function(key,index) {
                if(counts[key] > max) {
                    max_category = key;
                    max = Math.max(counts[key], max);
                }
                if(counts[key] < min) {
                    min_category = key;
                    min = Math.min(counts[key], min);
                }
            });
        }
        return {min_category: min_category, max_category: max_category};
    }

    function combineFreqCount(fieldName_x, fieldName_y, dataset) {
        var min = 0, // least freq categories
        max = 0; // most freq categories
        var counts = {}, min_category = [], max_category = [];
        if (fieldName_x in dataset.schema._fieldSchemaIndex &&
            fieldName_y in dataset.schema._fieldSchemaIndex) {
            dataset.data.forEach(function(value) {
                var attrVal_x = value[fieldName_x],
                attrVal_y = value[fieldName_y];
                if(counts[attrVal_x] == undefined) {
                    counts[attrVal_x] = {};
                    counts[attrVal_x][attrVal_y] = 1;
                } else if(counts[attrVal_x][attrVal_y] == undefined) {
                    counts[attrVal_x][attrVal_y] = 1;
                } else {
                    counts[attrVal_x][attrVal_y] += 1;
                }

                if(counts[attrVal_y] == undefined) {
                    counts[attrVal_y] = {};
                    counts[attrVal_y][attrVal_x] = 1;
                } else if(counts[attrVal_y][attrVal_x] == undefined) {
                    counts[attrVal_y][attrVal_x] = 1;
                } else {
                    counts[attrVal_y][attrVal_x] += 1;
                }


            });
            Object.keys(counts).forEach(function(key_x,index) {
                Object.keys(counts[key_x]).forEach(function(key_y, index) {
                    if(counts[key_x][key_y] > max) {
                    max_category = [key_x, key_y];
                    max = Math.max(counts[key_x][key_y], max);
                    }
                });
                
            });

        }
        return max_category;
    }
}());
