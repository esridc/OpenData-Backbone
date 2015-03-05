// Karma configuration
// Generated on Thu Mar 05 2015 10:44:31 GMT-0700 (MST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      '../bower_components/jquery/dist/jquery.js',
      '../bower_components/underscore/underscore.js',
      '../bower_components/backbone/backbone.js',
      '../bower_components/backbone.babysitter/lib/backbone.babysitter.js',
      '../bower_components/backbone.wreqr/lib/backbone.wreqr.js',
      '../bower_components/marionette/lib/core/backbone.marionette.js',
      '../bower_components/backbone-fetch-cache/backbone.fetch-cache.js',
      '../bower_components/typeahead.js/dist/typeahead.bundle.js',
      '../bower_components/moment/moment.js',
      '../test/lib/init.js',
      '../app/scripts/app.js',
      '../app/scripts/utils/mapmanager.js',
      '../app/scripts/base/search-view.js',
      '../app/scripts/entities/search-model.js',
      '../app/scripts/app-config.js',
      '../app/scripts/compiled-templates.js',
      '../app/scripts/header-search-view.js',
      '../app/scripts/app-layout.js',
      '../app/scripts/home/home-view.js',
      '../app/scripts/home/home-controller.js',
      '../app/scripts/home/home-module.js',
      '../app/scripts/entities/dataset-model.js',
      '../app/scripts/entities/dataset-collection.js',
      '../app/scripts/results/results-view.js',
      '../app/scripts/results/results-controller.js',
      '../app/scripts/results/results-module.js',
      '../app/scripts/datasets/datasets-view.js',
      '../app/scripts/datasets/datasets-controller.js',
      '../app/scripts/datasets/datasets-module.js',
      '../app/scripts/error/error-view.js',
      '../app/scripts/error/error-controller.js',
      '../app/scripts/error/error-module.js',
      'spec/**/*.spec.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
