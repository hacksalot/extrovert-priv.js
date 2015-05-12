/*global define */

/**
 * The main module that defines the public interface for Extrovert.
 */
define(function (require) {
    'use strict';

    var THREE = require('three');
    var Physijs = require('physijs');
    var core = require('extrovert/core');

    //Return the module value.
    return {
        version: '0.1.0',
        init: core.init
    };
});
