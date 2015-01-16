(function () {

  'use strict';
    
  MyOD.module('HomeModule', function (HomeModule, App, Backbone, Marionette, $, _) {
          
    /**
     * Home controller for the main page of the application
     */
    HomeModule.Controller = Marionette.Controller.extend({ 

      /**
       * Initialize the Interface
       */
      initUi: function () {
        var view = new HomeModule.View();
        App.appLayout.getRegion('main').show(view);
      }

    });

  });

})();
