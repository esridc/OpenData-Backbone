
(function () {

  'use strict';
    
  MyOD.module('DatasetsModule', function (DatasetsModule, App, Backbone, Marionette, $, _) {
          
    DatasetsModule.View = Marionette.ItemView.extend({

      initialize: function (options) {
        _.bindAll(this, 'changeAttribute', 'changeRamp');
        this.mapManager = options.mapManager;
      },

      template: JST['datasets/templates/dataset'],

      id: 'page-dataset',

      ui: {
        'mapDiv': '#map',
        'tableContainer': '#table-container'
      },

      modelEvents: {
        'change': 'render'
      },

      templateHelpers: function () {
        var baseUrl = this.model.url().replace(/.json$/, '');
        return {
          baseUrl: baseUrl 
        };
      },

      onRender: function () {
        //TODO: refactor to use regions...
        this.tableView = new DatasetsModule.TableView({ el: this.ui.tableContainer, model: this.model }).render();
      },

      // onShow: function () {
      //   console.debug('onShow');
      // },

      onDomRefresh: function () {
        if (this.model.get('layer_type').toLowerCase() !== 'table') {
          var self = this;
          // TODO: would be nice to encapsulate this in mapmanager so consumers wouldn't have to know to do it
          this.ui.mapDiv.show();
          this.mapManager.dojoReady.done(function () {
            self.mapManager.createMap('map', { coords: self.model.get('extent').coordinates });
            self.mapManager.addDataset(self.model);

            self.initSmaps();
          });
        }
      },

      initSmaps: function (basemap) {
        var numerics = this.model.getNumericFields();

        if (numerics.length){

          // select the first attr to map 
          // we could put some logic around which to use here
          this.fieldName = this.fieldName || numerics[0].name;
          
          //get stats for selected attribute
          var fields = this.model.get('fields');
          this.stats = this.getStats(fields, this.fieldName);
          this.type = this.getGeometryType(this.model.get('geometry_type'));


          var yukiOptions = {
            fields: numerics,
            field: this.fieldName,
            statistics: this.stats,
            type: this.type,
            schemes: this.getSchemes()
          };

          if (!this.yuki) {
            this.yuki = new Yuki('smaps', yukiOptions);
          } else {
            $('#yuki-viz-tools').remove();
            this.yuki = new Yuki('smaps', yukiOptions);
          }

          // EVENT Handlers from yuki
          this.yuki.on('change', this.changeAttribute);
          this.yuki.on('ramp-change', this.changeRamp);

          this._execStyleMap();
        }

      },

      getStats: function (fields, fieldName) {
        var fieldObj = _.findWhere(fields, { name: fieldName });
        return fieldObj ? fieldObj.statistics : null;
      },

      getGeometryType: function (geomType) {
        switch (geomType) {
          case 'esriGeometryPoint':
          case 'esriGeometryMultipoint':
            return 'point';
          case 'esriGeometryPolyline':
            return 'line';
          case 'esriGeometryPolygon':
            return 'polygon';
          default:
            return geomType.toLowerCase();
        }
      },

      getSchemes: function (){
        var theme, styleType, self = this;
        switch (this.type){
          case 'point':
            theme = 'default';
            styleType = 'size';
            break;
          case 'polygon':
            theme = 'high-to-low';
            styleType = 'choropleth';
            break;
        }

        //TODO: move this into mapmanager
        return esri.styles[styleType].getSchemes({
          theme: theme, 
          basemap: 'dark-gray', 
          geometryType: self.type
        });
      },

      // handler for attr change 
      changeAttribute: function (fieldName) {
        //update stats for selected attribute
        var fields = this.model.get('fields');
        this.stats = this.getStats(fields, fieldName);
        this.fieldName = fieldName;

        this._execStyleMap(this.selectedScheme);
      },

      // handler for ramp UI change
      changeRamp: function (index) {
        this.selectedScheme = this.getSchemes().secondarySchemes[index];
        this._execStyleMap(this.selectedScheme);
      },

      //update the map in mapmanager
      _execStyleMap: function (scheme) {
        var self = this;

        var opts = {
          field: this.fieldName,
          basemap: 'dark-gray',
          statistics: this.stats,
          type: this.type
        };
      
        if (scheme){
          opts.scheme = scheme;
        }
        
        var foo = App.reqres.request('smaps:update:style', opts)
          .done(function(renderer){
            if (self.type === 'point'){
              self.yuki.buildPointLegend(renderer.breaks);
            }
          });
      },

      onDestroy: function () {
        this.mapManager.destroy();
        this.tableView.destroy();
      }
      
    });

  });

})();
