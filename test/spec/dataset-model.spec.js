describe('DatasetModel', function() {
  var datasetModel;

  beforeEach(function() {
    datasetModel = new MyOD.Models.DatasetModel({ id: 'abc123' });
  });

  it('should properly generate url', function() {
    expect(datasetModel.url()).toEqual(MyOD.config.api + 'datasets/abc123');
  });

});
