
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

          this.updateModel();

          this.search();
        }
      },

      onKeyUp: function () {
        this.updateModel();
      },

      search: function () {
        App.search();
      }

    });

  });

})();
