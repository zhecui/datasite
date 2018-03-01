'use strict';

angular.module('datasite')
    .directive('feedGroup', function () {
        return {
            templateUrl: 'components/feedgroup/feedgroup.html',
            restrict: 'E',
            replace: true,
            scope: {
                /** An instance of specQueryModelGroup */
                componentsByType: '=',
                limitByType: '=',
                typeCount: '=',
                type: "=",
                filter: "=",
                selectedEncodings: "="
            },
            link: function postLink(scope /*, element, attrs*/) {
                scope.hideExplore = false;
                scope.toggleHideExplore = function() {
                    scope.hideExplore = !scope.hideExplore;
                    if(scope.hideExplore) {
                        scope.limitByType[scope.type] = scope.componentsByType.length;
                    } else {
                        scope.limitByType[scope.type] = 3;
                    }
                };

                scope.$watchGroup(['selectedEncodings.x.field', 'selectedEncodings.y.field',
                    'selectedEncodings.col.field'], function(fields) {
                    console.log(fields);
                    // Object.keys(scope.selectedEncodings)
                    }
                );
            }
        };
    });
