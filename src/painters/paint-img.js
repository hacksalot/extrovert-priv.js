/**
A simple Extrovert image rasterizer.
@module paint-img.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {

  EXTROVERT.paint_img = function () {
    return {
      paint: function( $val, opts ) {
        var img = $val.get( 0 );
        var texture = THREE.ImageUtils.loadTexture( img.src );
        return {
          tex: texture,
          mat: new THREE.MeshLambertMaterial( { map: texture, side: THREE.FrontSide } )
        };
      }
    };
  };

}(window, $, THREE, EXTROVERT));
