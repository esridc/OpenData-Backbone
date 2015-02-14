this.JST = {"datasets/templates/dataset": function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class="clearfix">\n  <h2 class="pull-left clearfix"><img class="img-thumbnail" src="' +
((__t = ( thumbnail_url )) == null ? '' : __t) +
'"><span>' +
((__t = ( name )) == null ? '' : __t) +
'</span></h2>\n  <div class="dropdown pull-right">\n    <button class="btn btn-primary" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\n      Download\n      <span class="caret"></span>\n    </button>\n    <ul class="dropdown-menu" role="menu" aria-labelledby="dLabel">\n      <li><a href="' +
((__t = ( baseUrl )) == null ? '' : __t) +
'.csv" target="_blank" download>Spreadsheet</a></li>\n      <li><a href="' +
((__t = ( baseUrl )) == null ? '' : __t) +
'.kml" target="_blank" download>KML</a></li>\n      <li><a href="' +
((__t = ( baseUrl )) == null ? '' : __t) +
'.zip" target="_blank" download>Shapefile</a></li>\n      <li class="divider"></li>\n      <li><a href="' +
((__t = ( arcgis_online_item_url )) == null ? '' : __t) +
'" target="_blank">View in ArcGIS Online</a></li>\n      <li><a href="' +
((__t = ( url )) == null ? '' : __t) +
'" target="_blank">API</a></li>\n    </ul>\n  </div>\n</div>\n\n\n<dl class="dl-horizontal">\n  \n  <dt>Description:</dt>\n  <dd>' +
((__t = ( description )) == null ? '' : __t) +
'</dd>\n  \n  <dt>Owner:</dt>\n  <dd>' +
((__t = ( owner )) == null ? '' : __t) +
'</dd>\n\n  <dt>Created:</dt>\n  <dd>' +
((__t = ( moment(created_at).calendar() )) == null ? '' : __t) +
'</dd>\n  \n  <dt>Updated:</dt>\n  <dd>' +
((__t = ( moment(updated_at).calendar() )) == null ? '' : __t) +
'</dd>\n\n  <dt>Tags:</dt>\n  <dd>' +
((__t = ( tags.join(' | ') )) == null ? '' : __t) +
'</dd>\n  \n  <dt>Views:</dt>\n  <dd>' +
((__t = ( views )) == null ? '' : __t) +
'</dd>\n\n</dl>\n\n<div id="map"></div>\n<div id="smaps">\n  <div class="container"></div>\n</div>\n';

}
return __p
},
"error/templates/404": function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class="alert alert-danger" role="alert">\n  <h2>The page you are looking for doesn\'t exist.</h2>\n</div>\n';

}
return __p
},
"error/templates/500": function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class="alert alert-danger" role="alert">\n  <h2>An error ocurred.</h2>\n</div>\n';

}
return __p
},
"home/templates/home": function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class="jumbotron">\n  <h1 class="page-header">My Open Data</h1>\n\n  <p>\n    <div class="input-group input-group-lg">\n      <label class="sr-only" for="search">Search</label>\n      <input type="search" name="search" id="search" class="form-control" placeholder="search for open data">\n      <span class="input-group-btn">\n        <button id="search-btn" class="btn btn-default" type="button">\n          <span class="glyphicon glyphicon-search" aria-hidden="true"></span>\n        </button>\n      </span>\n    </div>\n  </p>\n\n</div>\n';

}
return __p
},
"results/templates/results-item": function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<td>' +
((__t = ( name )) == null ? '' : __t) +
'</td>\n<td>' +
((__t = ( owner )) == null ? '' : __t) +
'</td>\n<td>' +
((__t = ( record_count )) == null ? '' : __t) +
'</td>\n<td>' +
((__t = ( layer_type )) == null ? '' : __t) +
'</td>\n<td>' +
((__t = ( views )) == null ? '' : __t) +
'</td>\n<td>' +
((__t = ( moment(created_at).fromNow() )) == null ? '' : __t) +
'</td>\n<td>' +
((__t = ( moment(updated_at).fromNow() )) == null ? '' : __t) +
'</td>';

}
return __p
},
"results/templates/results": function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<h2>Your search for <em>' +
((__t = ( q )) == null ? '' : __t) +
'</em> yielded ' +
((__t = ( total_count )) == null ? '' : __t) +
' datasets</h2>\n<div class="table-responsive">  \n  <table class="table table-striped table-bordered table-hover">\n    <thead>\n      <tr>\n        <th>NAME</th>\n        <th>OWNER</th>\n        <th>RECORDS</th>\n        <th>LAYER TYPE</th>\n        <th>VIEWS</th>\n        <th>CREATED</th>\n        <th>UPDATED</th>\n      </tr>\n    </thead>\n    <tbody></tbody>\n  </table>\n</div>\n<nav>\n  <ul class="pagination">\n    ';
 if (pages.length > 1) { ;
__p += '\n      <li id="page-prev" class="' +
((__t = ( firstPage )) == null ? '' : __t) +
'"><a href="' +
((__t = ( prevUrl )) == null ? '' : __t) +
'" data-page="' +
((__t = ( prevPage )) == null ? '' : __t) +
'"><span aria-hidden="true">&laquo;</span></a></li>\n      \n      ';
 _.each(pages, function (page) { ;
__p += '\n        <li class="' +
((__t = ( page.active )) == null ? '' : __t) +
'"><a href="' +
((__t = ( page.url )) == null ? '' : __t) +
'" class="page-number" data-page="' +
((__t = ( page.page )) == null ? '' : __t) +
'">' +
((__t = ( page.page )) == null ? '' : __t) +
'</a></li>\n      ';
 }); ;
__p += '\n\n      <li id="page-next" class="' +
((__t = ( lastPage )) == null ? '' : __t) +
'"><a href="' +
((__t = ( nextUrl )) == null ? '' : __t) +
'" data-page="' +
((__t = ( nextPage )) == null ? '' : __t) +
'"><span aria-hidden="true">&raquo;</span></a></li>\n    ';
 } ;
__p += '\n  </ul>\n</nav>';

}
return __p
}};