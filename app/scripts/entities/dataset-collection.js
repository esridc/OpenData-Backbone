
(function () {

  'use strict';

  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {

    /*
    * Models a collection of datasets
    */
    Models.DatasetCollection = Backbone.Collection.extend({

      model: Models.DatasetModel,

      url: function () {
        return App.searchModel.getUrl();
      },

      parse: function (resp) {
        //apply the metadata to the searchmodel
        var obj = {
          page: resp.meta.queryParameters.page.number,
          per_page: resp.meta.queryParameters.page.size
        };
        App.searchModel.set(_.extend(obj, resp.meta.stats));

        return resp.data;
      }

    });

  });

})();
