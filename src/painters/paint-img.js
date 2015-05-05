/**
A simple Extrovert image rasterizer.
@module paint-img.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@version 1.0
*/

(function (window, extro) {

  extro.paint_img = function () {
    return {
      paint: function( obj ) {
        return extro.loadTexture( typeof obj === 'string' ? obj : obj.src );
      }
    };
  };

}(window, extrovert));
