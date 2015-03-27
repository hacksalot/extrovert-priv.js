/**
A sample Extrovert generator for demonstration purposes.
@module gen-sample.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   /**
   Module object.
   */
   //var my = {};


   /**
   Default options.
   */
   var _def_opts = {
      generator: {
         name: 'sample',
         background: 'default_background.png',
         material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
      }
   };


   /**
   @class The built-in 'sample' generator.
   */
   EXTROVERT.sample = function() {
      return {
         sample: function( options, eng ) {
            var new_opts = EXTROVERT.Utils.extend(true, { }, _def_opts, options);
            if( !new_opts.generator || typeof new_opts.generator == 'string' )
               new_opts.generator = _def_opts.generator;
            init_objects( new_opts, eng );
         }
      };
   };



   /**
   Module return.
   */
   //return my;



}(window, $, THREE, EXTROVERT));

