(function () {

  'use strict';
    
  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {
          
    /**
     * Home controller for the main page of the application
     */
    Models.SearchModel = Backbone.Model.extend({ 

      defaults: {
        q: '',
        page: 1,
        per_page: 20,
        total_count: 0
      },

      queryStringParams: [ 'q', 'page', 'per_page' ],

      getRoute: function (api) {
        var obj = _.pick(this.toJSON(), this.queryStringParams);
        var route = 'datasets'
        route += (api) ? '.json?' : '?';
        route += $.param(obj);
        return route;
      },

      getUrl: function () {
        return App.config.api + this.getRoute(true);
      }

    });

  });

})();
