
(function () {

  'use strict';
    
  MyOD.module('ErrorModule', function (ErrorModule, App, Backbone, Marionette, $, _) {
          
    ErrorModule.View = Marionette.ItemView.extend({
      
      //className: 'container',

      getTemplate: function(){
        var errorCode = this.model.get('errorCode');
        var template;

        switch (errorCode) {
          case 404:
              template = JST['error/templates/404'];
            break;
          default:
              template = JST['error/templates/500'];
        }

        return template;
      }

    });

  });

})();
