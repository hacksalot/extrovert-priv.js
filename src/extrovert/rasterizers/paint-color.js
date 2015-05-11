/**
A simple Extrovert HTML rasterizer.
@module paint-color.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@version 1.0
*/

define(['extrovert/core'], function( extrovert ) {

  'use strict';

  return {
    paint: function( val, opts ) {
      // Create a texture from the canvas
      return extrovert.provider.createTextureFromCanvas( canvas );
    }
  };


});
