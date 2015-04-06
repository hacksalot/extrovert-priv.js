/**
Extrovert.js is a 3D front-end for websites, blogs, and web-based apps.
@module extrovert.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@version 1.0
*/

var EXTRO = (function (window, THREE) {



  /**
  Module object.
  */
  var my = {};




  /**
  Default engine options. Will be smushed together with generator and user options.
  */
  var defaults = {
    renderer: 'Any',
    generator: 'gallery',
    rasterizer: 'img',
    gravity: [0,0,0],
    camera: {
      fov: 35,
      near: 1,
      far: 10000
    },
    controls: {
      type: 'trackball',
      enabled: true,
      allow_drag: false
    },
    physics: {
      enabled: true,
      materials: false,
      physijs: {
        worker: '/js/pjsworker.js',
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
    onerror: null,
    created: null,
    clicked: null
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
    objects: [],
    drag_plane: null,
    placement_plane: null,
    offset: new THREE.Vector3(),
    generator: null,
    clock: new THREE.Clock(),
    supportsWebGL: false,
    supportsCanvas: false,
    pass_mouse_input: true
  };



  /**
  The one and only ultrafied combined options object.
  */
  var opts = null;



  /**
  An alias to EXTROVERT.Utils.
  */
  var _utils = null;



  /**
  Initialize the Extrovert library and get some 3D up in that grill.
  @method init
  */
  my.init = function( options ) {

    _utils = EXTRO.Utils;

    // Quick exit if we don't support the requested renderer
    eng.supportsWebGL = _utils.detectWebGL();
    eng.supportsCanvas = _utils.detectCanvas();
    if(( !eng.supportsWebGL && !eng.supportsCanvas ) ||
       ( options.renderer === 'WebGL' && !eng.supportsWebGL ) ||
       ( options.renderer === 'Canvas' && !eng.supportsCanvas ))
      return false;

    // Special handling for IE- TODO: needs work.
    var ua = window.navigator.userAgent;
    if( ~ua.indexOf('MSIE ') || ~ua.indexOf('Trident/') ) {
      Object.keys(THREE.ShaderLib).forEach(function (key) { // [3]
        THREE.ShaderLib[key].fragmentShader =
        THREE.ShaderLib[key].fragmentShader.replace('#extension GL_EXT_frag_depth : enable', '');
      });
    }

    init_options( options );
    init_renderer( opts );
    init_world( opts, eng );
    init_canvas( opts );
    init_physics( opts );
    init_controls( opts, eng );
    init_events();
    init_timer();
    start();
    return true;
  };



  /**
  Initialize engine options. Merge user, generator, and engine options into a
  new combined options object and carry across other important settings.
  @method init_options
  */
  function init_options( user_opts ) {
    eng.log = _utils.log;

    if( !user_opts.generator )
      eng.generator = new EXTRO.float();
    else if (typeof user_opts.generator == 'string')
      eng.generator = new EXTRO[ user_opts.generator ]();
    else
      eng.generator = new EXTRO[ user_opts.generator.name ]();

    opts = _utils.extend(true, { }, defaults, eng.generator.options );
    opts = _utils.extend(true, opts, user_opts );

    if( typeof opts.generator === 'string' ) {
      opts.generator = _utils.extend(true, opts.generator, eng.generator.options.generator);
    }

    if( opts.physics.enabled ) {
      Physijs.scripts.worker = opts.physics.physijs.worker;
      Physijs.scripts.ammo = opts.physics.physijs.ammo;
    }

    if( typeof opts.rasterizer == 'string' )
      eng.rasterizer = new EXTRO[ 'paint_' + opts.rasterizer ]();
    else
      eng.rasterizer = opts.rasterizer || new EXTRO.paint_img();
    return opts;
  }



  /**
  Generate the "world".
  @method init_world
  */
  function init_world( options, eng ) {

    // TODO: CORS stuff.
    THREE.ImageUtils.crossOrigin = '*';
    THREE.Loader.prototype.crossOrigin = '*';

    EXTRO.create_scene( options );
    EXTRO.create_camera( _utils.extend(true, {}, options.camera, eng.generator.init_cam_opts) );

    // Create an invisible plane for drag and drop
    // TODO: Only create this if drag-drop controls are enabled
    // This should be up to the XxxxxControls object.
    if( options.controls.allow_drag ) {
      eng.drag_plane = EXTRO.create_object( {
        type: 'plane',
        dims: [2000,2000,8],
        visible: false,
        color: 0x000000,
        opacity: 0.25,
        transparent: true } );
    }

    // Initialize the generator and create predefined scene objects
    eng.generator.init && eng.generator.init( options, eng );
    create_scene_objects( eng.scene, options );
    eng.scene.updateMatrix();

    // Get the source container element if specified or default to body
    var cont = document.body;
    if( options.src && options.src.container ) {
      cont = ( typeof options.src.container === 'string' ) ?
        _utils.$( options.src.container ) : options.src.container;
      if( cont.length !== undefined) cont = cont[0];
    }

    // Get the source elements for transformation
    var elems;
    if( options.src ) {
      if( options.src.selector ) {
          // options.src.selector can be a string or a function
          elems = ( typeof options.src.selector === 'string' ) ?
            cont.querySelectorAll( options.src.selector ) :
            options.src.selector();
      }
      else {
        // No options.src.selector: options.src specifies the data
        // it can be a single element or an array
        elems = options.src;
      }
    }
    else {
      // No options.src? Dealing with arbitrary off-page data
      eng.generator.generate();
    }

    // Transform the elements: TODO: refactor.
    var idx, length = elems.length;
    for(idx = 0; idx < length; ++idx) {
      var elem = elems[ idx ];
      var mesh = eng.generator.generate( elem );
      mesh.updateMatrix();
      mesh.updateMatrixWorld();
      options.creating && options.creating( elem, mesh );
      eng.scene.add( mesh );
      eng.objects.push( mesh );
      mesh.elem = elem;
      options.created && options.created( elem, mesh );
    }

    // Now that objects have been placed, update the final cam position
    var oc = options.camera;
    oc.rotation && eng.camera.rotation.set( oc.rotation[0], oc.rotation[1], oc.rotation[2] );
    oc.position && eng.camera.position.set( oc.position[0], oc.position[1], oc.position[2] );

    // Create lights AFTER final cam positioning
    EXTRO.fiat_lux( options.lights );
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
  Initialize the renderer. TODO: Support CanvasRenderer
  @method init_renderer
  */
  function init_renderer( opts ) {

    if( opts.src && opts.src.container ) {
      var cont = (typeof opts.src.container === 'string') ?
        _utils.$( opts.src.container ): opts.src.container;
      if( cont.length !== undefined )
        cont = cont[0];
      var rect = cont.getBoundingClientRect();
      eng.width = rect.right - rect.left;
      eng.height = rect.bottom - rect.top;
    }
    else {
      eng.width = window.innerWidth;
      eng.height = window.innerHeight;
    }

    // Choose a [WebGL|Canvas]Renderer based on options
    var rendName = opts.renderer;
    if( !rendName || rendName === 'Any' ) {
      rendName = eng.supportsWebGL ? 'WebGL' : (eng.supportsCanvas ? 'Canvas' : null);
    }
    var rendOpts = rendName === 'Canvas' ? undefined : { antialias: true };

    eng.renderer = new THREE[rendName + 'Renderer']( rendOpts );
    eng.renderer.setPixelRatio( window.devicePixelRatio );
    eng.renderer.setSize( eng.width, eng.height );
    opts.bkcolor && eng.renderer.setClearColor( opts.bkcolor );
    eng.renderer.domElement.setAttribute('tabindex', '0'); // [2]
    eng.renderer.domElement.style += ' position: relative;';
  }



  /**
  Introduce the canvas to the live DOM. Note: .getBoundingClientRect will
  return an empty (zero-size) result until this happens.
  */
  function init_canvas( opts ) {
    if( opts.target && opts.target.container ) {
      var action = opts.target.action || 'append';
      var target_container = (typeof opts.target.container === 'string') ?
        _utils.$( opts.target.container ) : opts.target.container;
      if( target_container.length !== undefined ) target_container = target_container[0];
      if( action === 'append' )
        target_container.appendChild( eng.renderer.domElement );
      else if( action === 'replace' || action === 'replaceWith' ) {
        target_container.parentNode.insertBefore( eng.renderer.domElement, target_container );
        target_container.parentNode.removeChild( target_container );
      }
    }
  }



  /**
  Create a mouse/keyboard control type from a generic description.
  @method create_controls
  */
  my.create_controls = function( control_opts, camera, domElement ) {
    var controls = null;
    var track_opts = null;
    if( !control_opts || !control_opts.type || control_opts.type === 'trackball' ) {
      track_opts = { ignore_events: 'mousedown mousemove mouseup' };
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
    }
    else if( control_opts.type === 'fly' ) {
      controls = new THREE.FlyControls( camera, domElement );
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
    eng.camera = cam;
    copts.position && cam.position.set( copts.position[0], copts.position[1], copts.position[2] );
    if( copts.up ) cam.up.set( copts.up[0], copts.up[1], copts.up[2] );
    if( copts.lookat ) cam.lookAt( new THREE.Vector3( copts.lookat[0], copts.lookat[1], copts.lookat[2] ) );
    cam.updateMatrix(); // TODO: Are any of these calls still necessary?
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    return cam;
  };



  /**
  Initialize the Three.js or Physijs scene object along with any predefined
  geometry specified by the client.
  @method init_scene
  */
  my.create_scene = function( scene_opts ) {
    eng.scene = scene_opts.physics.enabled ? new Physijs.Scene() : new THREE.Scene();
    return eng.scene;
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
  Utility function for drawing a rounded rect (2D).
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
  Create a mesh object from a generic description. Currently only supports box
  and plane meshes; add others as necessary.
  @method create_object
  */
  my.create_object = function( desc ) {
    var mesh = null, geo = null, mat = null;
    var rgb = desc.color || 0xFFFFFF;
    var opac = desc.opacity || 1.0;
    var trans = desc.transparent || false;
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
    mesh.castShadow = mesh.receiveShadow = false;
    return mesh;
  };



  /**
  Helper function to create a specific mesh type.
  @method create_mesh
  */
  function create_mesh( geo, mesh_type, mat, force_simple, mass ) {
    return opts.physics.enabled && !force_simple ?
      new Physijs[ mesh_type + 'Mesh' ]( geo, mat, mass ) : new THREE.Mesh(geo, mat);
  }



  /**
  Initialize the physics system.
  @method init_physics
  */
  function init_physics( opts ) {
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
    // requestAnim shim layer by Paul Irish
    // Better version here: https://github.com/chrisdickinson/raf
    window.requestAnimFrame =
      window.requestAnimationFrame       ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      function(/* function */ callback, /* DOMElement */ element){
        window.setTimeout(callback, 1000 / 60);
      };

    opts.onload && opts.onload(); // Fire the 'onload' event
    animate();
  }



  /**
  Request animation of the scene.
  @method animate
  */
  function animate() {
    //requestAnimationFrame( animate );
    requestAnimFrame( animate );
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
      for ( var i = 0, l = eng.objects.length; i < l; i ++ )
      {
        if( eng.objects[ i ].has_been_touched ) {
          eng.objects[ i ].__dirtyPosition = true;
        }
      }
    }

    eng.controls && eng.controls.enabled && eng.controls.update( eng.clock.getDelta() );
    eng.renderer.clear();

    eng.css_renderer && eng.css_renderer.render( eng.css_scene, eng.camera );
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

    for( var idx = 0; idx < light_opts.length; idx++ ) {

      var val = light_opts[ idx ];
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
    }

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
  location, at whatever point it intersects with the placement_plane.
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
    var intersects = eng.raycaster.intersectObjects( eng.objects );
    if( intersects.length !== 0 ) {
      if( e.ctrlKey ) {
        eng.selected = intersects[ 0 ].object;
        eng.selected.has_been_touched = true;
        eng.drag_plane.position.copy( eng.selected.position );
        eng.offset.copy( intersects[ 0 ].point ).sub( eng.selected.position );
        if( opts.physics.enabled ) {
          eng.selected.setAngularFactor( _utils.VZERO );
          eng.selected.setLinearFactor( _utils.VZERO );
          eng.selected.setAngularVelocity( _utils.VZERO );
          eng.selected.setLinearVelocity( _utils.VZERO );
        }
        else {
          eng.selected.temp_velocity = eng.selected.velocity.clone();
          eng.selected.velocity.set(0,0,0);
        }
      }
      else {
         apply_force( intersects[0] );
      }
      opts.clicked && opts.clicked( e, eng.selected );
    }

    if( eng.controls && eng.controls.enabled ) {
      eng.controls.mousedown( e );
    }
  }



  /**
  Handle the 'mousemove' event. TODO: physics integration.
  @method mouse_move
  */
  function mouse_move( e ) {
    if( eng.controls && eng.controls.enabled ) {
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
    if( eng.controls && eng.controls.enabled ) {
      eng.controls.mouseup( e );
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
    var src_cont = (typeof opts.src.container === 'string') ?
      _utils.$( opts.src.container ) : opts.src.container;
    if(src_cont.length !== undefined) src_cont = src_cont[0];
    var parent_pos = _utils.offset( src_cont );
    var child_pos = _utils.offset( val );
    var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };
    // Get the position in world coords relative to camera
    var topLeft = EXTRO.calc_position( pos.left, pos.top, eng.placement_plane );
    var botRight = EXTRO.calc_position( pos.left + val.offsetWidth, pos.top + val.offsetHeight, eng.placement_plane );


    var block_width = Math.abs( botRight.x - topLeft.x );
    var block_height = Math.abs( topLeft.y - botRight.y );
    var block_depth = Math.abs( topLeft.z - botRight.z );

    // Offset by the half-height/width so the corners line up
    return {
      pos:
        [topLeft.x + (block_width / 2),
        topLeft.y - (block_height / 2),
        topLeft.z - (block_depth / 2)],
      width: block_width,
      height: block_height,
      depth: block_depth
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



}(window, THREE));

//
// [1]: FireFox doesn't support .offsetX:
//      https://bugzilla.mozilla.org/show_bug.cgi?id=69787
//      http://stackoverflow.com/q/11334452
//
// [2]: Give the canvas a tabindex so it receives keyboard input and set the
//      position to relative so coordinates are canvas-local.
//      http://stackoverflow.com/a/3274697
//
// [3]: Remove some troublesome stuff from the shader for IE. Assumes three.js R70/71.
//      https://github.com/mrdoob/three.js/issues/4843#issuecomment-43957698
//
