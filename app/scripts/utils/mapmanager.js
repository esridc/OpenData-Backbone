(function () {
    
  'use strict';

  MyOD.module('Utils', function (Utils, App, Backbone, Marionette, $, _) {

    Utils.MapManager = Marionette.Object.extend({
      
      initialize: function () {
        _.bindAll(this, 'updateStyle');

        this.globalChannel = Backbone.Wreqr.radio.channel('global');
        //load dojo and start the map
        this._loadDojo();
        App.reqres.setHandler('smaps:update:style', this.updateStyle);

      },

      /**
       * load dojo, resolve a promise when it's ready to roll
       */
      _loadDojo: function(){
        var dfd = $.Deferred();
        this.dojoReady = dfd.promise();
        //check if dojo is loaded...
        if( !window.dojo ){
          //if not, inject a script tag, and then require in things
          include('//js.arcgis.com/3.13compact/init.js', function(){
            //now that require is present, load in the other things we need
            require(['esri/map', 'esri/layers/FeatureLayer', 'plugins/smartMapping', 'dojo/domReady!'], function(Map) {
              dfd.resolve();
            });
          }); 

        }else{
          //it's loaded
          dfd.resolve();
        }
      },


      onBeforeDestroy: function () {
        if (this.map) {
          this.map.destroy();
        }
      },

      proxyEvent: function (evtName, evt) {
        this.globalChannel.vent.trigger(evtName, evt);
        //OR (if everything that will listen has a reference to this)
        //this.trigger(evtName, evt);
      },

      createMap: function (mapDiv, options) {
        var self = this;
        var mapOpts = {
          center: [ -56.049, 38.485 ],
          zoom: 3,
          basemap: 'dark-gray',
          smartNavigation:false,
          navigationMode: 'css-transforms',
          fitExtent:true,
          minZoom: 2,
          wrapAround180:true
        };

        this.map = new esri.Map(mapDiv, mapOpts);
        
       
        var onLoad = function(opts){
            opts.map.disableScrollWheelZoom();
            if (options.coords) {
              var extent = new esri.geometry.Extent(options.coords[0][0], options.coords[0][1], options.coords[1][0], options.coords[1][1], new esri.SpatialReference({ wkid: 4326 }));
              opts.map.setExtent(extent);
            }
            self.proxyEvent('map:load');
        };

        //proxy events
        this.map.on('load', dojo.hitch(this, onLoad));
        this.map.on('extent-change', dojo.hitch(this, this.proxyEvent, 'map:extent-change'));
        this.map.on('layer-add', dojo.hitch(this, this.proxyEvent, 'map:layer-add'));
      },




      getDatasetInfoTemplate: function (dataset) {
        //var datasetName = dataset.get('name');
        var displayFieldName = dataset.get('display_field');
        var title = displayFieldName ? '${' + displayFieldName + '}' : 'Attributes';
        return new esri.InfoTemplate(title, '${*}');
      },

      getDatasetLayerOpts: function (dataset) {
        var opts = 
         { 
          mode: esri.layers.FeatureLayer.MODE_AUTO,
          outFields: '*',
          infoTemplate: this.getDatasetInfoTemplate(dataset),
          geometryType: dataset.get('geometry_type')
        };
        //add the default symbol
        this._addDefaultSymbols(opts);
        return opts;
      },

      addDataset: function (dataset) {
        var opts = this.getDatasetLayerOpts(dataset);
        this.datasetLayer = new esri.layers.FeatureLayer(dataset.get('url'), opts);
        //apply default renderer
        if(opts.layerDefinition && opts.layerDefinition.drawingInfo){
          //apply renderers
          this.datasetLayer.setRenderer(this._createRendererFromJson(opts.layerDefinition.drawingInfo.renderer));
        }

        this.datasetLayer.on('load', this.onLoadDataset);

        //proxy events
        this.datasetLayer.on('load', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:load'));
        this.datasetLayer.on('click', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:click'));
        this.datasetLayer.on('query-limit-exceeded', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:query-limit-exceeded'));
        this.datasetLayer.on('update-end', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:update-end'));

        this.map.addLayer(this.datasetLayer);


      },

      onLoadDataset: function (evt) {
        //squash scale ranges - we need the layer to draw at all scales
        evt.layer.minScale = 0; 
        evt.layer.maxScale = 0;
      },

      updateStyle: function (opts) {
        var dfd = $.Deferred();

        var layer = opts.layer = this.datasetLayer;

        var _applyRenderer = function(smap){
          layer.setRenderer(smap.renderer);

          //check if refresh needed, else redraw
          if ( layer.graphics && layer.graphics.length ) {
            if (layer.graphics[0].attributes[ opts.field ]) {
              layer.redraw();
            } else {
              layer.refresh();
            }
          }

          dfd.resolve(smap.renderer);
        };

          
        if (opts.type === 'polygon'){
          esri.renderer.smartMapping.createClassedColorRenderer(opts)
            .then(function(renderer){
              _applyRenderer( renderer );
            });
        } else if (opts.type === 'point' && !opts.heatmap){
          esri.renderer.smartMapping.createClassedSizeRenderer(opts)
            .then(function(renderer){
              _applyRenderer( renderer );
            });
        } else if (opts.type === 'point' && opts.heatmap) {
          esri.renderer.smartMapping.createHeatmapRenderer(opts)
            .then(function(renderer){
              _applyRenderer( renderer );
            });
        }

        return dfd.promise();
      },

      /**
       * Append in default layer styling by adding/updateing 
       * layerOptions.layerDefinition.drawingInfo and setting it's properties
       * as though it was set from webmap.
       * @param {Object} layerOptions Json hash of layer properties. Either from a webmap
       * or constructed for a layer in a feature service
       */
      _addDefaultSymbols: function(layerOptions){
          //add the layerDefinition node
          if(!layerOptions.layerDefinition){
              layerOptions.layerDefinition = {};
              layerOptions.layerDefinition.drawingInfo = {};
          }
          if(!layerOptions.layerDefinition.drawingInfo){
              layerOptions.layerDefinition.drawingInfo = {};
          }

          //depending on the type, load in the default renderer as json
          switch (layerOptions.geometryType){
              case 'esriGeometryPolygon':
                  layerOptions.layerDefinition.drawingInfo.renderer = util.defaults.defaultPolygonRenderer;
                  break;
              case 'esriGeometryPoint':
                  layerOptions.layerDefinition.drawingInfo.renderer = util.defaults.defaultPointRenderer;
                  break;
              case 'esriGeometryMultipoint':
                  layerOptions.layerDefinition.drawingInfo.renderer = util.defaults.defaultPointRenderer;
                  break;
              case 'esriGeometryPolyline':
                  layerOptions.layerDefinition.drawingInfo.renderer = util.defaults.defaultLineRenderer;
                  break;
              case 'esriGeometryLine':
                  layerOptions.layerDefinition.drawingInfo.renderer = util.defaults.defaultLineRenderer;
                  break;
              default: 
                  layerOptions.layerDefinition.drawingInfo.renderer = util.defaults.defaultPolygonRenderer;
          }
          return layerOptions;
      },

      _createRendererFromJson: function(rendererJson){
          var renderer;
          switch (rendererJson.type){
              case 'simple':
                  //create the default symbol
                  renderer = new esri.renderer.SimpleRenderer(rendererJson);
                  break;
              case 'classBreaks':
                  renderer = new esri.renderer.ClassBreaksRenderer(rendererJson);
                  break;
          }
          return renderer;
      }

      
    });

  });
})();