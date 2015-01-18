
(function () {

  'use strict';
    
  MyOD.module('HomeModule', function (HomeModule, App, Backbone, Marionette, $, _) {
          
    /**
     * Home controller for the main page of the application
     */
    HomeModule.View = MyOD.Base.SearchView.extend({ 

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
      }

    });

  });

})();
