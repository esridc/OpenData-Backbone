(function () {
    
  'use strict';

  // namespace the esri stuff - there's prolly a better way to do this...
  var esri = {};

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
      _loadDojo: function() {
        var dfd = $.Deferred();
        this.dojoReady = dfd.promise();
        //check if dojo is loaded...
        if( !window.dojo ){
          //if not, inject a script tag, and then require in things
          include('//js.arcgis.com/4.0beta1/', function(){
            //now that require is present, load in the other things we need
            require([
              'esri/Map',
              'esri/views/MapView',
              'esri/layers/FeatureLayer',
              'esri/widgets/PopupTemplate',
              'esri/geometry/SpatialReference',
              'esri/geometry/Extent',
              'esri/renderers/SimpleRenderer',
              'dojo/domReady!'
            ], function(Map, MapView, FeatureLayer, PopupTemplate, SpatialReference, Extent, SimpleRenderer) {
              esri.Map = Map;
              esri.MapView = MapView;
              esri.FeatureLayer = FeatureLayer;
              esri.PopupTemplate = PopupTemplate;
              esri.SpatialReference = SpatialReference;
              esri.Extent = Extent;
              esri.SimpleRenderer = SimpleRenderer;
              //, MapView, FeatureLayer, PopupTemplate, SpatialReference, Extent, SimpleRenderer
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
        var mapOpts = {
          basemap: 'dark-gray'
        };

        this.map = new esri.Map(mapOpts);

        var $mapDiv = $('#map');

        var mapViewOpts = {
          container: 'map',  //reference to the DOM node that will contain the view
          map: this.map,  //references the map object created in step 3
          height: $mapDiv.height(),
          width: $mapDiv.width()
        };

        var extent;
        if (options.coords) {
          extent = new esri.Extent(options.coords[0][0], options.coords[0][1], options.coords[1][0], options.coords[1][1], new esri.SpatialReference({ wkid: 4326 }));
        }

        if (extent) {
          mapViewOpts.extent = extent;
        } else {
          mapViewOpts.center = [ -56.049, 38.485 ];
          mapViewOpts.zoom = 3;
        }

        this.mapView = new esri.MapView(mapViewOpts);

        //proxy events
        this.map.on('load', dojo.hitch(this, this.proxyEvent, 'map:load'));
        this.map.on('extent-change', dojo.hitch(this, this.proxyEvent, 'map:extent-change'));
        this.map.on('layer-add', dojo.hitch(this, this.proxyEvent, 'map:layer-add'));
      },

      getDatasetInfoTemplate: function (dataset) {
        var displayFieldName = dataset.get('displayField');
        var title = displayFieldName ? '{' + displayFieldName + '}' : 'Attributes';
        return new esri.PopupTemplate({ title: title, description: '{*}' });
      },

      getDatasetLayerOpts: function (dataset) {
        var opts = {
          minScale: 0,
          maxScale: 0,
          outFields: ['*'],
          popupTemplate: this.getDatasetInfoTemplate(dataset),
          renderer: this.getRenderer(dataset)
        };
        
        return opts;
      },

      addDataset: function (dataset) {
        var opts = this.getDatasetLayerOpts(dataset);
        this.datasetLayer = new esri.FeatureLayer(dataset.get('url'), opts);

        //proxy events
        this.datasetLayer.on('load', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:load'));
        this.datasetLayer.on('click', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:click'));
        this.datasetLayer.on('query-limit-exceeded', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:query-limit-exceeded'));
        this.datasetLayer.on('update-end', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:update-end'));

        this.map.add(this.datasetLayer);
      },

      /**
       * Append in default layer styling by adding/updateing 
       * layerOptions.layerDefinition.drawingInfo and setting it's properties
       * as though it was set from webmap.
       * @param {Object} layerOptions Json hash of layer properties. Either from a webmap
       * or constructed for a layer in a feature service
       */
      getRenderer: function(dataset){
          var geometryType = dataset.get('geometryType');
          var renderer;

          switch (geometryType){
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
          return new esri.SimpleRenderer(rendererJson);
      }

      
    });

  });
})();
