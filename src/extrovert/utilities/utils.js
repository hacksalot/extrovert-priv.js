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
  
  // Improved wrap text drawing helper for canvas. See:
  // - http://stackoverflow.com/a/11361958
  // - http://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
  my.wrapText = function( context, text, x, y, maxWidth, lineHeight, measureOnly ) {

    var numLines = 1;
    var start_of_line = true;
    var line_partial = '';
    var try_line = '';
    var extents = [0,0];

    var lines = text.split('\n');

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
          metrics = context.measureText( line_partial );
          if( metrics.width > extents[0] )
            extents[0] = metrics.width;
          measureOnly || context.fillText( line_partial, x, y);
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
            // A single word that is wider than max allowed width; TODO: letter-break
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

  // via SO
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

  my.setCookie = function(sName,sValue)
  {
    var oDate = new Date();
    oDate.setYear(oDate.getFullYear()+1);
    var sCookie = encodeURIComponent(sName) + '=' + encodeURIComponent(sValue) + ';expires=' + oDate.toGMTString() + ';path=/';
    document.cookie = sCookie;
  };

  my.clearCookie = function(sName)
  {
    my.setCookie(sName,'');
  };

  // TODO: unused
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

  // https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events
  my.registerEvent = function( eventName ) {
    var classic = true; // older IE-compat method
    my.events = my.events || { };
    my.events[ eventName ] = classic ? document.createEvent( 'Event' ) : new Event( eventName );
    classic && my.events[ eventName ].initEvent( eventName, true, true );
    return my.events[ eventName ];
  };

  my.fireEvent = function( eventName ) {
    document.dispatchEvent( my.events[ eventName ] );
  };

  return my;

});
