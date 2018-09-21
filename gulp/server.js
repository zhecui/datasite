'use strict';

var gulp = require('gulp');

var paths = gulp.paths;

var util = require('util');

var browserSync = require('browser-sync');
// added by Zhe
var nodemon = require('gulp-nodemon');

var middleware = require('./proxy');

function browserSyncInit(baseDir, files) {
  var routes = null;
  if(baseDir === paths.src || (util.isArray(baseDir) && baseDir.indexOf(paths.src) !== -1)) {
    routes = {
      '/bower_components': 'bower_components'
    };
  }

  browserSync.instance = browserSync.init(files, {
    startPath: '/',
    server: {
      baseDir: baseDir,
      middleware: middleware,
      routes: routes
    }
  });
}

gulp.task('serve', ['watch', 'jshint', 'nodemon'], function () {
  browserSyncInit([
    paths.tmp + '/serve',
    paths.src
  ], [
    paths.tmp + '/serve/{app,components}/**/*.css',
    paths.src + '/{app,components}/**/*.js',
    paths.src + '/assets/images/**/*',
    // modified by Zhe
    paths.src + '/app/data/*',
    paths.tmp + '/serve/*.html',
    paths.tmp + '/serve/{app,components}/**/*.html',
    paths.src + '/{app,components}/**/*.html',
    // paths.src + '../bower_components/vega-lite-ui/*',
  ]);

  // gulp.start('test:auto');
});

// gulp.task('serve', ['watch', 'jshint', 'nodemon'], function () {
//   browserSyncInitProxy([
//     paths.tmp + '/serve',
//     paths.src
//   ], [
//     paths.tmp + '/serve/{app,components}/**/*.css',
//     paths.src + '/{app,components}/**/*.js',
//     paths.src + '/assets/images/**/*',
//     paths.tmp + '/serve/*.html',
//     paths.tmp + '/serve/{app,components}/**/*.html',
//     paths.src + '/{app,components}/**/*.html',
//   ]);

//   gulp.start('test:auto');
// });

gulp.task('nodemon', function (cb) {
    var callbackCalled = false;
    return nodemon({script: './server.js', nodeArgs: ['--debug']}).on('start', function () {
        if (!callbackCalled) {
            callbackCalled = true;
            cb();
        }
    });
});

gulp.task('serve:dist', ['build'], function () {
  browserSyncInit(paths.dist);
});

gulp.task('serve:e2e', ['inject'], function () {
  browserSyncInit([paths.tmp + '/serve', paths.src], null, []);
});

gulp.task('serve:e2e-dist', ['build'], function () {
  browserSyncInit(paths.dist, null, []);
});
