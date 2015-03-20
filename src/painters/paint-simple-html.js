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
            // Get the element content
            var title_elem = $val.find( opts.src.title );
            var title = title_elem.text().trim();

            // Create a canvas element. TODO: Reuse a single canvas.
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.width = $val.width();
            canvas.height = $val.height();

            // Paint on the canvas
            var bkColor = $val.css('background-color');
            if(bkColor === 'rgba(0, 0, 0, 0)')
               bkColor = 'rgb(0,0,0)';
            context.fillStyle = bkColor;
            context.fillRect(0, 0, canvas.width, canvas.height);
            var images = $val.children('img');
            if(images.length > 0)
               context.drawImage(images.get(0),0,0, canvas.width, canvas.height);
            var font_size = title_elem.css('font-size');
            //context.font = "Bold 18px 'Open Sans Condensed'";
            context.font = "Bold " + font_size + " '" + title_elem.css('font-family') + "'";
            context.fillStyle = title_elem.css('color');
            context.textBaseline = 'top';
            var line_height = 24;
            var num_lines = EXTROVERT.Utils.wrap_text( context, title, 10, 10, canvas.width - 20, line_height, true );
            if(images.length === 0)
               context.fillStyle = EXTROVERT.Utils.shade_blend( -0.25, bkColor );
            else
               context.fillStyle = "rgba(0,0,0,0.75)";
            context.fillRect(0,0, canvas.width, 20 + num_lines * line_height);
            context.fillStyle = title_elem.css('color');
            wrap_text( context, title, 10, 10, canvas.width - 20, line_height, false );

            // Create a texture from the canvas
            var texture = new THREE.Texture( canvas );
            texture.needsUpdate = true;
            return {
               tex: texture,
               mat: new THREE.MeshLambertMaterial( { map: texture/*, side: THREE.DoubleSide*/ } )
            };
         }
      };
   };




}(window, $, THREE, EXTROVERT));
