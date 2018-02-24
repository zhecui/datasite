/**
 * Created by Zhe Cui on 9/9/2017.
 */

(function () {
    module.exports.linearRegression = function (params, callback) {
        var fieldName_x = params.fieldName_x;
        var fieldName_y = params.fieldName_y;
        var Dataset = params.Dataset;
        linearRegression(fieldName_x, fieldName_y, Dataset, callback);
    }
    function linearRegression(fieldName_x, fieldName_y, dataset, callback) {
        var X = [];
        var Y = [];

        dataset.data.forEach(function (value) {
            var attrVal_x = value[fieldName_x];
            var attrVal_y = value[fieldName_y];
            if (attrVal_x != null) {
                X.push(attrVal_x);
                Y.push(attrVal_y);
            }

        });
        // console.log(X);
        var shaman = require('shaman');
        var lr = new shaman.LinearRegression(X, Y
        //     {
        //     algorithm: 'GradientDescent'
        // }
        );
        lr.train(function (err) {
            if (err) {
                throw err;
            }
            var y2 = [];
            // you can now start using lr.predict:
            X.forEach(function (xi) {
                y2.push(lr.predict(xi));
            });
            var results = {};
            results[fieldName_x] = X;
            results[fieldName_y] = y2;
            //     fieldName_x: X,
            //     fieldName_y: y2
            // };
            callback(results);
        });
    }
}());