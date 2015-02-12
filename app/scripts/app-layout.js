
(function () {

  'use strict';
    
  MyOD.module('Main', function (Main, App, Backbone, Marionette, $, _) {

    Main.Layout = Marionette.LayoutView.extend({
      
      initialize: function () {
        _.bindAll(this, 'setClasses');
        this.headerSearchView = new Main.HeaderSearchView({ model: App.searchModel }).render();
      },

      el: 'body',

      regions: {
        main: '#main-region'
      },

      events: {
        'click #home-link': 'navigateHome'
      },

      navigateHome: function (e) {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          App.navigate('', { trigger: true });
        }
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
