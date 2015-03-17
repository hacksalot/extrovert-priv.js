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
      rasterizer: my.generate_image_texture,
      container: '#container',
      gravity: [0,0,0],
      camera: {
         fov: 35,
         near: 1,
         far: 2000,
         position: [0,0,800],
         rotation: [0,0,0],
         up: [0,1,0]
      },
      physics: {
         enabled: true,
         materials: false,
         physijs: {
            worker: 'physijs_worker.js',
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
   The infamous zero vector.
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
      if( !detect_webgl() ) return false;
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
      eng.rasterizer = opts.rasterizer || my.generate_image_texture;
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

      // A couple tweaks. Give the canvas a tabindex so it receives keyboard
      // input and set the position to relative so coordinates are canvas-local.
      eng.renderer.domElement.setAttribute('tabindex', '0');
      eng.renderer.domElement.style += ' position: relative;'; // http://stackoverflow.com/a/3274697
      log.msg( "Renderer: %o", eng.renderer );
   }



   /**
   Create a camera from a generic options object.
   @method create_camera
   */
   my.create_camera = function( cam_opts ) {
      var cam = cam_opts.type != 'orthographic' ?
         new THREE.PerspectiveCamera( cam_opts.fov, eng.width / eng.height, cam_opts.near, cam_opts.far ) :
         new THREE.OrthographicCamera( cam_opts.left, cam_opts.right, cam_opts.top, cam_opts.bottom, cam_opts.near, cam_opts.far );
      cam.position.set( cam_opts.position[0], cam_opts.position[1], cam_opts.position[2] );
      eng.camera = cam;
      eng.scene && eng.scene.add( cam );      
      cam.up.set( cam_opts.up[0], cam_opts.up[1], cam_opts.up[2] );
      if( cam_opts.lookat ) {
         cam.lookAt( new THREE.Vector3( cam_opts.lookat[0], cam_opts.lookat[1], cam_opts.lookat[2] ) );
         cam.updateProjectionMatrix();
      }
      cam.updateMatrixWorld();
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
      return scene;
   };



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
   @method generate_image_texture
   */
   my.generate_image_texture = function ( $val ) {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = $val.width();
      canvas.height = $val.height();
      var img = $val.get( 0 );
      context.drawImage(img, 0, 0, img.clientWidth, img.clientHeight);
      var texture = new THREE.Texture( canvas );
      texture.needsUpdate = true;
      return {
         tex: texture,
         mat: new THREE.MeshLambertMaterial( { map: texture, side: THREE.FrontSide } )
      };
   };


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
   function detect_webgl( return_context ) {
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
   }



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
;/**
An Extrovert.js generator for a 3D city.
@module extrovert-city.js
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
      gravity: [0,-1,0],
      camera: {
         position: [0,400,0],
         lookat: [0,0,-800],
         up: [0,0,-1]
      },
      generator: {
         name: 'city',
         background: 'default_background.png',
         material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
      }
   };


   /**
   @class The built-in 'city' generator.
   */
   EXTROVERT.city = function() {
      return {
         generate: function( options, eng ) {
            var new_opts = $.extend(true, { }, _def_opts, options);
            if( !new_opts.generator || typeof new_opts.generator == 'string' )
               new_opts.generator = _def_opts.generator;
            init_objects( new_opts, eng );
         },
         options: _def_opts
      };
   };


   /**
   Initialize scene props and objects. TODO: clean up object allocations.
   @method init_objects
   */
   function init_objects( opts, eng ) {

      EXTROVERT.create_scene( opts );
      var cam = EXTROVERT.create_camera( opts.camera );
      EXTROVERT.fiat_lux( opts.lights );

      // Create an invisible, untouchable drag plane for drag-drop
      // TODO: remove hard-coded numbers
      eng.drag_plane = new THREE.Mesh(
         new THREE.PlaneBufferGeometry( 2000, 2000, 8, 8 ),
         new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.25, transparent: true } ));
      eng.drag_plane.visible = false;
      eng.log.msg("Building intersection plane: %o", eng.drag_plane);

      // Create the visible/collidable backplane. Place it on the 
      // camera's back frustum plane so it always fills the viewport.
      if( false ) {

         var frustum_planes = EXTROVERT.calc_frustum( eng.camera );
         var planeWidth = frustum_planes.farPlane.topRight.x - frustum_planes.farPlane.topLeft.x;
         var planeHeight = frustum_planes.farPlane.topRight.y - frustum_planes.farPlane.botRight.y;

         var plane_tex = opts.generator.background ?
            THREE.ImageUtils.loadTexture( opts.generator.background ) : null;

         var plane2 = opts.physics.enabled ?
            new Physijs.BoxMesh(
               new THREE.BoxGeometry(planeWidth, planeHeight, 10),
               new THREE.MeshLambertMaterial( { color: 0xFFFFFF, map: plane_tex } ), 0 )
            :
            new THREE.Mesh(
               new THREE.BoxGeometry(planeWidth,planeHeight,10),
               new THREE.MeshLambertMaterial( { color: 0x333333, map: plane_tex, opacity: 1.0, transparent: false } )
            );
         plane2.position.z = frustum_planes.farPlane.topRight.z;
         plane2.receiveShadow = false; // TODO: not working
         plane2.updateMatrix();
         plane2.updateMatrixWorld();
         eng.scene.add( plane2 );
         eng.log.msg("Building base plane: %o", plane2);
      }

      // Create a hidden plane for object placement.
      // TODO: We don't actually need this plane. Replace with unproject at specified Z.
      eng.placement_plane = opts.physics.enabled ?
            new Physijs.BoxMesh(
               new THREE.BoxGeometry(200000,1, 200000),
               new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ),
               0 ) :
            new THREE.Mesh(
               new THREE.BoxGeometry(200000,1, 200000),
               new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } )
            );
      eng.placement_plane.visible = false;
      eng.placement_plane.position.y = 200;
      // TODO: Figure out which update calls are necessary
      eng.scene.updateMatrix();
      eng.placement_plane.updateMatrix();
      eng.placement_plane.updateMatrixWorld();
      eng.log.msg("Building placement plane: %o", eng.placement_plane);

      init_elements( opts, eng );
   }



   /**
   Initialize all card objects.
   @method init_cards
   */
   function init_elements( opts, eng ) {
      var mat = new THREE.MeshLambertMaterial({ color: opts.generator.material.color });
      eng.side_mat = Physijs.createMaterial( mat, opts.generator.material.friction, opts.generator.material.restitution );
      $( opts.src.selector ).each( function( idx, val ) {
         init_image( idx, val, opts, eng );
      });
   }



   /**
   Initialize a single card object. TODO: Clean up material/geo handling.
   @method init_card
   */
   function init_image( idx, val, opts, eng ) {

      // Position
      var pos_info = get_position( val, opts, eng );

      // Texture
      var texture = eng.rasterizer( $(val), opts );
      var material = (!opts.physics.enabled || !opts.physics.materials) ?
         texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
      var materials = new THREE.MeshFaceMaterial([
         material, material, material, material,
         material, material
      ]);

      // Mesh
      var cube_geo = new THREE.BoxGeometry( pos_info.width, pos_info.height, pos_info.depth   );
      var mesh = opts.physics.enabled ?
         new Physijs.BoxMesh( cube_geo, materials, 1000 ) :
         new THREE.Mesh( cube_geo, materials );
      mesh.position.copy( pos_info.pos );         
      mesh.castShadow = mesh.receiveShadow = false;
      if( opts.generator.lookat )
         mesh.lookAt( new THREE.Vector3(opts.generator.lookat[0], opts.generator.lookat[1], opts.generator.lookat[2]) );
      mesh.elem = $(val);
      
      opts.creating && opts.creating( val, mesh );
      eng.scene.add( mesh );
      eng.card_coll.push( mesh );
      eng.log.msg("Created element %d (%f, %f, %f): %o.", idx, pos_info.pos.x, pos_info.pos.y, pos_info.pos.z, mesh);
      opts.created && opts.created( val, mesh );

      return mesh;
   }
   
   
   
   /**
   Retrieve the position, in 3D space, of a recruited HTML element.
   @method init_card
   */   
   function get_position( val, opts, eng ) {
   
      // Get the position of the HTML element [1]
      var parent_pos = $( opts.container ).offset();
      var child_pos = $( val ).offset();
      var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

      // From that, compute the position of the top-left and bottom-right corner
      // of the element as they would exist in 3D-land.
      var topLeft = EXTROVERT.calc_position( pos.left, pos.top, eng.placement_plane );
      var botRight = EXTROVERT.calc_position( pos.left + $(val).width(), pos.top + $(val).height(), eng.placement_plane );
      var block_width = Math.abs( botRight.x - topLeft.x );
      var block_height = Math.abs( topLeft.z - botRight.z );
      
      // Offset by the half-height/width so the corners line up
      return { 
         pos: new THREE.Vector3(
            topLeft.x + (block_width / 2),
            topLeft.y - (opts.block.depth / 2),
            Math.min(botRight.z,topLeft.z) + (block_height / 2)),
         width: block_width,
         depth: block_height,
         height: opts.block.depth
      };
   }



   /**
   Module return.
   */
   //return my;



}(window, $, THREE, EXTROVERT));

