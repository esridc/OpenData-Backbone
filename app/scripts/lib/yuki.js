/*
* Initialize Yuki | Simple Smart Maps Styler
*
*/
var Yuki = function( container, options ) {
  console.log('init Yuki, options: ', options);

  this.scheme = options.scheme;

  this.options = options;
  this.container = container;
  this.width = options.width || 239;
  this.height = options.height || "auto";

  this._buildUI();

  //build legend based on layer type
  if ( this.options.type === "point" && !options.heatmap ) {
    //this._buildPointLegend();
  } else if ( this.options.type === "point" && options.heatmap ) {
    this._buildHeatmapLegend();
  } else {
    this._buildRampLegend();
  }

  // save event handlers 
  this._handlers = {};
  
  //build attribute select geezer
  this._buildAttributeSelect();
  this._wire();

  return this;
};


/*
*
* Yuki Bones | Build UI
*
*/
Yuki.prototype._buildUI = function() {
  //console.log('woof woof, feed me already brendan...');
  //set container size
  var container = document.getElementById( this.container ).getElementsByClassName( 'container' )[0];
  
  var innerContainer = document.createElement("div");
  container.appendChild( innerContainer ).id = "yuki-viz-tools";

  //attribute selection container 
  var div = document.createElement("div");
  innerContainer.appendChild( div ).id = "yuki-attribute-select-container";

  //color ramp container 
  var atts = document.createElement("div");
  innerContainer.appendChild( atts ).id = "yuki-color-ramp-container";
};



/*
* Wire Yuki Events 
*
*/
Yuki.prototype._wire = function() {
  var self = this;
  
  //attach handler
  var linkEl = document.getElementsByClassName( "field-list-item" );
  for(var i=0;i<linkEl.length;i++){
    if(linkEl[i].addEventListener){
      linkEl[i].addEventListener('click', function(e) { self._onAttributeClick.call(self, e) });
    } else {
      linkEl[i].attachEvent('onclick', function(e) { self._onAttributeClick.call(self, e) });
    }
  }

  //attach handler
  var linkEl = document.getElementsByClassName( "ramp-list-item" );
  for(var i=0;i<linkEl.length;i++){
    if(linkEl[i].addEventListener){
      linkEl[i].addEventListener('click', function(e) { self._onRampClick.call(self, e) });
    } else {
      linkEl[i].attachEvent('onclick', function(e) { self._onRampClick.call(self, e) });
    }
  }
  
};




/*
*
* Build legend for color ramps (polygons!)
*
*/
Yuki.prototype._buildRampLegend = function() {

  var container = document.getElementById( "yuki-color-ramp-container" );

  var div = document.createElement("div");

  var dropDown = '<span class="dropdown" id="yuki-ramp-list">\
    <span class="dropdown-toggle" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">\
      <span id="yuki-active-ramp">';

  dropDown = this._buildRampColors( dropDown, this.options.schemes.primaryScheme.colors);

  dropDown += '</span>\
      <span class="caret"></span>\
    </span>\
    <ul class="dropdown-menu dropdown-menu-right" role="menu" aria-labelledby="dropdownMenu1">\
    </ul>\
  </span>';

  div.insertAdjacentHTML( 'beforeend', dropDown );

  container.appendChild(div).id = "styled-by";
  
  var self = this, li;
  var list = document.getElementById( "yuki-ramp-list" ).getElementsByClassName( 'dropdown-menu' )[0];
  this.options.schemes.secondarySchemes.forEach(function(ramp, i) {
    li = '<li role="presentation"><span id="'+i+'" role="menuitem" class="ramp-list-item" tabindex="-1">';
    li = self._buildRampColors( li, ramp.colors, i);
    li += '</span></li>';
    list.insertAdjacentHTML('beforeend', li);
  });
};




