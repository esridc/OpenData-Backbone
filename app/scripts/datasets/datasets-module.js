
(function () {
    
  'use strict';

  MyOD.module('DatasetsModule', function (DatasetsModule, App, Backbone, Marionette, $, _) {
      
    //Router for the module
    DatasetsModule.Router = Backbone.Marionette.AppRouter.extend({
      appRoutes:{
        'datasets/:id(/)': 'show',
      }
    });

    //Add the router during the initialization 
    DatasetsModule.addInitializer(function (options) {
      var router = new DatasetsModule.Router({ controller: DatasetsModule.API }); 
    });

    //Simple API object that provides the implementation for the routes
    DatasetsModule.API = {

      show: function(options){

        if(!this.datasetsController){
          this.datasetsController = new DatasetsModule.Controller(options);
        }

        this.datasetsController.initUi(options);
      }
    };

  });
})();