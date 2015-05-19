/**
Top-level module for Extrovert.js. Define the library's public interface.
@module extrovert.js
@license Copyright (c) 2015 | James M. Devlin
*/

define(function (require) {
  
  'use strict';
  // var THREE = require('three');
  // var Physijs = require('physijs');
  var core = require('extrovert/core');
  var utils = require('extrovert/utilities/utils');

  return {
      version: '0.1.0',
      init: core.init,
      utils: utils
  };

});
