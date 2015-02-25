if (!this.util || typeof this.util !== 'object') {
    this.util = {};
}

util.defaults = {

  extent:  {
    'xmin': -24140227.55632808,
    'ymin': 2529400.5847910205,
    'xmax': 13430100.586391762,
    'ymax': 8399764.357090997,
    'spatialReference': {
      'wkid': 102100
    }
  },

  serviceUrls: {
    'geometryService': { 
      'url': 'http://utility.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer' 
    }
  },
  /**
   * Default Point Renderer for Composer
   * @return {Object} Json Renderer
   */   
  defaultPointRenderer : {
    'type': 'simple',
    'label': '',
    'description': '',
    'symbol': {
      'color': [49,130,189,225],
      'size': 6,
      'angle': 0,
      'xoffset': 0,
      'yoffset': 0,
      'type': 'esriSMS',
      'style': 'esriSMSCircle',
      'outline': {
        'color': [220,220,220,255],
        'width': 0.6,
        'type': 'esriSLS',
        'style': 'esriSLSSolid'
      }
    }
  },

  /**
   * Default Line Renderer for Composer
   * @return {Object} Json Renderer
   */
  defaultLineRenderer :  {
    'type': 'simple',
    'symbol': {
      'color': [0,122,194,255],
      'width': 2,
      'type': 'esriSLS',
      'style': 'esriSLSSolid'
    }
  },

  /**
   * Default Polygon Renderer for Composer
   * @return {Object} Json Renderer
   */
  defaultPolygonRenderer :{
    'type': 'simple',
    'symbol': {
      'color': [49,130,189,225],
      'outline': {
        'color': [220,220,220,255],
        'width': 0.6,
        'type': 'esriSLS',
        'style': 'esriSLSSolid'
      },
      'type': 'esriSFS',
      'style': 'esriSFSSolid'
    }
  }
};