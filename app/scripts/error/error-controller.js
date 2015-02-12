
(function () {

  'use strict';
    
  MyOD.module('ErrorModule', function (ErrorModule, App, Backbone, Marionette, $, _) {

    ErrorModule.Controller = Marionette.Controller.extend({ 

      initUi: function (options) {
        // init the results view in here so it re-binds on "back button"
        var model = new Backbone.Model({ errorCode: options.errorCode });
        var view = new ErrorModule.View({ model: model });

        App.layout.getRegion('main').show(view);
      }

    });

  });

})();
