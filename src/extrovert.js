/**
Extrovert.js is a 3D front-end for websites, blogs, and web-based apps.
@module extrovert.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

var EXTROVERT = (function (window, $, THREE) {



   /**
   Module object.
   */
   var my = {};




   /**
   Initialize EXTROVERT.
   @method init
   */
   my.init = function( options ) {
      return init_priv( options );
   };



   /**
   Default options.
   */
   var defaults = {
      src: {
         selector: 'div',
         title: 'h2'
      },
      generator: 'gallery',
      rasterizer: 'img',
      container: '#container',
      gravity: [0,0,0],
      camera: {
         fov: 35,
         near: 1,
         far: 2000
      },
      physics: {
         enabled: true,
         materials: false,
         physijs: {
            worker: 'physijs_worker.min.js',
            ammo: 'ammo.js'
         }
      },
      block: {
         width: 128,
         height: 64,
         depth: 2
      },
      move_with_physics: true,
      onload: null,
      onerror: null
   };



   /**
   Internal engine settings.
   */
   var eng = {
      camera: null,
      scene: null,
      renderer: null,
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      width: 100,
      height: 100,
      gravity: new THREE.Vector3( defaults.gravity[0], defaults.gravity[1], defaults.gravity[2] ),
      selected: null,
      start_time: 0,
      last_time: 0,
      card_coll: [],
      drag_plane: null,
      placement_plane: null,
      offset: new THREE.Vector3(),
      generator: null
   };



   /**
   The infamous zero vector, whose reputation precedes itself.
   */
   var ZERO_G = new THREE.Vector3(0, 0, 0);



   /**
   Combined options object.
   */
   var opts = null;



   /**
   Private initialization workhorse.
   @method init_priv
   */
   function init_priv( options ) {
      if( !my.detect_webgl() ) return false;
      init_options( options );
      init_renderer();
      init_world( opts, eng );
      init_physics();
      init_events();
      init_timer();
      start();
      return true;
   }



   /**
   Initialize engine options. Merge user-specified options with default options
   without modifying the user-specified options.
   @method init_options
   */
   function init_options( options ) {

      // Grab the generator. It has default options we need to wire in.
      if( !options.generator )
         eng.generator = new EXTROVERT.imitate();
      else if (typeof options.generator == 'string')
         eng.generator = new EXTROVERT[ options.generator ]();
      else {
         eng.generator = new EXTROVERT[ options.generator.name ]();
      }

      opts = $.extend(true, { }, defaults, eng.generator.options );
      opts = $.extend(true, opts, options );
      log.msg("Options: %o", opts);

      if( opts.physics.enabled ) {
         Physijs.scripts.worker = opts.physics.physijs.worker;
         Physijs.scripts.ammo = opts.physics.physijs.ammo;
      }

      if( typeof opts.rasterizer == 'string' )
         eng.rasterizer = new EXTROVERT[ 'paint_' + opts.rasterizer ]();
      else
         eng.rasterizer = opts.rasterizer || new EXTROVERT.paint_img();

      eng.log = log;
   }



   /**
   Generate world geography.
   @method init_world
   */
   function init_world( options, eng ) {
      eng.generator.generate( options, eng );
   }



   /**
   Initialize the renderer.
   @method init_renderer
   */
   function init_renderer() {
      var cont = $( opts.container );
      var rect = cont[0].getBoundingClientRect();
      eng.width = rect.right - rect.left;
      eng.height = rect.bottom - rect.top;
      eng.renderer = new THREE.WebGLRenderer();
      eng.renderer.setPixelRatio( window.devicePixelRatio );
      eng.renderer.setSize( eng.width, eng.height );
      // Give the canvas a tabindex so it receives keyboard input and set the
      // position to relative so coordinates are canvas-local.
      // http://stackoverflow.com/a/3274697
      eng.renderer.domElement.setAttribute('tabindex', '0');
      eng.renderer.domElement.style += ' position: relative;';
      log.msg( "Renderer: %o", eng.renderer );
   }



   /**
   Create a camera from a generic options object.
   @method create_camera
   */
   my.create_camera = function( copts ) {
      var cam = copts.type != 'orthographic' ?
         new THREE.PerspectiveCamera( copts.fov, eng.width / eng.height, copts.near, copts.far ) :
         new THREE.OrthographicCamera( copts.left, copts.right, copts.top, copts.bottom, copts.near, copts.far );
      cam.position.set( copts.position[0], copts.position[1], copts.position[2] );
      eng.camera = cam;
      if( copts.up ) cam.up.set( copts.up[0], copts.up[1], copts.up[2] );
      if( copts.lookat ) cam.lookAt( new THREE.Vector3( copts.lookat[0], copts.lookat[1], copts.lookat[2] ) );
      cam.updateMatrix();
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      log.msg( "Created camera: %o", eng.camera );
      return cam;
   };



   /**
   Initialize the scene.
   @method init_scene
   */
   my.create_scene = function( scene_opts ) {
      var scene = scene_opts.physics.enabled ? new Physijs.Scene() : new THREE.Scene();
      eng.scene = scene;
      log.msg( "Created scene: %o", scene );
      create_scene_objects( scene, scene_opts );
      return scene;
   };



   /**
   Create predefined scene objects.
   @method create_scene_objects
   */
   function create_scene_objects( scene, scene_opts ) {
      if( scene_opts.scene && scene_opts.scene.items ) {
         for(var i = 0; i < scene_opts.scene.items.length; i++) {
            var mesh = my.create_object( scene_opts.scene.items[ i ] );
            scene.add( mesh );
         }
      }
   }



   /**
   Create a mesh object from a generic description.
   @method create_object
   */
   my.create_object = function( desc ) {
      var mesh = null, geo = null, mat = null;
      var rgb = desc.color || 0xFFFFFF;
      var opac = desc.opacity || 1.0;
      var trans = desc.transparent || true;
      if( desc.type === 'box' ) {
         geo = new THREE.BoxGeometry( desc.dims[0], desc.dims[1], desc.dims[2] );
         mat = new THREE.MeshLambertMaterial( { color: rgb, opacity: opac, transparent: trans } );
         mesh = create_mesh(geo, 'Box', mat);
      }
      else if( desc.type === 'plane' ) {
         geo = new THREE.PlaneBufferGeometry( desc.dims[0], desc.dims[1] );
         mat = new THREE.MeshBasicMaterial( { color: rgb, opacity: opac, transparent: trans } );
         mesh = create_mesh( geo, null, mat, true );
      }
      if( desc.pos )
         mesh.position.set( desc.pos[0], desc.pos[1], desc.pos[2] );
      if( desc.visible === false )
         mesh.visible = false;
      eng.log.msg("Created object: %o", mesh);
      return mesh;
   };


   function create_mesh( geo, mesh_type, mat, force_simple ) {
      return opts.physics.enabled && !force_simple ?
         new Physijs[ mesh_type + 'Mesh' ]( geo, mat, 0 ) : new THREE.Mesh(geo, mat);
   }


   /**
   Initialize the physics system.
   @method init_physics
   */
   function init_physics() {
      if( opts.physics.enabled ) {
         eng.gravity.set( opts.gravity[0], opts.gravity[1], opts.gravity[2] );
         eng.scene.setGravity( eng.gravity );
         eng.scene.addEventListener('update', update);
      }
   }



   /**
   Set up event handlers.
   @method init_events
   */
   function init_events() {
      eng.renderer.domElement.addEventListener( 'mousedown', mouse_down, false );
      eng.renderer.domElement.addEventListener( 'mouseup', mouse_up, false );
      eng.renderer.domElement.addEventListener( 'mousemove', mouse_move, false );
      window.addEventListener( 'resize', window_resize, false );
   }



   /**
   Initialize the scene "timer". TODO: Improve simulation timing and structure.
   @method init_timer
   */
   function init_timer() {
      eng.start_time = eng.last_time = Date.now() / 1000.0;
   }



   /**
   Start the simulation.
   @method start
   */
   function start() {
      $( opts.container ).replaceWith( eng.renderer.domElement );
      opts.onload && opts.onload();
      animate();
   }



   /**
   Animate the scene.
   @method animate
   */
   function animate() {
      requestAnimationFrame( animate );
      render();
   }



   /**
   Update the scene physics. Only called when physics are enabled. TODO: move
   physics-related manipulation to this function.
   @method update
   */
   function update() {

   }



   /**
   Render the scene. TODO: Optimize animate/render timing and structure.
   @method render
   */
   function render() {

      eng.scene.simulate();

      // Get time in SECONDS
      var time = Date.now() / 1000.0;
      var elapsed = time - eng.last_time;
      eng.last_time = time;

      if( !opts.move_with_physics ) {
         // Maintain the __dirtyPosition flag while dragging
         if( eng.selected !== null ) {
            eng.selected.__dirtyPosition = true;
         }
         // Maintain the __dirtyPosition flag on touched objects
         for ( var i = 0, l = eng.card_coll.length; i < l; i ++ )
         {
            if( eng.card_coll[ i ].has_been_touched ) {
               eng.card_coll[ i ].__dirtyPosition = true;
            }
         }
      }

      eng.renderer.clear();
      eng.renderer.render( eng.scene, eng.camera );
   }




   /**
   Create one or more lights.
   @method fiat_lux
   */
   my.fiat_lux = function( light_opts ) {

      var lights = [];
      var new_light = null;

      $.each( light_opts, function(idx, val) {

         if( val.type === 'ambient' ) {
            new_light = new THREE.AmbientLight( val.color );
         }
         else if (val.type === 'point') {
            new_light = new THREE.PointLight( val.color, val.intensity, val.distance );
         }
         else if (val.type === 'spotlight') {
            new_light = create_spotlight( val );
         }
         else {
            return;
         }

         if( val.type !== 'ambient' ) {
            if( val.pos )
               new_light.position.set( val.pos[0], val.pos[1], val.pos[2] );
            else
               new_light.position.copy( eng.camera.position );
         }

         eng.scene.add( new_light );
         lights.push( new_light );
      });

      return lights;
   };



   /**
   Create a spotlight with the specified color. TODO: adjust shadowmap settings.
   @method create_spotlight
   */
   function create_spotlight( light ) {
      // var spotLight = new THREE.SpotLight(
         // light.color, light.intensity || 0.5, light.distance || 1000,
         // light.angle || 35 );
      var spotLight = new THREE.SpotLight( light.color );
      spotLight.shadowCameraVisible = false;
      return spotLight;
   }



   /**
   Perform a color blend (darken, lighten, or gradient) on a color (string) and
   return another string representing the color. See: http://stackoverflow.com/a/13542669
   @method shade_blend
   */
   /* jshint ignore:start */
   function shade_blend( p, c0, c1 ) {
       var n=p<0?p*-1:p,u=Math.round,w=parseInt;
       if(c0.length>7) {
           var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
           return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")";
       }
       else {
           var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
           return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1);
       }
   }
   /* jshint ignore:end */



   /**
   Generate a texture corresponding to the passed-in element. TODO: remove use
   of jQuery. TODO: shader. TODO: Power-of-2 textures when possible. TODO: raw
   bitmap data instead of loading via canvas. TODO: don't need to load separate
   textures if they only differ by text or color.
   @method generate_texture
   */
   my.generate_texture = function( $val ) {

      // Get the element content
      var title_elem = $val.find( opts.src.title );
      var title = title_elem.text().trim();

      // Create a canvas element. TODO: Reuse a single canvas.
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = $val.width();
      canvas.height = $val.height();

      //rasterizeHTML.drawHTML( $val.html(), canvas );
      //rasterizeHTML.drawDocument( document, canvas );

      if( true ) {
         // Paint on the canvas
         var bkColor = $val.css('background-color');
         if(bkColor === 'rgba(0, 0, 0, 0)')
            bkColor = 'rgb(0,0,0)';
         context.fillStyle = bkColor;
         context.fillRect(0, 0, canvas.width, canvas.height);
         var images = $val.children('img');
         if(images.length > 0)
            context.drawImage(images.get(0),0,0, canvas.width, canvas.height);
         var font_size = title_elem.css('font-size');
         //context.font = "Bold 18px 'Open Sans Condensed'";
         context.font = "Bold " + font_size + " '" + title_elem.css('font-family') + "'";
         context.fillStyle = title_elem.css('color');
         context.textBaseline = 'top';
         var line_height = 24;
         var num_lines = wrap_text( context, title, 10, 10, canvas.width - 20, line_height, true );
         if(images.length === 0)
            context.fillStyle = shade_blend( -0.25, bkColor );
         else
            context.fillStyle = "rgba(0,0,0,0.75)";
         context.fillRect(0,0, canvas.width, 20 + num_lines * line_height);
         context.fillStyle = title_elem.css('color');
         wrap_text( context, title, 10, 10, canvas.width - 20, line_height, false );
      }

      // Create a texture from the canvas
      var texture = new THREE.Texture( canvas );
      texture.needsUpdate = true;
      return {
         tex: texture,
         mat: new THREE.MeshLambertMaterial( { map: texture/*, side: THREE.DoubleSide*/ } )
      };
   };



   /**
   Wrap text drawing helper for canvas. See:
   - http://stackoverflow.com/a/11361958
   - http: //www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
   @method wrap_text
   */
   function wrap_text( context, text, x, y, maxWidth, lineHeight, measureOnly ) {
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
   }



   /**
   Calculate the position, in world coordinates, of the specified (x,y) screen
   location, at a depth specified by the plane parameter. TODO: this can be done
   without raycasting; just extend a vector out to the desired Z.
   @method calc_position
   */
   my.calc_position = function( posX, posY, placement_plane ) {
      eng.raycaster.setFromCamera( to_ndc( posX, posY, 0.5, new THREE.Vector3() ), eng.camera );
      var intersects = eng.raycaster.intersectObject( eng.placement_plane );
      return (intersects.length > 0) ? intersects[0].point : null;
   };



   /**
   Push a card.
   @method push_card
   */
   function push_card( thing ) {
      if( opts.physics.enabled ) {
         var rotation_matrix = new THREE.Matrix4().extractRotation( thing.object.matrix );
         var effect = thing.face.normal.clone().negate().multiplyScalar( 30000 ).applyMatrix4( rotation_matrix );
         var force_offset = thing.point.clone().sub( thing.object.position );
         thing.object.applyImpulse( effect, force_offset );
      }
   }



   /**
   Handle the 'mousedown' event.
   @method mouse_down
   */
   function mouse_down( e ) {

      e.preventDefault();
      var xpos = e.offsetX === undefined ? e.layerX : e.offsetX; //[1]
      var ypos = e.offsetY === undefined ? e.layerY : e.offsetY;
      eng.mouse = to_ndc( xpos, ypos, 0.5, eng.mouse );
      eng.raycaster.setFromCamera( eng.mouse, eng.camera );
      var intersects = eng.raycaster.intersectObjects( eng.card_coll );
      if( intersects.length === 0 )
         return;

      if( e.ctrlKey ) {
         eng.selected = intersects[ 0 ].object;
         eng.selected.has_been_touched = true;
         eng.drag_plane.position.copy( eng.selected.position );
         //var plane_intersects = eng.raycaster.intersectObject( eng.drag_plane );
         eng.offset.copy( intersects[ 0 ].point ).sub( eng.selected.position );
         if( opts.physics.enabled ) {
            eng.selected.setAngularFactor( ZERO_G );
            eng.selected.setLinearFactor( ZERO_G );
            eng.selected.setAngularVelocity( ZERO_G );
            eng.selected.setLinearVelocity( ZERO_G );
         }
         else {
            eng.selected.temp_velocity = new THREE.Vector3().copy( eng.selected.velocity );
            eng.selected.velocity.set(0,0,0);
         }
      }
      else {
         push_card( intersects[0] );
      }
   }



   /**
   Handle the 'mousemove' event. TODO: physics integration.
   @method mouse_move
   */
   function mouse_move( e ) {
      e.preventDefault();
      var xpos = e.offsetX === undefined ? e.layerX : e.offsetX; //[1]
      var ypos = e.offsetY === undefined ? e.layerY : e.offsetY;
      eng.mouse = to_ndc( xpos, ypos, 0.5, eng.mouse );
      if ( eng.selected ) {
         eng.raycaster.setFromCamera( eng.mouse, eng.camera );
         var intersects = eng.raycaster.intersectObject( eng.drag_plane );
         if( opts.move_with_physics ) {
            var lin_vel = intersects[ 0 ].point.sub( eng.selected.position );
            lin_vel.z = 0;
            eng.selected.setLinearVelocity( lin_vel );
         }
         else {
            eng.selected.position.copy( intersects[ 0 ].point.sub( eng.offset ) );
            eng.selected.__dirtyPosition = true;
         }
      }
   }



   /**
   Handle the 'mouseup' event.
   @method mouse_up
   */
   function mouse_up( event ) {
      event.preventDefault();
      if( eng.selected && opts.physics.enabled ) {
         if( opts.physics.enabled ) {
            var oneVec = new THREE.Vector3( 1, 1, 1 );
            eng.selected.setAngularFactor( oneVec );
            eng.selected.setLinearFactor( oneVec );
            eng.selected.__dirtyPosition = true;
         }
         else {
            eng.raycaster.setFromCamera( eng.mouse, eng.camera );
            var intersects = eng.raycaster.intersectObject( eng.drag_plane );
            eng.selected.position.copy( intersects[ 0 ].point.sub( eng.offset ) );
         }
         eng.selected.updateMatrixWorld();
         eng.selected.updateMatrix();
      }
      eng.selected = null;
   }



   /**
   Handle the 'resize' event.
   @method window_resize
   */
   function window_resize() {
      var rect = eng.renderer.domElement.parentNode.getBoundingClientRect();
      eng.width = rect.right - rect.left;
      eng.height = rect.bottom - rect.top;
      eng.camera.aspect = eng.width / eng.height;
      eng.camera.updateProjectionMatrix();
      eng.renderer.setSize( eng.width, eng.height );
      log.msg("window_resize( %d, %d a=%s)", eng.width, eng.height, eng.camera.aspect.toString());
   }



   /**
   Determine if the browser/machine supports WebGL.
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
   Convert the specified screen coordinates to normalized device coordinates
   (NDC) ranging from -1.0 to 1.0 along each axis.
   @method to_ndc
   */
   function to_ndc( posX, posY, posZ, coords ) {
      coords.x = ( posX / eng.width ) * 2 - 1;
      coords.y = - ( posY / eng.height ) * 2 + 1;
      coords.z = posZ;
      return coords;
   }



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
   var log = (function () {
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
