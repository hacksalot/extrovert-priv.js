/**
A simple Extrovert image rasterizer.
@module paint-img.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, THREE, EXTRO) {

  EXTRO.paint_img = function () {
    return {
      paint: function( img, opts ) {
        var t = THREE.ImageUtils.loadTexture( img.src ); 
        return {
          tex: t,
          mat: new THREE.MeshLambertMaterial( { map: t } )
        };
      }
    };
  };

}(window, THREE, EXTRO));
