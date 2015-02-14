define([
  "require",
  "module",
  "dojo/_base/array",
  "dojo/_base/lang",
  "dojo/has",
  "dojo/Deferred",
  "dojo/number",
  "dojo/i18n!dojo/cldr/nls/number",
  
  "esri/kernel",
  "esri/Color",
  "esri/styles/type",
  "esri/styles/size",
  "esri/styles/choropleth",
  "esri/styles/heatmap",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  
  "esri/renderers/UniqueValueRenderer",
  "esri/renderers/ClassBreaksRenderer",
  "esri/renderers/HeatmapRenderer",
  
  "dojo/i18n!esri/nls/jsapi"
], 
function(
  require, module, array, lang, has, Deferred, dojoNumber, nlsNumber,
  esriNS, esriColor, typeStyle, sizeStyle, choroplethStyle, heatmapStyle, SMS, SLS, SFS, 
  UVRenderer, CBRenderer, HMRenderer,
  nlsJsapi
) {

  // Based on Smart Feature Styling specification:
  // http://servicesbeta.esri.com/jerome/esri-color-browser/index.html
  // https://devtopia.esri.com/jero6957/esri-color-browser/blob/master/data/schemes.json
  
  var smartMapping = {};
  
  //////////////////////
  // Internal functions
  //////////////////////
  
  ////////////////////
  // Utility functions
  ////////////////////
  
  // This regex matches "dot or comma + trailing zeros" in formatted numbers of this pattern:
  // 234,234.0000000 (lang=en)
  // 234.234,0000000 (lang=de)
  var reZeros = new RegExp("\\" + nlsNumber.decimal + "0+$", "g"),
  
      // This regex matches "last digit + trailing zeros" in formatted numbers of this pattern:
      // 234,234.23423400000 (lang=en)
      // 234.234,23423400000 (lang=de)
      reZerosFractional = new RegExp("(\\d)0*$", "g"),

      // This regex matches an integer or fractional number - positive or negative.
      reNumber = /^-?(\d+)(\.(\d+))?$/i,
      
      // http://www.w3.org/TR/MathML2/bycodes.html
      specialChars = {
        // less-than or equal to
        lte: "\u2264", 
        
        // greater-than or equal to
        gte: "\u2265",
  
        // less-than
        lt: "\u003C",
  
        // greater-than
        gt: "\u003E",
        
        // percent sign
        pct: "%"
      },
      
      // TODO
      // Remove smartStyling when all nls bundles have "smartMapping".
      i18n = nlsJsapi.smartMapping || nlsJsapi.smartStyling,
      defaultTypeTheme = "default",
      defaultColorTheme = "high-to-low",
      defaultSizeTheme = "default",
      defaultHeatmapTheme = "default",
      maxNoiseRatio = 0.01;
  
  function getAbsMid(relativeMid) {
    return require.toAbsMid
    
      // Dojo loader has toAbsMid
      ? require.toAbsMid(relativeMid)
      
      // RequireJS loaded does not support toAbsMid but we can use 
      // module.id
      // http://wiki.commonjs.org/wiki/Modules/1.1
      : (
        module.id.replace(/\/[^\/]*$/ig, "/") + // returns folder containing this module
        relativeMid
      );
  }
  
  function rejectDfd(dfd, errorMsg) {
    dfd.reject(new Error(errorMsg));
  }
  
  function getLabel(data, fieldInfo, domain, layer) {
    var label = String(data),
        domainName = (domain && domain.codedValues) 
          ? domain.getName(data)
          : null;
    
    if (domainName) {
      label = domainName;
    }
    else if (typeof data === "number") {
      if (fieldInfo.type === "esriFieldTypeDate") {
        // TODO
        // Date format
      }
      else {
        // Number format:
        // Add group and decimal separators based on current locale, 
        // but retain precision.
        label = dojoNumber
                  // Pad the fractional part to fill 20 places - due to a
                  // quirk in dojo.number.format that ends up reducing the
                  // precision. We don't want to reduce the precision.
                  .format(data, { places: 20, round: -1 })
                  // Remove insignificant trailing zeros
                  .replace(reZerosFractional, "$1")
                  .replace(reZeros, "");
      }
    }
    
    /*else if (
      typeof data === "number" && 
      fieldInfo.type === "esriFieldTypeDate"
    ) {
      // TODO
      // Date format
    }
    else if (
      typeof data === "number" || 
      array.indexOf(this._numericTypes, fieldInfo.type) > -1
    ) {
      // TODO
      // Number format
    }*/

    // Generate renderer returns date values in this format:
    // "10/5/2012 12:00:00 AM"
    // 1. We don't know the timezone of this date
    // 2. We don't know if the date pattern is m/d/y or d/m/y.
    // Let's just use the date string as label.
    
    return label;
  }
  
  function createSymbol(scheme, color, geomType, size) {
    var symbol, outline;
    
    switch(geomType) {
      case "point":
        symbol = new SMS();
        symbol.setColor(color);
        symbol.setSize(size != null ? size : scheme.size);

        outline = new SLS();
        outline.setColor(scheme.outline.color);
        outline.setWidth(scheme.outline.width);
        
        symbol.setOutline(outline);
        break;
        
      case "line":
        symbol = new SLS();
        symbol.setColor(color);
        symbol.setWidth(size != null ? size : scheme.width);
        break;

      case "polygon":
        symbol = new SFS();
        symbol.setColor(color);
        
        outline = new SLS();
        outline.setColor(scheme.outline.color);
        outline.setWidth(scheme.outline.width);
        
        symbol.setOutline(outline);
        break;
    }
    
    return symbol;
  }
  
  function getGeometryType(layer) {
    var geomType = layer.geometryType;
    
    if (geomType === "esriGeometryPoint" || geomType === "esriGeometryMultipoint") {
      geomType = "point";
    }
    else if (geomType === "esriGeometryPolyline") {
      geomType = "line";
    }
    else if (geomType === "esriGeometryPolygon") {
      geomType = "polygon";
    }
    
    return geomType;
  }
  
  ////////////////////
  // Types
  ////////////////////
  
  function getTypeScheme(params, geomType) {
    var scheme = params.scheme;
    
    // If scheme is not provided, use the primary scheme
    // available for the given theme/basemap/geomType
    // combination.
    if (!scheme) {
      scheme = typeStyle.getSchemes({
        theme: params.theme || defaultTypeTheme,
        basemap: params.basemap,
        geometryType: geomType
      });
      
      scheme = scheme && scheme.primaryScheme;
    }
    
    return scheme;
  }
  
  function sortUVByLabel(a, b) {
    var diff;
    
    // "label ASC"
    if (a.label < b.label) { 
      diff = -1; 
    } 
    else if (a.label > b.label) { 
      diff = 1;
    }
    else {
      diff = 0;
    } 
    
    return diff;
  }
  
  function sortUVByValue(a, b) {
    var diff;
    
    // "value ASC"
    if (a.value < b.value) { 
      diff = -1; 
    } 
    else if (a.value > b.value) { 
      diff = 1;
    }
    else {
      diff = 0;
    } 
    
    return diff;
  }
  
  function sortUVByCountLabel(a, b) {
    // "count DESC"
    var diff = b.count - a.count; 
    
    // If both counts are identical, then "label ASC" 
    if (diff === 0) {
      diff = sortUVByLabel(a, b);
    }
    
    return diff;
  }
  
  function sortUVByCountValue(a, b) {
    // "count DESC"
    var diff = b.count - a.count; 
    
    // If both counts are identical, then "value ASC"
    if (diff === 0) {
      diff = sortUVByValue(a, b);
    }
    
    return diff;
  }
  
  function sortUVInfos(uvInfos, sortBy, domain) {
    var sortFunc;
    
    if (sortBy === "count") {
      sortFunc = sortUVByCountValue;
      
      if (domain && domain.codedValues)  {
        sortFunc = sortUVByCountLabel;
      }
    }
    else if (sortBy === "value") {
      sortFunc = sortUVByValue;
      
      if (domain && domain.codedValues) {
        sortFunc = sortUVByLabel;
      }
    }
    
    if (sortFunc) {
      uvInfos.sort(sortFunc);
    }
  }
  
  function rendererFromUV(response, params, dfd) {
    // Pick a style scheme, and create the renderer
    var uvInfos = response.uniqueValueInfos,
        layer = params.layer,
        field = params.field,
        fieldInfo = layer.getField(field),
        domain = layer.getDomain(fieldInfo.name),
        i, uvInfo, colors,
        nullIndex = -1, nullInfo,
        
        numTypes = (params.numTypes == null) 
          ? 10 
          // -1 implies we need to show all available types
          : (params.numTypes === -1) ? uvInfos.length : params.numTypes,
        
        showOthers = (params.showOthers == null) ? true : params.showOthers,
        sortBy = (params.sortBy == null) ? "count" : params.sortBy,
        
        // For TESTING only!
        labelCallback = params && params.labelCallback,
        
        geomType = getGeometryType(layer),
        scheme = getTypeScheme(params, geomType),
        
        renderer = new UVRenderer(null, field);
    
    ////////////////////
    // Unique values
    ////////////////////
    
    // Add label to all unique values.
    array.forEach(uvInfos, function(uvInfo, idx) {
      uvInfo.label = getLabel(uvInfo.value, fieldInfo, domain, layer);
      
      // For TESTING only!
      if (labelCallback) {
        uvInfo.label = labelCallback(uvInfo);
      }
      
      if (uvInfo.value === null) {
        nullIndex = idx;
      }
    });
    
    // Remove null value info
    if (nullIndex > -1) {
      nullInfo = uvInfos.splice(nullIndex, 1)[0];
    }
    
    // Sort uvInfos
    sortUVInfos(uvInfos, sortBy, domain);
    
    // Get colors for all available unique values
    colors = smartMapping.createColors(scheme.colors, uvInfos.length);
    
    // Add symbol to all unique values.
    // We need to return everything to the caller.
    array.forEach(uvInfos, function(uvInfo, idx) {
      uvInfo.symbol = createSymbol(scheme, colors[idx], geomType);
    });
    
    ////////////////////
    // Create renderer
    ////////////////////

    // Make sure we have enough colors to support numTypes.
    colors = smartMapping.createColors(scheme.colors, numTypes);
    
    // Add UniqueValueInfos to renderer
    for (i = 0; i < numTypes; i++) {
      uvInfo = uvInfos[i];
      
      // [1] uvInfos.length may be less than numTypes. Lets make sure we have uvInfo.
      // [2] Do not include null here - it should be displayed as part of "others"
      if (uvInfo) {
        renderer.addValue({
          value: uvInfo.value,
          label: uvInfo.label,
          symbol: createSymbol(scheme, colors[i], geomType)
        });
      }
    }
    
    // Add default symbol and label if required.
    if (showOthers) {
      renderer.defaultSymbol = createSymbol(scheme, scheme.noDataColor, geomType);
      renderer.defaultLabel = i18n.others;
    }
    
    // Add null value to the end of the list.
    if (nullInfo) {
      nullInfo.symbol = createSymbol(scheme, scheme.noDataColor, geomType);
      uvInfos.push(nullInfo);
    }

    dfd.resolve({ 
      renderer: renderer,
      uniqueValueInfos: uvInfos,
      source: response.source,
      othersStartIndex: (renderer.infos.length === uvInfos.length) ? -1 : renderer.infos.length
    });
  }
  
  ////////////////////
  // Color functions
  ////////////////////
  
  function getColorScheme(params, geomType, enforcedTheme) {
    var scheme = params.scheme;

    // If scheme is not provided, use the primary scheme
    // available for the given theme/basemap/geomType
    // combination.
    if (!scheme) {
      scheme = choroplethStyle.getSchemes({
        theme: enforcedTheme || params.theme || defaultColorTheme,
        basemap: params.basemap,
        geometryType: geomType
      });
      
      scheme = scheme && scheme.primaryScheme;
    }

    return scheme;
  }
  
  ////////////////////
  // Unclassed color
  ////////////////////
  
  function getDigits(number) {
    // Returns number of digits in the integer and fractional parts of the 
    // given numeric value.
    var numString = String(number),
        match = numString.match(reNumber),
        retVal = {
          integer: 0,
          fractional: 0
        };
    
    //console.log("match = ", match);
    
    if (match && match[1]) {
      retVal.integer = match[1].split("").length;
      retVal.fractional = match[3] ? match[3].split("").length : 0;
    }
    
    return retVal;
  }
  
  function getFixedNumbers(number, fractionDigits) {
    var num1, num2;
    
    num1 = Number( number.toFixed(fractionDigits) );
    
    if (num1 < number) {
      // num2 will be larger than num1/number
      num2 = num1 + ( 1 / Math.pow(10, fractionDigits) );
    }
    else {
      // num2 will be smaller than num1/number
      num2 = num1 - ( 1 / Math.pow(10, fractionDigits) );
    }
    
    // Returns two numbers (equivalent to floor and ceil of the given number):
    // One less than the given number.
    // The other greater than the given number.
    return [ num1, num2 ];
  }
  
  function getPctChange(number, fixedNumber, prev, next) {
    // Returns the absolute percent change of the given number 
    // (after it has been changed to <fixedNumber>)
    // w.r.t its nearby numbers given as <prev> and <next>.
    var change = {
          prev: null,
          next: null
        },
        oldDiff, newDiff, diffChange;
    
    if (prev != null) {
      oldDiff = number - prev;
      newDiff = fixedNumber - prev;
      diffChange = newDiff - oldDiff;
  
      change.prev = Math.floor(Math.abs( (diffChange * 100) / oldDiff ));
    }
    
    if (next != null) {
      oldDiff = next - number;
      newDiff = next - fixedNumber;
      diffChange = newDiff - oldDiff;
  
      change.next = Math.floor(Math.abs( (diffChange * 100) / oldDiff ));
    }
    
    return change;
  }
  
  function hasMinimalChange(number, fixedNumber, prev, next, pctTolerance) {
    // Returns true if the given <fixedNumber> has changed minimally with 
    // respect to the nearby numbers in the sequence given by <prev> and <next>.
    var change = getPctChange(number, fixedNumber, prev, next),
        prevOk, nextOk, isMinimal;
    
    //console.log(" ", change, fixedNumber);
  
    // It is considered minimal change if one of the following conditions is true:
    // 1. Change w.r.t <prev> is atmost <pctTolerance> AND 
    //    Change w.r.t <next> is atmost <pctTolerance>
    // 2. Sum of change w.r.t <prev> and <next> is atmost twice the <pctTolerance>.
    prevOk = (change.prev == null || change.prev <= pctTolerance);
    nextOk = (change.next == null || change.next <= pctTolerance);
  
    isMinimal = (prevOk && nextOk) 
      || ( (change.prev + change.next) <= (2 * pctTolerance) );
    
    return isMinimal;
  }
  
  function fixPrecision(numbers, pctTolerance) {
    var numbersCopy = numbers.slice(0), i;
    pctTolerance = (pctTolerance == null) ? 2 : pctTolerance;
  
    //console.log("Numbers: ", numbers);
    //console.log("Percent tolerance: ", pctTolerance);
    
    for (i = 0; i < numbersCopy.length; i++) {
      var number = numbersCopy[i],
          prev = (i === 0) ? null : numbersCopy[i - 1],
          next = (i === (numbersCopy.length - 1)) ? null : numbersCopy[i + 1],
          digits = getDigits(number),
          fractionDigits = digits.fractional, fixedNumber, fixedNumbers,
          j, found;
      
      //console.log(number, digits, prev, next);
      
      // Let's reduce the precision of fractional numbers.
      if (fractionDigits) {
        j = 0;
        found = false;
        
        // Keep iterating until we find an optimal precision.
        while (j <=  fractionDigits && !found) {
          fixedNumbers = getFixedNumbers(number, j);
          
          // Use the adjusted/fixed number only if it introduces minimal change 
          // in the sequence.
          fixedNumber = fixedNumbers[0];
          found = hasMinimalChange(number, fixedNumber, prev, next, pctTolerance);
          
          j++;
        }
        
        if (found) {
          // Update the sequence with the fixed number so that the next number 
          // in sequence can be adjusted based on it.
          numbersCopy[i] = fixedNumber;
        }
      }
    }
    
    //console.log("Fixed: ", numbersCopy);
    return numbersCopy;
  }
  
  // TODO
  // Export this function?
  function createStopValues(stats) {
    var avg = stats.avg,
        
        // We want stops to cover 1 stddev on either side of data average.
        minValue = avg - stats.stddev,
        maxValue = avg + stats.stddev,
        values;
    
    // Make sure we're within the data range
    if (minValue < stats.min) {
      minValue = stats.min;
    }
    
    if (maxValue > stats.max) {
      maxValue = stats.max;
    }
    
    // TODO
    // Support user defined values:
    // [ minValue, midValue, maxValue ]
    
    values = [
      minValue,
      minValue + ((avg - minValue) / 2),
      avg,
      avg + ((maxValue - avg) / 2),
      maxValue
    ];
    
    // TODO
    // Support normalizationField?
    
    return fixPrecision(values);
  }
  
  function colorRendererFromStats(stats, cbResponse, normType, normField, params, dfd) {
    var layer = params.layer,
        field = params.field,
        geomType = getGeometryType(layer),
        showOthers = (params.showOthers == null) ? true : params.showOthers,
        scheme = getColorScheme(params, geomType),
        schemeName = scheme.name && scheme.name.toLowerCase(),
        labelIndices, values, numStops,
        
        // 5 colors
        // 6 colors (spectral), if group-similar theme
        colors = smartMapping.createColors(scheme.colors, scheme.colors.length),
        
        // We need ClassBreaksRenderer so that we can support the case where 
        // showOthers is set to false i.e. we still need to provide a 
        // base symbol that ColorInfo can override for features that have data. 
        // We'll use a single class break for this purpose - see below.
        renderer = new CBRenderer(null, field);
  
    // Symbol for features with NULL value
    if (showOthers) {
      renderer.defaultSymbol = createSymbol(scheme, scheme.noDataColor, geomType);
      renderer.defaultLabel = i18n.others;
    }
    
    // Symbol for features that have data.
    renderer.addBreak({
      // TODO
      // Legend: if this field === colorInfo.field, then do not repeat the 
      // field label in color ramp section.
      label:    field,
      
      minValue: -Number.MAX_VALUE,
      maxValue: Number.MAX_VALUE,
      symbol:   createSymbol(scheme, scheme.noDataColor, geomType)
    });
    
    // theme = group-similar
    if (cbResponse) {
      // Use the mid value from each break, so that the break color 
      // dissipates on either side of the mid value and blends with the 
      // nearby break. Whereas before, a break color for a group would 
      // spill over into the nearby group which is not ideal.
      values = array.map(cbResponse.classBreakInfos, function(cbInfo) {
        return (cbInfo.minValue + cbInfo.maxValue) / 2;
      });
      
      values = fixPrecision(values);
  
      // Display labels for all stops
      labelIndices = [0, 1, 2, 3, 4, 5];
    }
    // theme != group-similar
    else {
      // Get 5 stop values
      values = createStopValues(stats);

      // high to low: display labels for min and max values only.
      // other themes: display min, avg and max labels.
      // params.theme is optional when params.scheme is specified.
      // Use scheme.name to decide labeling strategy.
      labelIndices = (schemeName.indexOf("seq-") === 0) ? [0, 4] : [0, 2, 4];
    }
    
    renderer.normalizationType = normType;
    renderer.normalizationField = normField;
    
    numStops = values.length;
    
    // ColorInfo
    renderer.setVisualVariables([
      {
        type: "colorInfo",
        field: field,
        normalizationField: normField,
        
        stops: array.map(values, function(value, idx) {
          var labelPrefix = "";
          
          // Add label prefix for the first and last stops.
          if (idx === 0) {
            // less-than sign
            labelPrefix = specialChars.lt + " ";
          }
          else if (idx === (numStops - 1)) {
            // greater-than sign
            labelPrefix = specialChars.gt + " ";
          }
          
          return {
            value: value,
            color: colors[idx],
            
            label: (array.indexOf(labelIndices, idx) > -1) 
              ? (labelPrefix + String(value))
              : null
          };
        })
      }
    ]);
  
    dfd.resolve({
      renderer: renderer,
      statistics: stats,
      classBreaks: cbResponse
    });
  }
  
  ////////////////////
  // Unclassed size
  ////////////////////
  
  function getSizeScheme(params, geomType) {
    var scheme = params.scheme;
    
    // If scheme is not provided, use the primary scheme
    // available for the given theme/basemap/geomType
    // combination.
    if (!scheme) {
      scheme = sizeStyle.getSchemes({
        theme: params.theme || defaultSizeTheme,
        basemap: params.basemap,
        geometryType: geomType
      });
      
      scheme = scheme && scheme.primaryScheme;
    }
    
    return scheme;
  }
  
  function getSizeRange(scheme, geomType) {
    var range;
    
    switch(geomType) {
      case "point":
        range = [ scheme.minSize, scheme.maxSize ];
        break;
        
      case "line":
        range = [ scheme.minWidth, scheme.maxWidth ];
        break;

      case "polygon":
        range = [ scheme.marker.minSize, scheme.marker.maxSize ];
        break;
    }
    
    return range;
  }
  
  function sizeRendererFromStats(stats, normType, normField, params, dfd) {
    var layer = params.layer,
        field = params.field,
        geomType = getGeometryType(layer),
        showOthers = (params.showOthers == null) ? true : params.showOthers,
        
        scheme = getSizeScheme(params, geomType),
        sizeRange = getSizeRange(scheme, geomType),

        isPolygon = (geomType === "polygon"),
        geomScheme = isPolygon ? scheme.marker : scheme,
        backgroundScheme = isPolygon ? scheme.background : null,
        
        // Reason for choice of ClassBreaksRenderer is same as colorRendererFromStats
        renderer = new CBRenderer(null, field);
    
    // Symbol for features with NULL value
    if (showOthers) {
      renderer.defaultSymbol = createSymbol(
        geomScheme, 
        // TODO
        // Legend: noDataColor/Others is all white and cannot be seen
        // noDataColor looks identical to features with data for secondary schemes of light basemaps
        geomScheme.noDataColor, 
        isPolygon ? "point" : geomType
      );
      
      renderer.defaultLabel = i18n.others;
    }
    
    // Symbol for features that have data.
    renderer.addBreak({
      // TODO
      // Legend: if this field === colorInfo.field, then do not repeat the 
      // field label in color ramp section.
      label:    field,
      
      minValue: -Number.MAX_VALUE,
      maxValue: Number.MAX_VALUE,
      
      symbol: createSymbol(
        geomScheme, 
        geomScheme.color,
        isPolygon ? "point" : geomType
      )
    });
  
    if (backgroundScheme) {
      renderer.backgroundFillSymbol = createSymbol(backgroundScheme, backgroundScheme.color, geomType);
    }
    
    renderer.normalizationType = normType;
    renderer.normalizationField = normField;
    
    // SizeInfo
    renderer.setVisualVariables([
      {
        type: "sizeInfo",
        field: field,
        valueUnit: "unknown",
        normalizationField: normField,
        
        minSize: sizeRange[0],
        
        // TODO
        // Calculate based on feature count
        maxSize: sizeRange[1],
        
        minDataValue: stats.min,
        maxDataValue: stats.max
      }
    ]);
    
    // TODO
    // Legend does not interpolate when minDataValue = 0
  
    dfd.resolve({
      renderer: renderer,
      statistics: stats
    });
  }
  
  ////////////////////
  // Classed color
  ////////////////////

  function interpolateColors(start, end, numColors) {
    // Returns <numColors> colors in the given color range - excluding start
    // and end
    var i, colors = [], ratio = 1 / (numColors + 1);

    for (i = 1; i <= numColors; i++) {
      colors.push(
        esriColor.blendColors(start, end, ratio * i)
      );
    }

    return colors;
  }

  function getSDColors(colors, numColors) {
    // There are always 3 colors.
    // First color is always the avg color.
    // numColors can be in range 1 to N depending on number of stddev breaks.
    var outColors = [];

    if (numColors === 1) {
      // Use avg color
      outColors = [ colors[0] ];
    }
    else if (numColors === 2) {
      // Use the avg color and extreme color
      outColors = [ colors[0], colors[2] ];
    }
    else if (numColors === 3) {
      // Use avg, mid and extreme colors
      outColors = colors;
    }
    else {
      var diff = numColors - colors.length,
          half = diff / 2,
          bottomColors, topColors;

      if (diff % 2 === 0) {
        // Equal halves
        bottomColors = interpolateColors(colors[0], colors[1], half);
        topColors = interpolateColors(colors[1], colors[2], half);
      }
      else {
        // Unequal halves: one of them may have 0 colors.
        bottomColors = interpolateColors(colors[0], colors[1], Math.floor(half));
        topColors = interpolateColors(colors[1], colors[2], Math.ceil(half));
      }

      outColors = [ colors[0] ]
        .concat(bottomColors)
        .concat([ colors[1] ])
        .concat(topColors)
        .concat([ colors[2] ]);
    }

    return outColors;
  }
  
  function getColorsForBreaks(scheme, breaks, isStdDev) {
    // Returns colors for the given breaks based on the scheme:
    // We'll use colors from scheme.colors for "standard-deviation", and
    // scheme.colorsForClassBreaks for all other classification methods.

    var colors, numClasses = breaks.length, indexOfAvg = -1;

    if (isStdDev) {
      // Find the break info that contains the average data value.
      array.some(breaks, function(brk, idx) {
        if (brk.hasAvg) {
          indexOfAvg = idx;
        }

        return (indexOfAvg > -1);
      });
    }

    if (indexOfAvg > -1) {
      // scheme = "above-and-below"
      // Assign "below" colors for breaks before break-with-avg.
      // Assign the middle color for break-with-avg.
      // Assign "above" colors for breaks after break-with-avg.

      // 5 colors: 3rd color is neutral and should be used for break-with-avg
      var stopColors = scheme.colors,

          // Calculate num of colors above and below the avg color
          // (including the avg color).
          numBelow = indexOfAvg + 1,
          numAbove = numClasses - indexOfAvg,

          // Split stopColors into two arrays: below, above
          belowColors = stopColors.slice(0, 3), // last color is avg color
          aboveColors = stopColors.slice(2);    // first color is avg color

      belowColors.reverse(); // first color is avg color

      // console.log(indexOfAvg, numBelow, numAbove, belowColors, aboveColors);

      belowColors = getSDColors(belowColors, numBelow);
      aboveColors = getSDColors(aboveColors, numAbove);

      belowColors.reverse(); // last color is avg color

      colors = []
        // last color is avg color
        .concat(belowColors)

        // Exclude the first color since avg color is already included at the
        // end of belowColors
        .concat(aboveColors.slice(1));
    }
    else {
      // Method is NOT stddev, or
      // Method is stddev, but break-with-avg cannot be found for some reason.
      array.some(scheme.colorsForClassBreaks, function(clrInfo) {
        if (clrInfo.numClasses === numClasses) {
          colors = clrInfo.colors;
        }

        return !!colors;
      });
    }

    // Copy/clone colors
    if (colors) {
      colors = smartMapping.createColors(colors, colors.length);
    }
    
    return colors;
  }
  
  /*function getClassLabel(cbInfo, params) {
    var min = cbInfo.minValue, max = cbInfo.maxValue,
        suffix = "";
    
    if (params.normalizationType === "percent-of-total") {
      suffix = specialChars.pct;
    }
    
    return min + suffix + " - " + max + suffix;
  }*/
  
  function colorRendererFromCB(cbResponse, params, dfd) {
    var layer = params.layer,
        field = params.field,
        geomType = getGeometryType(layer),
        showOthers = (params.showOthers == null) ? true : params.showOthers,

        classMethod = params.classificationMethod || "equal-interval",
        isStdDev = (classMethod === "standard-deviation"),
        normType = params.normalizationType,
        
        // Enforce theme based on classification method.
        // Other themes are not supported.
        enforcedTheme = isStdDev ? "above-and-below" : "high-to-low",
          
        scheme, colors, renderer, breaks = cbResponse.classBreakInfos;

    scheme = getColorScheme(params, geomType, enforcedTheme);
    
    if (!scheme) {
      rejectDfd(dfd, "smartMapping.createClassedColorRenderer: unable to find suitable style scheme.");
      return;
    }
    
    colors = getColorsForBreaks(scheme, breaks, isStdDev);
    
    if (!colors || colors.length != breaks.length) {
      rejectDfd(dfd, "smartMapping.createClassedColorRenderer: unable to find suitable colors for number of classes.");
      return;
    }
    
    ////////////////////
    // Create renderer
    ////////////////////

    renderer = new CBRenderer(null, field);

    // Metadata
    renderer.classificationMethod = classMethod;
    renderer.normalizationType = normType;
    renderer.normalizationField = (normType === "field") ? params.normalizationField : undefined;
    renderer.normalizationTotal = (normType === "percent-of-total") ? cbResponse.normalizationTotal : undefined;

    // Symbol for features with NULL value
    if (showOthers) {
      renderer.defaultSymbol = createSymbol(scheme, scheme.noDataColor, geomType);
      renderer.defaultLabel = i18n.others;
    }

    // Add class break infos with varying colors.
    array.forEach(breaks, function(brk, idx) {
      renderer.addBreak({
        minValue: brk.minValue,
        maxValue: brk.maxValue,
        symbol:   createSymbol(scheme, colors[idx], geomType),
        label:    brk.label
      });
    });
        
    cbResponse.renderer = renderer;
    
    dfd.resolve(cbResponse);
  }
  
  ////////////////////
  // Classed size
  ////////////////////
  
  function interpolateSize(scheme, geomType, numClasses) {
    // Return <numClasses> size values.
    var range = getSizeRange(scheme, geomType),
        minSize = range[0], maxSize = range[1],
        
        // Make sure we reach maxSize when numClasses = 4 or more. Hence 
        // the divisor below.
        interval = (maxSize - minSize) / (numClasses >= 4 ? (numClasses - 1) : numClasses),
        
        i, sizeBreaks = [];
   
    for (i = 0; i < numClasses; i++) {
      sizeBreaks.push(minSize + (interval * i));
    }
    
    /*if (numClasses === 1) {
      sizeBreaks = [ minSize ];
    }
    else if (numClasses === 2) {
      sizeBreaks = [ minSize, maxSize ];
    }
    else {
      var numInterpolated = numClasses - 2, // exclude minSize and maxSize since we already got them
          ratio = 1 / (numInterpolated + 1),
          i;
      
      range = maxSize - minSize;
      
      sizeBreaks.push(minSize);
      
      for (i = 1; i <= numInterpolated; i++) {
        sizeBreaks.push(minSize + (range * ratio * i));
      }
      
      sizeBreaks.push(maxSize);
    }*/
    
    return sizeBreaks;
  }

  function sizeRendererFromCB(cbResponse, params, dfd) {
    var layer = params.layer,
        field = params.field,
        geomType = getGeometryType(layer),
        showOthers = (params.showOthers == null) ? true : params.showOthers,
        classMethod = params.classificationMethod || "equal-interval",
        normType = params.normalizationType,
        breaks = cbResponse.classBreakInfos,
        
        scheme = getSizeScheme(params, geomType),
        sizeValues = interpolateSize(scheme, geomType, breaks.length),

        isPolygon = (geomType === "polygon"),
        geomScheme = isPolygon ? scheme.marker : scheme,
        backgroundScheme = isPolygon ? scheme.background : null,
        
        renderer;
    
    ////////////////////
    // Create renderer
    ////////////////////

    renderer = new CBRenderer(null, field);

    // Metadata
    renderer.classificationMethod = classMethod;
    renderer.normalizationType = normType;
    renderer.normalizationField = (normType === "field") ? params.normalizationField : undefined;
    renderer.normalizationTotal = (normType === "percent-of-total") ? cbResponse.normalizationTotal : undefined;

    // Symbol for features with NULL value
    if (showOthers) {
      renderer.defaultSymbol = createSymbol(
        geomScheme, 
        geomScheme.noDataColor, 
        isPolygon ? "point" : geomType
      );
      
      renderer.defaultLabel = i18n.others;
    }
  
    if (backgroundScheme) {
      renderer.backgroundFillSymbol = createSymbol(backgroundScheme, backgroundScheme.color, geomType);
    }

    // Add class break infos with varying size.
    array.forEach(breaks, function(brk, idx) {
      renderer.addBreak({
        minValue: brk.minValue,
        maxValue: brk.maxValue,
        symbol:   createSymbol(
          geomScheme, 
          geomScheme.color, 
          isPolygon ? "point" : geomType, 
          sizeValues[idx]
        ),
        label:    brk.label
      });
    });
        
    cbResponse.renderer = renderer;
    
    dfd.resolve(cbResponse);
  }
  
  ////////////////////
  // Heatmap
  ////////////////////
  
  function getHeatmapScheme(params) {
    var scheme = params.scheme;
    
    // If scheme is not provided, use the primary scheme
    // available for the given theme/basemap/geomType
    // combination.
    if (!scheme) {
      scheme = heatmapStyle.getSchemes({
        theme: params.theme || defaultHeatmapTheme,
        basemap: params.basemap
      });
      
      scheme = scheme && scheme.primaryScheme;
    }
    
    return scheme;
  }
  
  function heatmapRenderer(stats, params, dfd) {
    var field = params.field,
        blurRadius = (params.blurRadius == null) ? 10 : params.blurRadius,
        minRatio = (params.minRatio == null) ? 0.01 : params.minRatio,
        maxRatio = (params.maxRatio == null) ? 1 : params.maxRatio,
        fadeToTransparent = (params.fadeToTransparent == null) ? true : params.fadeToTransparent,
        scheme = getHeatmapScheme(params),
        colors = scheme.colors,
        numColors = colors.length,
        renderer = new HMRenderer();
    
    renderer.setBlurRadius(blurRadius);
    renderer.setField(field);
    
    renderer.setMinPixelIntensity(stats.min);
    renderer.setMaxPixelIntensity(stats.max);
    
    // Add colorStops
    var firstColor = colors[0],
        colorStops = [
          // The first color needs to be fully transparent to avoid solid background 
          // color everywhere.
          { ratio: 0,    color: new esriColor([ firstColor.r, firstColor.g, firstColor.b, 0 ]) },
          
          // All pixels with <maxNoiseRatio> or less are considered noise.
          { ratio: maxNoiseRatio, color: new esriColor([ firstColor.r, firstColor.g, firstColor.b, 0 ]) },
          
          { 
            ratio: fadeToTransparent ? minRatio : maxNoiseRatio, 
            color: firstColor  // opacity = 0.7
          }
        ],
        interval = (maxRatio - minRatio) / (numColors - 1);
    
    colors = smartMapping.createColors(colors, numColors);

    array.forEach(colors, function(color, idx) {
      colorStops.push({
        ratio: minRatio + (interval * idx),
        color: color
      });
    });
    
    renderer.setColorStops(colorStops);
    
    dfd.resolve({
      renderer: renderer,
      statistics: stats
    });
  }
  
  ////////////////////
  // Module value
  ////////////////////
  
  var statsPluginUrl = getAbsMid("./FeatureLayerStatistics");

  lang.mixin(smartMapping, {
    
    createColors: function(colors, numColors) {
      // Returns <numColors> colors - repeats colors if necessary.
      var outColors = [], maxColors = colors.length, i;
      
      for (i = 0; i < numColors; i++) {
        outColors.push(
          new esriColor(colors[i % maxColors])
        );
      }
      
      return outColors;
    },
    
    createTypeRenderer: function(parameters) {
      // parameters:
      //  layer, field, theme, basemap, scheme?
      //  numTypes(10), showOthers(true)
      //  sortBy(count [value])
      //  labelCallback
      var dfd = new Deferred();
      
      // Reject if parameters are missing.
      if (
        !(
          parameters &&
          parameters.layer && 
          parameters.field && 
          (
            parameters.scheme || parameters.basemap
          )
        )
      ) {
        rejectDfd(dfd, "smartMapping.createTypeRenderer: missing parameters.");
        return dfd.promise;
      }

      var layer = parameters.layer;
      
      layer
        .addPlugin(statsPluginUrl)
        
        .then(function() {
          layer.statisticsPlugin
               .getUniqueValues({ field: parameters.field })
               
               .then(function(response) {
                 rendererFromUV(response, parameters, dfd);
               })
               
               .otherwise(function(error) {
                 rejectDfd(dfd, "smartMapping.createTypeRenderer: error when calculating unique values.");
               });
        })
        
        .otherwise(function(error) {
          rejectDfd(dfd, "smartMapping.createTypeRenderer: error when adding feature layer statistics plugin.");
        });
      
      return dfd.promise;
    },
    
    createColorRenderer: function(parameters) {
      var dfd = new Deferred();
      
      // Reject if parameters are missing.
      if (
        !(
          parameters &&
          parameters.layer && 
          parameters.field
        )
      ) {
        rejectDfd(dfd, "smartMapping.createColorRenderer: missing parameters.");
        return dfd.promise;
      }

      var layer = parameters.layer,
          normField = parameters.normalizationField,
          normType = normField ? "field" : undefined;
      
      // TODO
      // We cannot support percent-of-total and log normalization until 
      // ColorInfo and SizeInfo support them.
      
      if (parameters.statistics) {
        colorRendererFromStats(parameters.statistics, null, normType, normField, parameters, dfd);
      }
      else {
        layer
          .addPlugin(statsPluginUrl)
          
          .then(function() {
            
            // Use class breaks for group-similar.
            // Use field statistics for other themes.
            
            if (parameters.theme === "group-similar") {
              layer.statisticsPlugin
                   .getClassBreaks({ 
                     field: parameters.field,
                     classificationMethod: "natural-breaks",
                     
                     // TODO
                     // Number of colors in the scheme should determine numClasses
                     numClasses: 6,
                     
                     normalizationType: normType,
                     normalizationField: normField
                   })
                   
                   .then(function(cbResponse) {
                     colorRendererFromStats(null, cbResponse, normType, normField, parameters, dfd);
                   })
                   
                   .otherwise(function(error) {
                     rejectDfd(dfd, "smartMapping.createColorRenderer: error when calculating class breaks.");
                   });
            }
            else {
              layer.statisticsPlugin
                   .getFieldStatistics({
                     field: parameters.field,
                     normalizationType: normType,
                     normalizationField: normField
                   })
                   
                   .then(function(stats) {
                     colorRendererFromStats(stats, null, normType, normField, parameters, dfd);
                   })
                   
                   .otherwise(function(error) {
                     rejectDfd(dfd, "smartMapping.createColorRenderer: error when calculating field statistics.");
                   });
            }
            
          })
          
          .otherwise(function(error) {
            rejectDfd(dfd, "smartMapping.createColorRenderer: error when adding feature layer statistics plugin.");
          });
      }
      
      return dfd.promise;
    },
    
    createSizeRenderer: function(parameters) {
      var dfd = new Deferred();
      
      // Reject if parameters are missing.
      if (
        !(
          parameters &&
          parameters.layer && 
          parameters.field
        )
      ) {
        rejectDfd(dfd, "smartMapping.createSizeRenderer: missing parameters.");
        return dfd.promise;
      }

      var layer = parameters.layer,
          normField = parameters.normalizationField,
          normType = normField ? "field" : undefined;
      
      // TODO
      // We cannot support percent-of-total and log normalization until 
      // ColorInfo and SizeInfo support them.
      
      if (parameters.statistics) {
        sizeRendererFromStats(parameters.statistics, normType, normField, parameters, dfd);
      }
      else {
        layer
          .addPlugin(statsPluginUrl)
          
          .then(function() {
            layer.statisticsPlugin
                 .getFieldStatistics({
                   field: parameters.field,
                   normalizationType: normType,
                   normalizationField: normField
                 })
                 
                 .then(function(stats) {
                   sizeRendererFromStats(stats, normType, normField, parameters, dfd);
                 })
                 
                 .otherwise(function(error) {
                   rejectDfd(dfd, "smartMapping.createSizeRenderer: error when calculating field statistics.");
                 });
          })
          
          .otherwise(function(error) {
            rejectDfd(dfd, "smartMapping.createSizeRenderer: error when adding feature layer statistics plugin.");
          });
      }
      
      return dfd.promise;
    },
    
    createClassedColorRenderer: function(parameters) {
      var dfd = new Deferred();
      
      // Reject if parameters are missing.
      if (
        !(
          parameters &&
          parameters.layer && 
          parameters.field
        )
      ) {
        rejectDfd(dfd, "smartMapping.createClassedColorRenderer: missing parameters.");
        return dfd.promise;
      }

      var layer = parameters.layer;
      
      layer
        .addPlugin(statsPluginUrl)
        
        .then(function() {
          layer.statisticsPlugin
               .getClassBreaks(parameters)
               
               .then(function(cbResponse) {
                 colorRendererFromCB(cbResponse, parameters, dfd);
               })
               
               .otherwise(function(error) {
                 rejectDfd(dfd, "smartMapping.createClassedColorRenderer: error when calculating class breaks.");
               });
        })
        
        .otherwise(function(error) {
          rejectDfd(dfd, "smartMapping.createClassedColorRenderer: error when adding feature layer statistics plugin.");
        });
    
      return dfd.promise;
    },
    
    createClassedSizeRenderer: function(parameters) {
      var dfd = new Deferred();
      
      // Reject if parameters are missing.
      if (
        !(
          parameters &&
          parameters.layer && 
          parameters.field
        )
      ) {
        rejectDfd(dfd, "smartMapping.createClassedSizeRenderer: missing parameters.");
        return dfd.promise;
      }

      var layer = parameters.layer;
      
      layer
        .addPlugin(statsPluginUrl)
        
        .then(function() {
          layer.statisticsPlugin
               .getClassBreaks(parameters)
               
               .then(function(cbResponse) {
                 sizeRendererFromCB(cbResponse, parameters, dfd);
               })
               
               .otherwise(function(error) {
                 rejectDfd(dfd, "smartMapping.createClassedSizeRenderer: error when calculating class breaks.");
               });
        })
        
        .otherwise(function(error) {
          rejectDfd(dfd, "smartMapping.createClassedSizeRenderer: error when adding feature layer statistics plugin.");
        });
    
      return dfd.promise;
    },
    
    createHeatmapRenderer: function(parameters) {
      var dfd = new Deferred();
      
      // Reject if parameters are missing.
      if (
        !(
          parameters &&
          parameters.layer
        )
      ) {
        rejectDfd(dfd, "smartMapping.createHeatmapRenderer: missing parameters.");
        return dfd.promise;
      }

      var layer = parameters.layer;
      
      if (parameters.statistics) {
        heatmapRenderer(parameters.statistics, parameters, dfd);
      }
      else {
        layer
          .addPlugin(statsPluginUrl)
          
          .then(function() {
            layer.statisticsPlugin
                 .getHeatmapStatistics(parameters)
                 
                 .then(function(stats) {
                   heatmapRenderer(stats, parameters, dfd);
                 })
                 
                 .otherwise(function(error) {
                   rejectDfd(dfd, "smartMapping.createHeatmapRenderer: error when calculating heatmap statistics.");
                 });
          })
          
          .otherwise(function(error) {
            rejectDfd(dfd, "smartMapping.createHeatmapRenderer: error when adding feature layer statistics plugin.");
          });
      }
      
      return dfd.promise;
    }
    
  });

  if (has("extend-esri")) {
    lang.setObject("renderer.smartMapping", smartMapping, esriNS);
  }
  
  return smartMapping;
});
