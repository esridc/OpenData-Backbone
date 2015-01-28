
(function () {

  'use strict';
    
  MyOD.module('DatasetsModule', function (DatasetsModule, App, Backbone, Marionette, $, _) {
          
    DatasetsModule.View = Marionette.ItemView.extend({

      initialize: function (options) {
        this.mapManager = options.mapManager;
      },

      template: JST['datasets/templates/dataset'],

      id: 'dataset',

      modelEvents: {
        'change': 'render'
      },

      onDomRefresh: function () {
        var self = this;
        // TODO: would be nice to encapsulate this in mapmanager so consumers wouldn't have to know to do it
        this.mapManager.dojoReady.done(function () {
          self.mapManager.createMap('map', { coords: self.model.get('extent').coordinates });
          self.mapManager.addDataset(self.model);
        });
      },

      onDestroy: function () {
        this.mapManager.destroy();
      }
      
    });

  });

})();
