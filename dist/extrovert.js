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

    // Special handling for IE
    var ua = window.navigator.userAgent;
    if( ~ua.indexOf('MSIE ') || ~ua.indexOf('Trident/') ) {
      // Remove some troublesome stuff from the shader. Assumes three.js R70.
      // https://github.com/mrdoob/three.js/issues/4843#issuecomment-43957698
      Object.keys(THREE.ShaderLib).forEach(function (key) {
        THREE.ShaderLib[key].fragmentShader =
        THREE.ShaderLib[key].fragmentShader.replace('#extension GL_EXT_frag_depth : enable', '');
      });
    }


    init_options( options );
    init_renderer();
    init_world( opts, eng );
    init_canvas( opts );
    init_physics();
    init_controls( opts, eng );
    init_events();
    init_timer();
    start();
    return true;
  };


  my.add = function( obj ) {

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
    return opts;
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

    // Create scene, camera, lighting from options
    EXTROVERT.create_scene( options );
    EXTROVERT.create_camera( $.extend(true, {}, options.camera, eng.generator.init_cam_opts) );
    EXTROVERT.fiat_lux( options.lights );

    // Create world content/geometry
    eng.generator.generate( options, eng );

    // Now that objects have been placed, update the final cam position
    var oc = options.camera;
    oc.rotation && eng.camera.rotation.set( oc.rotation[0], oc.rotation[1], oc.rotation[2] );
    oc.position && eng.camera.position.set( oc.position[0], oc.position[1], oc.position[2] );
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
    eng.renderer.autoClearStencil = false;
    eng.renderer.getContext().clearStencil = function() { };
    eng.log.msg( "Renderer: %o", eng.renderer );
  }



  /**
  Introduce the canvas to the live DOM. Note: .getBoundingClientRect will
  return an empty (zero-size) result until this happens.
  */
  function init_canvas( opts ) {
    var action = opts.target.action || 'append'; // call .append or .replaceWith
    $( opts.target.container )[ action ]( eng.renderer.domElement );
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
      // TODO
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
    // TODO: Are any of these calls still necessary?
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
  and plane meshes; add others as necessary.
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
  Helper function to create a specific mesh type.
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

    opts.physics.enabled && eng.scene.simulate();

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
      pos: //new THREE.Vector3(
        [topLeft.x + (block_width / 2),
        topLeft.y - (block_height / 2),
        topLeft.z - (opts.block.depth / 2)],
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
;/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author paulirish / http://paulirish.com/
 */

THREE.FirstPersonControls = function ( object, domElement ) {

	this.object = object;
	this.target = new THREE.Vector3( 0, 0, 0 );

	this.domElement = ( domElement !== undefined ) ? domElement : document;

	this.enabled = true;

	this.movementSpeed = 1.0;
	this.lookSpeed = 0.005;

	this.lookVertical = true;
	this.autoForward = false;

	this.activeLook = true;

	this.heightSpeed = false;
	this.heightCoef = 1.0;
	this.heightMin = 0.0;
	this.heightMax = 1.0;

	this.constrainVertical = false;
	this.verticalMin = 0;
	this.verticalMax = Math.PI;

	this.autoSpeedFactor = 0.0;

	this.mouseX = 0;
	this.mouseY = 0;

	this.lat = 0;
	this.lon = 0;
	this.phi = 0;
	this.theta = 0;

	this.moveForward = false;
	this.moveBackward = false;
	this.moveLeft = false;
	this.moveRight = false;

	this.mouseDragOn = false;

	this.viewHalfX = 0;
	this.viewHalfY = 0;

	if ( this.domElement !== document ) {

		this.domElement.setAttribute( 'tabindex', -1 );

	}

	//

	this.handleResize = function () {

		if ( this.domElement === document ) {

			this.viewHalfX = window.innerWidth / 2;
			this.viewHalfY = window.innerHeight / 2;

		} else {

			this.viewHalfX = this.domElement.offsetWidth / 2;
			this.viewHalfY = this.domElement.offsetHeight / 2;

		}

	};

	this.onMouseDown = function ( event ) {

		if ( this.domElement !== document ) {

			this.domElement.focus();

		}

		event.preventDefault();
		event.stopPropagation();

		if ( this.activeLook ) {

			switch ( event.button ) {

				case 0: this.moveForward = true; break;
				case 2: this.moveBackward = true; break;

			}

		}

		this.mouseDragOn = true;

	};

	this.onMouseUp = function ( event ) {

		event.preventDefault();
		event.stopPropagation();

		if ( this.activeLook ) {

			switch ( event.button ) {

				case 0: this.moveForward = false; break;
				case 2: this.moveBackward = false; break;

			}

		}

		this.mouseDragOn = false;

	};

	this.onMouseMove = function ( event ) {

		if ( this.domElement === document ) {

			this.mouseX = event.pageX - this.viewHalfX;
			this.mouseY = event.pageY - this.viewHalfY;

		} else {

			this.mouseX = event.pageX - this.domElement.offsetLeft - this.viewHalfX;
			this.mouseY = event.pageY - this.domElement.offsetTop - this.viewHalfY;

		}

	};

	this.onKeyDown = function ( event ) {

		//event.preventDefault();

		switch ( event.keyCode ) {

			case 38: /*up*/
			case 87: /*W*/ this.moveForward = true; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = true; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = true; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = true; break;

			case 82: /*R*/ this.moveUp = true; break;
			case 70: /*F*/ this.moveDown = true; break;

		}

	};

	this.onKeyUp = function ( event ) {

		switch ( event.keyCode ) {

			case 38: /*up*/
			case 87: /*W*/ this.moveForward = false; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = false; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = false; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = false; break;

			case 82: /*R*/ this.moveUp = false; break;
			case 70: /*F*/ this.moveDown = false; break;

		}

	};

	this.update = function( delta ) {

		if ( this.enabled === false ) return;

		if ( this.heightSpeed ) {

			var y = THREE.Math.clamp( this.object.position.y, this.heightMin, this.heightMax );
			var heightDelta = y - this.heightMin;

			this.autoSpeedFactor = delta * ( heightDelta * this.heightCoef );

		} else {

			this.autoSpeedFactor = 0.0;

		}

		var actualMoveSpeed = delta * this.movementSpeed;

		if ( this.moveForward || ( this.autoForward && !this.moveBackward ) ) this.object.translateZ( - ( actualMoveSpeed + this.autoSpeedFactor ) );
		if ( this.moveBackward ) this.object.translateZ( actualMoveSpeed );

		if ( this.moveLeft ) this.object.translateX( - actualMoveSpeed );
		if ( this.moveRight ) this.object.translateX( actualMoveSpeed );

		if ( this.moveUp ) this.object.translateY( actualMoveSpeed );
		if ( this.moveDown ) this.object.translateY( - actualMoveSpeed );

		var actualLookSpeed = delta * this.lookSpeed;

		if ( !this.activeLook ) {

			actualLookSpeed = 0;

		}

		var verticalLookRatio = 1;

		if ( this.constrainVertical ) {

			verticalLookRatio = Math.PI / ( this.verticalMax - this.verticalMin );

		}

		this.lon += this.mouseX * actualLookSpeed;
		if ( this.lookVertical ) this.lat -= this.mouseY * actualLookSpeed * verticalLookRatio;

		this.lat = Math.max( - 85, Math.min( 85, this.lat ) );
		this.phi = THREE.Math.degToRad( 90 - this.lat );

		this.theta = THREE.Math.degToRad( this.lon );

		if ( this.constrainVertical ) {

			this.phi = THREE.Math.mapLinear( this.phi, 0, Math.PI, this.verticalMin, this.verticalMax );

		}

		var targetPosition = this.target,
			position = this.object.position;

		targetPosition.x = position.x + 100 * Math.sin( this.phi ) * Math.cos( this.theta );
		targetPosition.y = position.y + 100 * Math.cos( this.phi );
		targetPosition.z = position.z + 100 * Math.sin( this.phi ) * Math.sin( this.theta );

		this.object.lookAt( targetPosition );

	};


	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

	this.domElement.addEventListener( 'mousemove', bind( this, this.onMouseMove ), false );
	this.domElement.addEventListener( 'mousedown', bind( this, this.onMouseDown ), false );
	this.domElement.addEventListener( 'mouseup', bind( this, this.onMouseUp ), false );

	window.addEventListener( 'keydown', bind( this, this.onKeyDown ), false );
	window.addEventListener( 'keyup', bind( this, this.onKeyUp ), false );

	function bind( scope, fn ) {

		return function () {

			fn.apply( scope, arguments );

		};

	}

	this.handleResize();

};
;/**
 * @author James Baicoianu / http://www.baicoianu.com/
 */

THREE.FlyControls = function ( object, domElement ) {

	this.object = object;

	this.domElement = ( domElement !== undefined ) ? domElement : document;
	if ( domElement ) this.domElement.setAttribute( 'tabindex', -1 );

	// API

	this.movementSpeed = 1.0;
	this.rollSpeed = 0.005;

	this.dragToLook = false;
	this.autoForward = false;

	// disable default target object behavior

	// internals

	this.tmpQuaternion = new THREE.Quaternion();

	this.mouseStatus = 0;

	this.moveState = { up: 0, down: 0, left: 0, right: 0, forward: 0, back: 0, pitchUp: 0, pitchDown: 0, yawLeft: 0, yawRight: 0, rollLeft: 0, rollRight: 0 };
	this.moveVector = new THREE.Vector3( 0, 0, 0 );
	this.rotationVector = new THREE.Vector3( 0, 0, 0 );

	this.handleEvent = function ( event ) {

		if ( typeof this[ event.type ] == 'function' ) {

			this[ event.type ]( event );

		}

	};

	this.keydown = function( event ) {

		if ( event.altKey ) {

			return;

		}

		//event.preventDefault();

		switch ( event.keyCode ) {

			case 16: /* shift */ this.movementSpeedMultiplier = 0.1; break;

			case 87: /*W*/ this.moveState.forward = 1; break;
			case 83: /*S*/ this.moveState.back = 1; break;

			case 65: /*A*/ this.moveState.left = 1; break;
			case 68: /*D*/ this.moveState.right = 1; break;

			case 82: /*R*/ this.moveState.up = 1; break;
			case 70: /*F*/ this.moveState.down = 1; break;

			case 38: /*up*/ this.moveState.pitchUp = 1; break;
			case 40: /*down*/ this.moveState.pitchDown = 1; break;

			case 37: /*left*/ this.moveState.yawLeft = 1; break;
			case 39: /*right*/ this.moveState.yawRight = 1; break;

			case 81: /*Q*/ this.moveState.rollLeft = 1; break;
			case 69: /*E*/ this.moveState.rollRight = 1; break;

		}

		this.updateMovementVector();
		this.updateRotationVector();

	};

	this.keyup = function( event ) {

		switch ( event.keyCode ) {

			case 16: /* shift */ this.movementSpeedMultiplier = 1; break;

			case 87: /*W*/ this.moveState.forward = 0; break;
			case 83: /*S*/ this.moveState.back = 0; break;

			case 65: /*A*/ this.moveState.left = 0; break;
			case 68: /*D*/ this.moveState.right = 0; break;

			case 82: /*R*/ this.moveState.up = 0; break;
			case 70: /*F*/ this.moveState.down = 0; break;

			case 38: /*up*/ this.moveState.pitchUp = 0; break;
			case 40: /*down*/ this.moveState.pitchDown = 0; break;

			case 37: /*left*/ this.moveState.yawLeft = 0; break;
			case 39: /*right*/ this.moveState.yawRight = 0; break;

			case 81: /*Q*/ this.moveState.rollLeft = 0; break;
			case 69: /*E*/ this.moveState.rollRight = 0; break;

		}

		this.updateMovementVector();
		this.updateRotationVector();

	};

	this.mousedown = function( event ) {

		if ( this.domElement !== document ) {

			this.domElement.focus();

		}

		event.preventDefault();
		event.stopPropagation();

		if ( this.dragToLook ) {

			this.mouseStatus ++;

		} else {

			switch ( event.button ) {

				case 0: this.moveState.forward = 1; break;
				case 2: this.moveState.back = 1; break;

			}

			this.updateMovementVector();

		}

	};

	this.mousemove = function( event ) {

		if ( !this.dragToLook || this.mouseStatus > 0 ) {

			var container = this.getContainerDimensions();
			var halfWidth  = container.size[ 0 ] / 2;
			var halfHeight = container.size[ 1 ] / 2;

			this.moveState.yawLeft   = - ( ( event.pageX - container.offset[ 0 ] ) - halfWidth  ) / halfWidth;
			this.moveState.pitchDown =   ( ( event.pageY - container.offset[ 1 ] ) - halfHeight ) / halfHeight;

			this.updateRotationVector();

		}

	};

	this.mouseup = function( event ) {

		event.preventDefault();
		event.stopPropagation();

		if ( this.dragToLook ) {

			this.mouseStatus --;

			this.moveState.yawLeft = this.moveState.pitchDown = 0;

		} else {

			switch ( event.button ) {

				case 0: this.moveState.forward = 0; break;
				case 2: this.moveState.back = 0; break;

			}

			this.updateMovementVector();

		}

		this.updateRotationVector();

	};

	this.update = function( delta ) {

		var moveMult = delta * this.movementSpeed;
		var rotMult = delta * this.rollSpeed;

		this.object.translateX( this.moveVector.x * moveMult );
		this.object.translateY( this.moveVector.y * moveMult );
		this.object.translateZ( this.moveVector.z * moveMult );

		this.tmpQuaternion.set( this.rotationVector.x * rotMult, this.rotationVector.y * rotMult, this.rotationVector.z * rotMult, 1 ).normalize();
		this.object.quaternion.multiply( this.tmpQuaternion );

		// expose the rotation vector for convenience
		this.object.rotation.setFromQuaternion( this.object.quaternion, this.object.rotation.order );


	};

	this.updateMovementVector = function() {

		var forward = ( this.moveState.forward || ( this.autoForward && !this.moveState.back ) ) ? 1 : 0;

		this.moveVector.x = ( -this.moveState.left    + this.moveState.right );
		this.moveVector.y = ( -this.moveState.down    + this.moveState.up );
		this.moveVector.z = ( -forward + this.moveState.back );

		//console.log( 'move:', [ this.moveVector.x, this.moveVector.y, this.moveVector.z ] );

	};

	this.updateRotationVector = function() {

		this.rotationVector.x = ( -this.moveState.pitchDown + this.moveState.pitchUp );
		this.rotationVector.y = ( -this.moveState.yawRight  + this.moveState.yawLeft );
		this.rotationVector.z = ( -this.moveState.rollRight + this.moveState.rollLeft );

		//console.log( 'rotate:', [ this.rotationVector.x, this.rotationVector.y, this.rotationVector.z ] );

	};

	this.getContainerDimensions = function() {

		if ( this.domElement != document ) {

			return {
				size	: [ this.domElement.offsetWidth, this.domElement.offsetHeight ],
				offset	: [ this.domElement.offsetLeft,  this.domElement.offsetTop ]
			};

		} else {

			return {
				size	: [ window.innerWidth, window.innerHeight ],
				offset	: [ 0, 0 ]
			};

		}

	};

	function bind( scope, fn ) {

		return function () {

			fn.apply( scope, arguments );

		};

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

	this.domElement.addEventListener( 'mousemove', bind( this, this.mousemove ), false );
	this.domElement.addEventListener( 'mousedown', bind( this, this.mousedown ), false );
	this.domElement.addEventListener( 'mouseup',   bind( this, this.mouseup ), false );

	window.addEventListener( 'keydown', bind( this, this.keydown ), false );
	window.addEventListener( 'keyup',   bind( this, this.keyup ), false );

	this.updateMovementVector();
	this.updateRotationVector();

};
;/**
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin 	/ http://mark-lundin.com
 * @author Simone Manini / http://daron1337.github.io
 * @author Luca Antiga 	/ http://lantiga.github.io
 * @author James Devlin / http://indevious.com
 */

THREE.TrackballControls = function ( object, domElement, options ) {

	var _this = this;
	var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API
	this.enabled = true;
	this.screen = { left: 0, top: 0, width: 0, height: 0 };
	this.rotateSpeed = 1.0;
	this.zoomSpeed = 1.2;
	this.panSpeed = 0.3;
	this.noRotate = false;
	this.noZoom = false;
	this.noPan = false;
	this.staticMoving = false;
	this.dynamicDampingFactor = 0.2;
	this.minDistance = 0;
	this.maxDistance = Infinity;
	this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

	// internals
	this.target = new THREE.Vector3();
   if( options.target )
      this.target.set( options.target[0], options.target[1], options.target[2] );
      
   /* these used to be globals */
	var EPS = 0.000001;
	var lastPosition = new THREE.Vector3();
	var _state = STATE.NONE;
	var _prevState = STATE.NONE;
	var _eye = new THREE.Vector3();
	var _movePrev = new THREE.Vector2();
	var _moveCurr = new THREE.Vector2();
	var _lastAxis = new THREE.Vector3();
	var _lastAngle = 0;
	var _zoomStart = new THREE.Vector2();
	var _zoomEnd = new THREE.Vector2();
	var _touchZoomDistanceStart = 0;
	var _touchZoomDistanceEnd = 0;
	var _panStart = new THREE.Vector2();
	var _panEnd = new THREE.Vector2();

	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.up0 = this.object.up.clone();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };

	// methods

   function subscribe( event_name, handler, options ) {
      if( !options || !options.ignore_events || options.ignore_events.indexOf( event_name ) === -1 ) {
         _this.domElement.addEventListener( event_name, /*this[event_name]*/ handler, false );
      }
   }

	this.handleResize = function () {

		if ( _this.domElement === document ) {

			this.screen.left = 0;
			this.screen.top = 0;
			this.screen.width = window.innerWidth;
			this.screen.height = window.innerHeight;

		} else {

			var box = this.domElement.getBoundingClientRect();
			// adjustments come from similar code in the jquery offset() function
			var d = _this.domElement.ownerDocument.documentElement;
			this.screen.left = box.left + window.pageXOffset - d.clientLeft;
			this.screen.top = box.top + window.pageYOffset - d.clientTop;
			this.screen.width = box.width;
			this.screen.height = box.height;

		}

	};


	var getMouseOnScreen = ( function () {

		var vector = new THREE.Vector2();

		return function ( pageX, pageY ) {

			vector.set(
				( pageX - _this.screen.left ) / _this.screen.width,
				( pageY - _this.screen.top ) / _this.screen.height
			);

			return vector;

		};

	}() );

	var getMouseOnCircle = ( function () {

		var vector = new THREE.Vector2();

		return function ( pageX, pageY ) {

			vector.set(
				( ( pageX - _this.screen.width * 0.5 - _this.screen.left ) / ( _this.screen.width * 0.5 ) ),
				( ( _this.screen.height + 2 * ( _this.screen.top - pageY ) ) / _this.screen.width ) // screen.width intentional
			);

			return vector;
		};

	}() );

	this.rotateCamera = (function() {

		var axis = new THREE.Vector3(),
			quaternion = new THREE.Quaternion(),
			eyeDirection = new THREE.Vector3(),
			objectUpDirection = new THREE.Vector3(),
			objectSidewaysDirection = new THREE.Vector3(),
			moveDirection = new THREE.Vector3(),
			angle;

		return function () {

			moveDirection.set( _moveCurr.x - _movePrev.x, _moveCurr.y - _movePrev.y, 0 );
			angle = moveDirection.length();

			if ( angle ) {

				_eye.copy( _this.object.position ).sub( _this.target );

				eyeDirection.copy( _eye ).normalize();
				objectUpDirection.copy( _this.object.up ).normalize();
				objectSidewaysDirection.crossVectors( objectUpDirection, eyeDirection ).normalize();

				objectUpDirection.setLength( _moveCurr.y - _movePrev.y );
				objectSidewaysDirection.setLength( _moveCurr.x - _movePrev.x );

				moveDirection.copy( objectUpDirection.add( objectSidewaysDirection ) );

				axis.crossVectors( moveDirection, _eye ).normalize();

				angle *= _this.rotateSpeed;
				quaternion.setFromAxisAngle( axis, angle );

				_eye.applyQuaternion( quaternion );
				_this.object.up.applyQuaternion( quaternion );

				_lastAxis.copy( axis );
				_lastAngle = angle;

			}

			else if ( !_this.staticMoving && _lastAngle ) {

				_lastAngle *= Math.sqrt( 1.0 - _this.dynamicDampingFactor );
				_eye.copy( _this.object.position ).sub( _this.target );
				quaternion.setFromAxisAngle( _lastAxis, _lastAngle );
				_eye.applyQuaternion( quaternion );
				_this.object.up.applyQuaternion( quaternion );

			}

			_movePrev.copy( _moveCurr );

		};

	}());


	this.zoomCamera = function () {

		var factor;

		if ( _state === STATE.TOUCH_ZOOM_PAN ) {

			factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
			_touchZoomDistanceStart = _touchZoomDistanceEnd;
			_eye.multiplyScalar( factor );

		} else {

			factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

			if ( factor !== 1.0 && factor > 0.0 ) {

				_eye.multiplyScalar( factor );

				if ( _this.staticMoving ) {

					_zoomStart.copy( _zoomEnd );

				} else {

					_zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;

				}

			}

		}

	};

	this.panCamera = (function() {

		var mouseChange = new THREE.Vector2(),
			objectUp = new THREE.Vector3(),
			pan = new THREE.Vector3();

		return function () {

			mouseChange.copy( _panEnd ).sub( _panStart );

			if ( mouseChange.lengthSq() ) {

				mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );

				pan.copy( _eye ).cross( _this.object.up ).setLength( mouseChange.x );
				pan.add( objectUp.copy( _this.object.up ).setLength( mouseChange.y ) );

				_this.object.position.add( pan );
				_this.target.add( pan );

				if ( _this.staticMoving ) {

					_panStart.copy( _panEnd );

				} else {

					_panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );

				}

			}
		};

	}());

	this.checkDistances = function () {

		if ( !_this.noZoom || !_this.noPan ) {

			if ( _eye.lengthSq() > _this.maxDistance * _this.maxDistance ) {

				_this.object.position.addVectors( _this.target, _eye.setLength( _this.maxDistance ) );

			}

			if ( _eye.lengthSq() < _this.minDistance * _this.minDistance ) {

				_this.object.position.addVectors( _this.target, _eye.setLength( _this.minDistance ) );

			}

		}

	};

	this.update = function () {

		_eye.subVectors( _this.object.position, _this.target );

		if ( !_this.noRotate ) {
			_this.rotateCamera();
		}

		if ( !_this.noZoom ) {
			_this.zoomCamera();
		}

		if ( !_this.noPan ) {
			_this.panCamera();
		}

		_this.object.position.addVectors( _this.target, _eye );
		_this.checkDistances();
		_this.object.lookAt( _this.target );

		if ( lastPosition.distanceToSquared( _this.object.position ) > EPS ) {
			_this.dispatchEvent( changeEvent );
			lastPosition.copy( _this.object.position );
		}

	};

	this.reset = function () {

		_state = STATE.NONE;
		_prevState = STATE.NONE;

		_this.target.copy( _this.target0 );
		_this.object.position.copy( _this.position0 );
		_this.object.up.copy( _this.up0 );

		_eye.subVectors( _this.object.position, _this.target );

		_this.object.lookAt( _this.target );

		_this.dispatchEvent( changeEvent );

		lastPosition.copy( _this.object.position );

	};

	// listeners

	function keydown( event ) {

		if ( _this.enabled === false ) return;

		window.removeEventListener( 'keydown', keydown );

		_prevState = _state;

		/* if ( _state !== STATE.NONE ) {

			// return;

		// } else*/ if ( event.keyCode === _this.keys[ STATE.ROTATE ] && !_this.noRotate ) {

			_state = STATE.ROTATE;

		} else if ( event.keyCode === _this.keys[ STATE.ZOOM ] && !_this.noZoom ) {

			_state = STATE.ZOOM;

		} else if ( event.keyCode === _this.keys[ STATE.PAN ] && !_this.noPan ) {

			_state = STATE.PAN;

		}

	}

	function keyup( event ) {

		if ( _this.enabled === false ) return;

		//_state = _prevState;

		window.addEventListener( 'keydown', keydown, false );

	}

	this.mousedown = function( event ) {

		if ( _this.enabled === false ) return;
      //if ( event.which !== 3 ) return;

		event.preventDefault();
		event.stopPropagation();

		if ( _state === STATE.NONE ) {
         // This should never happen
			//_state = event.button;
         _state = STATE.PAN;
		}

		if ( _state === STATE.ROTATE && !_this.noRotate ) {
			_moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );
			_movePrev.copy(_moveCurr);
		} else if ( _state === STATE.ZOOM && !_this.noZoom ) {
			_zoomStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
			_zoomEnd.copy(_zoomStart);
		} else if ( _state === STATE.PAN && !_this.noPan ) {
			_panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
			_panEnd.copy(_panStart);
		}

		_this.dispatchEvent( startEvent );

	};

	this.mousemove = function( event ) {

		if ( _this.enabled === false ) return;
      if ( _state === STATE.NONE ) return;

		event.preventDefault();
		event.stopPropagation();

		if ( _state === STATE.ROTATE && !_this.noRotate ) {

			_movePrev.copy(_moveCurr);
			_moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );

		} else if ( _state === STATE.ZOOM && !_this.noZoom ) {

			_zoomEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

		} else if ( _state === STATE.PAN && !_this.noPan ) {

			_panEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

		}

	};

	this.mouseup = function( event ) {

		if ( _this.enabled === false ) return;
      //if( event.which != 3 ) return;

		event.preventDefault();
		event.stopPropagation();

		//_state = STATE.NONE;

		_this.dispatchEvent( endEvent );

	};

	function mousewheel( event ) {

		if ( _this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		var delta = 0;

		if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta / 40;

		} else if ( event.detail ) { // Firefox

			delta = - event.detail / 3;

		}

		_zoomStart.y += delta * 0.01;
		_this.dispatchEvent( startEvent );
		_this.dispatchEvent( endEvent );

	}

	function touchstart( event ) {

		if ( _this.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:
				_state = STATE.TOUCH_ROTATE;
				_moveCurr.copy( getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				_movePrev.copy(_moveCurr);
				break;

			case 2:
				_state = STATE.TOUCH_ZOOM_PAN;
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				_touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );

				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				_panStart.copy( getMouseOnScreen( x, y ) );
				_panEnd.copy( _panStart );
				break;

			default:
				_state = STATE.NONE;

		}
		_this.dispatchEvent( startEvent );


	}

	function touchmove( event ) {

		if ( _this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		switch ( event.touches.length ) {

			case 1:
				_movePrev.copy(_moveCurr);
				_moveCurr.copy( getMouseOnCircle(  event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				break;

			case 2:
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				_touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );

				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				_panEnd.copy( getMouseOnScreen( x, y ) );
				break;

			default:
				_state = STATE.NONE;

		}

	}

	function touchend( event ) {

		if ( _this.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:
				_movePrev.copy(_moveCurr);
				_moveCurr.copy( getMouseOnCircle(  event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				break;

			case 2:
				_touchZoomDistanceStart = _touchZoomDistanceEnd = 0;

				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				_panEnd.copy( getMouseOnScreen( x, y ) );
				_panStart.copy( _panEnd );
				break;

		}

		_state = STATE.NONE;
		_this.dispatchEvent( endEvent );

	}

   //subscribe( 'contextmenu', function ( event ) { event.preventDefault(); }, options );
	subscribe( 'mousedown', this.mousedown, options );
	subscribe( 'mousewheel', mousewheel, options );
	subscribe( 'DOMMouseScroll', mousewheel, options ); // firefox
	subscribe( 'touchstart', touchstart, options );
	subscribe( 'touchend', touchend, options );
	subscribe( 'touchmove', touchmove, options );
	window.addEventListener( 'keydown', keydown, false );
	window.addEventListener( 'keyup', keyup, false );
	this.handleResize();
	// force an update at start
	this.update();

};

THREE.TrackballControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.TrackballControls.prototype.constructor = THREE.TrackballControls;
;/**
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
   // my.wrap_text = function( context, text, x, y, maxWidth, lineHeight, measureOnly ) {
      // var lines = text.split("\n");
      // var numLines = 1;
      // for (var ii = 0; ii < lines.length; ii++) {
         // var line = "";
         // var words = lines[ii].split(" ");
         // for (var n = 0; n < words.length; n++) {
            // var testLine = line + words[n]//; + " ";
            // var metrics = context.measureText(testLine);
            // var testWidth = metrics.width;
            // if (testWidth > maxWidth) {
               // measureOnly || context.fillText(line, x, y);
               // line = words[n] + " ";
               // y += lineHeight;
               // numLines++;
            // }
            // else {
               // line = testLine;
            // }
         // }
         // measureOnly || context.fillText(line, x, y);
         // y += lineHeight;
      // }
      // return numLines;
   // };
   
   
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
;/**
An Extrovert.js generator for a 3D city scene.
@module gen-city.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



  /**
  Default options for this generator. Set defaults here. These will be merged
  in with any user-specified or engine-level options.
  */
  var _def_opts = {
     gravity: [0,-50,0],
     camera: {
        position: [0,300,400],
        lookat: [0,0,0],
        up: [0,0,-1],
        rotation: [-(Math.PI / 8.0), 0, 0]
     },
     generator: {
        name: 'city',
        background: 'default_background.png',
        material: { color: 0xABABAB, friction: 0.2, restitution: 1.0 }
     }
  };



  /**
  @class The built-in 'city' generator.
  */
  EXTROVERT.city = function() {
    return {
      generate: function( options, eng ) {
        if( !options.generator || typeof options.generator == 'string' )
          options.generator = _def_opts.generator;
        init_ground( options, eng );
        init_placement_plane( options, eng );
        init_elements( options, eng );
      },
      options: _def_opts,
      init_cam_opts: {
        position: [0,400,0],
        lookat: [0,0,0],
        up: [0,0,-1]
      }
    };
  };



  function init_ground( opts, eng ) {
    // Create the ground. Place it on the camera's back frustum plane so
    // it always fills the viewport?
    var frustum_planes = EXTROVERT.Utils.calc_frustum( eng.camera );
    var planeWidth = frustum_planes.farPlane.topRight.x - frustum_planes.farPlane.topLeft.x;
    var planeHeight = frustum_planes.farPlane.topRight.y - frustum_planes.farPlane.botRight.y;
    var plane_tex = opts.generator.background ?
      THREE.ImageUtils.loadTexture( opts.generator.background ) : null;

    plane_tex.wrapS = plane_tex.wrapT = THREE.RepeatWrapping;
    plane_tex.repeat.set( 100, 100 );

    var ground = opts.physics.enabled ?
      new Physijs.BoxMesh(
        new THREE.BoxGeometry(planeWidth, 10, planeHeight),
        new THREE.MeshLambertMaterial( { color: 0xFFFFFF, map: plane_tex } ), 0 )
      :
      new THREE.Mesh(
        new THREE.BoxGeometry(planeWidth, 10, planeHeight),
        new THREE.MeshLambertMaterial( { color: 0x333333, map: plane_tex, opacity: 1.0, transparent: false } )
      );
    ground.position.y = 150; //frustum_planes.farPlane.topRight.z;
    ground.receiveShadow = false; // TODO: not working
    ground.updateMatrix();
    ground.updateMatrixWorld();
    eng.scene.add( ground );
    eng.log.msg("Building ground plane: %o", ground);
    return ground;
  }


  function init_placement_plane( opts, eng ) {
    // Create a hidden plane for object placement.
    // TODO: Replace with unproject at specified Z.
    eng.placement_plane = opts.physics.enabled ?
      new Physijs.BoxMesh(
        new THREE.BoxGeometry(200000,1,200000),
        new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ),
        0 ) :
        new THREE.Mesh(
          new THREE.BoxGeometry(200000,1,200000),
          new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } )
        );
    eng.placement_plane.visible = false;
    eng.placement_plane.position.y = 200;
    // TODO: Figure out which update calls are necessary
    eng.scene.updateMatrix();
    eng.placement_plane.updateMatrix();
    eng.placement_plane.updateMatrixWorld();
    eng.log.msg("Building placement plane: %o", eng.placement_plane);
  }


  /**
  Initialize all objects.
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
  Initialize a single object. TODO: Clean up material/geo handling.
  @method init_card
  */
  function init_image( idx, val, opts, eng ) {

    // Position
    var pos_info = get_position( val, opts, eng );

    // Texture
    var texture = eng.rasterizer.paint( $(val), opts );
    var material = (!opts.physics.enabled || !opts.physics.materials) ?
      texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
    eng.side_mat.color = 0x00FF00;
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
    eng.log.msg("Created element %d (%f, %f, %f) (size=%f x %f x %f): %o.", idx, pos_info.pos.x, pos_info.pos.y, pos_info.pos.z, pos_info.width, pos_info.height, pos_info.depth, mesh);
    eng.log.msg("Texture = %o", texture);
    opts.created && opts.created( val, mesh );

    return mesh;
  }



  /**
  Retrieve the position, in 3D space, of a recruited HTML element.
  @method init_card
  */
  function get_position( val, opts, eng ) {

     // Get the position of the HTML element [1]
     var parent_pos = $( opts.src.container ).offset();
     var child_pos = $( val ).offset();
     var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

     // From that, compute the position of the top-left and bottom-right corner
     // of the element as they would exist in 3D-land.
     var topLeft = EXTROVERT.calc_position( pos.left, pos.top, eng.placement_plane );
     var botRight = EXTROVERT.calc_position( pos.left + $(val).width(), pos.top + $(val).height(), eng.placement_plane );
     // These return the topLeft and bottomRight coordinates of the MAIN FACE of the thing in WORLD coords

     var block_width = Math.abs( botRight.x - topLeft.x );
     var block_depth = Math.abs( topLeft.z - botRight.z );
     var block_height = block_depth;

     // Offset by the half-height/width so the corners line up
     return {
        pos: new THREE.Vector3(
           topLeft.x + (block_width / 2),
           topLeft.y - (block_height / 2),
           topLeft.z + (block_depth / 2)),
        width: block_width,
        depth: block_depth,
        height: block_height
     };
  }



}(window, $, THREE, EXTROVERT));

