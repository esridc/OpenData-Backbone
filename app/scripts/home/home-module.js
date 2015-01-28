
(function () {
    
  'use strict';

  MyOD.module('HomeModule', function (HomeModule, App, Backbone, Marionette, $, _) {
      
    //Router for the module
    HomeModule.Router = Backbone.Marionette.AppRouter.extend({
      appRoutes:{
        '': 'show'
      }
    });

    //Add the router during the initialization 
    HomeModule.addInitializer(function (options) {
      var router = new HomeModule.Router({ controller: HomeModule.API }); 
    });

    //Simple API object that provides the implementation for the routes
    HomeModule.API = {

      show: function(options){

        if(!this.homeController){
          this.homeController = new HomeModule.Controller(options);
        }

        this.homeController.initUi(options);
      }
    };

  });
})();