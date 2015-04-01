
(function () {

  'use strict';
    
  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {
          
    /*
    * Models a collection of datasets
    */
    Models.DatasetCollection = Backbone.Collection.extend({

      model: Models.DatasetModel,

      url: function () {
        return App.searchModel.getUrl(true);
      },

      parse: function (resp) {
        //apply the metadata to the searchmodel
        App.searchModel.set(_.extend(resp.metadata.query_parameters, resp.metadata.stats));
        return resp.data;
      }

    });

  });

})();
