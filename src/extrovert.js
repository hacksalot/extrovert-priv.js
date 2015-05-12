/**
Top-level module for Extrovert.js. Define the public interface.
@module extrovert.js
@license Copyright (c) 2015 | James M. Devlin
*/

define(function (require) {
  
  'use strict';
  var THREE = require('three');
  var Physijs = require('physijs');
  var core = require('extrovert/core');

  return {
      version: '0.1.0',
      init: core.init
  };

});
