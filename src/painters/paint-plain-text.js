/**
A simple Extrovert HTML rasterizer.
@module paint-plain-text.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, THREE, EXTRO) {

  EXTRO.paint_plain_text = function () {
    return {
      paint: function( val, opts ) {

        var _utils = EXTRO.Utils;
        opts = opts || { };

        // Create a canvas element. TODO: Reuse a single canvas.
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = 250;//val.offsetWidth;
        canvas.height = 100;//val.offsetHeight;

        // Fill the canvas with the background color
        //var bkColor = $val.css('background-color');
        var bkColor = opts.bkcolor || 'rgb(255,255,255)';
        context.fillStyle = bkColor;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Compute the size of the title text
        //context.font = _utils.getComputedStyle( title_elem, 'font');

        context.fillStyle = opts.textColor || 'rgb(0,0,0)';
        //context.textBaseline = 'top';
        var title_line_height = 24;
        var num_lines = _utils.wrapText( context, val.title, 10, 10 + title_line_height, canvas.width - 20, title_line_height, true );

        // Paint the title's background panel
        context.fillStyle = _utils.shadeBlend( -0.25, bkColor );
        context.fillRect(0,0, canvas.width, 20 + num_lines * title_line_height);

        // Paint the title text
        context.fillStyle = opts.textColor || 'rgb(0,0,0)';
        _utils.wrapText( context, val.title, 10, 10 + title_line_height, canvas.width - 20, title_line_height, false );

        // Paint the content text
        //context.font = _utils.getComputedStyle( content_elem, 'font');

        var line_height = 16;

        //var TestDivLineHeight = $("#TestDiv").css("font-size", "12px").css("line-height", "1.25").text("x").height();
        var massaged_content = val.text.replace('\n',' ');

        _utils.wrapText( context, massaged_content, 10, 20 + (num_lines * title_line_height) + line_height, canvas.width - 20, line_height, false );

        // Create a texture from the canvas
        var texture = new THREE.Texture( canvas );
        texture.needsUpdate = true;
        return texture;
      }
    };
  };

}(window, THREE, EXTRO));
