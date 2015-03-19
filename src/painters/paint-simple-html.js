/**
A simple Extrovert HTML rasterizer.
@module paint-simple-html.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   EXTROVERT.paint_simple_html = function () {
      return {
         paint: function( $val, opts ) {
            /* TODO */
            var texture = null;
            return {
               tex: texture,
               mat: new THREE.MeshLambertMaterial( { map: texture, side: THREE.FrontSide } )
            };
         }
      };
   };




}(window, $, THREE, EXTROVERT));

