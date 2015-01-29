
(function () {
    
  'use strict';

  MyOD.module('ResultsModule', function (ResultsModule, App, Backbone, Marionette, $, _) {
      
    //Router for the module
    ResultsModule.Router = Backbone.Marionette.AppRouter.extend({
      appRoutes:{
        'datasets(/)': 'show'
      }
    });

    //Add the router during the initialization 
    ResultsModule.addInitializer(function (options) {
      var router = new ResultsModule.Router({ controller: ResultsModule.API }); 
    });

    //Simple API object that provides the implementation for the routes
    ResultsModule.API = {

      show: function(options){

        var queryObj = App.queryStringToObject();
        //don't encode the q
        // var q = App.searchModel.get('q');
        // App.searchModel.set(_.extend(queryObj, { q: q }));
        App.searchModel.set(queryObj);

        if(!this.resultsController){
          this.resultsController = new ResultsModule.Controller(options);
        }

        this.resultsController.initUi(options);
      }

    };

  });
})();