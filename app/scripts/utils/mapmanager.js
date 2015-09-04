(function () {
    
  'use strict';

  MyOD.module('Utils', function (Utils, App, Backbone, Marionette, $, _) {

    Utils.MapManager = Marionette.Object.extend({
      
      initialize: function () {
        this.globalChannel = Backbone.Wreqr.radio.channel('global');
        //load dojo and start the map
        this._loadDojo();
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
          include('//js.arcgis.com/3.14compact/init.js', function(){
            //now that require is present, load in the other things we need
            require(['esri/map', 'esri/layers/FeatureLayer', 'dojo/domReady!'], function(Map) {
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
            opts.map.setExtent(extent, true);
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
        return opts;
      },

      addDataset: function (dataset) {
        var opts = this.getDatasetLayerOpts(dataset);
        this.datasetLayer = new esri.layers.FeatureLayer(dataset.get('url'), opts);
        //apply default renderer
        this.datasetLayer.setRenderer(this._getRenderer(opts));

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

      /**
       * Append in default layer styling by adding/updateing 
       * layerOptions.layerDefinition.drawingInfo and setting it's properties
       * as though it was set from webmap.
       * @param {Object} layerOptions Json hash of layer properties. Either from a webmap
       * or constructed for a layer in a feature service
       */
      _getRenderer: function(layerOptions){
          var renderer;

          switch (layerOptions.geometryType){
              case 'esriGeometryPolygon':
                  renderer = this._createRendererFromJson(util.defaults.defaultPolygonRenderer);
                  break;
              case 'esriGeometryPoint':
                  renderer = this._createRendererFromJson(util.defaults.defaultPointRenderer);
                  break;
              case 'esriGeometryMultipoint':
                  renderer = this._createRendererFromJson(util.defaults.defaultPointRenderer);
                  break;
              case 'esriGeometryPolyline':
                  renderer = this._createRendererFromJson(util.defaults.defaultLineRenderer);
                  break;
              case 'esriGeometryLine':
                  renderer = this._createRendererFromJson(util.defaults.defaultLineRenderer);
                  break;
              default: 
                  renderer = this._createRendererFromJson(util.defaults.defaultPolygonRenderer);
          }

          return renderer;
      },

      _createRendererFromJson: function(rendererJson){
          return new esri.renderer.SimpleRenderer(rendererJson);
      }

      
    });

  });
})();
