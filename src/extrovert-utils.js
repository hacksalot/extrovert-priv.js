/**
Extrovert.js is a 3D front-end for websites, blogs, and web-based apps.
@module extrovert-utils.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

EXTROVERT.Utils = (function (window, THREE) {



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
  @method shade_blend
  */
  /* jshint ignore:start */
  my.shade_blend = function( p, c0, c1 ) {
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
  Wrap text drawing helper for canvas. See:
  - http://stackoverflow.com/a/11361958
  - http: //www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
  @method wrap_text
  */
  my.wrap_text = function( context, text, x, y, maxWidth, lineHeight, measureOnly ) {

    var numLines = 1;
    var start_of_line = true;
    var lines = text.split('\n');
    var line_partial = '';
    var try_line = '';

    for (var line_no = 0; line_no < lines.length; line_no++) {
      var words = lines[ line_no ].split(' ');
      start_of_line = true;
      line_partial = '';
      for( var w = 0; w < words.length; w++ ) {
        try_line = line_partial + (start_of_line ? "" : " ") + words[ w ];
        var metrics = context.measureText( try_line );
        if( metrics.width <= maxWidth ) {
          start_of_line = false;
          line_partial = try_line;
        }
        else {
          measureOnly || context.fillText( line_partial, x, y);
          start_of_line = true;
          y += lineHeight;
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
      measureOnly || context.fillText( line_partial, x, y );
      y += lineHeight;
    }
    return numLines;
  };




  /**
  Figure out if the browser/machine supports WebGL.
  @method detect_webgl
  */
  my.detect_webgl = function( return_context ) {
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
  Calculate the vertices of the near and far planes. Don't use THREE.Frustum
  here. http://stackoverflow.com/a/12022005 http://stackoverflow.com/a/23002688
  @method calc_frustum
  */
  my.calc_frustum = function( camera ) {
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
  Simple plain JavaScript version of jQuery .extend.
  @method extend
  function extend(){
    for(var i=1; i<arguments.length; i++)
      for(var key in arguments[i])
        if(arguments[i].hasOwnProperty(key))
          arguments[0][key] = arguments[i][key];
    return arguments[0];
  }*/


  my.is_plain_object = function( obj ) {
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
          if (deep && copy && (my.is_plain_object(copy) || (copyIsArray = (copy.constructor === Array)))) {
            if (copyIsArray) {
              copyIsArray = false;
              clone = src && jQuery.isArray(src) ? src : [];
            } else {
              clone = src && my.is_plain_object(src) ? src : {};
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


  my.offset = function( elem ) {
    var docElem, win;//, elem = this[0];
    var box = {
        top: 0,
        left: 0
    };

    doc = elem && elem.ownerDocument;
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
        console.log.apply(console, args);
      },
      warn: function() {
        var args = Array.prototype.slice.call(arguments);
        console.warn.apply(console, args);
      },
      error: function() {
        var args = Array.prototype.slice.call(arguments);
        console.error.apply(console, args);
      }
    };
  })();



  /**
  Simple jQuery-like selector. We don't want to pull in jQuery itself, and at 8k
  minified, a standalone selector library like Sizzle is overkill, so we roll a
  simple one in the style of
  http://blog.garstasio.com/you-dont-need-jquery/selectors/#see-a-pattern?
  */
  my.$ = function(selector) {
    var selectorType = 'querySelectorAll';
    if (selector.indexOf('#') === 0) {
        selectorType = 'getElementById';
        selector = selector.substr(1, selector.length);
    }
    return document[selectorType](selector);
  };



  /**
  Module return.
  */
  return my;



}(window, THREE));
// [1]: FireFox doesn't support .offsetX:
//      https://bugzilla.mozilla.org/show_bug.cgi?id=69787
//      http://stackoverflow.com/q/11334452
