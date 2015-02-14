define([
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/declare",
  "dojo/has",
  "dojo/Deferred",
  "dojo/on",
  "dojo/promise/all",
  "dojo/when",
  
  "esri/kernel",
  "esri/config",
  "esri/tasks/query",
  "esri/tasks/StatisticDefinition",
  "esri/tasks/GenerateRendererTask",
  "esri/tasks/UniqueValueDefinition",
  "esri/tasks/ClassBreaksDefinition",
  "esri/tasks/GenerateRendererParameters",
  "esri/tasks/generateRenderer",
  "esri/tasks/GeometryService",
  "esri/tasks/ProjectParameters",
  
  "esri/layers/HeatmapManager",
  "esri/workers/heatmapCalculator",
  
  "esri/graphicsUtils",
  "esri/SpatialReference",
  "esri/geometry/scaleUtils",
  "esri/geometry/mathUtils",
  "esri/geometry/webMercatorUtils",
  "esri/geometry/Point",
  "esri/geometry/Extent"
], 
function(
  lang, array, declare, has, Deferred, on, all, when,
  esriNS, esriConfig, Query, StatDefinition,  GRTask, UVDefinition, CBDefinition, GRParameters, generateRenderer, GeometryService, ProjParams,
  HMManager, HMCalculator,
  graphicsUtils, SR, scaleUtils, mathUtils, webMercUtils, Point, Extent
) {
  
  esriConfig = esriConfig.defaults;
  
  var calcIntensityMatrix = HMCalculator.prototype._calculateIntensityMatrix,
      calcHeatmapStats = HMCalculator.prototype.calculateStats,
      getScreenPoints = HMManager.prototype._getScreenPoints;
  
  ////////////////////
  // Module value
  ////////////////////
  
  var FeatureLayerStatistics = declare(null, {
    
    declaredClass: "esri.plugins.FeatureLayerStatistics",
    
    sampleSize: 500,
    generalizeForScale: 4000 * 100, // scale corresponding to 100 meter resolution.
    mapWidth: 1280,  // pixels - assumed width of map control
    mapHeight: 800,  // pixels - assumed height of map control
    minDistance: 12, // pixels - based on typical marker of size 8px, outline 1px and buffer 2px between points
    minLength: 30,   // pixels - length of a decent looking line
    minSize: 15,     // pixels - minimum size of a polygon that is not obstructed by its outline.
    minPixels: 15,   // pixels
    samplingThreshold: 20000,
    numBins: 10,
    numClasses: 5,
    classificationMethod: "equal-interval",
    geometryServiceUrl: window.location.protocol + "//utility.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer",
    
    // TODO
    // timeout: 10000, // 10 seconds
    
    constructor: function(parameters) {
      lang.mixin(this, parameters);
      
      this._scaleCache = this._sampleCache = null;
      
      this._gsTask = esriConfig.geometryService || new GeometryService(this.geometryServiceUrl);
      
      if (this.layer.loaded) {
        this._createGRTask();
      }
      else {
        // With on.once we don't have to worry about removing the signal.
        on.once(this.layer, "load", lang.hitch(this, this._createGRTask));
      }
    },
    
    destroy: function() {
      // TODO
      // Remove all pending layer load signals
      
      this.layer = this._grTask = this._scaleCache = this._sampleCache = null;
    },
    
    getUniqueValues: function(parameters) {
      var dfd = new Deferred();
      
      // Reject if required parameters are missing.
      if (!parameters || !parameters.field) {
        this._rejectDfd(dfd, "FeatureLayerStatistics.getUniqueValues: 'field' parameter is missing.");
      }
      else {
        // Wait for layer to load.
        this._callAfterLoad(this._findUniqueValues, {
          dfd: dfd,
          params: parameters
        });
      }
      
      return dfd.promise;
    },
    
    getFieldStatistics: function(parameters) {
      var dfd = new Deferred();
      
      // Reject if required parameters are missing.
      if (
        !(
          parameters && 
          parameters.field
        )
      ) {
        this._rejectDfd(dfd, "FeatureLayerStatistics.getFieldStatistics: 'field' parameter is missing.");
      }
      else {
        // Wait for layer to load.
        this._callAfterLoad(this._getFieldStats, {
          dfd: dfd,
          params: parameters
        });
      }
      
      return dfd.promise;
    },
    
    getSpatialStatistics: function(parameters) {
      var dfd = new Deferred();
      
      // Reject if required parameters are missing.
      if (
        !(
          parameters && 
          parameters.features && 
          parameters.features.length
        )
      ) {
        this._rejectDfd(dfd, "FeatureLayerStatistics.getSpatialStatistics: 'features' parameter is missing or it has no features.");
      }
      else {
        // Wait for layer to load.
        this._callAfterLoad(this._spatialStats, {
          dfd: dfd,
          params: parameters
        });
      }
      
      return dfd.promise;
    },
    
    getHeatmapStatistics: function(parameters) {
      var dfd = new Deferred();
      
      // Wait for layer to load.
      this._callAfterLoad(this._getHeatmapStats, {
        dfd: dfd,
        params: parameters
      });
      
      return dfd.promise;
    },
    
    getHistogram: function (parameters) {
      var dfd = new Deferred();
      
      // Reject if required parameters are missing.
      if (
        !(
          parameters && 
          parameters.field
        )
      ) {
        this._rejectDfd(dfd, "FeatureLayerStatistics.getHistogram: 'field' parameter is missing.");
      }
      else {
        // Wait for layer to load.
        this._callAfterLoad(this._getHistogram, {
          dfd: dfd,
          params: parameters
        });
      }
      
      return dfd.promise;
    },
    
    getSampleFeatures: function(parameters) {
      var dfd = new Deferred();

      // Wait for layer to load.
      this._callAfterLoad(this._sampleFeatures, {
        dfd: dfd,
        params: parameters
      });
      
      return dfd.promise;
    },
    
    getSuggestedScaleRange: function(parameters) {
      var dfd = new Deferred();

      // Wait for layer to load.
      this._callAfterLoad(this._getScaleRange, {
        dfd: dfd,
        params: parameters
      });

      return dfd.promise;
    },
    
    getSuggestedViewInfo: function(parameters) {
      var dfd = new Deferred();

      // Wait for layer to load.
      this._callAfterLoad(this._getViewInfo, {
        dfd: dfd,
        params: parameters
      });

      return dfd.promise;
    },
    
    getClassBreaks: function(parameters) {
      var dfd = new Deferred();

      // Reject if required parameters are missing.
      if (
        !(
          parameters && 
          parameters.field
        )
      ) {
        this._rejectDfd(dfd, "FeatureLayerStatistics.getClassBreaks: 'field' parameter is missing.");
      }
      else {
        // Wait for layer to load.
        this._callAfterLoad(this._findClassBreaks, {
          dfd: dfd,
          params: parameters
        });
      }
      
      return dfd.promise;
    },
    
    ////////////////////
    // Internal methods
    ////////////////////
    
    _srcQuery: "service-query",
    _srcGenRend: "service-generate-renderer",
    _srcMemory: "features-in-memory",
    _log10e: Math.LOG10E,

    // Matches a number
    _reNumber: /\s*(\+|-)?((\d+(\.\d+)?)|(\.\d+))\s*/gi,
    
    ////////////////////
    // Field statistics
    ////////////////////
    
    _getFieldStats: function(info) {
      var self = this,
          params = info.params,
          fieldInfo = this.layer.getField(params.field);
      
      if (this._rejectNonNumeric(info.dfd, fieldInfo, "getFieldStatistics")) {
        return;
      }
      
      var primaryAttempt = (params.normalizationType)
        // Extract approx stats using generate renderer.
        // outStatistics does not support normalization.
        ? this._statsFromGenRend(params)

        // Use outStatistics query.
        : this._statsFromQuery(params);

      primaryAttempt
        .then(function(stats) {
          info.dfd.resolve(stats);
        })
        
        .otherwise(function(error) {
          self._statsFromMemory(params)
              .then(function(stats) {
                info.dfd.resolve(stats);
              })
              
              .otherwise(function(error) {
                self._rejectDfd(info.dfd, "FeatureLayerStatistics.getFieldStatistics: unable to calculate field statistics.");
              });
        });
    },
    
    _statsFromQuery: function(params) {
      var layer = this.layer, dfd = new Deferred();
      
      if (layer.url && layer.supportsStatistics) {
        var query = new Query(), 
            self = this,
            types = [ "min", "max", "avg", "stddev", "count", "sum", "var" ];
        
        query.outStatistics = array.map(types,  function(type){
          var def = new StatDefinition();
          
          def.statisticType = type;
          def.onStatisticField = params.field;
          def.outStatisticFieldName = (type === "var") ? "variance" : type;
          
          return def;
        });
        
        layer
          .queryFeatures(query)
          .then(function(featureSet){
            var features = featureSet && featureSet.features,
                statsAttrs = features && features[0] && features[0].attributes,
                type, stats = {
                  source: self._srcQuery
                };
            
            for (type in statsAttrs) {
              stats[type.toLowerCase()] = statsAttrs[type];
            }
            
            dfd.resolve(stats);
          })
          
          .otherwise(function(error) {
            self._rejectDfd(dfd, "FeatureLayerStatistics: Statistics query operation failed.");
          });
      }
      else {
        this._rejectDfd(dfd, "FeatureLayerStatistics: Statistics query requires a layer that supports statistics.");
      }
      
      return dfd.promise;
    },
    
    _statsFromMemory: function(params) {
      // TODO
      // Support normalizationType and normalizationField.
      var layer = this.layer, dfd = new Deferred(),
          fieldName = params.field,
          attr, dataValue, values = [];
      
      // Extract non-null values first
      array.forEach(layer.graphics, function(graphic) {
        attr = graphic.attributes;
        dataValue = attr && attr[fieldName];
        
        // Exclude features with no data.
        // This matches ArcGIS server's statistics query behavior.
        if (dataValue != null) {
          values.push(dataValue);
        }
      });
      
      var stats = this._calcStatistics(values);
      stats.source = this._srcMemory;
      
      dfd.resolve(stats);
      
      return dfd.promise;
    },
    
    _calcStatistics: function(values) {
      var min = Infinity, max = -Infinity, count = 0, 
          
          // The following stats should be null if there are no values.
          sum = null, avg = null, stddev = null, variance = null;

      // Calcaulate statistics
      array.forEach(values, function(value) {
        count++; 
        
        sum += value;
        
        if (value < min) {
          min = value;
        }
        
        if (value > max) {
          max = value;
        }
      });
      
      // Calculate standard deviation.
      if (count) {
        avg = sum / count;
        
        var diffSquared = 0;
        
        array.forEach(values, function(value) {
          diffSquared += Math.pow(value - avg, 2);
        });
        
        variance = (count > 1) ?  (diffSquared / (count - 1)) : 0;
        
        // "Sample" std dev (not "Population" std dev)
        // i.e. divided by "count - 1" (not "count")
        // This matches ArcGIS server's statistics query behavior.
        stddev = Math.sqrt(variance);
      }
      
      return { 
        min:    count ? min : null,
        max:    count ? max : null,
        count:  count,
        sum:    sum,
        avg:    avg,
        stddev: stddev,
        variance: variance
      };
    },
    
    _statsFromGenRend: function(params) {
      var dfd = new Deferred(),
          self = this,
          normType = params.normalizationType,
          normField = params.normalizationField;
      
      this.getClassBreaks({
            field: params.field,
            classificationMethod: "standard-deviation",
            standardDeviationInterval: 0.25,
            normalizationType: normType,
            normalizationField: (normType === "field") ? normField : undefined
          })
          
          .then(function(cbResponse) {
            var brkWithAvg, avg, stddev, range;

            array.some(cbResponse.classBreakInfos, function(brk, idx) {
              if (brk.hasAvg) {
                brkWithAvg = brk;
              }
      
              return !!brkWithAvg;
            });
            
            if (brkWithAvg) {
              range = (brkWithAvg.maxValue - brkWithAvg.minValue);
              
              // Avg and stddev below are approximate values.
              
              avg = brkWithAvg.minValue + (range / 2);
              
              // Multiplication factor is 4 since stddev interval is 0.25.
              // It would be 2 if stddev interval is 0.5.
              stddev = range * 4;
            }
            
            dfd.resolve({
              min: cbResponse.minValue,
              max: cbResponse.maxValue,
              avg: avg,
              stddev: stddev,
              source: self._srcGenRend
            });
          })
          
          .otherwise(function(error) {
            self._rejectDfd(dfd, "FeatureLayerStatistics.getFieldStatistics: unable to calculate class breaks.");
          });
      
      return dfd.promise;
    },
    
    ////////////////////
    // Spatial statistics
    ////////////////////
    
    _spatialStats: function(info) {
      var features = info.params.features,
          geomType = this.layer.geometryType,
          stats = {},
          featureType = {
            point:   geomType === "esriGeometryPoint",
            mPoint:  geomType === "esriGeometryMultipoint",
            line:    geomType === "esriGeometryPolyline",
            polygon: geomType === "esriGeometryPolygon"
          };
    
      // Calculate type specific stats.
      if (featureType.point) {
        stats = this._getPointStats(features);
      }
      else if (featureType.mPoint) {
        stats = this._getPointStats(features, true);
      }
      else if (featureType.line) {
        stats = this._getLineStats(features);
      }
      else if (featureType.polygon) {
        stats = this._getPolygonStats(features);
      }
      // TODO
      // Add multipatch support
      
      // Calculate common stats:
      // Can be null.
      stats.avgXY = this._getAvgXY(features, featureType);
      
      info.dfd.resolve(stats);
    },
    
    _getPointStats: function(features, isMultipoint) {
      // Returns the min/max/average of "distance between a point and its closest point".
      var i, j, len = features.length, pointA, pointB, 
          distance, obj1 = {}, obj2 = {},
          totalMinDistance = 0, totalMaxDistance = 0,
          overallMinDistance = Infinity, overallMaxDistance = -Infinity,
          numMinCalcs = 0, numMaxCalcs = 0,
          minDistance, maxDistance, points = [];
      
      if (isMultipoint) {
        // Features are multipoints:
        // Flatten points within multipoints into a single array.
        for (i = 0; i < len; i++) {
          if (features[i].geometry) {
            points.push.apply(points, features[i].geometry.points);
          }
        }
      }
      else {
        // Features are points.
        points = features;
      }
      
      // points = [ <Graphic> ]
      //  or
      // points = [ [<x>, <y>], ... ]
      
      len = points.length;
      
      for (i = 0; i < len; i++) {
        // Get pointA
        if (isMultipoint) {
          obj1.x = points[i][0];
          obj1.y = points[i][1];
          
          pointA = obj1;
        }
        else {
          pointA = points[i].geometry;
        }
        
        if (!pointA) {
          continue;
        }
        
        minDistance = Infinity;
        maxDistance = -Infinity;
        
        // Find the distance between pointA and its closest point.
        for (j = 0; j < len; j++) {
          // Don't calculate distance between pointA and pointA.
          if (j === i) {
            continue;
          }

          // Get pointB
          if (isMultipoint) {
            obj2.x = points[j][0];
            obj2.y = points[j][1];
            
            pointB = obj2;
          }
          else {
            pointB = points[j].geometry;
          }
          
          if (pointB) {
            distance = mathUtils.getLength(pointA, pointB);
            
            if (distance > 0) {
              // Calculate min distance for pointA.
              if (distance < minDistance) {
                minDistance = distance;
              }
              
              // Calculate overall min distance.
              if (distance < overallMinDistance) {
                overallMinDistance = distance;
              }

              // Calculate max distance for pointA.
              if (distance > maxDistance) {
                maxDistance = distance;
              }
              
              // Calculate overall max distance.
              if (distance > overallMaxDistance) {
                overallMaxDistance = distance;
              }
            }
          }
        }
        
        // Calculate sum of all minDistances.
        if (minDistance !== Infinity) {
          ++numMinCalcs;
          totalMinDistance += minDistance;
        }

        // Calculate sum of all maxDistances.
        if (maxDistance !== -Infinity) {
          ++numMaxCalcs;
          totalMaxDistance += maxDistance;
        }
      }
      
      return {
        minDistance: (overallMinDistance !== Infinity) ? overallMinDistance : null,
        maxDistance: (overallMaxDistance !== -Infinity) ? overallMaxDistance : null,
        
        avgMinDistance: numMinCalcs ? (totalMinDistance / numMinCalcs) : null,
        avgMaxDistance: numMaxCalcs ? (totalMaxDistance / numMaxCalcs) : null
      };
    },
    
    _getLineStats: function(features) {
      // Returns the average approximate-length of the given polylines.
      var i, len = features.length, 
          geom, obj1 = {}, obj2 = {},
          length, minLength = Infinity, maxLength = -Infinity,
          totalLength = 0, numFeatures = 0;
      
      for (i = 0; i < len; i++) {
        geom = features[i].geometry;
        
        if (geom) {
          length = this._getLineLength(geom, obj1, obj2);

          if (length > 0) {
            ++numFeatures;
            totalLength += length;

            // Calculate overall min length.
            if (length < minLength) {
              minLength = length;
            }

            // Calculate overall max length.
            if (length > maxLength) {
              maxLength = length;
            }
          }
        }
      }
      
      return {
        minLength: (minLength !== Infinity) ? minLength : null,
        maxLength: (maxLength !== -Infinity) ? maxLength : null,
        avgLength: numFeatures ? (totalLength / numFeatures) : null
      };
    },
    
    _getLineLength: function(geom, obj1, obj2) {
      // Returns the sum of approximate-length of paths in the given polyline.
      var paths = geom.paths,
          i, len = paths.length,
          points, firstPt, lastPt,
          length, totalLength = 0;
      
      for (i = 0; i < len; i++) {
        points = paths[i];
        
        firstPt = points[0];
        lastPt = points[points.length - 1];
        
        if (firstPt && lastPt) {
          // Calculate approximate length of the path:
          // i.e. distance between the first and last points of the path.
          obj1.x = firstPt[0];
          obj1.y = firstPt[1];

          obj2.x = lastPt[0];
          obj2.y = lastPt[1];

          length = mathUtils.getLength(obj1, obj2);
          
          if (length > 0) {
            totalLength += length;
          }
        }
      }
      
      return totalLength;
    },
    
    _getPolygonStats: function(features) {
      // Returns the average approximate-size of the given polygons.
      var i, len = features.length, 
          size, minSize = Infinity, maxSize = -Infinity,
          totalSize = 0, numFeatures = 0,
          extent;
      
      for (i = 0; i < len; i++) {
        if (features[i].geometry) {
          extent = features[i].geometry.getExtent();
          
          if (extent) {
            // Approximate size
            size = (extent.getWidth() + extent.getHeight()) / 2;
            
            if (size > 0) {
              ++numFeatures;
              totalSize += size;

              // Calculate overall min size.
              if (size < minSize) {
                minSize = size;
              }
  
              // Calculate overall max size.
              if (size > maxSize) {
                maxSize = size;
              }
            }
          }
        }
      }
      
      return {
        minSize: (minSize !== Infinity) ? minSize : null,
        maxSize: (maxSize !== -Infinity) ? maxSize : null,
        avgSize: numFeatures ? (totalSize / numFeatures) : null
      };
    },
    
    _getAvgXY: function(features, featureType) {
      var i, j, k, len = features.length, lenS, lenP, geom,
          points, paths, rings,
          totalX = null, totalY = null,
          numPoints = 0, avgLocation;
      
      for (i = 0; i < len; i++) {
        geom = features[i].geometry;
        
        if (geom) {
          // Calculate sum of all x and y coordinates
          if (featureType.point) {
            ++numPoints;
            totalX += geom.x;
            totalY += geom.y;
          }
          else if (featureType.mPoint) {
            points = geom.points;
            lenP = points.length;
            
            for (j = 0; j < lenP; j++) {
              ++numPoints;
              totalX += points[j][0];
              totalY += points[j][1];
            }
          }
          else if (featureType.line) {
            paths = geom.paths;
            lenS = paths.length;
            
            for (j = 0; j < lenS; j++) {
              points = paths[j];
              lenP = points.length;
              
              for (k = 0; k < lenP; k++) {
                ++numPoints;
                totalX += points[k][0];
                totalY += points[k][1];
              }
            }
          }
          else if (featureType.polygon) {
            rings = geom.rings;
            lenS = rings.length;
            
            for (j = 0; j < lenS; j++) {
              points = rings[j];
              lenP = points.length;
              
              for (k = 0; k < lenP; k++) {
                ++numPoints;
                totalX += points[k][0];
                totalY += points[k][1];
              }
            }
          }
        }
      }
      
      // Calculate average x and y
      if (totalX != null && totalY != null) {
        avgLocation = {
          x: totalX / numPoints,
          y: totalY / numPoints
        };
      }
      
      return avgLocation;
    },
    
    ////////////////////
    // Heatmap statistics
    ////////////////////
    
    _getHeatmapStats: function(info) {
      var self = this,
          params = info.params,
          
          // field is optional
          fieldInfo = params.field && this.layer.getField(params.field);
      
      if (params.field && this._rejectNonNumeric(info.dfd, fieldInfo, "getHeatmapStatistics")) {
        return;
      }
      
      this._heatStatsFromMemory(params)
          .then(function(stats) {
            info.dfd.resolve(stats);
          })
          
          .otherwise(function(error) {
            self._rejectDfd(info.dfd, "FeatureLayerStatistics.getHeatmapStatistics: unable to calculate heatmap statistics.");
          });
    },
    
    _heatStatsFromMemory: function(params) {
      var dfd = new Deferred(),
          blurRadius = params.blurRadius || 10,
          layer = this.layer,
          map = layer.getMap(),
          
          // renderer = layer.renderer,
          // heatmapManager = layer._heatmapManager,
          // heatmapCalculator = heatmapManager && heatmapManager._calculator,
          heatStats;
      
      if (
        map /*&& 
        renderer && 
        renderer.setMinPixelIntensity && 
        heatmapCalculator*/
      ) {
        var intensityInfo = calcIntensityMatrix(
          getScreenPoints(layer.graphics, map, layer), 
          map.width, 
          map.height, 
          blurRadius,
          params.field
        );
        
        heatStats = intensityInfo && 
          intensityInfo.matrix && 
          calcHeatmapStats.call({}, 1, intensityInfo.matrix);
      }

      if (heatStats) {
        dfd.resolve({ 
          min:    heatStats.min,
          max:    heatStats.max,
          avg:    heatStats.mean,
          stddev: heatStats.stdDev,
          source: this._srcMemory
        });
      }
      else {
        // TODO
        // Add more info in the error message about some errors
        this._rejectDfd(dfd, "FeatureLayerStatistics.getHeatmapStatistics: unable to calculate heatmap statistics.");
      }
      
      return dfd.promise;
    },
    
    ////////////////////
    // Histogram
    ////////////////////
    
    _getHistogram: function(info) {
      var self = this,
          params = info.params,
          customMin = params.minValue,
          customMax = params.maxValue,
          hasCustomMinMax = (customMin != null && customMax != null),
          fieldInfo = this.layer.getField(params.field);
      
      if (this._rejectNonNumeric(info.dfd, fieldInfo, "getHistogram")) {
        return;
      }
      
      // (1) Generate bins
      // (2) Query count for each bin from the service.
      //       On failure: execute count queries in-memory.
      
      // Use generate renderer to get bin parameters: min, max and bin intervals
      if (
        params.normalizationType ||
        (
          params.classificationMethod && 
          params.classificationMethod !== "equal-interval"
        )
      ) {
        this._binParamsFromGenRend(params)
            .then(function(binParams) {
              
              if (hasCustomMinMax) {
                // Generate renderer returns error under the following conditions.
                // Observed in Online hosted FS
                if (customMin > binParams.max || customMax < binParams.min) {
                  self._rejectDfd(info.dfd, "FeatureLayerStatistics.getHistogram: custom value range is beyond field value range.");
                }
                else {
                  // Construct where clause to calculate stats only for the 
                  // data range specified by the caller.
                  var fieldExpr = self._getFieldExpr(params, binParams.normTotal),
                      customRangeFilter = self._getRangeExpr(fieldExpr, customMin, customMax);
                  
                  self._binParamsFromGenRend(params, customRangeFilter)
                      .then(function(customBinParams) {
                        self._getBins(info, customBinParams.sqlExpr, customBinParams.min, customBinParams.max, customBinParams.intervals, customBinParams.source, customBinParams.normTotal, customBinParams.excludeZerosExpr);
                      })
  
                      .otherwise(function(error) {
                        // TODO
                        // Should we calculate binParams for customRangeFilter in-memory?
                        self._rejectDfd(info.dfd, "FeatureLayerStatistics.getHistogram: unable to calculate histogram parameters using custom min/max values.");
                      });
                }
              }
              else {
                self._getBins(info, binParams.sqlExpr, binParams.min, binParams.max, binParams.intervals, binParams.source, binParams.normTotal, binParams.excludeZerosExpr);
              }
              
            })
            
            .otherwise(function(error) {
              self._rejectDfd(info.dfd, "FeatureLayerStatistics.getHistogram: unable to calculate min/max from generate renderer operation.");
            });
      }
      // Use field statistics
      else {
        if (hasCustomMinMax) {
          // Caller has specified both minValue and maxValue
          this._getBins(info, null, customMin, customMax, null, "parameters");
        }
        else {
          this.getFieldStatistics(params)
              .then(function(stats) {
                self._getBins(info, null, stats.min, stats.max, null, stats.source);
              })
              
              .otherwise(function(error) {
                self._rejectDfd(info.dfd, "FeatureLayerStatistics.getHistogram: unable to calculate min/max.");
              });
        }
      }
    },
    
    _getBins: function(info, sqlExpr, min, max, intervals, statSource, normTotal, excludeZerosExpr) {
      var self = this,
          field = info.params.field,
          numBins = info.params.numBins || this.numBins,
          binSize = (max - min) / numBins,
          i, minValue = min, maxValue;
      
      if (!intervals) {
        intervals = [];
        
        // Equal interval bins
        for (i = 1; i <= numBins; i++) {
          maxValue = minValue + binSize;
          
          intervals.push([
            minValue,
            maxValue // (i < numBins) ? maxValue : null
          ]);
          
          minValue = maxValue;
        }
      }
      
      sqlExpr = sqlExpr || field;
      
      this._queryBins(sqlExpr, intervals, excludeZerosExpr)
          .then(function(counts) {
            var outBins = array.map(counts, function(count, i) {
              return {
                minValue: intervals[i][0],
                maxValue: intervals[i][1],
                count:    count
              };
            });
            
            info.dfd.resolve({
              bins:     outBins,
              minValue: min,
              maxValue: max,
              normalizationTotal: normTotal,
              source:   self._srcQuery,
              statisticsSource: statSource
            });
          })
          
          .otherwise(function(error) {
            self._binsFromMemory(info.params, min, max, intervals, normTotal)
                .then(function(outBins) {
                  info.dfd.resolve({
                    bins:     outBins,
                    minValue: min,
                    maxValue: max,
                    normalizationTotal: normTotal,
                    source:   self._srcMemory,
                    statisticsSource: statSource
                  });
                })
                
                .otherwise(function(error) {
                  self._rejectDfd(info.dfd, "FeatureLayerStatistics: unable to calculate histogram.");
                });
          });
    },
    
    _queryBins: function(sqlExpr, intervals, excludeZerosExpr) {
      var layer = this.layer, i, query, queries = [],
          numIntervals = intervals.length;
      
      for (i = 0; i < numIntervals; i++) {
        query = new Query();
        
        query.where = (
          // To exclude zero values from count
          (
            excludeZerosExpr 
              ? (excludeZerosExpr + " AND ")
              : ""
          ) +
          // Range comparison
          sqlExpr + " >= " + intervals[i][0] + 
          (
            (intervals[i][1] !== null) 
              ? (
                " AND " + 
                sqlExpr + 
                
                // maxValue of the last interval is inclusive
                ( (i === numIntervals - 1) ? " <= " : " < " ) +
                 
                intervals[i][1]
              )
              : ""
          )
        );

        queries.push(query);
      }
  
      return all(
        array.map(queries, function(query){ 
          return layer.queryCount(query) ;
        })
      );
    },
    
    _binsFromMemory: function(params, min, max, intervals, normTotal) {
      var dfd = new Deferred(),
          field = params.field,
          normType = params.normalizationType,
          normField = params.normalizationField,
          graphics = this.layer.graphics, graphic, attr, dataValue,
          i, len, idx, value, normValue,
          outBins = [];
      
      len = intervals.length;
      
      // Prepare outBins with count = 0
      for (i = 0; i < len; i++) {
        outBins.push({
          minValue: intervals[i][0],
          maxValue: intervals[i][1], // will be null for the last bin
          count: 0
        });
      }
      
      len = graphics.length;
      
      for (i = 0; i < len; i++) {
        graphic = graphics[i];
        attr = graphic && graphic.attributes;
        dataValue = attr && attr[field];

        // Exclude features with no data.
        if (dataValue != null) {
          // Calculate normalized data value
          if (normType) {
            value = null;
            normValue = attr && parseFloat(attr[normField]);
  
            if (normType === "log" && dataValue != 0) {
              // Base 10 logarithm
              value = Math.log(dataValue) * this._log10e;
            }
            else if (normType === "percent-of-total" && !isNaN(normTotal) && normTotal != 0) {
              value = (dataValue / normTotal) * 100;
            }
            else if (normType === "field" && !isNaN(normValue) && normValue != 0) {
              value = dataValue / normValue;
            }
          }
          // Data value
          else {
            value = dataValue;
          }
          
          if (
            value != null && !isNaN(value) && 
            
            // Make sure we filter out values out of min/max range. This is 
            // needed especially when the caller has specified custom minValue 
            // and maxValue.
            value >= min && value <= max
          ) {
            idx = this._binIndex(intervals, value);
            
            if (idx > -1) {
              outBins[idx].count++;
            }
          }
        }
      }
      
      dfd.resolve(outBins);
      
      return dfd.promise;
    },
    
    _binIndex: function(intervals, value) {
      var i, len = intervals.length, minValue, idx = -1;
      
      for (i = len - 1; i >= 0; i--) {
        minValue = intervals[i][0];
        
        // Ideally we would also like to compare against maxValue - to make 
        // sure that we're not counting values out of bounds when custom min/max 
        // is specified by the caller.
        // However it is not necessary since _binsFromMemory is filtering out 
        // values that are out of bounds.
        if (value >= minValue) {
          idx = i;
          break;
        }
      }
      
      return idx;
    },
    
    _binParamsFromGenRend: function(params, customRangeFilter) {
      var layer = this.layer, dfd = new Deferred(),
          self = this;
      
      if (layer.url && layer.version >= 10.1) {
        var field = params.field,
            classMethod = params.classificationMethod || this.classificationMethod,
            normType = params.normalizationType,
            normField = params.normalizationField,
            whereInfo = this._getGRWhereInfo(layer, params),
            where = whereInfo.where;
        
        // Define input parameters
        var cbDef = new CBDefinition();
        cbDef.classificationField = field;
        cbDef.breakCount = params.numBins || this.numBins;
        cbDef.classificationMethod = classMethod;
        cbDef.standardDeviationInterval = (classMethod === "standard-deviation") ? params.standardDeviationInterval : undefined;
        cbDef.normalizationType = normType;
        cbDef.normalizationField = (normType === "field") ? normField : undefined;
        
        var grParams = new GRParameters();
        grParams.classificationDefinition = cbDef;
        
        // where = filter for non-zero values + layer defn expr
        // customRangeFilter = filter for custom min/max
        grParams.where = where 
          ? (
            where + 
            (customRangeFilter ? (" AND " + customRangeFilter) : "")
          )
          : customRangeFilter;
        
        // Execute generate renderer task
        this._grTask
          .execute(grParams)
          .then(function(renderer) {
            var min, max, intervals = [], infos = renderer.infos,
                len = infos.length;
            
            min = infos[0].minValue;
            max = infos[len - 1].maxValue;
            
            array.forEach(infos, function(cbInfo, idx) {
              intervals.push([
                cbInfo.minValue,
                cbInfo.maxValue // (idx === len - 1) ? null : cbInfo.maxValue
              ]);
            });
            
            dfd.resolve({
              min: min,
              max: max,
              intervals: intervals,
              
              // Calculate LHS of the expression to use for count queries.
              sqlExpr: self._getFieldExpr(params, renderer.normalizationTotal),
              
              excludeZerosExpr: whereInfo.excludeZerosExpr,
              normTotal: renderer.normalizationTotal,
              source: self._srcGenRend
            });
          })
          
          .otherwise(function(error) {
            self._rejectDfd(dfd, "FeatureLayerStatistics: Generate renderer operation failed.");
          });
      }
      else {
        this._rejectDfd(dfd, "FeatureLayerStatistics: Generate renderer operation requires server version 10.1 or later.");
      }
      
      return dfd.promise;
    },
    
    _getGRWhereInfo: function(layer, params) {
      var field = params.field, 
          normType = params.normalizationType, 
          normField = params.normalizationField,
          
          // User-defined layer filter
          defExpr = layer.getDefinitionExpression(),
          
          excludeZerosExpr;
      
      // Generate renderer returns error when:
      // 1. Using normalize by log where some features have 0 value for <field>.
      // 2. Using normalize by field where some features have 0 value for <normField>. 
      // Let's exclude 0s from our calculations.
      if (normType === "log") {
        excludeZerosExpr = "(NOT " + field + " = 0)";
      }
      else if (normType === "field") {
        excludeZerosExpr = "(NOT " + normField + " = 0)";
      }
      
      return {
        where: excludeZerosExpr 
          ? (
            excludeZerosExpr + 
            (defExpr ? (" AND " + defExpr) : "")
          )
          : defExpr,
        
        excludeZerosExpr: excludeZerosExpr
      };
    },
    
    _getFieldExpr: function(params, normTotal) {
      // Returns LHS of a SQL comparison expression
      var field = params.field, 
          normType = params.normalizationType, 
          normField = params.normalizationField,
          fieldExpr = field;
      
      if (normType === "percent-of-total") {
        fieldExpr = "((" + field + " / " + normTotal + ") * 100)";
      }
      else if (normType === "log") {
        fieldExpr = "(log(" + field + ") * " + this._log10e + ")";
      }
      else if (normType === "field") {
        fieldExpr = "(" + field + " / " + normField + ")";
      }
      
      return fieldExpr;
    },
    
    _getRangeExpr: function(fieldExpr, min, max) {
      // Returns SQL expression to match field values within min and max.
      var minExpr = (min != null) ? (fieldExpr + " >= " + min) : "", 
          maxExpr = (max != null) ? (fieldExpr + " <= " + max) : "",
          expr = "";
      
      if (minExpr && maxExpr) {
        expr = minExpr + " AND " + maxExpr;
      }
      else {
        expr = minExpr || maxExpr;
      }
      
      return expr ? ( "(" + expr + ")" ) : "";
    },
    
    ////////////////////
    // Sample features
    ////////////////////
    
    _sampleFeatures: function(info) {
      var self = this,
          params = info.params,
          dfd = info.dfd,
          layer = this.layer,
          graphics = layer.graphics,
          cache = this._sampleCache,
          resample = params && params.resample,
          sampleSize = (params && params.sampleSize) || this.sampleSize;

      // 1) Randomly pick features in-memory if we have <sampleSize> features.
      // 2) If NOT:
      //    a) Cutoff <sampleSize> to <maxRecordCount>
      //    b) Query featureCount
      //    c) If featureCount <= sampleSize:
      //         Query all features
      //    d) Else:
      //         If featureCount <= 20k:
      //           Get all object ids
      //           Randomly pick <sampleSize> ids
      //           Query features with these ids
      //         Else:
      //           Query all features
      //            - Randomly pick <sampleSize> features? No - more features is good.
      // On ERROR: fallback to (1)
      
      // Use cache only if:
      // Caller did not specify SR
      // Or, the specified SR is identical to SR of features in the cache.
      // NOTE
      // We ignore params when using the existing cache.
      if (cache && !resample) {
        dfd.resolve(this._cloneSample(cache));
        return;
      }

      // TODO
      // Do not use layer.graphics if their SR is not the same as params.SR if specified.
      
      // TODO
      // We should probably return error if the server does not support 
      // returnCountOnly query parameter. Ex: 10.0 - sampleserver3
      
      dfd._time = {
        start: this._getTime()
      };
      
      if (graphics.length && sampleSize <= graphics.length) {
        this._resolveSample(dfd, this._pickItems(graphics, sampleSize), this._srcMemory);
      }
      else {
        var countQuery = new Query();
        countQuery.where = "1=1"; // make sure we query feature count from service
        
        dfd._time.countStart = this._getTime();
        
        layer
          .queryCount(countQuery)
          .then(function(featureCount) {
            dfd._time.countEnd = self._getTime();
            
            dfd._totalFeatures = featureCount;
            
            if (sampleSize > layer.maxRecordCount) {
              sampleSize = layer.maxRecordCount;
            }
            
            var featuresQuery;
            
            if (!featureCount) {
              // There are no features in the layer.
              self._resolveSample(dfd, [], self._srcQuery);
            }
            else if (featureCount <= sampleSize) {
              // Fetch all available features
              featuresQuery = new Query();
              featuresQuery.where = "1=1";
                
              self._queryFeatures(featuresQuery, params, layer, graphics, dfd);
            }
            else {
              if (featureCount <= self.samplingThreshold) {
                // Get all object ids and randomly pick <sampleSize> features.
                var idsQuery = new Query();
                idsQuery.where = "1=1";
                
                dfd._time.idStart = self._getTime();
                
                layer
                  .queryIds(idsQuery)
                  .then(function(objectIds) {
                    dfd._time.idEnd = self._getTime();
                    
                    // Randomly pick <sampleSize> object ids
                    var featuresByIds = new Query();
                    featuresByIds.objectIds = self._pickItems(objectIds, sampleSize);
                    
                    self._queryFeatures(featuresByIds, params, layer, graphics, dfd);
                  })
                  
                  .otherwise(function(error) {
                    // console.log("_sampleFeatures: IDs Query failed.", error);
                    // Unable to fetch object ids, just query as much as we can.
                    featuresQuery = new Query();
                    featuresQuery.where = "1=1";
                    
                    self._queryFeatures(featuresQuery, params, layer, graphics, dfd);
                  });
              }
              else {
                // Fetch as many features as possible upto <maxRecordCount> features.
                featuresQuery = new Query();
                featuresQuery.where = "1=1";
                
                self._queryFeatures(featuresQuery, params, layer, graphics, dfd);
              }
            }
          })
          
          .otherwise(function(error) {
            // console.log("_sampleFeatures: Count Query failed.", error);
            self._resolveSample(dfd, self._pickItems(graphics, graphics.length), self._srcMemory);
          });
      }
    },
    
    _queryFeatures: function(query, params, layer, graphics, dfd) {
      var self = this;
      
      query.outSpatialReference = params && params.spatialReference;
      query.maxAllowableOffset = params && params.maxAllowableOffset;
      query.outFields = params && params.outFields;
      
      dfd._time.featStart = this._getTime();

      layer
        .queryFeatures(query)
        .then(function(featureSet) {
          dfd._time.featEnd = self._getTime();
          
          var features = featureSet && featureSet.features;
          self._resolveSample(dfd, features || [], self._srcQuery);
        })
        
        .otherwise(function(error) {
          // console.log("_queryFeatures: FL.queryFeatures failed.", error);
          self._resolveSample(dfd, self._pickItems(graphics, graphics.length), self._srcMemory);
        });
    },
    
    _pickItems: function(items, sampleSize) {
      var len = items.length, indices = [], idx,
          samples = [];
      
      if (sampleSize >= len) {
        // Return all items
        samples = items.slice(0);
      }
      else {
        // Randomly pick <sampleSize> items
        while (samples.length < sampleSize) { // pick until we have enough
          idx = this._getRandomInt(0, len);

          // Prevent duplicate items
          if (array.indexOf(indices, idx) === -1) {
            indices.push(idx);
            samples.push(items[idx]);
          }
        }
      }
      
      return samples;
    },
    
    _getRandomInt: function(min, max) {
      // Returns a random integer between min (included) and max (excluded)
      return Math.floor(Math.random() * (max - min)) + min;
    },
    
    _resolveSample: function(dfd, features, source) {
      features = features || [];
      
      // Extract spatial reference from features.
      var i, len = features.length, geom, sr;
      for (i = 0; i < len; i++) {
        geom = features[i].geometry;
        
        sr = geom && geom.spatialReference;
        if (sr) {
          break;
        }
      }
      
      dfd._time.end = (new Date()).getTime();
      
      var time = dfd._time;
      dfd._time = null;
      
      this._sampleCache = {
        features: features,
        spatialReference: sr && new SR( sr.toJson() ),
        source: source,
        time: this._getTimeStats(time),
        totalFeatures: dfd._totalFeatures
      };
      
      dfd.resolve(this._cloneSample(this._sampleCache));
    },
    
    _cloneSample: function(sample) {
      return {
        features: array.map(sample.features, function(feature) {
          return new feature.constructor(feature.toJson());
        }),
        spatialReference: sample.spatialReference && new SR( sample.spatialReference.toJson() ),
        source: sample.source,
        time: lang.clone(sample.time),
        totalFeatures: sample.totalFeatures
      };
    },
    
    _getTimeStats: function(time) {
      var timeDiff = this._getTimeDiff;
      
      return {
        total:        timeDiff(time.start, time.end),
        features:     timeDiff(time.featStart, time.featEnd),
        featureIds:   timeDiff(time.idStart, time.idEnd),
        featureCount: timeDiff(time.countStart, time.countEnd)
      };
    },
    
    _getTimeDiff: function(start, end) {
      var retVal, elapsed, unit;
      
      if (start != null && end != null) {
        elapsed = (end - start); 
        unit = "millisecond";
        
        if (elapsed >= 1000) {
          elapsed = elapsed / 1000;
          unit = "second";

          if (elapsed >= 60) {
            elapsed = elapsed / 60;
            unit = "minute";
          }
        }
        
        retVal = {
          value: Number(elapsed.toFixed(2)),
          unit: unit
        };
      }
      
      return retVal;
    },
    
    _getTime: function() {
      return (new Date()).getTime();
    },
    
    ////////////////////
    // Scale range
    ////////////////////
    
    _getScaleRange: function(info) {
      var params = info.params,
          cache = this._scaleCache,
          layer = this.layer,
          sampleSize = (params && params.sampleSize) || this.sampleSize,
          algorithm = (params && params.algorithm) || "full-extent",
          maxCount = (params && params.maxCount != null) ? params.maxCount : layer.maxRecordCount,
          minPixels = (params && params.minPixels) || this.minPixels,
          map = (params && params.map) || layer.getMap(),
          self = this;

      // Ignore cache when caller asked to recalculate.
      if (cache && (!params || params.recalculate !== true)) {
        // TODO
        // Clone cache
        info.dfd.resolve(cache);
      }
      else {
        all([
          this._getMinScalePromise(map, algorithm, maxCount, sampleSize, minPixels),
          this._getMaxScalePromise(map, sampleSize)
        ])
        .then(function(scaleInfos) {
          var minScaleInfo = scaleInfos[0],
              maxScaleInfo = scaleInfos[1],

              // TODO
              // Check validity of the scale range. Ex: minScale > maxScale
              minScale = Math.ceil(minScaleInfo.minScale),
              maxScale = Math.floor(maxScaleInfo.maxScale);
        
          // console.log(minScaleInfo, maxScaleInfo);
          
          self._scaleCache = {
            minScale: minScale,
            maxScale: maxScale,
            minScaleInfo: minScaleInfo,
            maxScaleInfo: maxScaleInfo
          };
          
          // TODO
          // Clone cache
          info.dfd.resolve(self._scaleCache);
        });
      }
    },
    
    _getMaxScale: function(map, layer, features) {
      var geomType = layer.geometryType,
          extent, scale, closestPoints, smallestFeature;
          
      if (geomType === "esriGeometryPoint") {
        // maxScale = "scale of the extent between the closest points"
        closestPoints = this._getClosestPoints(features);
        
        if (closestPoints.length === 2) {
          extent = graphicsUtils.graphicsExtent(closestPoints);
        }
      }
      else {
        // maxScale = "scale of the smallest feature"
        smallestFeature = this._getSmallestFeature(features);
        extent = smallestFeature && smallestFeature.geometry.getExtent();
      }
      
      extent = extent && extent.expand(
        (geomType === "esriGeometryPolygon") ? 2 : 4
      );

      scale = extent ? scaleUtils.getScale(map, extent) : layer.maxScale;
      
      return scale;
    },
    
    _getMaxScalePromise: function(map, sampleSize) {
      var self = this,
          dfd = new Deferred(),
          maxScale = this.layer.maxScale;
      
      if (map) {
        // 1) Get sample features
        // 2) Calculate max scale
        this.getSampleFeatures({ sampleSize: sampleSize })
        
            .then(function(sample) {
              dfd.resolve({
                maxScale: self._getMaxScale(map, self.layer, sample.features),
                source:   sample.source
              });
            })
            
            .otherwise(function(error) {
              dfd.resolve({
                maxScale: maxScale
              });
            });
      }
      else {
        dfd.resolve({
          maxScale: maxScale
        });
      }
      
      return dfd.promise;
    },
    
    _getClosestPoints: function(features) {
      var i, j, len = features.length, distance, minDistance = Infinity,
          closest = [];
      
      for (i = 0; i < len; i++) {
        for (j = i + 1; j < len; j++) {
          if (features[i].geometry && features[j].geometry) {
            distance = mathUtils.getLength(features[i].geometry, features[j].geometry);
            
            if (distance > 0 && distance < minDistance) {
              minDistance = distance;
              
              closest[0] = features[i];
              closest[1] = features[j];
            }
          }
        }
      }
      
      return closest;
    },
    
    _getSmallestFeature: function(features) {
      var i, len = features.length, area, minArea = Infinity,
          smallest, extent;
      
      for (i = 0; i < len; i++) {
        if (features[i].geometry) {
          extent = features[i].geometry.getExtent();
          
          if (extent) {
            // Approximate area
            area = extent.getWidth() * extent.getHeight();
            
            if (area > 0 && area < minArea) {
              minArea = area;
              
              smallest = features[i];
            }
          }
        }
      }
      
      return smallest;
    },
    
    _getLODForExtent: function(extent, map) {
      // console.info("\n[ _getLODForExtent ]");

      var tileInfo = map.__tileInfo,
          lods = tileInfo && tileInfo.lods,
          targetLOD;
      
      // Tiled basemap
      if (lods && lods.length) {
        // Lets copy the given extent, since _fixAspectRatio will modify it in-place.
        extent = new extent.constructor(extent.toJson());
        
        // Re-aspect the extent to match map aspect ratio.
        extent = map._fixAspectRatio(extent);
    
        var i,
        
            // Scale corresponding to the given extent.
            scale = scaleUtils.getScale(map, extent),
            
            // Min/max LODs available for the map.
            minMapLOD = lods[map.getMinZoom()],
            maxMapLOD = lods[map.getMaxZoom()];
  
        // console.log("  target extent = ", extent.xmin, extent.ymin, extent.xmax, extent.ymax, extent.getWidth(), extent.getHeight());
        // console.log("  target scale = ", scale);
        // console.log("  layer minLOD: ", "level =", minMapLOD.level, " scale =", minMapLOD.scale);
        // console.log("  layer maxLOD: ", "level =", maxMapLOD.level, " scale =", maxMapLOD.scale);
        
        if (scale >= minMapLOD.scale) {
          targetLOD = minMapLOD;
        }
        else if (scale <= maxMapLOD.scale) {
          targetLOD = maxMapLOD;
        }
        else {
          // Scale is within map lod range:
          // We need to find the closest lod that can display this scale.
          for (i = lods.length - 1; i >= 0; i--) {
            if (
              lods[i].level < minMapLOD.level || 
              lods[i].level > maxMapLOD.level
            ) {
              continue;
            }
            
            if (lods[i].scale >= scale) {
              targetLOD = lods[i];
              break;
            }
          }
        }
        
        // console.log("  calculated zoom level, scale = ", targetLOD && targetLOD.level, targetLOD && targetLOD.scale);
      }
      
      return targetLOD;
    },
    
    _getMinScalePromise: function(map, algorithm, maxCount, sampleSize, minPixels) {
      // TODO
      // Recalculate layer's fullExtent to fix cases where it is 
      // out of sync with real fullExtent.
      // Ex: http://services.arcgis.com/V6ZHFr6zdgNZuVG0/ArcGIS/rest/services/blitz/FeatureServer/0
      var fullExtent = this.layer.fullExtent,
          self = this,
          dfd = new Deferred();
      
      // TODO
      // If layer's feature count is too large, do not find optimal extent.
      // Use fullExtent instead.
      
      if (map && fullExtent) {
        var fullExtentScale = this._getMinScale(fullExtent, map);
        
        if (algorithm === "full-extent") {
          dfd.resolve({
            minScale: fullExtentScale
          });
        }
        else if (algorithm === "feature-count") {
          this._findOptimalExtent(fullExtent, maxCount)
              .then(function(response) {
                response.minScale = self._getMinScale(response.extent, map);
                dfd.resolve(response);
              })
              
              .otherwise(function(error) {
                dfd.resolve({
                  minScale: fullExtentScale
                });
              });
        }
        else if (algorithm === "feature-size") {
          if (this.layer.geometryType === "esriGeometryPolygon") {
            this.getSampleFeatures({ sampleSize: sampleSize })
            
                .then(function(sample) {
                  var avgSize, lod;
                  
                  // (1) Get average size of sampled features, in map units.
                  avgSize = self._getAvgFeatureSize(sample.features);
                  // console.log("avgSize = ", avgSize);

                  // (2) Find map LOD that can display an average-sized
                  //     feature using a minimum of <minPixels> pixels.
                  if (avgSize > 0) {
                    lod = self._findOptimalLOD(map, avgSize, minPixels);
                  }
                  // console.log("optimal LOD = ", lod);

                  dfd.resolve({
                    minScale: lod ? lod.scale : fullExtentScale,
                    extent: graphicsUtils.graphicsExtent(sample.features)
                  });
                })
                
                .otherwise(function(error) {
                  dfd.resolve({
                    minScale: fullExtentScale
                  });
                });
          }
          else {
            // console.log("Cannot use feature-size algorithm for this geometry type. Using fullExtentScale.");
            
            dfd.resolve({
              minScale: fullExtentScale
            });
          }
        }
      }
      else {
        dfd.resolve({
          minScale: this.layer.minScale
        });
      }
      
      return dfd.promise;
    },
    
    _getMinScale: function(extent, map) {
      var minLOD = this._getLODForExtent(extent, map);
      
      return minLOD 
        ? minLOD.scale 
        : scaleUtils.getScale(map, this.layer.fullExtent);
    },
    
    _findOptimalExtent: function(extent, maxFeatures) {
      // Optimal extent is one that contains a maximum of <maxFeatures> features.
      
      // (1) Break down the given extent until there are no extents with more 
      //     than <maxFeatures> features.
      // (2) Pick the extent whose featureCount is closer to <maxFeatures>
      
      var dfd = this._processExtents([ extent ], maxFeatures),
          self = this;
      
      return dfd.promise.then(function(response) {
        var filtered = [], numErrors = 0;
        
        array.forEach(response.candidates, function(candidate) {
          if (candidate.count > -1) {
            filtered.push(candidate);
          }
          else {
            ++numErrors;
          }
        });
        
        // Sort the filtered array by count DESC + level ASC.
        filtered.sort(self._extentSorter);
        
        // Pick the top candidate
        var optimal = filtered[0];
        
        if (optimal) {
          optimal = {
            extent: optimal.extent,
            count: optimal.count,
            queryResults: response.queryResults,
            numErrors: numErrors,
            numQueries: response.queryResults.length
          };
        }
        else {
          optimal = { extent: extent };
        }
        
        // Result returned to the caller
        return optimal;
      });
    },
    
    _extentSorter: function(a, b) {
      // "count DESC"
      var diff = b.count - a.count; 
      
      // If both counts are identical, then "level ASC"
      if (diff === 0) {
        if (a.level < b.level) { 
          diff = -1; 
        } 
        else if (a.level > b.level) { 
          diff = 1;
        }
        else {
          // If both levels are identical, we get non-deterministic behavior.
          diff = 0;
        } 
      }
      
      return diff;
    },
    
    _processExtents: function(extents, maxFeatures, dfd, candidates, level, queryResults) {
      // Initialize optional arguments for the first external call 
      dfd = dfd || new Deferred();
      candidates = candidates || [];
      level = (level == null) ? 0 : level;
      queryResults = queryResults || [];
      
      var self = this;
      
      this._getCountForAll(extents, level)
          .then(function(countInfos) {
            var nextBatch = [], children;
            
            array.forEach(countInfos, function(info) {
              if (info.count > maxFeatures) {
                // console.log("Breaking down: ", info.count, info.level);
                children = self._getChildExtents(info.extent);
                nextBatch.push.apply(nextBatch, children);
              }
              else {
                candidates.push(info);
              }
            });
            
            queryResults = queryResults.concat(countInfos);
            
            if (nextBatch.length) {
              self._processExtents(nextBatch, maxFeatures, dfd, candidates, ++level, queryResults);
            }
            else {
              dfd.resolve({
                candidates: candidates,
                queryResults: queryResults
              });
            }
          });
    
      return dfd;
    },
    
    _getCountForAll: function(extents, level) {
      var countPromises;
      
      countPromises = array.map(extents, function(ext) {
        return this._getCountInExtent(ext, level);
      }, this);
      
      return all(countPromises);
    },
    
    _getCountInExtent: function(extent, level) {
      var countQuery = new Query(),
          dfd = new Deferred();
      
      countQuery.geometry = extent;
      
      // Force service query:
      // TODO
      // FL should automatically use service query if SR of the query 
      // geometry is different from map SR.
      // TODO
      // Include layer's definition expression.
      countQuery.where = "1=1";
      
      this.layer
        .queryCount(countQuery)
        
        .then(function(featureCount) {
          // console.log(level, "featureCount = ", featureCount);
          dfd.resolve({
            count: featureCount,
            extent: extent,
            level: level
          });
        })
        
        .otherwise(function(error) {
          // console.log("featureCount error: ", error);
          dfd.resolve({
            count: -1,
            error: error,
            extent: extent,
            level: level
          });
        });
    
      return dfd.promise;
    },
    
    _getChildExtents: function(extent) {
      var children;
      
      // (1) Shrink the extent to half its original width and height.
      // (2) Calculate the 4 children by offsetting the halfExtent.
      var width = extent.getWidth(),
          height = extent.getHeight(),
          oneFourthWidth = width / 4,
          oneFourthHeight = height / 4,
          halfExtent = extent.expand(0.5);
    
      children = [
        // Clockwise from top left
        halfExtent.offset(-oneFourthWidth,  oneFourthHeight),
        halfExtent.offset( oneFourthWidth,  oneFourthHeight),
        halfExtent.offset( oneFourthWidth, -oneFourthHeight),
        halfExtent.offset(-oneFourthWidth, -oneFourthHeight)
      ];
      
      return children;
    },
    
    _getAvgFeatureSize: function(features) {
      var i, len = features.length, size, totalSize = 0, numFeatures = 0,
          extent;
      
      for (i = 0; i < len; i++) {
        if (features[i].geometry) {
          extent = features[i].geometry.getExtent();
          
          if (extent) {
            // Approximate size
            size = (extent.getWidth() + extent.getHeight()) / 2;
            
            if (size > 0) {
              ++numFeatures;
              totalSize += size;
            }
          }
        }
      }
      
      return numFeatures ? (totalSize / numFeatures) : 0;
    },
    
    _findOptimalLOD: function(map, avgSize, minPixels) {
      var tileInfo = map.__tileInfo,
          lods = tileInfo && tileInfo.lods,
          lod, i, screenSize;
      
      // Tiled basemap
      if (lods && lods.length) {
        // Min/max LODs available for the map.
        var minMapLOD = lods[map.getMinZoom()],
            maxMapLOD = lods[map.getMaxZoom()];

        for (i = 0; i < lods.length; i++) {
          if (
            lods[i].level < minMapLOD.level || 
            lods[i].level > maxMapLOD.level
          ) {
            continue;
          }
          
          screenSize = avgSize / lods[i].resolution;
          // console.log(lods[i].level, lods[i].resolution, screenSize);
          
          if (screenSize >= minPixels) {
            lod = lods[i];
            break;
          }
        }
      }

      return lod;
    },
    
    ////////////////////
    // View info
    ////////////////////
    
    _getViewInfo: function(info) {
      var self = this,
          params = info.params,
          layer = this.layer,
          geomType = this.layer.geometryType,
          
          featureType = {
            point:   geomType === "esriGeometryPoint",
            mPoint:  geomType === "esriGeometryMultipoint",
            line:    geomType === "esriGeometryPolyline",
            polygon: geomType === "esriGeometryPolygon"
          },
          
          sampleSize = (params && params.sampleSize) || this.sampleSize,
          map = (params && params.map) || layer.getMap(),
          mapSR = map.spatialReference,
          mapWidth = (params && params.mapWidth) || this.mapWidth,
          mapHeight = (params && params.mapHeight) || this.mapHeight,
          genScale = (params && params.generalizeForScale) || this.generalizeForScale;

      if (!map) {
        this._rejectDfd(info.dfd, "FeatureLayerStatistics.getSuggestedViewInfo: 'map' parameter is missing.");
        return;
      }

      // We need to calculate minScale, maxScale and center
      // We will use a sampling of <sampleSize> features in map SR.
      
      // Offset corresponding to the desired scale.
      var maxOffset = ((map.extent.getWidth() / map.width) / map.getScale()) * genScale;
      
      // TODO
      // Is there a better distribution algorithm for sampling?
      this.getSampleFeatures({ 
            sampleSize: sampleSize,
            spatialReference: mapSR,
            maxAllowableOffset: maxOffset,
            outFields: []
          })
      
          .then(function(sample) {
            // TODO
            // We need to query extent from the service to make sure we have the 
            // appropriate fullExtent considering the layer's definition expression.
            // That is, layer's fullExtent of the entire dataset is not relevant 
            // when displaying a subset of that dataset.
            var projectValue = self._projectExtent(layer.fullExtent, mapSR),
                sampleFeatures = sample.features;
            
            if (sampleFeatures && sampleFeatures.length) {
              self.getSpatialStatistics({ features: sampleFeatures })
              
                  .then(function(spatialStats) {
                    when(projectValue)
                      .always(function(fullExtent) {
                        fullExtent = (fullExtent && fullExtent.hasOwnProperty("xmin")) ? fullExtent : null;
                        // console.log("Projection result: ", fullExtent);
                        
                        var minViewLOD = self._getMinViewLOD(params, spatialStats, featureType, map);
                        self._resolveViewInfo(info.dfd, minViewLOD, map, mapWidth, mapHeight, fullExtent, sample, spatialStats, featureType);
                      });
                  })
                  
                  .otherwise(function(error) {
                    self._rejectDfd(info.dfd, "FeatureLayerStatistics.getSuggestedViewInfo: unable to calculate spatial statistics.");
                  });
            }
            else {
              self._rejectDfd(info.dfd, "FeatureLayerStatistics.getSuggestedViewInfo: sampling returned 0 features.");
            }
          })
          
          .otherwise(function(error) {
            self._rejectDfd(info.dfd, "FeatureLayerStatistics.getSuggestedViewInfo: unable to sample features.");
          });
    },
    
    _resolveViewInfo: function(dfd, minViewLOD, map, mapWidth, mapHeight, fullExtent, sample, spatialStats, featureType) {
      var avgXY = spatialStats.avgXY,
      
          // Choices for calculating center:
          // 1) Use average-x and average-y of all sampled features
          // 2) Use center of the extent of all sampled features
          // 3) Use center of the extent of a random/smallest/largest sampled feature
          // 4) Use center of the layer's full extent
          center = avgXY && new Point(
            avgXY.x,
            avgXY.y,
            sample.spatialReference && new SR( sample.spatialReference.toJson() )
          ),
          
          lods = map.__tileInfo.lods,
          closestLOD;
      
      // If extent of the "minScale" at the "center" completely contains the 
      // layer's fullExtent, we can zoom in further as long as the primary 
      // criteria (size, length or distance) is not violated.
      if (minViewLOD && fullExtent && center) {
        closestLOD = this._findClosestLOD(lods, minViewLOD, fullExtent, center, mapWidth, mapHeight);
      }
      
      // Use the closest LOD or the original LOD.
      minViewLOD = closestLOD || minViewLOD;
      
      if (minViewLOD) {
        if (center) {
          // console.log("Initial center: ", center.toJson());
          
          this._countAtView(center, minViewLOD, mapWidth, mapHeight)
          
              .then(function(featureCount) {
                // console.log("featureCount at suggested scale and center: ", featureCount);
                
                var adjustedCenter;
                
                // If there are no features visible at the suggested scale 
                // and center, then let's pick a location where there is 
                // atleast one feature.
                if (!featureCount) {
                  // Pick the first feature.
                  var feature = sample.features[0], extent;
                  
                  if (featureType.point) {
                    adjustedCenter = feature.geometry;
                  }
                  else {
                    extent = feature.geometry && feature.geometry.getExtent();
                    adjustedCenter = extent && extent.getCenter();
                  }
                  
                  // console.log("Adjusted center: ", adjustedCenter && adjustedCenter.toJson());
                }
                
                dfd.resolve({
                  minScale:   Math.ceil(minViewLOD.scale),
                  center:     adjustedCenter || center,
                  sampleInfo: sample
                });
              })
              
              .otherwise(function(error) {
                // Unable to get count at the suggested scale and center:
                // Be optimistic and return what we've got.
                dfd.resolve({
                  minScale:   Math.ceil(minViewLOD.scale),
                  center:     center,
                  sampleInfo: sample
                });
              });
        }
        else {
          // We still have an LOD.
          dfd.resolve({
            minScale:   Math.ceil(minViewLOD.scale),
            center:     null,
            sampleInfo: sample
          });
        }
      }
      else {
        this._rejectDfd(dfd, "FeatureLayerStatistics.getSuggestedViewInfo: unable to find a suitable minScale.");
      }
    },
    
    _countAtView: function(center, minViewLOD, mapWidth, mapHeight) {
      var viewExtent = this._getExtentFromCenter(center, minViewLOD, mapWidth, mapHeight);

      var countQuery = new Query();
      countQuery.geometry = viewExtent;
      countQuery.where = "1=1";
      
      return this.layer.queryCount(countQuery).promise;
    },
    
    _projectExtent: function(extent, sr) {
      // Returns extent or a promise that resolves to an extent.
      if (extent.spatialReference.equals(sr)) {
        // console.log("Projection not required.");
        return new extent.constructor(extent.toJson());
      }
      else if (webMercUtils.canProject(extent.spatialReference, sr)) {
        // console.log("Client-side projection required.");
        return webMercUtils.project(extent, sr);
      }
      else {
        var params = new ProjParams();
        params.geometries = [ extent ];
        params.outSR = sr;
        
        // console.log("Server-side projection required.");
        
        return this._gsTask
          .project(params)
          .then(function(extents) {
            return extents && extents[0];
          });
      }
    },
    
    _getMinViewLOD: function(params, spatialStats, featureType, map) {
      // minScale:
      // For polygons: use average feature size (minSize)
      // For lines: use average feature length (minLength)
      // For points: use average distance between features (minDistance)
      
      // TODO
      // Calculate <minXyz> using the layer's current symbology. 
      
      // TODO
      // Should we use histogram of feature sizes?
      
      var minDistance = (params && params.minDistance) || this.minDistance,
          minLength = (params && params.minLength) || this.minLength,
          minSize = (params && params.minSize) || this.minSize,
          avgMapUnits, lod, minPixels;
      
      if (featureType.point) {
        avgMapUnits = spatialStats.avgMinDistance;
        minPixels = minDistance;
      }
      else if (featureType.mPoint) {
        avgMapUnits = spatialStats.avgMinDistance;
        minPixels = minDistance;
      }
      else if (featureType.line) {
        avgMapUnits = spatialStats.avgLength;
        minPixels = minLength;
      }
      else if (featureType.polygon) {
        avgMapUnits = spatialStats.avgSize;
        minPixels = minSize;
      }

      // console.log("Average map units ", avgMapUnits, "minPixels ", minPixels);

      if (avgMapUnits > 0) {
        lod = this._findLOD(map, avgMapUnits, minPixels);
      }

      // console.log("LOD = ", lod && lod.toJson());
      
      return lod;
    },
    
    _findLOD: function(map, avgMapUnits, minPixels) {
      // Returns the first LOD that for which <avgMapUnits>/<lod.resolution> yields 
      // minimum of <minPixels>.
      var tileInfo = map.__tileInfo,
          lods = tileInfo && tileInfo.lods,
          match, lod, i, screenSize;
      
      // Tiled basemap
      if (lods && lods.length) {
        // Min/max LODs available for the map.
        var minMapLOD = lods[map.getMinZoom()],
            maxMapLOD = lods[map.getMaxZoom()];

        for (i = 0; i < lods.length; i++) {
          lod = lods[i];
          
          if (
            lod.level < minMapLOD.level || 
            lod.level > maxMapLOD.level
          ) {
            continue;
          }
          
          // Rounding ensures that a matching LOD can be within 0.5 pixels of 
          // the required <minPixels>.
          // TODO
          // Should we increase this tolerance to 1px or 1.5px?
          screenSize = Math.round(avgMapUnits / lod.resolution);
          
          // console.log("level ", lod.level, "resolution ", lod.resolution, "pixels ", screenSize, "scale ", lod.scale);
          
          if (screenSize >= minPixels) {
            match = lod;
            break;
          }
        }
      }

      return match;
    },
    
    _getExtentFromCenter: function(center, lod, mapWidth, mapHeight) {
      // Calculates "extent" around the given "center" at the resolution specified 
      // by the "lod".
      var halfExtentWidth = (mapWidth / 2) * lod.resolution,
          halfExtentHeight = (mapHeight / 2) * lod.resolution;
    
      return new Extent(
        center.x - halfExtentWidth, 
        center.y - halfExtentHeight, 
        center.x + halfExtentWidth, 
        center.y + halfExtentHeight, 
        new SR( center.spatialReference.toJson() )
      );
    },
    
    _findClosestLOD: function(lods, startLOD, fullExtent, center, mapWidth, mapHeight) {
      // Returns LOD greater than startLOD that can fully contain the 
      // layer's fullExtent.
      var i, len = lods.length, extentAtLevel, closestLOD;
      
      for (i = 0; i < len; i++) {
        // Ignore LODs lower than startLOD.
        if (lods[i].level < startLOD.level) {
          continue;
        }
        
        extentAtLevel = this._getExtentFromCenter(center, lods[i], mapWidth, mapHeight);
        
        if (!extentAtLevel.contains(fullExtent)) {
          // Pick the previous LOD since it fully contains the fullExtent.
          closestLOD = lods[i - 1];
          break;
        }
        // We've exhausted all LODs but "contains" operation still returns true:
        // Pick this last available LOD as the closest.
        else if (i === len - 1) {
          closestLOD = lods[i];
          break;
        }
      }
      
      closestLOD = (closestLOD && (closestLOD.level > startLOD.level)) ? closestLOD : null;

      // console.log("Even closest LOD = ", closestLOD && closestLOD.toJson());
      return closestLOD;
    },
    
    ////////////////////
    // Unique values
    ////////////////////
    
    _findUniqueValues: function(info) {
      var self = this,
          params = info.params,
          fieldInfo = this.layer.getField(params.field);
      
      if (!fieldInfo) {
        this._rejectDfd(info.dfd, "FeatureLayerStatistics.getUniqueValues: unknown 'field'.");
        return;
      }
      
      // [1] Use statistics query if layer supportsStatistics.
      this._uvFromStatisticsQuery(params)
          .then(function(response) {
            self._resolveUVDfd(response, info, fieldInfo, self._srcQuery);
          })
          
          .otherwise(function(error) {
            // [2] Use generate renderer task if possible.
            self._uvFromGenRenderer(params, fieldInfo)
                .then(function(response) {
                  self._resolveUVDfd(response, info, fieldInfo, self._srcGenRend);
                })
                
                .otherwise(function(error) {
                  // [3] Calculate client-side using available features as the last resort.
                  self._uvFromMemory(params)
                      .then(function(response) {
                        self._resolveUVDfd(response, info, fieldInfo, self._srcMemory);
                      })
                      
                      .otherwise(function(error) {
                        self._rejectDfd(info.dfd, "FeatureLayerStatistics: unable to calculate unique values.");
                      });
                });
          });
    },
    
    _uvFromStatisticsQuery: function(params) {
      var layer = this.layer, dfd = new Deferred();
      
      if (layer.url && layer.supportsStatistics) {
        var countOutField = "countOF" + params.field, self = this;
        
        var statDef = new StatDefinition();
        statDef.statisticType = "count";
        statDef.onStatisticField = params.field;
        statDef.outStatisticFieldName = countOutField;
        
        // We're querying for num of features for each unique value in "params.field"
        var query = new Query();
        query.outStatistics = [ statDef ];
        query.groupByFieldsForStatistics = [ params.field ];
        // query.orderByFields = [ countOutField + " DESC"  ];
        
        layer
          .queryFeatures(query)
          .then(function(featureSet) {
            var attr, dataValue, count = {}, countValue,
                hasNull;

            array.forEach(featureSet.features, function(feature) {
              attr = feature.attributes;
              dataValue = this._getAttributeVal(attr, params.field);
              countValue = this._getAttributeVal(attr, countOutField);
              
              if (dataValue === null && countValue === 0) {
                hasNull = true;
              }
              
              // Treat undefined, null and <empty-string> as just one type of value:
              // null
              if (
                dataValue == null ||  dataValue === "" || 
                (typeof dataValue === "string" && lang.trim(dataValue) === "") 
              ) {
                dataValue = null;
              }
              
              // Initialize the counter if we haven't seen this value before.
              // Else, just increment the count.
              if (count[dataValue] == null) {
                count[dataValue] = {
                  count: countValue,
                  data: dataValue
                };
              }
              else {
                count[dataValue].count = count[dataValue].count + countValue;
              }
            }, self);
            
            // Statistics query incorrectly returns count = 0 for null value:
            // If statistics query result had null, then we will perform a
            // separate count query to accurately count features with null value.
            if (hasNull) {
              query = new Query();
              query.where = params.field + " is NULL";
              
              // Query num of features with null value in "params.field"
              layer
                .queryCount(query)
                .then(function(nullCount) {
                  nullCount = nullCount || 0;
                  count["null"].count = count["null"].count + nullCount;
                  
                  dfd.resolve({ count: count });
                })
                
                .otherwise(function(error) {
                  dfd.resolve({ count: count });
                });
                
            }
            else {
              dfd.resolve({ count: count });
            }
          })
          
          .otherwise(function(error) {
            self._rejectDfd(dfd, "FeatureLayerStatistics: Statistics query operation failed.");
          });
      }
      else {
        this._rejectDfd(dfd, "FeatureLayerStatistics: Statistics query requires a layer that supports statistics.");
      }
      
      return dfd.promise;
    },
    
    _uvFromGenRenderer: function(params, fieldInfo) {
      var layer = this.layer, dfd = new Deferred(),
          self = this;
      
      if (layer.url && layer.version >= 10.1) {
        // Define input parameters
        var uvDef = new UVDefinition();
        uvDef.attributeField = params.field;
        
        var grParams = new GRParameters();
        grParams.classificationDefinition = uvDef;
        grParams.where = layer.getDefinitionExpression();
        
        // Execute generate renderer task
        this._grTask
          .execute(grParams)
          .then(function(renderer) {
            var count = {}, dataValue,
                isNumericField = (array.indexOf(self._numericTypes, fieldInfo.type) > -1);
            
            array.forEach(renderer.infos, function(uvInfo) {
              dataValue = uvInfo.value;
              
              // Treat undefined, null and <empty-string> as just one type of value:
              // null
              if (
                dataValue == null || dataValue === "" || 
                (
                  typeof dataValue === "string" && 
                  (
                    lang.trim(dataValue) === "" || 
                    // Generate renderer returns this peculiar string for 
                    // features with null value.
                    dataValue.toLowerCase() === "<null>"
                  )
                ) 
              ) {
                dataValue = null;
              }
              
              // Initialize the counter if we haven't seen this value before.
              // Else, just increment the count.
              if (count[dataValue] == null) {
                count[dataValue] = {
                  count: uvInfo.count,
                  
                  // Generate renderer returns numeric values as strings in 
                  // uvInfo.label.
                  // Let's convert them back to numbers.
                  data: (isNumericField && dataValue) ? Number(dataValue) : dataValue
                };
              }
              else {
                count[dataValue].count = count[dataValue].count + uvInfo.count;
              }
            });
      
            dfd.resolve({ count: count });
          })
          
          .otherwise(function(error) {
            self._rejectDfd(dfd, "FeatureLayerStatistics: Generate renderer operation failed.");
          });
      }
      else {
        this._rejectDfd(dfd, "FeatureLayerStatistics: Generate renderer operation requires server version 10.1 or later.");
      }
      
      return dfd.promise;
    },
    
    _uvFromMemory: function(params) {
      var layer = this.layer, dfd = new Deferred(),
          fieldName = params.field,
          attr, dataValue, count = {};
      
      array.forEach(layer.graphics, function(graphic) {
        attr = graphic.attributes;
        dataValue = attr && attr[fieldName];
        
        // Treat undefined, null and <empty-string> as just one type of value:
        // null
        if (
          dataValue == null ||  dataValue === "" || 
          (typeof dataValue === "string" && lang.trim(dataValue) === "") 
        ) {
          dataValue = null;
        }
        
        // Initialize the counter if we haven't seen this value before.
        // Else, just increment the count.
        if (count[dataValue] == null) {
          count[dataValue] = {
            count: 1,
            data: dataValue
          };
        }
        else {
          count[dataValue].count++;
        }
      });
      
      dfd.resolve({ count: count });
      
      return dfd.promise;
    },
    
    _resolveUVDfd: function(response, info, fieldInfo, source) {
      var //fieldName = info.params.field, 
          count = response.count,
          dataValue, infos = [], obj; 
      
      for (dataValue in count) {
        obj = count[dataValue];
        
        infos.push({
          value: obj.data,
          count: obj.count
        });
      }

      info.dfd.resolve({
        source: source,
        uniqueValueInfos: infos
      });
    },
    
    ////////////////////
    // Class breaks
    ////////////////////
    
    _findClassBreaks: function(info) {
      var self = this,
          params = info.params,
          fieldInfo = this.layer.getField(params.field);

      if (this._rejectNonNumeric(info.dfd, fieldInfo, "getClassBreaks")) {
        return;
      }
      
      this._cbFromGenRend(params)
          .then(function(renderer) {
            self._resolveCBDfd(info.dfd, params, renderer, self._srcGenRend);
          })
          
          .otherwise(function(error) {
            self._cbFromMemory(params)
                .then(function(renderer) {
                  self._resolveCBDfd(info.dfd, params, renderer, self._srcMemory);
                })
                
                .otherwise(function(error) {
                  self._rejectDfd(info.dfd, "FeatureLayerStatistics: unable to calculate class breaks.");
                });
          });
    },
    
    _cbFromGenRend: function(params) {
      var layer = this.layer, dfd = new Deferred(),
          self = this;
      
      if (layer.url && layer.version >= 10.1) {
        // Define input parameters
        var cbDef = this._createCBDefn(params),
            whereInfo = this._getGRWhereInfo(layer, params);
        
        var grParams = new GRParameters();
        grParams.classificationDefinition = cbDef;
        grParams.where = whereInfo.where;
        
        // Execute generate renderer task
        this._grTask
          .execute(grParams)
          .then(function(renderer) {
            dfd.resolve(renderer);
          })
          
          .otherwise(function(error) {
            self._rejectDfd(dfd, "FeatureLayerStatistics: Generate renderer operation failed.");
          });
      }
      else {
        this._rejectDfd(dfd, "FeatureLayerStatistics: Generate renderer operation requires server version 10.1 or later.");
      }
      
      return dfd.promise;
    },
    
    _cbFromMemory: function(params) {
      // TODO
      // Client-side algorithm seems to be wrong.
      // Test layer: http://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/Warren_College_Trees/FeatureServer/0
      var dfd = new Deferred(),
          cbDef = this._createCBDefn(params),
          
          renderer = generateRenderer.createClassBreaksRenderer({
            features: this.layer.graphics,
            definition: cbDef
          });
      
      dfd.resolve(renderer);
      
      return dfd.promise;
    },
    
    _createCBDefn: function(params) {
      var field = params.field,
          classMethod = params.classificationMethod || this.classificationMethod,
          normType = params.normalizationType,
          normField = params.normalizationField;

      var cbDef = new CBDefinition();
      cbDef.classificationField = field;
      cbDef.breakCount = params.numClasses || this.numClasses;
      cbDef.classificationMethod = classMethod;
      cbDef.standardDeviationInterval = (classMethod === "standard-deviation") ? params.standardDeviationInterval : undefined;
      cbDef.normalizationType = normType;
      cbDef.normalizationField = (normType === "field") ? normField : undefined;
      
      return cbDef;
    },
    
    _resolveCBDfd: function(dfd, params, renderer, source) {
      // console.log("renderer = ", renderer);
      
      var cbInfos = renderer.infos, len = cbInfos.length,
          min = cbInfos[0].minValue,
          max = cbInfos[len - 1].maxValue,
          isStdDev = (params.classificationMethod === "standard-deviation"),
          reNumber = this._reNumber,
          range, outInfo, label;

      // TODO
      // Remove spurious precision from min and max values
      
      cbInfos = array.map(cbInfos, function(cbInfo) {
        label = cbInfo.label;
        
        // Standard break properties
        outInfo = {
          minValue: cbInfo.minValue,
          maxValue: cbInfo.maxValue,
          
          // TODO
          // Add percent sign after min and max value where needed
          // Hosted Service does not set it.
          // Labels from SS6 seem to have it.
          // TODO
          // How should the label look when method = stddev, norm = percent?
          // TODO
          // Should we manually construct labels from values?
          label: label
        };

        // Add min/max stddev values to each break
        if (isStdDev && label) {
          // Extract stddev numbers from the label
          // Examples:
          //  "\u003c -0.75 Std. Dev."
          //  "-0.75 - -0.25 Std. Dev."
          //  "\u003e 5.34 Std. Dev."
          range = label.match(reNumber);
          
          // Convert them to numeric values.
          range = array.map(range, function(numStr) {
            return +lang.trim(numStr);
          });
          
          if (range.length === 2) {
            outInfo.minStdDev = range[0];
            outInfo.maxStdDev = range[1];
            
            // Examples:
            // -0.5 0.5
            // -0.25 0.25
            // -0.19 0.14
            // -0.12 0.13
            if (range[0] < 0 && range[1] > 0) {
              outInfo.hasAvg = true;
            }
          }
          else if (range.length === 1) {
            if (label.indexOf("<") > -1) {
              outInfo.minStdDev = null;
              outInfo.maxStdDev = range[0];
            }
            else if (label.indexOf(">") > -1) {
              outInfo.minStdDev = range[0];
              outInfo.maxStdDev = null;
            }
          }
          
          // console.log(label, range, outInfo.hasAvg);
        }
        
        return outInfo;
      });
     
      dfd.resolve({
        minValue: min,
        maxValue: max,
        classBreakInfos: cbInfos,
        normalizationTotal: renderer.normalizationTotal,
        source: source
      });
    },
    
    _rejectDfd: function(dfd, errorMsg) {
      // TODO
      // Aggregate and bubble up all error messages including the 
      // message/details returned by the service.
      dfd.reject(new Error(errorMsg));
    },
    
    _rejectNonNumeric: function(dfd, fieldInfo, method) {
      var error;
      
      // Reject if
      // 1. Field is not found
      // 2. Field is not numeric
      if (!fieldInfo) {
        this._rejectDfd(dfd, "FeatureLayerStatistics." + method + ": unknown 'field'.");
        error = true;
      }
      else if (
        fieldInfo.name === this.layer.objectIdField || 
        array.indexOf(this._numericTypes, fieldInfo.type) === -1
      ) {
        this._rejectDfd(dfd, "FeatureLayerStatistics." + method + ": 'field' should be numeric.");
        error = true;
      }
      
      return error;
    },
    
    _getAttributeVal: function(attributes, fieldName) {
      // Accessing attribute value would be a simple object["property"],
      // except statistics query result does not retain character casing
      // of out statistic fields provided in the query parameters.
      // We need to do case-agnostic attribute lookup.
      var value, name;
      
      fieldName = fieldName.toLowerCase();
      
      if (attributes) {
        for (name in attributes) {
          if (name.toLowerCase() === fieldName) {
            value = attributes[name];
            break;
          }
        }
      }
      
      return value;
    },
    
    _callAfterLoad: function(callback, info) {
      if (this.layer.loaded) {
        callback.call(this, info);
      }
      else {
        on.once(this.layer, "load", lang.hitch(this, callback, info));
      }
    },
    
    _numericTypes: [
      "esriFieldTypeInteger",
      "esriFieldTypeSmallInteger",
      "esriFieldTypeSingle",
      "esriFieldTypeDouble"
    ],
    
    _createGRTask: function() {

      this._grTask = new GRTask(this.layer, {
        source:     this.layer.source,
        gdbVersion: this.layer.gdbVersion
      });
    }
    
  });
  
  ////////////////////
  // Static functions
  ////////////////////
  
  // All plugins must implement these functions regardless of their
  // internal architecture.
  
  lang.mixin(FeatureLayerStatistics, {
    
    // Called by PluginTarget.addPlugin
    add: function(layer, options) {
      if (!layer.statisticsPlugin) {
        var parameters = options || {};
        parameters.layer = layer;
        
        layer.statisticsPlugin = new FeatureLayerStatistics(parameters);
      }
    },

    // Called by PluginTarget.removePlugin
    remove: function(layer) {
      if (layer.statisticsPlugin) {
        layer.statisticsPlugin.destroy();
        delete layer.statisticsPlugin;
      }
    }
    
  });

  if (has("extend-esri")) {
    lang.setObject("plugins.FeatureLayerStatistics", FeatureLayerStatistics, esriNS);
  }
  
  return FeatureLayerStatistics;
});
