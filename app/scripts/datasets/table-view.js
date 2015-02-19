
(function () {

  'use strict';
    
  MyOD.module('DatasetsModule', function (DatasetsModule, App, Backbone, Marionette, $, _) {
         
    DatasetsModule.TableRowView = Marionette.ItemView.extend({ 

      initialize: function (options) {
        this.dataset = options.dataset;
        this.fields = this.dataset.get('fields');
      },

      template: JST['datasets/templates/table-row'],

      templateHelpers: function () {
        var self = this;
        return {
          fields: self.fields
        };
      },

      model: MyOD.Models.DatasetRow,

      tagName: 'tr'

    });

    DatasetsModule.TableView = Marionette.CompositeView.extend({

      initialize: function (options) {
        this.collection = new App.Models.RowCollection([], { dataset: this.model });
        this.collection.fetch();
      },

      events: {
        'click ul.pagination li a': 'onPageClicked'
      },

      collectionEvents: {
        //we need the pagination to re-render
        'reset': 'render'
      },

      template: JST['datasets/templates/table'],

      childView: DatasetsModule.TableRowView,

      childViewOptions: function () {
        var dataset = this.model;
        return {
          dataset: dataset
        };
      },

      templateHelpers: function () {

        var obj = {
          firstPage: '',
          lastPage: '',
          prevPage: 0,
          nextPage: 0,
          pages: [],
          showPagination: false
        };

        if (this.collection.supportsPagination) {
          //NOTE: quick and dirty first stab, not sure this is right

          var totalPages = Math.ceil(this.model.get('record_count') / this.collection.perPage);
          var page = this.collection.page;

          //don't show more than 10?
          var start = ( totalPages > 10 && page > 6 ) ? page - 5 : 1;
          var end = ( totalPages > start + 9 ) ? start + 9 : totalPages;

          var active, pages = [];
          for (var i = start; i <= end; i++) {
            active = (i === page + 1) ? 'active' : '';
            pages.push({ page: i, active: active });
          }

          var prevPage = page;
          if (page !== 1) { 
            prevPage = page - 1;
          }
          
          var nextPage = page + 1;
          if (totalPages !== nextPage) {
            nextPage = nextPage + 1;
          }

          obj = {
            firstPage: (page === 0) ? 'disabled' : '',
            lastPage: (totalPages === page + 1) ? 'disabled' : '',
            prevUrl: '',
            nextUrl: '',
            prevPage: prevPage,
            nextPage: nextPage,
            pages: pages,
            showPagination: true
          };
        }

        return obj;
      },

      childViewContainer: 'tbody',

      onPageClicked: function (e) {
        var anchor = $(e.target).closest('a');
        var li = anchor.closest('li');
        if (!li.hasClass('disabled') && !li.hasClass('active')) {
          var page = anchor.data('page') - 1;
          this.collection.page = page;
          this.collection.fetch({ reset: true });
        }
      }
      
    });

  });

})();
