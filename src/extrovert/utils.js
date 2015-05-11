/**
Utilities for Extrovert.js.
@module extrovert-utils.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

define([], function( )  {

  'use strict';


    /**
    Module object.
    */
    var my = {};

    /**
    The infamous zero vector, whose reputation precedes itself.
    */
    my.VZERO = new THREE.Vector3(0, 0, 0);

    /**
    Perform a color blend (darken, lighten, or gradient) on a color (string) and
    return another string representing the color. See: http://stackoverflow.com/a/13542669
    @method shadeBlend
    */
    /* jshint ignore:start */
    my.shadeBlend = function( p, c0, c1 ) {
      var n=p<0?p*-1:p,u=Math.round,w=parseInt;
      if(c0.length>7) {
        var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
        return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")";
      }
      else {
        var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
        return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1);
      }
    };
    /* jshint ignore:end */

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
    Determine if the supplied object is a "plain object", ie, an object created
    via { } or new. Loosely based on jQuery.isPlainObject.
    @method isPlainObject
    */
    my.isPlainObject = function( obj ) {
      // Not plain objects:
      // - Any object or value whose internal [[Class]] property is not "[object Object]"
      // - DOM nodes
      // - window
      if ((typeof obj !== "object") || obj.nodeType || (obj !== null && obj === obj.window)) {
        return false;
      }

      if (obj.constructor && !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")) {
        return false;
      }

      // If the function hasn't returned already, we're confident that
      // |obj| is a plain object, created by {} or constructed with new Object
      return true;
    };

    /**
    Determine if the specified object is an array.
    @method isArray
    */
    my.isArray = function( obj ) {
      return Object.prototype.toString.call( obj ) === '[object Array]';
    };

    /**
    Simple plain JavaScript version of jQuery .extend.
    function extend(){
      for(var i=1; i<arguments.length; i++)
        for(var key in arguments[i])
          if(arguments[i].hasOwnProperty(key))
            arguments[0][key] = arguments[i][key];
      return arguments[0];
    }*/

    /**
    Industrial-strength plain JavaScript version of .extend based on jQuery sources.
    @method extend
    */
    my.extend = function() {
      var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

      // Handle a deep copy situation
      if (typeof target === "boolean") {
        deep = target;
        // Skip the boolean and the target
        target = arguments[i] || {};
        i++;
      }

      // Handle case when target is a string or something (possible in deep copy)
      //if (typeof target !== "object" && !jQuery.isFunction(target))
      if (typeof target !== "object" && typeof target !== "function")
        target = {};

      for (; i < length; i++) {
        // Only deal with non-null/undefined values
        if ((options = arguments[i]) !== null) {
          // Extend the base object
          for (name in options) {
            src = target[name];
            copy = options[name];

            // Prevent never-ending loop
            if (target === copy) continue;

            // Recurse if we're merging plain objects or arrays
            if (deep && copy && (my.isPlainObject(copy) || (copyIsArray = (copy.constructor === Array)))) {
              if (copyIsArray) {
                copyIsArray = false;
                clone = src && (src.constructor === Array) ? src : [];
              } else {
                clone = src && my.isPlainObject(src) ? src : {};
              }
              // Never move original objects, clone them
              target[name] = my.extend(deep, clone, copy);
              // Don't bring in undefined values
            } else if (copy !== undefined) {
              target[name] = copy;
            }
          }
        }
      }

      // Return the modified object
      return target;
    };

    /**
    Retrieve the location of the given element. This implementation loosely based
    on jQuery's method.
    @method offset
    */
    my.offset = function( elem ) {
      var docElem, win;//, elem = this[0];
      var box = {
          top: 0,
          left: 0
      };

      var doc = elem && elem.ownerDocument;
      if (!doc) return;

      docElem = doc.documentElement;

      // Make sure it's not a disconnected DOM node
      // if (!jQuery.contains(docElem, elem)) {
          // return box;
      // }

      // If we don't have gBCR, just use 0,0 rather than error
      // BlackBerry 5, iOS 3 (original iPhone)
      if (elem.getBoundingClientRect !== undefined) {
        box = elem.getBoundingClientRect();
      }
      win = (doc !== null && doc === doc.window) ? doc : doc.nodeType === 9 && doc.defaultView;
      return {
        top: box.top + win.pageYOffset - docElem.clientTop,
        left: box.left + win.pageXOffset - docElem.clientLeft
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
    Simple jQuery-like selector. We don't want to pull in jQuery itself, and at 8k
    minified, a standalone selector library like Sizzle is overkill, so we roll a
    simple one in the style of
    http://blog.garstasio.com/you-dont-need-jquery/selectors/#see-a-pattern?
    @method $
    */
    my.$ = function(selector) {
      var selectorType = 'querySelectorAll';
      // if (selector.indexOf('#') === 0) {
          // selectorType = 'getElementById';
          // selector = selector.substr(1, selector.length);
      // }
      return document[selectorType](selector);
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
