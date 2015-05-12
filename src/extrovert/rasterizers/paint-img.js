/**
A simple Extrovert image rasterizer.
@module paint-img.js
@license Copyright (c) 2015 | James M. Devlin
*/

define(['extrovert/core'], function( extro ) {

  'use strict';

  return {
    paint: function( obj ) {
      return extro.loadTexture( typeof obj === 'string' ? obj : obj.src );
    }
  };

});
