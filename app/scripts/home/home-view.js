(function () {

  'use strict';
    
  MyOD.module('HomeModule', function (HomeModule, App, Backbone, Marionette, $, _) {
          
    /**
     * Home controller for the main page of the application
     */
    HomeModule.View = Marionette.ItemView.extend({ 

      initialize: function () {
        this.model = App.searchModel;   
      },

      template: JST['home/templates/home'],

      events: {
        'keydown #search': 'onKeyDown',
        'keyup #search': 'onKeyUp',
        'click #search-btn': 'search'
      },

      ui: {
        search: '#search'
      },

      id: 'home',

      onDomRefresh: function () {
        this.ui.search.focus();
      },

      onKeyDown:function(e){
        if (e.which === 13) {
          e.preventDefault();

          var q = this.ui.search.val();

          this.model.set({
            q: q,
            page: 1
          });

          this.search();
        }
      },

      onKeyUp: function () {
        var q = this.ui.search.val();
        this.model.set({
          q: q,
          page: 1
        });
      },

      search: function () {
        var route = this.model.getRoute();
        App.navigate(route, { trigger:true });
      }

    });

  });

})();
