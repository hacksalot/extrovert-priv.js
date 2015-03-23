/**
A simple Extrovert HTML rasterizer.
@module paint-plain-text.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   EXTROVERT.paint_plain_text = function () {
      return {
         paint: function( $val, opts ) {

            // Get the element content
            var title_elem = $val.find( opts.src.title );
            var title = title_elem.text();//.trim();
            var content_elem = $val.find( opts.src.content );
            var content = content_elem.text();//.trim();

            // Create a canvas element. TODO: Reuse a single canvas.
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.width = $val.width();
            canvas.height = $val.height();

            // Fill the canvas with the background color
            var bkColor = $val.css('background-color');
            if(bkColor === 'rgba(0, 0, 0, 0)')
               bkColor = 'rgb(0,0,0)';
            context.fillStyle = bkColor;
            context.fillRect(0, 0, canvas.width, canvas.height);

            // For photo backgrounds:
            // var images = $val.children('img');
            // if(images.length > 0)
            // context.drawImage(images.get(0),0,0, canvas.width, canvas.height);
            var has_photo = false;

            // Compute the size of the title text
            var font_size = title_elem.css('font-size');
            //context.font = "Bold " + font_size + " '" + title_elem.css('font-family') + "'";
            
            context.font = title_elem.css('font');
            
            context.fillStyle = title_elem.css('color');
            //context.textBaseline = 'top';
            var line_height = 24;
            var num_lines = EXTROVERT.Utils.wrap_text( context, title, 10, 10 + line_height, canvas.width - 20, line_height, true );
            
            // Paint the title's background panel
            context.fillStyle = has_photo ? "rgba(0,0,0,0.75)" : EXTROVERT.Utils.shade_blend( -0.25, bkColor );
            context.fillRect(0,0, canvas.width, 20 + num_lines * line_height);

            // Paint the title text
            context.fillStyle = title_elem.css('color');
            EXTROVERT.Utils.wrap_text( context, title, 10, 10 + line_height, canvas.width - 20, line_height, false );
            
            // Paint the content text
            //context.font = "Normal " + font_size + " '" + content_elem.css('font-family') + "'";
            context.font = content_elem.css('font');
            
            var shim = $('<div id="_fetchSize" style="display: none;">Sample text</div>');
            $( opts.src.container ).append( shim );
            line_height = shim.text("x").height();
            
            //var TestDivLineHeight = $("#TestDiv").css("font-size", "12px").css("line-height", "1.25").text("x").height();
            var massaged_content = content.replace('\n',' ');
            
            EXTROVERT.Utils.wrap_text( context, massaged_content, 10, 20 + (num_lines * line_height) + line_height, canvas.width - 20, line_height, false );

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
