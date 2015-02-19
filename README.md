# OpenData-Backbone
A sample application demonstrating how an application might be built against the Open Data API using Backbone.js and Marionette.js.

See it running here: [http://mjuniper.github.io/OpenData-Backbone/](http://mjuniper.github.io/OpenData-Backbone/)

# Prerequisites
1. nodejs and npm
2. phantomjs (for tests)

# Setup
1. Clone the repo: `git clone git@github.com:mjuniper/OpenData-Backbone.git`
2. `cd OpenData-Backbone`
2. `npm install`
3. `bower install`
4. `gulp serve`

# Roadmap
Not a roadmap in the sense that these are features that will *definitely* be implemented; more of a list of potential improvements

* table
  * marionette composite view
  * styled with bootstrap
  * click table header to sort
  * pagination only if the service `supportsAdvancedPagination`, otherwise we show the first `n` rows
* API v2
* leaflet mapmanager with config flag (if we go this route, the mapmanager should load it's own dependencies)
* more tests