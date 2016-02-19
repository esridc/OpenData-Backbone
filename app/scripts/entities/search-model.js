
(function () {

  'use strict';

  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {

    /*
    * Models search parameters and uses them to generate search urls
    */
    Models.SearchModel = Backbone.Model.extend({

      defaults: {
        q: '',
        page: 1,
        per_page: 20,
        totalCount: 0
      },

      queryStringParams: [ 'q', 'page', 'per_page', 'sort_by' ],

      getQueryString: function () {
        //create an object containing only the attributes we need to generate the querystring
        var obj = _.pick(this.toJSON(), this.queryStringParams);

        //map it to the format that apiv2 expects
        obj.page = {
          number: obj.page,
          size: obj.per_page
        };
        delete obj.per_page;

        //generate querystring parameters from the object
        return $.param(obj);
      },

      getRoute: function () {
        // we use this function to generate routes within the app
        // AND to generate api urls

        var route = 'datasets';
        //route += (api) ? '.json?' : '?';
        route += '?' + this.getQueryString();
        return route;
      },

      getUrl: function () {
        return App.config.api + this.getRoute();
      }

    });

  });

})();
