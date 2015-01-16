
(function () {

  'use strict';
    
  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {
          
    /**
     * Home controller for the main page of the application
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
      }

    });

  });

})();
