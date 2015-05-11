/**
A simple Extrovert HTML rasterizer.
@module paint-plain-text.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@version 1.0
*/

define(['extrovert/core'], function( extrovert ) {

  'use strict';

  return {
    paint: function( val, opts, info ) {

      var _utils = extrovert.Utils;
      opts = opts || { };

      // Create a canvas element. TODO: Reuse a single canvas.
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = opts.width;
      canvas.height = opts.height;

      // Fill the canvas with the background color
      //var bkColor = $val.css('background-color');
      var bkColor = opts.bkColor || 'rgb(255,255,255)';
      context.fillStyle = bkColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.font = _utils.getComputedStyle( document.body, 'font' );
      context.fillStyle = opts.bkColor || 'rgb(0,0,0)';
      //context.textBaseline = 'top';
      var title_line_height = 14;
      var numLines = _utils.wrapText( context, val.title, 10, 10 + title_line_height, canvas.width - 20, title_line_height, true );

      // Paint the title's background panel
      context.fillStyle = _utils.shadeBlend( -0.25, bkColor );
      context.fillRect(0,0, canvas.width, 20 + numLines * title_line_height);

      // Paint the title text
      context.fillStyle = opts.textColor || 'rgb(255,255,255)';
      numLines = _utils.wrapText( context, val.title, 10, 10 + title_line_height, canvas.width - 20, title_line_height, false );

      // Paint the content text
      var line_height = 16;
      var massaged_content = val.text.replace('\n',' ');
      numLines = _utils.wrapText( context, massaged_content, 10, 20 + (numLines * title_line_height) + line_height, canvas.width - 20, line_height, false );
      info.numLines = numLines;

      // Create a texture from the canvas
      return extrovert.provider.createTextureFromCanvas( canvas, true );
    }
  };
});
