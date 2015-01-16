/*global MyOD */

if (!this.MyOD || typeof this.MyOD !== 'object') {
  this.MyOD = {};
}

(function () {
  'use strict';

  MyOD = new Backbone.Marionette.Application();

  MyOD.on('before:start', function(options){
    this.searchModel = new MyOD.Models.SearchModel();
    this.appLayout = new MyOD.Main.Layout();
  });

  MyOD.on('start', function(options){
    if (Backbone.history){
      Backbone.history.start({ pushState: Modernizr.history });
    }

    Backbone.history.on('route', this.appLayout.setClasses);
    this.appLayout.setClasses();
  });

  MyOD.navigate = function (route, options) {
    Backbone.history.navigate(route, options);
  }

  MyOD.queryStringToJSON = function () {            
    var pairs = location.search.slice(1).split('&');
    
    var result = {};
    _.each(pairs, function(pair) {
        pair = pair.split('=');
        result[pair[0]] = decodeURIComponent(pair[1] || '');
    });

    return JSON.parse(JSON.stringify(result));
  }

})();