// [1] Don't rely exclusively on .offset() or .position()
//     See: http://bugs.jquery.com/ticket/11606
//     var pos = $(val).offset();
//     var pos = $(val).position();
;/**
An Extrovert.js generator for 3D extrusion.
@module gen-extrude.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



  /**
  Default options.
  */
  var _def_opts = {
    generator: {
       name: 'extrude',
       material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
    },
    camera: { position: [0,0,800] }
  };



  /**
  @class The built-in 'gallery' generator.
  */
  EXTROVERT.extrude = function() {
    return {
      generate: function( options, eng ) {
        if( !options.generator || typeof options.generator == 'string' )
          options.generator = _def_opts.generator;
        EXTROVERT.create_placement_plane( [0,0,200] );
        init_things( options, eng );
      },
      options: _def_opts,
      init_cam_opts: null
    };
  };



  /**
  Initialize all the things.
  @method init_things
  */
  function init_things( opts, eng ) {
    var mat = new THREE.MeshLambertMaterial({ color: opts.generator.material.color });
    eng.side_mat = opts.physics.enabled ? Physijs.createMaterial( mat, opts.generator.material.friction, opts.generator.material.restitution ) : mat;
    $( opts.src.selector ).each( function( idx, val ) {
      init_thing( val, opts, eng );
    });
  }



  /**
  Initialize a single card object. TODO: Clean up material/geo handling.
  @method init_card
  */
  function init_thing( val, opts, eng ) {

    // Position
    var pos_info = EXTROVERT.get_position( val, opts, eng );

    // Texture
    var texture = eng.rasterizer.paint( $(val), opts );
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
    mesh.position.set( pos_info.pos[0], pos_info.pos[1], pos_info.pos[2] );
    mesh.castShadow = mesh.receiveShadow = false;
    if( opts.generator.lookat )
      mesh.lookAt( new THREE.Vector3(opts.generator.lookat[0], opts.generator.lookat[1], opts.generator.lookat[2]) );
    mesh.elem = $(val);

    opts.creating && opts.creating( val, mesh );
    eng.scene.add( mesh );
    eng.card_coll.push( mesh );
    opts.created && opts.created( val, mesh );

    return mesh;
  }



}(window, $, THREE, EXTROVERT));
;/**
An Extrovert.js generator for a floating scene.
@module gen-float.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



  /**
  Default options.
  */
  var _def_opts = {
    gravity: [0,0,0],
    camera: {
      position: [0,300,200],
      rotation: [-(Math.PI / 4),0,0]
    },
    generator: {
      name: 'float',
      material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
    },
    lights: [
      { type: 'point', color: 0xffffff, intensity: 1, distance: 10000 },
      { type: 'point', color: 0xffffff, intensity: 0.25, distance: 1000, pos: [0,300,0] },
    ]
  };


  /**
  @class The built-in 'float' generator.
  */
  EXTROVERT.float = function() {
    return {
      generate: function( options, eng ) {
        //var new_opts = $.extend(true, { }, _def_opts, options);
        if( !options.generator || typeof options.generator == 'string' )
          options.generator = _def_opts.generator;
          init_objects( options, eng );
      },
      options: _def_opts,
      init_cam_opts: {
        position: [0,400,0],
        lookat: [0,0,0],
        up: [0,0,-1]
      }
    };
  };


  /**
  Initialize scene props and objects. TODO: clean up object allocations.
  @method init_objects
  */
  function init_objects( opts, eng ) {
    // Create the ground. Place it on the camera's back frustum plane so
    // it always fills the viewport?
    if( true ) {
      var frustum_planes = EXTROVERT.Utils.calc_frustum( eng.camera );
      var planeWidth = frustum_planes.farPlane.topRight.x - frustum_planes.farPlane.topLeft.x;
      var planeHeight = frustum_planes.farPlane.topRight.y - frustum_planes.farPlane.botRight.y;
      var plane_tex = opts.generator.background ?
        THREE.ImageUtils.loadTexture( opts.generator.background ) : null;

      var plane2 = opts.physics.enabled ?
        new Physijs.BoxMesh(
          new THREE.BoxGeometry(planeWidth, 10, planeHeight),
          new THREE.MeshLambertMaterial( { color: 0xFFFFFF, map: plane_tex } ), 0 )
        :
        new THREE.Mesh(
          new THREE.BoxGeometry(planeWidth,10,planeHeight),
          new THREE.MeshLambertMaterial( { color: 0x333333, map: plane_tex, opacity: 1.0, transparent: false } )
        );
      plane2.position.y = 150;
      plane2.receiveShadow = false; // TODO: not working
      plane2.updateMatrix();
      plane2.updateMatrixWorld();
      eng.scene.add( plane2 );
      eng.log.msg("Building base plane: %o", plane2);
    }

    // Create a hidden plane for object placement.
    // TODO: Replace with unproject at specified Z.
    eng.placement_plane = opts.physics.enabled ?
      new Physijs.BoxMesh(
        new THREE.BoxGeometry(200000,1,200000),
        new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ),
        0 ) :
      new THREE.Mesh(
        new THREE.BoxGeometry(200000,1,200000),
        new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } )
      );
    eng.placement_plane.visible = false;
    eng.placement_plane.position.y = 200;

    // TODO: Figure out which update calls are necessary
    eng.scene.updateMatrix();
    eng.placement_plane.updateMatrix();
    eng.placement_plane.updateMatrixWorld();
    eng.log.msg("Building placement plane: %o", eng.placement_plane);

    // Generate scene objects!
    init_elements( opts, eng );

    // // Now that objects have been placed in-frustum, we can change the
    // // camera orientation. Rotation is in radians, here.
    // eng.camera.rotation.x = -(Math.PI / 4);
    // eng.camera.position.y = 300;
    // eng.camera.position.z = 200;
  }



  /**
  Initialize all objects.
  @method init_elements
  */
  function init_elements( opts, eng ) {
     var mat = new THREE.MeshLambertMaterial({ color: opts.generator.material.color });
     eng.side_mat = opts.physics.enabled ?
        Physijs.createMaterial( mat, opts.generator.material.friction, opts.generator.material.restitution ) :
        mat;

     $( opts.src.selector ).each( function( idx, val ) {
        init_image( idx, val, opts, eng );
     });
  }



  /**
  Initialize a single element. TODO: Clean up material/geo handling.
  @method init_card
  */
  function init_image( idx, val, opts, eng ) {

     // Position
     var pos_info = get_position( val, opts, eng );

     // Texture
     var texture = eng.rasterizer.paint( $(val), opts );
     var material = (!opts.physics.enabled || !opts.physics.materials) ?
        texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
     var materials = new THREE.MeshFaceMaterial([
        material, material, material, material,
        material, material
     ]);
     
     var mesh = EXTROVERT.create_object({ type: 'box', dims: [pos_info.width, pos_info.height, pos_info.depth], mat: materials, mass: 1000, pos: pos_info.pos });
     mesh.castShadow = mesh.receiveShadow = false;
     if( opts.generator.lookat )
        mesh.lookAt( new THREE.Vector3(opts.generator.lookat[0], opts.generator.lookat[1], opts.generator.lookat[2]) );
     mesh.elem = $(val);

     opts.creating && opts.creating( val, mesh );
     eng.scene.add( mesh );
     eng.card_coll.push( mesh );
     opts.created && opts.created( val, mesh );

     return mesh;
  }



  /**
  Retrieve the position, in 3D space, of a recruited HTML element.
  @method init_card
  */
  function get_position( val, opts, eng ) {

     // Get the position of the HTML element [1]
     var parent_pos = $( opts.src.container ).offset();
     var child_pos = $( val ).offset();
     var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

     // From that, compute the position of the top-left and bottom-right corner
     // of the element as they would exist in 3D-land.
     var topLeft = EXTROVERT.calc_position( pos.left, pos.top, eng.placement_plane );
     var botRight = EXTROVERT.calc_position( pos.left + $(val).width(), pos.top + $(val).height(), eng.placement_plane );
     // These return the topLeft and bottomRight coordinates of the MAIN FACE of the thing in WORLD coords

     var block_width = Math.abs( botRight.x - topLeft.x );
     var block_height = opts.block.depth;//Math.abs( topLeft.y - botRight.y );
     var block_depth = Math.abs( topLeft.z - botRight.z );

     // Offset by the half-height/width so the corners line up
     return {
        pos: [
           topLeft.x + (block_width / 2),
           topLeft.y - (block_height / 2),
           topLeft.z + (block_depth / 2) ],
        width: block_width,
        depth: block_depth,
        height: block_height
     };
  }



}(window, $, THREE, EXTROVERT));

