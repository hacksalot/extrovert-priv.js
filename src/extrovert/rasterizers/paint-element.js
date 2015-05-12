/**
A simple Extrovert HTML rasterizer.
@module paint-simple-html.js
@license Copyright (c) 2015 by James M. Devlin. All rights reserved.
*/

define(['extrovert/providers/three/provider-three', 'extrovert/utils'], function( provider, utils ) {

  'use strict';

  return {
    paint: function( val, opts ) {

      // Create a canvas element. TODO: Reuse a single canvas.
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = val.offsetWidth;
      canvas.height = val.offsetHeight;

      // Fill the canvas with the background color
      var bkColor = utils.getComputedStyle(val, 'background-color');
      if(bkColor === 'rgba(0, 0, 0, 0)')
        bkColor = 'rgb(0,0,0)';
      context.fillStyle = bkColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Create a texture from the canvas
      return provider.createTextureFromCanvas( canvas, true );
    }
  };

});
