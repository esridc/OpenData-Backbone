
(function () {

  'use strict';
    
  MyOD.module('ResultsModule', function (ResultsModule, App, Backbone, Marionette, $, _) {

    ResultsModule.ItemView = Marionette.ItemView.extend({ 

      template: JST['results/templates/results-item'],

      model: MyOD.Models.DatasetModel,

      tagName: 'tr',

      events: {
        click: 'onClick'
      },

      onClick: function () {
        this.trigger('result:clicked', this.model);
      }

    });

    ResultsModule.View = Marionette.CompositeView.extend({ 

      initialize: function () {
        this.listenTo(this, 'childview:result:clicked', this.selectDataset);
      },

      template: JST['results/templates/results'],

      childView: ResultsModule.ItemView,

      childViewContainer: 'tbody',

      events: {
        'click ul.pagination a': 'onPageClicked'
      },

      modelEvents: {
        'change:total_count': 'render'
      },

      id: 'page-results',

      selectDataset: function (childView, childModel) {
        App.navigate('/datasets/' + childModel.get('id'), { trigger: true });
      },

      onPageClicked: function (e) {
        //allow cmd-click to open in new window
        if(!(e.metaKey || e.ctrlKey)){
          e.stopPropagation();
          e.preventDefault();
          var page = $(e.target).closest('a').data('page');
          //not sure why i was doing it this way...
          //var model = App.searchModel.clone();
          //App.navigate(model.getRoute(false), { trigger: true });
          this.model.set('page', page);
          App.search();
        }
      },

      templateHelpers: function () {
        //serialize the model into what we need for the template
        var info = App.searchModel.toJSON();

        var len = Math.round(info.total_count);
        var page = +info.page;
        var from = (page === 0) ? page + 1 : page;
        var size = info.per_page;
        var total_pages = Math.ceil(len / size);
        var pages = [];
        
        //don't show more than 10?
        var start = ( total_pages > 10 && from > 6 ) ? from - 5 : 1;
        var end = ( total_pages > start + 9 ) ? start + 9 : total_pages;

        // build the pages array
        var searchModel = this.model.clone();
        var active;
        for (var i = start; i <= end; i++) {
          active = (i === from) ? 'active' : '';
          searchModel.set('page', i);
          pages.push({ url: searchModel.getRoute(false), page: i, active: active });
        }

        var prevUrl = this.model.getRoute(false);
        var prevPage = page;
        if (from !== 1) { 
          prevPage = page-1;
          searchModel.set('page', prevPage);
          prevUrl = searchModel.getUrl();
        }
        var nextUrl = this.model.getRoute(false);
        var nextPage = page;
        if (total_pages !== from) {
          nextPage = page + 1;
          searchModel.set('page', nextPage);
          nextUrl = searchModel.getUrl();
        }

        return {
          firstPage: (from === 1) ? 'disabled' : '',
          lastPage: (total_pages === from) ? 'disabled' : '',
          prevUrl: prevUrl,
          nextUrl: nextUrl,
          prevPage: prevPage,
          nextPage: nextPage,
          pages: pages
        };
      }

    });

  });

})();
