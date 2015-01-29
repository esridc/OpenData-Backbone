describe('HeaderSearchView', function() {
  var searchModel, searchView;

  beforeEach(function() {
    $('body').append('<form id="header-search-container" class="navbar-form navbar-right" role="search"><div class="input-group"><label class="sr-only" for="header-search">Search</label><input type="search" name="header-search" id="header-search" class="form-control" placeholder="search"><span class="input-group-btn"><button id="header-search-btn" class="btn btn-default" type="button"><span class="glyphicon glyphicon-search" aria-hidden="true"></span></button></span></div></form>');
    searchModel = new MyOD.Models.SearchModel();
    searchView = new MyOD.Main.HeaderSearchView({ model: searchModel });
    searchView.render();
  });

  describe('when searchModel.q changes', function () {
    beforeEach(function() {
      searchModel.set({ q: 'foo' });
    });    

    it('should update input val', function() {
      expect(searchView.ui.search.val()).toEqual('foo');
      expect(searchModel.set).toBeDefined();
      expect(searchView.ui).toBeDefined();
    });
  });

  afterEach(function () {
    $('#header-search-container').remove();
  });

});
