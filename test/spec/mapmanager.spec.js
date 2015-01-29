describe('MapManager', function() {
  var mapManager;

  beforeEach(function(done) {
    $('body').append('<div id="map"></div>');
    mapManager = new MyOD.Utils.MapManager();
    mapManager.dojoReady.always(done());
  });

  describe('when initialized', function () {
    it('should have dojo and esri', function() {
      expect(esri).toBeDefined();
      expect(dojo).toBeDefined();
    });
  });

  afterEach(function () {
    mapManager.destroy();
    $('#map').remove();
  });

});
