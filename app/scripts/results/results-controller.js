
(function () {

  'use strict';
    
  MyOD.module('ResultsModule', function (ResultsModule, App, Backbone, Marionette, $, _) {
          
    ResultsModule.Controller = Marionette.Controller.extend({ 

      initUi: function (options) {
        this.collection = new App.Models.DatasetCollection();
        this.collection.fetch({ cache: true });
        this.view = new ResultsModule.View({ model: App.searchModel, collection: this.collection });
        App.layout.getRegion('main').show(this.view);
      }

    });

  });

})();
