
(function () {

  'use strict';
    
  MyOD.module('Base', function (Base, App, Backbone, Marionette, $, _) {
          
    /**
     * Home controller for the main page of the application
     */
    Base.SearchView = Marionette.ItemView.extend({ 

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
        App.search();
      }

    });

  });

})();
