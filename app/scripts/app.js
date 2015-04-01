/*jshint -W020 */

if (!this.MyOD || typeof this.MyOD !== 'object') {
  this.MyOD = {};
}

(function () {
  'use strict';

  MyOD = new Backbone.Marionette.Application();

  MyOD.on('before:start', function(options){
    this.searchModel = new MyOD.Models.SearchModel();
    this.layout = new MyOD.Main.Layout();
    //this.reqres = new Backbone.Wreqr.RequestResponse();
  });

  MyOD.on('start', function(options){
    Backbone.history.on('route', this.layout.setClasses);

    if (Backbone.history){
      //if you are hosting on a server that can let the browser handle all the routing,
      //you can use pushstate, otherwise (gh-pages) use hashed urls
      //Backbone.history.start({ pushState: Modernizr.history, root: '/OpenData-Backbone' });
      //Backbone.history.start returns false if the current url doesn't match a route
      if (!Backbone.history.start({ pushState: false, root: '/OpenData-Backbone' })) {
        MyOD.navigate('404', { trigger:true });
      }
    }
  });

  MyOD.navigate = function (route, options) {
    Backbone.history.navigate(route, options);
  };

  MyOD.search = function (options) {
    var route = MyOD.searchModel.getRoute();
    MyOD.navigate(route, { trigger: true });
  };

  MyOD.navigateDataset = function (datasetId) {
    MyOD.navigate('/datasets/' + datasetId, { trigger: true });
  };  

  MyOD.navigate404 = function () {
    MyOD.navigate('404', { trigger: true, replace: true });
  };

  MyOD.queryStringToObject = function () {
    var result = {};

    var q = Backbone.history.getFragment().split('?')[1];

    if (q) {
      var pairs = q.split('&');
      
      _.each(pairs, function(pair) {
        pair = pair.split('=');
        if (pair[0] === 'q') {
          result[pair[0]] = pair[1].replace(/\+/g, ' ') || '';
        } else {
          result[pair[0]] = decodeURIComponent(pair[1] || '');
        }
      });
    }

    return result;
  };

  //by putting it on app instead of this base view, we can share one instance throughout the app
  //instead of having one instance per view that needs one
  MyOD.getBloodhound = function () {
    if (!this.bloodhound) {
      this.bloodhound = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        limit: 10,
        remote: {
          url: MyOD.config.api + 'datasets/autocomplete.json?query=%QUERY',
          rateLimitWait: 150,
          replace: function (url, query) {
            return url.replace('%QUERY', query);
          },
          filter: function(response) {
            return response ? response.data : [];
          }
        }
      });
    }
    return this.bloodhound;
  };

  MyOD.onBeforeDestroy = function () {
    Backbone.history.stop();
  };

})();
