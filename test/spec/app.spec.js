
//problems running this one repeatedly with watch..
xdescribe('App', function() {

  beforeEach(function() {
    $('body').append('<div id="main-region"></div>');
    Backbone.history.root = ''; 
    MyOD.start();
  });

  describe('when started', function () {
    it('should create a searchModel', function() {
      expect(MyOD.searchModel).toBeDefined();
    });

    it('should create a appLayout', function() {
      expect(MyOD.appLayout).toBeDefined();
    });
  });

  afterEach(function () {
    $('#main-region').remove();
    MyOD.destroy();
  });

});
