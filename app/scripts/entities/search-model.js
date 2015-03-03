
(function () {

  'use strict';
    
  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {
          
    Models.SearchModel = Backbone.Model.extend({ 

      defaults: {
        q: '',
        page: 1,
        per_page: 20,
        total_count: 0,
        sort_by: 'relevance'
      },

      queryStringParams: [ 'q', 'page', 'per_page', 'sort_by' ],

      getRoute: function (api) {
        // we use this function to generate routes within the app
        // AND to generate api urls - hence the api parameter

        //create an object containing only the attributes we need to generate the querystring
        var obj = _.pick(this.toJSON(), this.queryStringParams);
        var route = 'datasets';
        route += (api) ? '.json?' : '?';
        //generate querystring parameters from the object
        route += $.param(obj);
        return route;
      },

      getUrl: function () {
        return App.config.api + this.getRoute(true);
      }

    });

  });

})();
