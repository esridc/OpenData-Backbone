(function () {
    
  'use strict';

  MyOD.module('Utils', function (Utils, App, Backbone, Marionette, $, _) {

    Utils.MapManager = Marionette.Object.extend({
      
      initialize: function () {
        this.globalChannel = Backbone.Wreqr.radio.channel('global');

        var dfd = $.Deferred();
        this.dojoReady = dfd.promise();
        require(['esri/map', 'esri/layers/FeatureLayer', 'dojo/domReady!'], function(Map) {
          dfd.resolve();
        });
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
          center: [ -56.049, 38.485 ],
          zoom: 3,
          basemap: 'dark-gray'
        };

        this.map = new esri.Map(mapDiv, mapOpts);

        if (options.coords) {
          var extent = new esri.geometry.Extent(options.coords[0][0], options.coords[0][1], options.coords[1][0], options.coords[1][1], new esri.SpatialReference({ wkid: 4326 }));
          this.map.setExtent(extent);
        }

        //proxy events
        this.map.on('load', dojo.hitch(this, this.proxyEvent, 'map:load'));
        this.map.on('extent-change', dojo.hitch(this, this.proxyEvent, 'map:extent-change'));
        this.map.on('layer-add', dojo.hitch(this, this.proxyEvent, 'map:layer-add'));
      },

      addDataset: function (dataset) {
        this.datasetLayer = new esri.layers.FeatureLayer(dataset.get('url'), { mode: esri.layers.FeatureLayer.MODE_AUTO });

        //proxy events
        this.datasetLayer.on('load', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:load'));
        this.datasetLayer.on('click', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:click'));
        this.datasetLayer.on('query-limit-exceeded', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:query-limit-exceeded'));
        this.datasetLayer.on('update-end', dojo.hitch(this, this.proxyEvent, 'map:datasetlayer:update-end'));

        this.map.addLayer(this.datasetLayer);
      }
      
    });

  });
})();