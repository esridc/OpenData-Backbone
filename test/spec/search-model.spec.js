describe('SearchModel', function() {
  var searchModel;

  beforeEach(function() {
    searchModel = new MyOD.Models.SearchModel();
  });

  describe('with defaults', function() {
    beforeEach(function() {
      
    });

    it('should properly getRoute', function() {
      expect(searchModel.getRoute()).toEqual('datasets?q=&page=1&per_page=20&sort_by=relevance');
    });

    it('should properly getUrl', function() {
      expect(searchModel.getUrl()).toEqual('//umb.dcdev.opendata.arcgis.com/datasets.json?q=&page=1&per_page=20&sort_by=relevance');
    });
  });

  describe('with parameters', function() {
    beforeEach(function() {
      searchModel.set({
        q: 'foo',
        page: 2,
        sort_by: 'updated_at',
        foo: 'foo'
      });
    });

    it('should properly getRoute', function() {
      expect(searchModel.getRoute()).toEqual('datasets?q=foo&page=2&per_page=20&sort_by=updated_at');
    });

    it('should properly getUrl', function() {
      expect(searchModel.getUrl()).toEqual('//umb.dcdev.opendata.arcgis.com/datasets.json?q=foo&page=2&per_page=20&sort_by=updated_at');
    });
  });

});
