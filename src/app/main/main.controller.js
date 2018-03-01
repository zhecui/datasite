'use strict';

angular.module('datasite')
  .controller('MainCtrl', function($scope, $document, Spec, Feed, Dataset, Config, consts, Chronicle, Logger, Bookmarks, Modals, FilterManager, Pills) {
    $scope.Spec = Spec;
    // modified by Zhe
    $scope.Feed = Feed;
    $scope.Dataset = Dataset;
    $scope.Config = Config;
    $scope.Logger = Logger;
    $scope.Bookmarks = Bookmarks;
    $scope.FilterManager = FilterManager;
    $scope.consts = consts;
    $scope.showDevPanel = false;
    $scope.embedded = !!consts.embeddedData;

    $scope.Pills = Pills;

    $scope.hideExplore = false;
    $scope.showDataPanel = false;
    $scope.showEncodingPanel = false;

    $scope.toggleHideExplore = function() {
      $scope.hideExplore = !$scope.hideExplore;
      if ($scope.hideExplore) {
        Logger.logInteraction(Logger.actions.TOGGLE_HIDE_ALTERNATIVES, Spec.chart.shorthand);
      } else {
        Logger.logInteraction(Logger.actions.TOGGLE_SHOW_ALTERNATIVES, Spec.chart.shorthand);
      }
    };

    $scope.toggleDataPanel = function() {
      $scope.showDataPanel = !$scope.showDataPanel;
    };

    $scope.toggleEncodingPanel = function() {
      $scope.showEncodingPanel = !$scope.showEncodingPanel;
    };

    $scope.alternativeType = null;
    $scope.setAlternativeType = function(type, select, automatic) {
      if(type != null) {
        type = type.replace(/[\n]/g, '').trim();
      } else if(select === true) {
        // $scope.selectedType = undefined;
        // if(document.getElementById('selected').selected != null)
        var a = document.getElementById('selected');
          a.selectedIndex = -1;
        // document.getElementById('selected').selectedIndex = -1;
      }
      $scope.alternativeType = type;
      if (!automatic) {
        $scope.hideExplore = false;
        Logger.logInteraction(Logger.actions.TOGGLE_SHOW_ALTERNATIVES, Spec.chart.shorthand);
        Logger.logInteraction(Logger.actions.SET_ALTERNATIVES_TYPE, type, {
          shorthand: Spec.chart.shorthand
        });
      }
    };

    $scope.scrollToTop = function() {
      $document.find('.vis-pane-container').scrollTop(0);
    };

    $scope.groupByChanged = function() {
      Logger.logInteraction(Logger.actions.GROUP_BY_CHANGED, Spec.spec.groupBy);
    };
    $scope.autoAddCountChanged = function() {
      Logger.logInteraction(Logger.actions.AUTO_ADD_COUNT_CHANGED, Spec.spec.autoAddCount);
    };

    // $scope.$watch('Spec.alternatives', function(alternatives) {
    //   for (var i = 0 ; i < alternatives.length; i++) {
    //     if ($scope.alternativeType === alternatives[i].type) {
    //       return;
    //     }
    //   }
    //   // at this point we don't have the suggestion type available, thus reset
    //   $scope.setAlternativeType(null, true);
    // });

    // modified by Zhe
    // $scope.$watch('Spec.feeds', function(feeds) {
    //   for (var i = 0 ; i < feeds.length; i++) {
    //     if ($scope.alternativeType === feeds[i].type) {
    //       return;
    //     }
    //   }
    //   // at this point we don't have the suggestion type available, thus reset
    //   $scope.setAlternativeType(null, true);
    // });

    $scope.$watch('Feed', function(feed) {
      if (feed.length === 0) {
        return;
      }
      if(Dataset.currentDataset) {
        feed.update();
      }
      // at this point we don't have the suggestion type available, thus reset
      $scope.setAlternativeType(null, false, true);
    });

    $scope.$watch('Pills', function(Pills) {
        console.log(Pills);
    });

    // undo/redo support
    $scope.canUndo = false;
    $scope.canRedo = false;

    // bookmark
    $scope.showModal = function(modalId) {
      Modals.open(modalId);
      if (modalId == 'bookmark-list') {
        Logger.logInteraction(Logger.actions.BOOKMARK_OPEN);
      }
    };

    // added by Zhe
    $scope.showChart = [];
    $scope.showVis = function(index) {
        if($scope.showChart[index] === undefined) {
            $scope.showChart[index] = false;
        }
      $scope.showChart[index] = !$scope.showChart[index];
    }

    if (Bookmarks.isSupported) {
      // load bookmarks from local storage
      Bookmarks.load();
    }

    if ($scope.embedded) {
      // use provided data and we will hide the dataset selector
      Dataset.dataset = {
        values: consts.embeddedData,
        name: 'embedded'
      };
    }

    // initialize undo after we have a dataset
    Dataset.update(Dataset.dataset).then(function() {
      Config.updateDataset(Dataset.dataset);

      if (consts.initialSpec) {
        Spec.parseSpec(consts.initialSpec);
      }

      $scope.chron = Chronicle.record('Spec.spec', $scope, true,
        ['Dataset.dataset', 'Config.config', 'FilterManager.filterIndex']);

      $scope.canUndoRedo = function() {
        $scope.canUndo = $scope.chron.canUndo();
        $scope.canRedo = $scope.chron.canRedo();
      };
      $scope.chron.addOnAdjustFunction($scope.canUndoRedo);
      $scope.chron.addOnUndoFunction($scope.canUndoRedo);
      $scope.chron.addOnRedoFunction($scope.canUndoRedo);

      $scope.chron.addOnUndoFunction(function() {
        Logger.logInteraction(Logger.actions.UNDO);
      });
      $scope.chron.addOnRedoFunction(function() {
        Logger.logInteraction(Logger.actions.REDO);
      });

      angular.element($document).on('keydown', function(e) {
        if (e.keyCode === 'Z'.charCodeAt(0) && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
          $scope.chron.undo();
          $scope.$digest();
          return false;
        } else if (e.keyCode === 'Y'.charCodeAt(0) && (e.ctrlKey || e.metaKey)) {
          $scope.chron.redo();
          $scope.$digest();
          return false;
        } else if (e.keyCode === 'Z'.charCodeAt(0) && (e.ctrlKey || e.metaKey) && e.shiftKey) {
          $scope.chron.redo();
          $scope.$digest();
          return false;
        }
      });
    });

    $scope.increaseLimit = function(type) {
      $scope.Feed.limitByType[type] += 4;
      Logger.logInteraction(Logger.actions.LOAD_MORE, $scope.limit, {
        list: $scope.listTitle
      });
    };

    $scope.releaseLimit = function() {
      for(var key in $scope.Feed.limitByType) {
        if($scope.Feed.limitByType[key] > Feed.components[key].length) {
          $scope.Feed.limitByType[key] = 3;
        } else {
          $scope.Feed.limitByType[key] = Feed.components[key].length + 1;
        }
        Logger.logInteraction(Logger.actions.LOAD_MORE, $scope.limit, {
          list: $scope.listTitle
        });
      }
      // if($scope.Feed.components[0].limit > Feed.components.length) {
      //   $scope.Feed.components[0].limit = 3;
      // } else {
      //   $scope.Feed.components[0].limit = Feed.components.length + 1;
      // }
      // Logger.logInteraction(Logger.actions.LOAD_MORE, $scope.limit, {
      //   list: $scope.listTitle
      // });
    };

    // $scope.tests = [];
    // $scope.loadMore = function() {
    //   $scope.tests = $scope.Feed.components.slice(0, $scope.tests.length + 7);
    // }
  });
