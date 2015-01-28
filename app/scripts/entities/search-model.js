
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
        var obj = _.pick(this.toJSON(), this.queryStringParams);
        var route = 'datasets';
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
