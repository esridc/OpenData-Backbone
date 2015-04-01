
(function () {

  'use strict';
    
  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {
          
    /*
    * Models a dataset
    */
    Models.DatasetModel = Backbone.Model.extend({

      defaults: {
        id: '',
        name: '',
        description: '',
        tags: [],
        arcgis_online_item_url: '',
        owner: '',
        url: '',
        created_at: '',
        updated_at: '',
        views: 0,
        thumbnail_url: ''
      },

      parse: function (response) {
        return response.data || response;
      },

      url: function () {
        return MyOD.config.api + 'datasets/' + this.get('id') + '.json';
      },

      getNumericFields: function () {
        var fields = this.get('fields');
        return _.filter(fields, function (item) {
          return _.contains([ 'esriFieldTypeSingle', 'esriFieldTypeDouble', 'esriFieldTypeInteger' ], item.type);
        });
      }

    });

  });

})();
