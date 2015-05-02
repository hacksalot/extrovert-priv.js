/**
A simple Extrovert HTML rasterizer.
@module paint-color.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, extro) {

  extro.paint_color = function () {
    return {
      paint: function( val, opts ) {
        // Create a texture from the canvas
        return extro.createTextureFromCanvas( canvas );
      }
    };
  };

}(window, extrovert));
