/**
A simple Extrovert HTML rasterizer.
@module paint-plain-text.js
@license Copyright (c) 2015 by James M. Devlin. All rights reserved.
*/

define(['extrovert/utilities/utils', 'extrovert/providers/three/provider-three'], function( utils, gfx ) {

  'use strict';

  return {
    paint: function( val, opts, info ) {

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

      context.font = utils.getComputedStyle( document.body, 'font' );
      context.fillStyle = opts.bkColor || 'rgb(0,0,0)';
      //context.textBaseline = 'top';
      var title_line_height = 14;
      var numLines = utils.wrapText( context, val.title, 10, 10 + title_line_height, canvas.width - 20, title_line_height, true );

      // Paint the title's background panel
      context.fillStyle = utils.shadeBlend( -0.25, bkColor );
      context.fillRect(0,0, canvas.width, 20 + numLines * title_line_height);

      // Paint the title text
      context.fillStyle = opts.textColor || 'rgb(255,255,255)';
      numLines = utils.wrapText( context, val.title, 10, 10 + title_line_height, canvas.width - 20, title_line_height, false );

      // Paint the content text
      var line_height = 16;
      var massaged_content = val.text.replace('\n',' ');
      numLines = utils.wrapText( context, massaged_content, 10, 20 + (numLines * title_line_height) + line_height, canvas.width - 20, line_height, false );
      info.numLines = numLines;

      // Create a texture from the canvas
      return gfx.createTextureFromCanvas( canvas, true );
    }
  };
});
