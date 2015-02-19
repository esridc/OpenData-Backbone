
(function () {

  'use strict';
    
  MyOD.module('Models', function (Models, App, Backbone, Marionette, $, _) {
          
    Models.RowCollection = Backbone.Collection.extend({

      initialize: function (attributes, options) {
        this.dataset = options.dataset;
        
        var queryCapabilities = this.dataset.get('advanced_query_capabilities');
        //TODO: this is wrong - it should be supports_pagination but they changed the api!
        this.supportsPagination = queryCapabilities && queryCapabilities.supportsPagination;
        this.perPage = 10;
        this.page = 0;
        
        if (queryCapabilities && !_.isUndefined(queryCapabilities.supports_pagination)) { 
          window.alert('The API has been fixed. Time to update /entities/row-collection.js!');
        }
      },

      model: Models.DatasetRow,

      getQueryUrl: function () {
        //TODO: add paging stuff here for services that support it
        //NOTE: for services that do not support pagination, we just fetch maxRecordCount - no paging

        var url = this.dataset.get('url');
        url += '/query?where=1%3D1&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&f=pjson';

        if (this.supportsPagination) {
          //Note that when you pass in one of these two parameters and orderByFields is left empty, 
          //map service uses the object-id field to sort the result. 
          //For a query layer with a pseudo column as the object-id field (e.g., FID), 
          //you must provideorderByFields; otherwise the query fails
          url += '&resultOffset=' + this.page * this.perPage;
          url += '&resultRecordCount=' + this.perPage;
        }

        return url;
      },

      url: function () {
        return this.getQueryUrl();
      },

      parse: function (resp) {
        // this.fields = resp.fields;
        // this.fieldAliases = resp.fieldAliases;
        return resp.features;
      }

    });

  });

})();
