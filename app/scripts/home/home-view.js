
(function () {

  'use strict';
    
  MyOD.module('HomeModule', function (HomeModule, App, Backbone, Marionette, $, _) {
          
    HomeModule.View = MyOD.Base.SearchView.extend({ 

      initialize: function () {
        this.model = App.searchModel;   
      },

      template: JST['home/templates/home'],

      events: {
        'keydown #search': 'onKeyDown',
        'keyup #search': 'onKeyUp',
        'click #search-btn': 'onSearchButtonClick',
        'typeahead:selected input': 'onTypeaheadSelected'
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
