describe('SearchModel', function() {
  var searchModel;

  beforeEach(function() {
    searchModel = new MyOD.Models.SearchModel();
  });

  describe('with defaults', function() {
    beforeEach(function() {

    });

    it('should properly getRoute', function() {
      expect(searchModel.getRoute()).toEqual('datasets?q=&page%5Bnumber%5D=1&page%5Bsize%5D=20');
    });

    it('should properly getUrl', function() {
      expect(searchModel.getUrl()).toEqual(MyOD.config.api + 'datasets?q=&page%5Bnumber%5D=1&page%5Bsize%5D=20');
    });
  });

  describe('with parameters', function() {
    beforeEach(function() {
      searchModel.set({
        q: 'foo',
        page: 2,
        foo: 'foo'
      });
    });

    it('should properly getRoute', function() {
      expect(searchModel.getRoute()).toEqual('datasets?q=foo&page%5Bnumber%5D=2&page%5Bsize%5D=20');
    });

    it('should properly getUrl', function() {
      expect(searchModel.getUrl()).toEqual(MyOD.config.api + 'datasets?q=foo&page%5Bnumber%5D=2&page%5Bsize%5D=20');
      //expect(true).toBe(false);
    });
  });

});
