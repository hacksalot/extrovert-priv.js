/**
@module paint-plain-text-stream.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@version 1.0
*/

(function (window, extro, inscribe) {

  /**
  A simple streaming plain text rasterizer.
  @class paint_plain_text_stream
  @returns An array of textures.
  */
  extro.paint_plain_text_stream = function () {

    return {
      paint: function( val, opts, info ) {

        var _utils = extro.Utils;
        opts = opts || { };

        var painter = new inscribe();
        var textures = [];
        var wrapInfo = { };
        var lineHeight = opts.lineHeight || 16;
        var massaged_content = val.text.replace('\n',' ');
        var padding = opts.padding || 10;

        info.numLines = 0;

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
        painter.inscribe( massaged_content, 'text', context, 
          { padding: padding,
            maxWidth: canvas.width,
            lineHeight: lineHeight,
            chunkSize: 35,
            pageEmitted: function ( context ) {
              textures.push( extro.provider.createTextureFromCanvas( context.canvas, true ) );
              var newCanvas = document.createElement('canvas');
              newCanvas.width = opts.width;
              newCanvas.height = opts.height;
              var newContext = newCanvas.getContext('2d');
              // Fill the canvas with the background color
              //var bkColor = $val.css('background-color');
              var bkColor = opts.bkColor || 'rgb(255,255,255)';
              newContext.fillStyle = bkColor;
              newContext.fillRect(0, 0, newCanvas.width, newCanvas.height);

              // Paint the text
              newContext.font = _utils.getComputedStyle( document.body, 'font' );
              newContext.fillStyle = opts.bkColor || 'rgb(0,0,0)';              
              
              return newContext;
            }
        });

        return textures;
      }

    };
  };



}(window, extrovert, inscribe));
