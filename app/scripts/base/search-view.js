
(function () {

  'use strict';
    
  MyOD.module('Base', function (Base, App, Backbone, Marionette, $, _) {

    Base.SearchView = Marionette.ItemView.extend({ 

      onRender: function(){
        this.initTypeahead();
      },

      initTypeahead: function () {
        var self = this;

        var opts = {
          highlight: true,
          minLength: 3,
          hint: false
        };

        //by putting it on app instead of this base view, we can share one instance throughout the app
        //instead of having one instance per view that needs one
        var bloodhound = App.getBloodhound();
        bloodhound.initialize();

        var datasets = {
          name: 'datasets',
          displayKey: function(item) {
            return item;
          },
          templates: {
            empty: ''
          },
          source: bloodhound.ttAdapter()
        };

        this.ui.search.typeahead(opts, datasets);
      },

      onTypeaheadSelected: function (e) {
        //clicking a selection with the mouse should initiate a search  
        this.model.set({
          q: this.ui.search.typeahead('val'),
          page: 1
        });

        this.search();
      },

      updateModel: function () {
        var q = this.ui.search.typeahead('val');
        this.model.set({
          q: q,
          page: 1
        });
      },

      onKeyDown:function(e){
        if (e.which === 13) {
          e.preventDefault();

          this.ui.search.typeahead('close');

          this.updateModel();

          this.search();
        }
      },

      onKeyUp: function () {
        this.updateModel();
      },

      onSearchButtonClick: function () {
        this.updateModel();
        this.search();
      },

      search: function () {
        App.search();
      }

    });

  });

})();
