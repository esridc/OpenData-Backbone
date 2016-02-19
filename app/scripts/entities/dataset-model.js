
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
        landingPage: '',
        recordCount: '',
        itemType: '',
        owner: '',
        url: '',
        createdAt: '',
        updatedAt: '',
        views: 0,
        thumbnailUrl: ''
      },

      parse: function (response) {
        // map it from jsonapi back to what backbone expects
        var resp = response.data || response;
        return _.extend({id: resp.id}, resp.attributes);
      },

      url: function () {
        return MyOD.config.api + 'datasets/' + this.get('id');
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
