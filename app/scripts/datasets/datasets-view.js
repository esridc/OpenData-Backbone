
(function () {

  'use strict';
    
  MyOD.module('DatasetsModule', function (DatasetsModule, App, Backbone, Marionette, $, _) {
          
    DatasetsModule.View = Marionette.ItemView.extend({

      template: JST['datasets/templates/dataset'],

      id: 'dataset',

      modelEvents: {
        'change': 'render'
      }
      
    });

  });

})();
