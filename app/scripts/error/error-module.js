
(function () {
    
  'use strict';

  MyOD.module('ErrorModule', function (ErrorModule, App, Backbone, Marionette, $, _) {
      
    //Router for the module
    ErrorModule.Router = Backbone.Marionette.AppRouter.extend({
      appRoutes:{
        '404': 'error404',
        '500': 'error500'
      }
    });

    //Add the router during the initialization 
    ErrorModule.addInitializer(function (options) {
      var router = new ErrorModule.Router({ controller: ErrorModule.API }); 
    });

    //Simple API object that provides the implementation for the routes
    ErrorModule.API = {

      initController: function () {
        if(!this.errorController){
          this.errorController = new ErrorModule.Controller();
        }
      },

      error404: function () {
        this.initController();
        this.errorController.initUi({ errorCode: 404 });
      },

      error500: function () {
        this.initController();
        this.errorController.initUi({ errorCode: 500 });
      }
    };

  });
})();