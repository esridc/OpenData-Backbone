
(function () {

  'use strict';
    
  MyOD.module('Main', function (Main, App, Backbone, Marionette, $, _) {
          
    Main.HeaderSearchView = MyOD.Base.SearchView.extend({ 

      initialize: function () {
        this.listenTo(this.model, 'change:q', this.onQueryChanged);
      },

      el: '#header-search-container',

      template: false,

      events: {
        'keydown #header-search': 'onKeyDown',
        'keyup #header-search': 'onKeyUp',
        'click #header-search-btn': 'onSearchButtonClick',
        'typeahead:selected input': 'onTypeaheadSelected'
      },

      ui: {
        search: '#header-search'
      },

      onQueryChanged: function () {
        this.ui.search.typeahead('val', this.model.get('q'));
      }

    });

  });

})();
