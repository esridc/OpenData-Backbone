
(function () {

  'use strict';
    
  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {
          
    Models.DatasetModel = Backbone.Model.extend({

      initialize: function () {
        this.on('sync', this.onSync);
      },

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
        var data = response.data || response;
        return data;
      },

      url: function () {
        return MyOD.config.api + 'datasets/' + this.get('id') + '.json';
      }

    });

  });

})();