// [1] Don't rely exclusively on .offset() or .position()
//     See: http://bugs.jquery.com/ticket/11606
//     var pos = $(val).offset();
//     var pos = $(val).position();
;/**
An Extrovert.js generator for a 3D image gallery.
@module gen-gallery.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



  /**
  Default options.
  */
  var _def_opts = {
    generator: {
      name: 'gallery',
      material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
    },
    camera: {
      far: 10000,
      position: [0,0,3200]
    },
    lights: [
      { type: 'point', color: 0xffffff, intensity: 1, distance: 10000 },
      { type: 'point', color: 0xffffff, intensity: 0.25, distance: 1000, pos: [0,0,300] },
    ]
  };



  /**
  @class The built-in 'gallery' generator.
  */
  EXTROVERT.gallery = function() {
    return {
      generate: function( options, eng ) {
        if( !options.generator || typeof options.generator == 'string' )
          options.generator = _def_opts.generator;
        init_objects( options, eng );
      },
      options: _def_opts,
      init_cam_opts: { position: [0,0,800] }
    };
  };



  /**
  Initialize scene props and objects. TODO: clean up object allocations.
  @method init_objects
  */
  function init_objects( opts, eng ) {
    var frustum_planes = EXTROVERT.Utils.calc_frustum( eng.camera );
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
    EXTROVERT.create_placement_plane( [0,0,200] );
    init_elements( opts, eng );
  }



  /**
  Initialize all elements
  @method init_elements
  */
  function init_elements( opts, eng ) {
    var mat = new THREE.MeshLambertMaterial({ color: opts.generator.material.color });
    eng.side_mat = Physijs.createMaterial( mat, opts.generator.material.friction, opts.generator.material.restitution );
    $( opts.src.selector ).each( function( idx, val ) {
      init_image( idx, val, opts, eng );
    });
  }



  /**
  Initialize a single element. TODO: Clean up material/geo handling.
  @method init_image
  */
  function init_image( idx, val, opts, eng ) {

    // Position
    var pos_info = EXTROVERT.get_position( val, opts, eng );

    // Texture
    var texture = eng.rasterizer.paint( $(val), opts );
    var material = (!opts.physics.enabled || !opts.physics.materials) ?
       texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
    var materials = new THREE.MeshFaceMaterial([
       eng.side_mat, eng.side_mat, eng.side_mat, eng.side_mat,
       material, material
    ]);

    // Mesh
    var mesh = EXTROVERT.create_object({ type: 'box', dims: [pos_info.width, pos_info.height, pos_info.depth], mass: 1000, mat: materials });
    mesh.castShadow = mesh.receiveShadow = false;
    if( opts.generator.lookat )
       mesh.lookAt( new THREE.Vector3(opts.generator.lookat[0], opts.generator.lookat[1], opts.generator.lookat[2]) );
    mesh.elem = $(val);

    opts.creating && opts.creating( val, mesh );
    eng.scene.add( mesh );
    eng.card_coll.push( mesh );
    opts.created && opts.created( val, mesh );

    return mesh;
  }



}(window, $, THREE, EXTROVERT));
;/**
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

;/**
An Extrovert.js generator that creates a 3D wall or tower.
@module gen-extrude.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



  /**
  Default options.
  */
  var _def_opts = {
    generator: {
      name: 'wall',
      background: 'default_background.png',
      material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
    },
    gravity: [0,-200,0],
    scene: { items: [ { type: 'box', pos: [0,-2000,0], dims: [4000,10,4000] } ] },
    camera: {
      far: 20000,
      position: [0,-1500,2000],
      rotation: [-0.25,0,0]
    },
    controls: {
      target: [0,-1500, 0]
    },
    block: { depth: 100 }
  };



  /**
  @class The built-in 'wall' generator.
  */
  EXTROVERT.wall = function() {
    return {
      generate: function( options, eng ) {
        if( !options.generator || typeof options.generator == 'string' )
          options.generator = _def_opts.generator;
        EXTROVERT.create_placement_plane( [0,0,200] );
        init_elements( options, eng );
      },
      options: _def_opts,
      init_cam_opts: { position: [0,0,800] }
    };
  };



  /**
  Initialize all generated elements.
  @method init_elements
  */
  function init_elements( opts, eng ) {
    var mat = new THREE.MeshLambertMaterial({ color: opts.generator.material.color });
    eng.side_mat = opts.physics.enabled ? Physijs.createMaterial( mat, opts.generator.material.friction, opts.generator.material.restitution ) : mat;
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
    var pos_info = EXTROVERT.get_position( val, opts, eng );
    // Texture
    var texture = eng.rasterizer.paint( $(val), opts );
    var material = (!opts.physics.enabled || !opts.physics.materials) ?
      texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
    var materials = new THREE.MeshFaceMaterial([
      eng.side_mat, eng.side_mat, eng.side_mat, eng.side_mat,
      material, material
    ]);
    // Mesh
    var mesh = EXTROVERT.create_object({ type: 'box', dims: [pos_info.width, pos_info.height, pos_info.depth], mat: materials, mass: 1000, pos: pos_info.pos });
    mesh.castShadow = mesh.receiveShadow = false;
    if( opts.generator.lookat )
      mesh.lookAt( new THREE.Vector3(opts.generator.lookat[0], opts.generator.lookat[1], opts.generator.lookat[2]) );
    mesh.elem = $(val);
    // Housekeeping
    opts.creating && opts.creating( val, mesh );
    eng.scene.add( mesh );
    eng.card_coll.push( mesh );
    eng.log.msg("Created element %d (%f, %f, %f): %o.", idx, pos_info.pos.x, pos_info.pos.y, pos_info.pos.z, mesh);
    opts.created && opts.created( val, mesh );

    return mesh;
  }



}(window, $, THREE, EXTROVERT));
;/**
A simple Extrovert HTML rasterizer.
@module paint-html.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   EXTROVERT.paint_html = function () {
      return {
         paint: function( $val, opts ) {
            /* TODO */
            var texture = null;
            return {
               tex: texture,
               mat: new THREE.MeshLambertMaterial( { map: texture, side: THREE.FrontSide } )
            };
         }
      };
   };



}(window, $, THREE, EXTROVERT));
;/**
A simple Extrovert image rasterizer.
@module paint-img-canvas.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   EXTROVERT.paint_img_canvas = function () {
      return {
         paint: function( $val, opts ) {
            var img = $val.get( 0 );
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.width = $val.width();
            canvas.height = $val.height();
            log.msg("Creating texture %d x %d (%d x %d)", img.clientWidth, img.clientHeight, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, img.clientWidth, img.clientHeight);
            texture = new THREE.Texture( canvas );
            texture.needsUpdate = true;
            return {
               tex: texture,
               mat: new THREE.MeshLambertMaterial( { map: texture, side: THREE.FrontSide } )
            };
         }
      };
   };



}(window, $, THREE, EXTROVERT));
;/**
A simple Extrovert image rasterizer.
@module paint-img.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   EXTROVERT.paint_img = function () {
      return {
         paint: function( $val, opts ) {
            var img = $val.get( 0 );
            var texture = THREE.ImageUtils.loadTexture( img.src );
            return {
               tex: texture,
               mat: new THREE.MeshLambertMaterial( { map: texture, side: THREE.FrontSide } )
            };
         }
      };
   };



}(window, $, THREE, EXTROVERT));
;/**
A simple Extrovert HTML rasterizer.
@module paint-plain-text.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   EXTROVERT.paint_plain_text = function () {
      return {
         paint: function( $val, opts ) {

            // Get the element content
            var title_elem = $val.find( opts.src.title );
            var title = title_elem.text();//.trim();
            var content_elem = $val.find( opts.src.content );
            var content = content_elem.text();//.trim();

            // Create a canvas element. TODO: Reuse a single canvas.
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.width = $val.width();
            canvas.height = $val.height();

            // Fill the canvas with the background color
            var bkColor = $val.css('background-color');
            if(bkColor === 'rgba(0, 0, 0, 0)')
               bkColor = 'rgb(0,0,0)';
            context.fillStyle = bkColor;
            context.fillRect(0, 0, canvas.width, canvas.height);

            // For photo backgrounds:
            // var images = $val.children('img');
            // if(images.length > 0)
            // context.drawImage(images.get(0),0,0, canvas.width, canvas.height);
            var has_photo = false;

            // Compute the size of the title text
            var font_size = title_elem.css('font-size');
            //context.font = "Bold " + font_size + " '" + title_elem.css('font-family') + "'";
            
            context.font = title_elem.css('font');
            
            context.fillStyle = title_elem.css('color');
            //context.textBaseline = 'top';
            var line_height = 24;
            var num_lines = EXTROVERT.Utils.wrap_text( context, title, 10, 10 + line_height, canvas.width - 20, line_height, true );
            
            // Paint the title's background panel
            context.fillStyle = has_photo ? "rgba(0,0,0,0.75)" : EXTROVERT.Utils.shade_blend( -0.25, bkColor );
            context.fillRect(0,0, canvas.width, 20 + num_lines * line_height);

            // Paint the title text
            context.fillStyle = title_elem.css('color');
            EXTROVERT.Utils.wrap_text( context, title, 10, 10 + line_height, canvas.width - 20, line_height, false );
            
            // Paint the content text
            //context.font = "Normal " + font_size + " '" + content_elem.css('font-family') + "'";
            context.font = content_elem.css('font');
            
            var shim = $('<div id="_fetchSize" style="display: none;">Sample text</div>');
            $( opts.src.container ).append( shim );
            line_height = shim.text("x").height();
            
            //var TestDivLineHeight = $("#TestDiv").css("font-size", "12px").css("line-height", "1.25").text("x").height();
            var massaged_content = content.replace('\n',' ');
            
            EXTROVERT.Utils.wrap_text( context, massaged_content, 10, 20 + (num_lines * line_height) + line_height, canvas.width - 20, line_height, false );

            // Create a texture from the canvas
            var texture = new THREE.Texture( canvas );
            texture.needsUpdate = true;
            return {
               tex: texture,
               mat: new THREE.MeshLambertMaterial( { map: texture/*, side: THREE.DoubleSide*/ } )
            };
         }
      };
   };



}(window, $, THREE, EXTROVERT));
;/**
A simple Extrovert HTML rasterizer.
@module paint-simple-html.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   EXTROVERT.paint_simple_html = function () {
      return {
         paint: function( $val, opts ) {
            // Get the element content
            var title_elem = $val.find( opts.src.title );
            var title = title_elem.text().trim();

            // Create a canvas element. TODO: Reuse a single canvas.
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.width = $val.width();
            canvas.height = $val.height();

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
            var num_lines = EXTROVERT.Utils.wrap_text( context, title, 10, 10, canvas.width - 20, line_height, true );
            if(images.length === 0)
               context.fillStyle = EXTROVERT.Utils.shade_blend( -0.25, bkColor );
            else
               context.fillStyle = "rgba(0,0,0,0.75)";
            context.fillRect(0,0, canvas.width, 20 + num_lines * line_height);
            context.fillStyle = title_elem.css('color');
            wrap_text( context, title, 10, 10, canvas.width - 20, line_height, false );

            // Create a texture from the canvas
            var texture = new THREE.Texture( canvas );
            texture.needsUpdate = true;
            return {
               tex: texture,
               mat: new THREE.MeshLambertMaterial( { map: texture/*, side: THREE.DoubleSide*/ } )
            };
         }
      };
   };




}(window, $, THREE, EXTROVERT));
