/**
A simple Extrovert image rasterizer.
@module paint-img-canvas.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   EXTROVERT.paint_img_canvas = function () {
      return {
         paint: function( $val, opts ) {
            var img = $val.get( 0 );
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.width = $val.width();
            canvas.height = $val.height();
            log.msg("Creating texture %d x %d (%d x %d)", img.clientWidth, img.clientHeight, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, img.clientWidth, img.clientHeight);
            texture = new THREE.Texture( canvas );
            texture.needsUpdate = true;
            return {
               tex: texture,
               mat: new THREE.MeshLambertMaterial( { map: texture, side: THREE.FrontSide } )
            };
         }
      };
   };



}(window, $, THREE, EXTROVERT));
