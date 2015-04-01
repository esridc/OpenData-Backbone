
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
        'click ul.pagination li a': 'onPageClicked',
        'click thead th': 'sort'
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

        //defaults - this is what will be rendered if the dataset does not support pagination
        var obj = {
          firstPage: '',
          lastPage: '',
          prevPage: 0,
          nextPage: 0,
          pages: [],
          showPagination: false,
          from: 1,
          to: this.collection.perPage,
          total: this.model.get('record_count'),
          sortField: this.collection.orderBy,
          sortClass: this.collection.orderByAsc ? 'sort_asc' : 'sort_desc',
          sortIconClass: this.collection.orderByAsc ? 'glyphicon-chevron-down' : 'glyphicon-chevron-up',
        };

        if (this.collection.supportsPagination) {
          var totalPages = Math.ceil(this.model.get('record_count') / this.collection.perPage);
          //zero based page index
          var page = this.collection.page;

          //don't show more than 10 pages in paginator?
          var start = (totalPages > 10 && page > 6) ? page - 5 : 1;
          var end = (totalPages > start + 9) ? start + 9 : totalPages;

          var active, pages = [];
          for (var i = start; i <= end; i++) {
            active = (i === page + 1) ? 'active' : '';
            pages.push({ page: i, active: active });
          }

          var total = this.model.get('record_count');
          var from = page * this.collection.perPage + 1;
          var to = page * this.collection.perPage + this.collection.perPage;
          to = (to <= total) ? to : total;

          obj = {
            firstPage: (page === 0) ? 'disabled' : '',
            lastPage: (totalPages === page + 1) ? 'disabled' : '',
            prevPage: page,
            nextPage: page + 2,
            pages: pages,
            showPagination: true,
            from: from,
            to: to,
            total: total,
            sortField: this.collection.orderBy,
            sortClass: this.collection.orderByAsc ? 'sort_asc' : 'sort_desc',
            sortIconClass: this.collection.orderByAsc ? 'glyphicon-chevron-down' : 'glyphicon-chevron-up',
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
      },

      sort: function (e) {
        var orderBy = $(e.target).data('fieldName');
        if (orderBy) {
          if (orderBy === this.collection.orderBy) {
            this.collection.orderByAsc = !this.collection.orderByAsc;
          } else {
            this.collection.orderByAsc = true;
          }
          this.collection.page = 0;
          this.collection.orderBy = orderBy;
          this.collection.fetch({ reset: true });
        }
      }
      
    });

  });

})();
