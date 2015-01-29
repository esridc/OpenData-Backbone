describe('DatasetModel', function() {
  var datasetModel;

  beforeEach(function() {
    datasetModel = new MyOD.Models.DatasetModel({ id: 'abc123' });
  });

  it('should properly generate url', function() {
    expect(datasetModel.url()).toEqual('//umb.dcdev.opendata.arcgis.com/datasets/abc123.json');
  });

});
