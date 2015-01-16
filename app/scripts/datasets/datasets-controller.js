
(function () {

  'use strict';
    
  MyOD.module('DatasetsModule', function (DatasetsModule, App, Backbone, Marionette, $, _) {
          
    /**
     * Home controller for the main page of the application
     */
    DatasetsModule.Controller = Marionette.Controller.extend({ 

      /**
       * Initialize the Interface
       */
      initUi: function (options) {
        this.model = new App.Models.DatasetModel({ id: options });
        this.model.fetch();
        var view = new DatasetsModule.View({ model: this.model });
        App.appLayout.getRegion('main').show(view);
      }

    });

  });

})();
