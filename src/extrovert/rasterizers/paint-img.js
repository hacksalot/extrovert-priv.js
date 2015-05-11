/**
A simple Extrovert image rasterizer.
@module paint-img.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@version 1.0
*/

define(['extrovert'], function( extrovert ) {

  'use strict';

  return {
    paint: function( obj ) {
      return extro.loadTexture( typeof obj === 'string' ? obj : obj.src );
    }
  };

});
