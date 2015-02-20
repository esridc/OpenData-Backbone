
(function () {

  'use strict';
    
  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {
          
    Models.RowCollection = Backbone.Collection.extend({

      initialize: function (attributes, options) {
        this.dataset = options.dataset;
        
        var queryCapabilities = this.dataset.get('advanced_query_capabilities');
        //TODO: this is wrong - it should be supports_pagination but they changed the api!
        this.supportsPagination = queryCapabilities && queryCapabilities.supportsPagination;
        
        if (queryCapabilities && !_.isUndefined(queryCapabilities.supports_pagination)) { 
          window.alert('The API has been fixed. Time to update /entities/row-collection.js!');
        }

        this.orderBy = this.dataset.get('object_id_field');
      },

      perPage: 10,

      page: 0,

      orderBy: '',

      orderByAsc: true,

      model: Models.DatasetRow,

      getQueryUrl: function () {
        var url = this.dataset.get('url');
        url += '/query?where=1%3D1&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&f=pjson';

        if (this.supportsPagination) {
          url += '&resultOffset=' + this.page * this.perPage;
          url += '&resultRecordCount=' + this.perPage;
          //NOTE: when you pass in one of the above two parameters and orderByFields is left empty, 
          //map service uses the object-id field to sort the result. 
          //For a query layer with a pseudo column as the object-id field (e.g., FID), 
          //you must provide orderByFields; otherwise the query fails
        }

        var orderBy = this.orderBy;
        if (!this.orderByAsc) {
          orderBy += ' desc';
        }
        //NOTE: this still could fail 
        //if the oid field has changed since it was harvested by open data
        //or it is null (which should not happen...)
        url += '&orderByFields=' + orderBy;

        return url;
      },

      url: function () {
        return this.getQueryUrl();
      },

      parse: function (resp) {
        // this.fields = resp.fields;
        // this.fieldAliases = resp.fieldAliases;
        var rows = resp.features;
        if (!this.supportsPagination) {
          //this is slightly crappy but 
          //for datasets that don't support pagination
          //we just show the first n rows with no pagination
          //even though we got maxRecordCount rows
          rows = _.first(rows, this.perPage);
        }
        return rows;
      }

    });

  });

})();