// [1] Don't rely exclusively on .offset() or .position()
//     See: http://bugs.jquery.com/ticket/11606      
//     var pos = $(val).offset();
//     var pos = $(val).position();
;/**
An Extrovert.js generator for a 3D image gallery.
@module extrovert-gallery.js
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
         name: 'gallery',
         background: 'default_background.png',
         material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
      }
   };


   /**
   @class The built-in 'gallery' generator.
   */
   EXTROVERT.gallery = function() {
      return {
         generate: function( options, eng ) {
            var new_opts = $.extend(true, { }, _def_opts, options);
            if( !new_opts.generator || typeof new_opts.generator == 'string' )
               new_opts.generator = _def_opts.generator;
            init_objects( new_opts, eng );
         }
      };
   };


   /**
   Initialize scene props and objects. TODO: clean up object allocations.
   @method init_objects
   */
   function init_objects( opts, eng ) {

      EXTROVERT.create_scene( opts );
      EXTROVERT.create_camera( opts.camera );
      EXTROVERT.fiat_lux( opts.lights );

      // Create an invisible, untouchable drag plane for drag-drop
      // TODO: remove hard-coded numbers
      eng.drag_plane = new THREE.Mesh(
         new THREE.PlaneBufferGeometry( 2000, 2000, 8, 8 ),
         new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.25, transparent: true } ));
      eng.drag_plane.visible = false;
      eng.log.msg("Building intersection plane: %o", eng.drag_plane);

      // Create the visible/collidable backplane. Place it on the 
      // camera's back frustum plane so it always fills the viewport.
      if( true ) {

         var frustum_planes = EXTROVERT.calc_frustum( eng.camera );
         var planeWidth = frustum_planes.farPlane.topRight.x - frustum_planes.farPlane.topLeft.x;
         var planeHeight = frustum_planes.farPlane.topRight.y - frustum_planes.farPlane.botRight.y;

         var plane_tex = opts.generator.background ?
            THREE.ImageUtils.loadTexture( opts.generator.background ) : null;

         var plane2 = opts.physics.enabled ?
            new Physijs.BoxMesh(
               new THREE.BoxGeometry(planeWidth, planeHeight, 10),
               new THREE.MeshLambertMaterial( { color: 0xFFFFFF, map: plane_tex } ), 0 )
            :
            new THREE.Mesh(
               new THREE.BoxGeometry(planeWidth,planeHeight,10),
               new THREE.MeshLambertMaterial( { color: 0x333333, map: plane_tex, opacity: 1.0, transparent: false } )
            );
         plane2.position.z = frustum_planes.farPlane.topRight.z;
         plane2.receiveShadow = false; // TODO: not working
         plane2.updateMatrix();
         plane2.updateMatrixWorld();
         eng.scene.add( plane2 );
         eng.log.msg("Building base plane: %o", plane2);
      }

      // Create a hidden plane for object placement.
      // TODO: We don't actually need this plane. Replace with unproject at specified Z.
      eng.placement_plane = opts.physics.enabled ?
            new Physijs.BoxMesh(
               new THREE.BoxGeometry(200000,200000,1),
               new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ),
               0 ) :
            new THREE.Mesh(
               new THREE.BoxGeometry(200000,200000,1),
               new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } )
            );
      eng.placement_plane.visible = false;
      eng.placement_plane.position.z = 200;
      // TODO: Figure out which update calls are necessary
      eng.scene.updateMatrix();
      eng.placement_plane.updateMatrix();
      eng.placement_plane.updateMatrixWorld();
      eng.log.msg("Building placement plane: %o", eng.placement_plane);

      init_cards( opts, eng );
   }



   /**
   Initialize all card objects.
   @method init_cards
   */
   function init_cards( opts, eng ) {
      var mat = new THREE.MeshLambertMaterial({ color: opts.generator.material.color });
      eng.side_mat = Physijs.createMaterial( mat, opts.generator.material.friction, opts.generator.material.restitution );
      $( opts.src.selector ).each( function( idx, val ) {
         init_image( idx, val, opts, eng );
      });
   }



   /**
   Initialize a single card object. TODO: Clean up material/geo handling.
   @method init_card
   */
   function init_image( idx, val, opts, eng ) {

      // Position
      var pos_info = get_position( val, opts, eng );

      // Texture
      var texture = eng.rasterizer( $(val), opts );
      var material = (!opts.physics.enabled || !opts.physics.materials) ?
         texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
      var materials = new THREE.MeshFaceMaterial([
         eng.side_mat, eng.side_mat, eng.side_mat, eng.side_mat,
         material, material
      ]);

      // Mesh
      var cube_geo = new THREE.BoxGeometry( pos_info.width, pos_info.height, pos_info.depth );      
      var mesh = opts.physics.enabled ?
         new Physijs.BoxMesh( cube_geo, materials, 1000 ) :
         new THREE.Mesh( cube_geo, materials );
      mesh.position.copy( pos_info.pos );         
      mesh.castShadow = mesh.receiveShadow = false;
      if( opts.generator.lookat )
         mesh.lookAt( new THREE.Vector3(opts.generator.lookat[0], opts.generator.lookat[1], opts.generator.lookat[2]) );
      mesh.elem = $(val);
      
      opts.creating && opts.creating( val, mesh );
      eng.scene.add( mesh );
      eng.card_coll.push( mesh );
      eng.log.msg("Created element %d (%f, %f, %f): %o.", idx, pos_info.pos.x, pos_info.pos.y, pos_info.pos.z, mesh);
      opts.created && opts.created( val, mesh );

      return mesh;
   }
   
   
   
   /**
   Retrieve the position, in 3D space, of a recruited HTML element.
   @method init_card
   */   
   function get_position( val, opts, eng ) {
   
      // Get the position of the HTML element [1]
      var parent_pos = $( opts.container ).offset();
      var child_pos = $( val ).offset();
      var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

      // From that, compute the position of the top-left and bottom-right corner
      // of the element as they would exist in 3D-land.
      var topLeft = EXTROVERT.calc_position( pos.left, pos.top, eng.placement_plane );
      var botRight = EXTROVERT.calc_position( pos.left + $(val).width(), pos.top + $(val).height(), eng.placement_plane );
      var block_width = Math.abs( botRight.x - topLeft.x );
      var block_height = Math.abs( topLeft.y - botRight.y );
      
      // Offset by the half-height/width so the corners line up
      return { 
         pos: new THREE.Vector3(
            topLeft.x + (block_width / 2),
            topLeft.y - (block_height / 2), 
            topLeft.z - (opts.block.depth / 2)),
         width: block_width,
         height: block_height,
         depth: opts.block.depth
      };
   }



   /**
   Module return.
   */
   //return my;



}(window, $, THREE, EXTROVERT));

// [1] Don't rely exclusively on .offset() or .position()
//     See: http://bugs.jquery.com/ticket/11606      
//     var pos = $(val).offset();
//     var pos = $(val).position();
;/**
A sample Extrovert generator for demonstration purposes.
@module extrovert-sample.js
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
            var new_opts = $.extend(true, { }, _def_opts, options);
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

