
(function () {

  'use strict';
    
  MyOD.module('ResultsModule', function (ResultsModule, App, Backbone, Marionette, $, _) {
          
    /**
     * Home controller for the main page of the application
     */
    ResultsModule.Controller = Marionette.Controller.extend({ 

      /**
       * Initialize the Interface
       */
      initUi: function (options) {
        this.collection = new App.Models.DatasetCollection();
        this.collection.fetch({ cache: true });
        var view = new ResultsModule.View({ model: App.searchModel, collection: this.collection });
        App.appLayout.getRegion('main').show(view);
      }

    });

  });

})();
