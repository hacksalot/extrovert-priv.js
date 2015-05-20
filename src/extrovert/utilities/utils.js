/**
Utilities for Extrovert.js.
@module utils.js
@license Copyright (c) 2015 | James M. Devlin
*/

define(['require', 'three'], function( require, THREE )  {

  'use strict';

  var my = {};

  my.VZERO = new THREE.Vector3(0, 0, 0);
  
  my.shadeBlend = require('./blend');

  /**
  Improved wrap text drawing helper for canvas. See:
  - http://stackoverflow.com/a/11361958
  - http: //www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
  @method wrap_text
  @param A Canvas context.
  @param x Text origin.
  @param y Text origin.
  @param maxWidth Width to break lines at.
  @param lineHeight Height of each line.
  @param measureOnly If true, measure the text without drawing it.
  */
  my.wrapText = function( context, text, x, y, maxWidth, lineHeight, measureOnly ) {

    var numLines = 1;
    var start_of_line = true;
    var line_partial = '';
    var try_line = '';
    var extents = [0,0];

    // Split the input text on linebreaks
    var lines = text.split('\n');

    // Iterate over each "hard" line
    for (var line_no = 0; line_no < lines.length; line_no++) {

      // Get the words in the line
      var words = lines[ line_no ].split(' ');
      start_of_line = true;
      line_partial = '';

      // Iterate over the words in the line
      for( var w = 0; w < words.length; w++ ) {

        // Establish a candidate line based on any existing text, plus the next word
        try_line = line_partial + (start_of_line ? "" : " ") + words[ w ];

        // Measure the candidate line
        var metrics = context.measureText( try_line );

        // If the candidate line length is less than the maxWidth, append this
        // word to the candidate line and continue.
        if( metrics.width <= maxWidth ) {
          start_of_line = false;
          line_partial = try_line;
        }

        // If the candidate line length is greater than the maxWidth, paint the
        // previous incarnation of the line (without the last word) and reset.
        else {

          // Measure the to-be-painted line and update extents, in case we're measuring
          metrics = context.measureText( line_partial );
          if( metrics.width > extents[0] )
            extents[0] = metrics.width;

          // Paint the text here (as long as we're not measuring)
          measureOnly || context.fillText( line_partial, x, y);

          // Reset the line, preloaded with the text that didn't fit.
          start_of_line = true;
          y += lineHeight;
          extents[1] = y;
          numLines++;
          line_partial = words[w]; // Drop the space
          metrics = context.measureText( line_partial );
          if( metrics.width <= maxWidth ) {
            start_of_line = false;
          }
          else {
            // A single word that is wider than our max allowed width; need to break at the letter
          }
        }
      }

      // Handle any remaining text
      measureOnly || context.fillText( line_partial, x, y );
      y += lineHeight;
      extents[1] = y;
    }

    return {
      numLines: numLines,
      extents: extents
    };
  };

  /**
  Figure out if the browser/machine supports WebGL.
  @method detectWebGL
  */
  my.detectWebGL = function( return_context ) {
    if( !!window.WebGLRenderingContext ) {
      var canvas = document.createElement("canvas");
      var names = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"];
      var context = false;
      for(var i=0;i<4;i++) {
        try {
          context = canvas.getContext(names[i]);
          if (context && typeof context.getParameter == "function") {
            // WebGL is enabled
            if (return_context) {
              // return WebGL object if the function's argument is present
              return {name:names[i], gl:context};
            }
            // else, return just true
            return true;
          }
        } catch(e) {
        }
      }

      // WebGL is supported, but disabled
      return false;
    }

    // WebGL not supported
    return false;
  };

  /**
  Figure out if the browser supports Canvas.
  http://stackoverflow.com/q/2745432
  @method detectVCanvas
  */
  my.detectCanvas = function() {
    var elem = document.createElement('canvas');
    return !!(elem.getContext && elem.getContext('2d'));
  };

  /**
  Calculate the vertices of the near and far planes. Don't use THREE.Frustum
  here. http://stackoverflow.com/a/12022005 http://stackoverflow.com/a/23002688
  @method calcFrustum
  */
  my.calcFrustum = function( camera ) {
    // Near Plane dimensions
    var hNear = 2 * Math.tan(camera.fov * Math.PI / 180 / 2) * camera.near; // height
    var wNear = hNear * camera.aspect; // width
    // Far Plane dimensions
    var hFar = 2 * Math.tan(camera.fov * Math.PI / 180 / 2) * camera.far; // height
    var wFar = hFar * camera.aspect; // width

    var cam_near = camera.position.z - camera.near; // -camera.near
    var cam_far  = camera.position.z - camera.far;  // -camera.far

    return {
      nearPlane: {
        topLeft: new THREE.Vector3( -(wNear / 2), hNear / 2, cam_near ),
        topRight: new THREE.Vector3( wNear / 2, hNear / 2, cam_near ),
        botRight: new THREE.Vector3( wNear / 2, -(hNear / 2), cam_near ),
        botLeft: new THREE.Vector3( -(wNear / 2), -(hNear / 2), cam_near )
      },
      farPlane: {
        topLeft: new THREE.Vector3( -(wFar / 2), hFar / 2, cam_far ),
        topRight: new THREE.Vector3( wFar / 2, hFar / 2, cam_far ),
        botRight: new THREE.Vector3( wFar / 2, -(hFar / 2), cam_far ),
        botLeft: new THREE.Vector3( -(wFar / 2), -(hFar / 2), cam_far )
      }
    };
  };

  /**
  Message logger from http://stackoverflow.com/a/25867340.
  @class log
  */
  my.log = (function () {
    return {
      msg: function() {
        var args = Array.prototype.slice.call(arguments);
        args[0] = 'EXTRO: ' + args[0];
        console.log.apply(console, args);
      },
      warn: function() {
        var args = Array.prototype.slice.call(arguments);
        args[0] = 'EXTRO: ' + args[0];
        console.warn.apply(console, args);
      },
      error: function() {
        var args = Array.prototype.slice.call(arguments);
        args[0] = 'EXTRO: ' + args[0];
        console.error.apply(console, args);
      }
    };
  })();

  /**
  Retrieve the computed CSS style for a given property. Taken from somewhere.
  @method getComputedStyle
  */
  my.getComputedStyle = function( el, styleProp ) {
    var value, defaultView = el.ownerDocument.defaultView;
    // W3C standard way:
    if (defaultView && defaultView.getComputedStyle) {
      // sanitize property name to css notation (hypen separated words eg. font-Size)
      styleProp = styleProp.replace(/([A-Z])/g, "-$1").toLowerCase();
      return defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
    } else if (el.currentStyle) { // IE
      // sanitize property name to camelCase
      styleProp = styleProp.replace(/\-(\w)/g, function(str, letter) {
        return letter.toUpperCase();
      });
      value = el.currentStyle[styleProp];
      // convert other units to pixels on IE
      if (/^\d+(em|pt|%|ex)?$/i.test(value)) {
        return (function(value) {
          var oldLeft = el.style.left, oldRsLeft = el.runtimeStyle.left;
          el.runtimeStyle.left = el.currentStyle.left;
          el.style.left = value || 0;
          value = el.style.pixelLeft + "px";
          el.style.left = oldLeft;
          el.runtimeStyle.left = oldRsLeft;
          return value;
        })(value);
      }
      return value;
    }
  };

  /**
  Retrieve the value of the specified cookie.
  This is for internal use but we expose it as part of the extro interface for
  the benefit of samples and demos and such.
  @method getCookie
  */
  my.getCookie = function(sName)
  {
    sName = sName.toLowerCase();
    var oCrumbles = document.cookie.split(';');
    for(var i=0; i<oCrumbles.length;i++)
    {
        var oPair= oCrumbles[i].split('=');
        var sKey = decodeURIComponent(oPair[0].trim().toLowerCase());
        var sValue = oPair.length>1?oPair[1]:'';
        if(sKey == sName)
            return decodeURIComponent(sValue);
    }
    return '';
  };

  /**
  Sets a cookie.
  This is for internal use but we expose it as part of the extro interface for
  the benefit of samples and demos and such.
  @method setCookie
  */
  my.setCookie = function(sName,sValue)
  {
    var oDate = new Date();
    oDate.setYear(oDate.getFullYear()+1);
    var sCookie = encodeURIComponent(sName) + '=' + encodeURIComponent(sValue) + ';expires=' + oDate.toGMTString() + ';path=/';
    document.cookie = sCookie;
  };

  /**
  Clear a cookie.
  This is for internal use but we expose it as part of the extro interface for
  the benefit of samples and demos and such.
  @method clearCookie
  */
  my.clearCookie = function(sName)
  {
    my.setCookie(sName,'');
  };

  /**
  Utility function for drawing a rounded rect (2D). Currently unused.
  @method roundedRect
  */
  function roundedRect( ctx, x, y, width, height, radius ){
    ctx.moveTo( x, y + radius );
    ctx.lineTo( x, y + height - radius );
    ctx.quadraticCurveTo( x, y + height, x + radius, y + height );
    ctx.lineTo( x + width - radius, y + height) ;
    ctx.quadraticCurveTo( x + width, y + height, x + width, y + height - radius );
    ctx.lineTo( x + width, y + radius );
    ctx.quadraticCurveTo( x + width, y, x + width - radius, y );
    ctx.lineTo( x + radius, y );
    ctx.quadraticCurveTo( x, y, x, y + radius );
  }

  /**
  Register an Extrovert event.
  https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events
  */
  my.registerEvent = function( eventName ) {
    var classic = true; // older IE-compat method
    my.events = my.events || { };
    my.events[ eventName ] = classic ? document.createEvent( 'Event' ) : new Event( eventName );
    classic && my.events[ eventName ].initEvent( eventName, true, true );
    return my.events[ eventName ];
  };

  /**
  Fire an Extrovert event.
  */
  my.fireEvent = function( eventName ) {
    document.dispatchEvent( my.events[ eventName ] );
  };

  /**
  Module return.
  */
  return my;

});
