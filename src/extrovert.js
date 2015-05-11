/*global define */

/**
 * The main module that defines the public interface for Extrovert.
 */
define(function (require) {
    'use strict';

    var THREE = require('three');
    var extro = require('extrovert/core');
    //convert = require('principium/convert');

    //Return the module value.
    return {
        version: '0.1.0',
        init: extro.init
    };
});
