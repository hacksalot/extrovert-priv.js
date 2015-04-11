/**
A simple Extrovert image rasterizer.
@module paint-img.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

// TODO: Rasterizers should not have THREE.js dependencies
(function (window, THREE, EXTRO) {

  EXTRO.paint_img = function () {
    return {
      paint: function( img, opts ) {
        return THREE.ImageUtils.loadTexture( img.src );
      }
    };
  };

}(window, THREE, EXTRO));
