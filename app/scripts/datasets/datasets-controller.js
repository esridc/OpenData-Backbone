
(function () {

  'use strict';
    
  MyOD.module('DatasetsModule', function (DatasetsModule, App, Backbone, Marionette, $, _) {

    DatasetsModule.Controller = Marionette.Controller.extend({ 

      initialize: function () {
        _.bindAll(this, 'onModelFetched');
      },

      initUi: function (options) {
        this.mapManager = new App.Utils.MapManager();
        this.model = new App.Models.DatasetModel({ id: options });
        this.model
          .fetch()
            .done(this.onModelFetched)
            .fail(function () {
              App.navigate404();
            });;
      },

      onModelFetched: function () {
        var view = new DatasetsModule.View({ model: this.model, mapManager: this.mapManager });
        App.appLayout.getRegion('main').show(view);
      },

      onBeforeDestroy: function () {
        if (this.mapManager) {
          this.mapManager.destroy();
        }
      }

    });

  });

})();
