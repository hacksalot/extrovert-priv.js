/**
A simple Extrovert HTML rasterizer.
@module paint-simple-html.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@version 1.0
*/

(function (window, extro) {

  extro.paint_element = function () {
    return {
      paint: function( val, opts ) {
        var _utils = extro.Utils;

        // Create a canvas element. TODO: Reuse a single canvas.
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = val.offsetWidth;
        canvas.height = val.offsetHeight;

        // Fill the canvas with the background color
        var bkColor = _utils.getComputedStyle(val, 'background-color');
        if(bkColor === 'rgba(0, 0, 0, 0)')
          bkColor = 'rgb(0,0,0)';
        context.fillStyle = bkColor;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Create a texture from the canvas
        return extro.createTextureFromCanvas( canvas, true );
      }
    };
  };

}(window, extrovert));
