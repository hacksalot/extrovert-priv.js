/**
A simple Extrovert HTML rasterizer.
@module paint-color.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, THREE, EXTRO) {

  EXTRO.paint_color = function () {
    return {
      paint: function( val, opts ) {
        // Create a texture from the canvas
        return new THREE.Texture( canvas );
      }
    };
  };

}(window, THREE, EXTRO));