/*
*
* Build legend for points!
*
*/
Yuki.prototype.buildPointLegend = function( breaks ) {

  var container = document.getElementById( "yuki-color-ramp-container" );
  container.innerHTML = '';

  var div = document.createElement("div");

  var dropDown = '<span class="dropdown" id="yuki-ramp-list">\
    <span class="dropdown-toggle" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">\
      <span id="yuki-active-ramp">';

  dropDown = this._buildPoints( dropDown, breaks, this.options.schemes.primaryScheme.color);

  dropDown += '</span>\
    </span>\
    <ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1">\
    </ul>\
  </span>';

  div.insertAdjacentHTML( 'beforeend', dropDown );

  container.appendChild(div).id = "styled-by";

  var self = this, li;
  var list = document.getElementById( "yuki-ramp-list" ).getElementsByClassName( 'dropdown-menu' )[0];
  this.options.schemes.secondarySchemes.forEach(function(scheme, i) {
    li = '<li role="presentation"><span id="'+i+'" role="menuitem" class="ramp-list-item" tabindex="-1">';
    li = self._buildPoints( li, breaks, scheme.color);
    li += '</span></li>';
    list.insertAdjacentHTML('beforeend', li);
  });

  this._wire();
};



/*
*
* Build legend heatmap legend!
*
*/
Yuki.prototype._buildHeatmapLegend = function() {

  var container = document.getElementById( "yuki-color-ramp-container" );

  var div = document.createElement("div");

  var dropDown = '<span class="dropdown" id="yuki-ramp-list">\
    <span class="dropdown-toggle" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">\
      <span id="yuki-active-ramp">';

  console.log( '----> rend', this.options.renderer );
  //dropDown = this._buildPoints( dropDown, this.options.renderer.breaks, this.options.renderer.scheme.primaryScheme.color);

  dropDown += '</span>\
    </span>\
    <ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1">\
    </ul>\
  </span>';

  div.insertAdjacentHTML( 'beforeend', dropDown );

  container.appendChild(div).id = "styled-by";

};




Yuki.prototype._buildPoints = function(html, breaks, color) {
  var rgba = [color.r, color.g, color.b, color.a].join(',');
  breaks.forEach(function(b, i) {
    html += "<div class='legend-size size-"+i+"' style='background:rgba("+rgba+");'></div>";
  });
  return html;
};


Yuki.prototype._buildRampColors = function(html, colors, id) {
  colors.forEach(function(color) {
    html += "<div id='"+id+"' style='background:"+color+"' class='legend-color'></div>";
  });
  return html;
};

/*
*
* Attribute select component
*
*/
Yuki.prototype._buildAttributeSelect = function() {

  var container = document.getElementById('yuki-attribute-select-container');
  var div = document.createElement("div");
  

  var span = document.createElement('span');
  span.innerHTML = "Styled by ";
  div.appendChild(span);

  
  var dropDown = '<span class="dropdown" id="yuki-attribute-list">\
    <span class="dropdown-toggle" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">\
      <span id="yuki-active-attribute">'+this.options.field+'</span>\
      <span class="caret"></span>\
    </span>\
    <ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1">\
    </ul>\
  </span>'

  div.insertAdjacentHTML('beforeend', dropDown);

  container.appendChild(div).id = "styled-by";

  this.options.fields.forEach(function(f) {
    var li = '<li role="presentation"><span role="menuitem" class="field-list-item" tabindex="-1" title="'+f.name+'">'+f.alias+'</span></li>';
    var list = document.getElementById( "yuki-attribute-list" ).getElementsByClassName( 'dropdown-menu' )[0];
    list.insertAdjacentHTML('beforeend', li);
  });

};



/** methods -- kind of **/
Yuki.prototype.setActiveAttribute = function(field) {
  this.emit('change', field);
  document.getElementById( 'yuki-active-attribute' ).innerHTML = field;
};

/** methods -- kind of **/
Yuki.prototype.setActiveRamp = function( ramp ) {
  this.emit('ramp-change', ramp);
  document.getElementById( 'yuki-active-ramp' ).innerHTML = document.getElementById( ramp ).innerHTML;
};



/******** EVENTS *********/

// registers event with specific handler functions 
Yuki.prototype.on = function(eventName, handler){
  this._handlers[ eventName ] = handler; 
};

// trigger callback 
Yuki.prototype.emit = function(eventName, val) {
  if (this._handlers[ eventName ]){
    this._handlers[ eventName ](val);
  }
};

Yuki.prototype._onAttributeClick = function(e) {
  if( e.which === 1 && !(e.metaKey || e.ctrlKey)){
    e.preventDefault();
    this.setActiveAttribute( e.target.getAttribute("title")); 
  }
};

Yuki.prototype._onRampClick = function(e) {
  if( e.which === 1 && !(e.metaKey || e.ctrlKey)){
    e.preventDefault();
    this.setActiveRamp( e.target.id ); 
  }
};
