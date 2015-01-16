(function () {

  'use strict';
    
  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {
          
    /**
     * Home controller for the main page of the application
     */
    Models.DatasetCollection = Backbone.Collection.extend({

      model: Models.DatasetModel,

      url: function () {
        return App.searchModel.getUrl(true);
      },

      parse: function (resp) {
        App.searchModel.set(_.extend(resp.metadata.query_parameters, resp.metadata.stats));
        return resp.data;
      }

    });

  });

})();
