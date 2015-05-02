/**
A simple Extrovert HTML rasterizer.
@module paint-plain-text.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, extro, inscribe) {

  /**
  A simple plain text rasterizer with support for styled title and body text.
  @class paint_plain_text_stream
  */
  extro.paint_plain_text_stream = function () {
    return {
      paint: function( val, opts, info ) {

        var _utils = extro.Utils;
        opts = opts || { };

        // Create a canvas element.
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = opts.width;
        canvas.height = opts.height;

        // Fill the canvas with the background color
        //var bkColor = $val.css('background-color');
        var bkColor = opts.bkColor || 'rgb(255,255,255)';
        context.fillStyle = bkColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Paint the text
        context.font = _utils.getComputedStyle( document.body, 'font' );
        context.fillStyle = opts.bkColor || 'rgb(0,0,0)';
        var line_height = opts.lineHeight || 16;
        var massaged_content = val.text.replace('\n',' ');
        var padding = opts.padding || 10;
        
        var painter = new inscribe();
        var wrapInfo = painter.renderText( context, massaged_content, false, 
          { padding: padding, maxWidth: canvas.width, lineHeight: line_height } );
        
        info.numLines = wrapInfo.numLines;
        return extro.createTextureFromCanvas( canvas, true );
      }
    };
  };

}(window, extrovert, inscribe));
