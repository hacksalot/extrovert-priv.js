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
   Default engine options. Will be smushed together with generator and user options.
   */
   var defaults = {
      src: {
         selector: 'div',
         title: 'h2',
         container: '#container'
      },
      generator: 'gallery',
      rasterizer: 'img',
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
         width: 128, // Not used
         height: 64, // Not used
         depth: 2
      },
      move_with_physics: true,
      click_force: 30000,
      onload: null,
      onerror: null
   };



   /**
   Internal engine settings for internal use inside the engine, internally.
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
      generator: null,
      clock: new THREE.Clock()
   };



   /**
   The one and only ultrafied combined options object.
   */
   var opts = null;



   /**
   Initialize the Extrovert library and get some 3D up in that grill.
   @method init
   */
   my.init = function( options ) {
      if( !EXTROVERT.Utils.detect_webgl() ) return false;
      init_options( options );
      init_renderer();
      init_world( opts, eng );
      init_canvas();
      init_physics();
      init_controls( opts, eng );
      init_events();
      init_timer();
      start();
      return true;
   };



   /**
   Initialize engine options. Not the engine, the *options*. Here's where we
   merge user, generator, and engine options into a new combined options object
   and carry across other important settings.
   @method init_options
   */
   function init_options( options ) {
      // Set up a logger
      eng.log = EXTROVERT.Utils.log;
      // Instantiate the generator
      if( !options.generator )
         eng.generator = new EXTROVERT.float();
      else if (typeof options.generator == 'string')
         eng.generator = new EXTROVERT[ options.generator ]();
      else {
         eng.generator = new EXTROVERT[ options.generator.name ]();
      }
      // Wire in generator options
      opts = $.extend(true, { }, defaults, eng.generator.options );
      opts = $.extend(true, opts, options );
      eng.log.msg("Options: %o", opts);
      // Carry across physics
      if( opts.physics.enabled ) {
         Physijs.scripts.worker = opts.physics.physijs.worker;
         Physijs.scripts.ammo = opts.physics.physijs.ammo;
      }
      // Instantiate a rasterizer
      if( typeof opts.rasterizer == 'string' )
         eng.rasterizer = new EXTROVERT[ 'paint_' + opts.rasterizer ]();
      else
         eng.rasterizer = opts.rasterizer || new EXTROVERT.paint_img();
   }



   /**
   Generate the "world". Defers directly to the generator.
   @method init_world
   */
   function init_world( options, eng ) {

      // Create an invisible, untouchable drag plane for drag-drop
      eng.drag_plane = EXTROVERT.create_object( {
         type: 'plane',
         dims: [2000,2000,8],
         visible: false,
         color: 0x000000,
         opacity: 0.25,
         transparent: true } );
      eng.log.msg("Building drag plane: %o", eng.drag_plane);      

      eng.generator.generate( options, eng );
   }



   /**
   Initialize keyboard and mouse controls for the scene.
   @method init_controls
   */
   function init_controls( opts, eng ) {
      eng.controls = my.create_controls( opts.controls, eng.camera, eng.renderer.domElement );
      return eng.controls;
   }



   /**
   Initialize the renderer.
   @method init_renderer
   */
   function init_renderer() {
      var cont = $( opts.src.container );
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
      eng.log.msg( "Renderer: %o", eng.renderer );
   }



   /**
   Introduce the canvas to the live DOM. Note: .getBoundingClientRect will
   return an empty (zero-size) result until this happens.
   */
   function init_canvas() {
      $( opts.target.container ).append( eng.renderer.domElement );
   }



   /**
   Create a mouse/keyboard control type from a generic description.
   @method create_controls
   */
   my.create_controls = function( control_opts, camera, domElement ) {
      var controls = null;
      if( !control_opts || !control_opts.type || control_opts.type === 'trackball' ) {
         var track_opts = { ignore_events: 'mousedown mousemove mouseup' };
         if( control_opts && control_opts.target )
            track_opts.target = control_opts.target;
         controls = new THREE.TrackballControls( camera, domElement, track_opts );
         controls.rotateSpeed = 1.0;
         controls.zoomSpeed = 1.2;
         controls.panSpeed = 0.8;
         controls.noZoom = false;
         controls.noPan = false;
         controls.staticMoving = true;
         controls.dynamicDampingFactor = 0.3;
         controls.keys = [ 65, 83, 68 ];
         //controls.addEventListener( 'change', render );
      }
      else if( control_opts.type === 'fly' ) {

      }
      return controls;
   };
   
   

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
      //eng.scene.add( cam );
      cam.updateMatrix();
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      eng.log.msg( "Created camera: %o", eng.camera );
      return cam;
   };



   /**
   Initialize the Three.js or Physijs scene object along with any predefined
   geometry specified by the client.
   @method init_scene
   */
   my.create_scene = function( scene_opts ) {
      var scene = scene_opts.physics.enabled ? new Physijs.Scene() : new THREE.Scene();
      eng.scene = scene;
      eng.log.msg( "Created scene: %o", scene );
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
   Create a mesh object from a generic description. Currently only supports box
   and plane meshes because those are all we've needed. Add others as necessary.
   @method create_object
   */
   my.create_object = function( desc ) {
      var mesh = null, geo = null, mat = null;
      var rgb = desc.color || 0xFFFFFF;
      var opac = desc.opacity || 1.0;
      var trans = desc.transparent || true;
      if( desc.type === 'box' ) {
         geo = new THREE.BoxGeometry( desc.dims[0], desc.dims[1], desc.dims[2] );
         mat = desc.mat || new THREE.MeshLambertMaterial( { color: rgb, opacity: opac, transparent: trans } );
         mesh = create_mesh(geo, 'Box', mat, false, desc.mass);
      }
      else if( desc.type === 'plane' ) {
         geo = new THREE.PlaneBufferGeometry( desc.dims[0], desc.dims[1] );
         mat = desc.mat || new THREE.MeshBasicMaterial( { color: rgb, opacity: opac, transparent: trans } );
         mesh = create_mesh( geo, null, mat, true, desc.mass );
      }
      else if( desc.type == 'roundedrect' ) {
         // Rounded rectangle
         var roundedRectShape = new THREE.Shape();
         roundedRect( roundedRectShape, 0, 0, desc.dims[0], desc.dims[1], desc.radius || 20 );
         var roundedRect3d = roundedRectShape.extrude( { amount: 8, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1, material:0, extrudeMaterial : 1 } );
         //var roundedRectPoints = roundedRectShape.createPointsGeometry();
         //var roundedRectSpacedPoints = roundedRectShape.createSpacedPointsGeometry();
         var real_mat = desc.mat ? desc.mat : new THREE.MeshLambertMaterial( { color: rgb, opacity: opac, transparent: trans } );
         mat = new THREE.MeshFaceMaterial([real_mat, real_mat]);
         mesh = create_mesh( /*roundedRectSpacedPoints*/ roundedRect3d, 'Convex', mat, true, desc.mass );
      }
      if( desc.pos )
         mesh.position.set( desc.pos[0], desc.pos[1], desc.pos[2] );
      if( desc.visible === false )
         mesh.visible = false;
      eng.log.msg("Created object: %o", mesh);
      return mesh;
   };



   /**
   Helper function to abstract away whether we're dealing with a normal mesh or
   a Physijs mesh.
   @method create_mesh
   */
   function create_mesh( geo, mesh_type, mat, force_simple, mass ) {
      return opts.physics.enabled && !force_simple ?
         new Physijs[ mesh_type + 'Mesh' ]( geo, mat, mass || 0 ) : new THREE.Mesh(geo, mat);
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
   Initialize the scene timer. TODO: Improve simulation timing and structure.
   TODO: integrate with Three.Clock() and eng.clock.
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
      // Okay so things that rely on getBoundingClientRect wont work til this has happened
      //...but we're doing this in init_canvas
      //$( opts.target.container ).replaceWith( eng.renderer.domElement );
      opts.onload && opts.onload(); // Fire the 'onload' event
      animate();
   }



   /**
   Request animation of the scene.
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

      eng.controls && eng.controls.enabled && eng.controls.update( /*eng.clock.getDelta()*/ );
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

      if( !light_opts || light_opts.length === 0 )
         return;
      
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
   Apply a force to an object at a specific point.
   @method apply_force
   */
   function apply_force( thing ) {
      if( opts.physics.enabled ) {
         var rotation_matrix = new THREE.Matrix4().extractRotation( thing.object.matrix );
         var effect = thing.face.normal.clone().negate().multiplyScalar( opts.click_force ).applyMatrix4( rotation_matrix );
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
      if( intersects.length !== 0 ) {
         if( e.ctrlKey ) {
            eng.selected = intersects[ 0 ].object;
            eng.selected.has_been_touched = true;
            eng.drag_plane.position.copy( eng.selected.position );
            eng.offset.copy( intersects[ 0 ].point ).sub( eng.selected.position );
            if( opts.physics.enabled ) {
               eng.selected.setAngularFactor( EXTROVERT.Utils.VZERO );
               eng.selected.setLinearFactor( EXTROVERT.Utils.VZERO );
               eng.selected.setAngularVelocity( EXTROVERT.Utils.VZERO );
               eng.selected.setLinearVelocity( EXTROVERT.Utils.VZERO );
            }
            else {
               eng.selected.temp_velocity = eng.selected.velocity.clone();
               eng.selected.velocity.set(0,0,0);
            }
         }
         else {
            // TODO: if we're following standard mouse-click behavior, the "click"
            // action should be triggered with the UP click, not the down.
            apply_force( intersects[0] );
         }
      }

      if( /*e.which !== 1 &&*/ eng.controls && eng.controls.enabled ) {
         eng.controls.mousedown( e );
         eng.pass_mouse_input = true;
         //return;
      }      
   }



   /**
   Handle the 'mousemove' event. TODO: physics integration.
   @method mouse_move
   */
   function mouse_move( e ) {
      if( eng.pass_mouse_input && eng.controls && eng.controls.enabled ) {
         eng.controls.mousemove( e );
         return;
      }

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
   function mouse_up( e ) {
      if( /*e.which !== 1 &&*/eng.pass_mouse_input && eng.controls && eng.controls.enabled ) {
         eng.controls.mouseup( e );
         eng.pass_mouse_input = false;
         return;
      }
      e.preventDefault();
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
   Retrieve the position, in 3D space, of a recruited HTML element.
   @method get_position
   */
   my.get_position = function( val, opts, eng ) {

      // Get the position of the HTML element [1]
      var parent_pos = $( opts.src.container ).offset();
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
   };
   
   
   
   /**
   Create an invisible placement plane. TODO: No need to create geometry to place objects;
   replace this technique with unproject at specified Z.
   @method create_placement_plane
   */   
   my.create_placement_plane = function( pos, dims ) {
      
      dims = dims || [200000,200000,1];
      var geo = new THREE.BoxGeometry(dims[0], dims[1], dims[2]); 
      eng.placement_plane = opts.physics.enabled ?
            new Physijs.BoxMesh( geo, new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ), 0 ) :
            new THREE.Mesh( geo, new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ));
      eng.placement_plane.visible = false;
      pos && eng.placement_plane.position.set( pos[0], pos[1], pos[2] );
      // TODO: Figure out which update calls are necessary
      eng.scene.updateMatrix();
      eng.placement_plane.updateMatrix();
      eng.placement_plane.updateMatrixWorld();
      eng.log.msg("Building placement plane: %o", eng.placement_plane);   
      return eng.placement_plane;
   };
   


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
      eng.log.msg("window_resize( %d, %d a=%s)", eng.width, eng.height, eng.camera.aspect.toString());
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
   Module return.
   */
   return my;



}(window, $, THREE));
// [1]: FireFox doesn't support .offsetX:
//      https://bugzilla.mozilla.org/show_bug.cgi?id=69787
//      http://stackoverflow.com/q/11334452
