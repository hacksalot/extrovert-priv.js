/**
Extrovert.js is a 3D front-end for websites, blogs, and web-based apps.
@module extrovert-utils.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

EXTROVERT.Utils = (function (window, $, THREE) {



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
      var lines = text.split("\n");
      var numLines = 1;
      for (var ii = 0; ii < lines.length; ii++) {
         var line = "";
         var words = lines[ii].split(" ");
         for (var n = 0; n < words.length; n++) {
            var testLine = line + words[n] + " ";
            var metrics = context.measureText(testLine);
            var testWidth = metrics.width;
            if (testWidth > maxWidth) {
               measureOnly || context.fillText(line, x, y);
               line = words[n] + " ";
               y += lineHeight;
               numLines++;
            }
            else {
               line = testLine;
            }
         }
         measureOnly || context.fillText(line, x, y);
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
            }
            catch(e) {

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
   Module return.
   */
   return my;



}(window, $, THREE));
// [1]: FireFox doesn't support .offsetX:
//      https://bugzilla.mozilla.org/show_bug.cgi?id=69787
//      http://stackoverflow.com/q/11334452
