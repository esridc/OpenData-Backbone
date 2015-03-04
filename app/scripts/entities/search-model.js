
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

      getQueryString: function () {
        //create an object containing only the attributes we need to generate the querystring
        var obj = _.pick(this.toJSON(), this.queryStringParams);
        //generate querystring parameters from the object
        var queryString = $.param(obj);
        return queryString;
      },

      getRoute: function (api) {
        // we use this function to generate routes within the app
        // AND to generate api urls - hence the api parameter
        
        var route = 'datasets';
        route += (api) ? '.json?' : '?';
        route += this.getQueryString();
        return route;
      },

      getUrl: function () {
        return App.config.api + this.getRoute(true);
      }

    });

  });

})();
