
(function () {

  'use strict';
    
  MyOD.module('Main', function (Main, App, Backbone, Marionette, $, _) {

    Main.Layout = Marionette.LayoutView.extend({
      
      initialize: function () {
        _.bindAll(this, 'setClasses');

        this.listenTo(App.searchModel, 'change:q', this.onQueryChanged);
      },

      el: 'body',

      regions: {
        main: '#main-region'
      },

      events: {
        'keydown #header-search': 'onKeyDown',
        'keyup #header-search': 'onKeyUp',
        'click #header-search-btn': 'search'
      },

      onQueryChanged: function () {
        this.$('#header-search').val(App.searchModel.get('q'));
      },

      onKeyDown:function(e){
        if (e.which === 13) {
          e.preventDefault();

          var q = this.$('#header-search').val();

          App.searchModel.set({
            q: q,
            page: 1
          });

          this.search();
        }
      },

      onKeyUp: function () {
        var q = this.$('#header-search').val();
        App.searchModel.set({
          q: q,
          page: 1
        });
      },

      search: function () {
        App.search();
      },

      setClasses: function () {
        var self = this;
        if (Backbone.history.getFragment().indexOf('datasets') === 0) {
          self.$el.removeClass('page-home');
        } else {
          self.$el.addClass('page-home');
        }
      }

    });

  });

})();
