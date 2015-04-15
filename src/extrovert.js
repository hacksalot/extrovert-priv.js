/**
Extrovert.js is a 3D front-end for websites, blogs, and web-based apps.
@module extrovert.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@version 1.0
*/



/**
Set up the EXTRO symbol in an IIFE for old-style includes.
*/
var EXTRO = (function (window, THREE) {



  /**
  The one-and-only module object. Treat this explicitly.
  */
  var my = {};



  /**
  Default engine options. Unless overridden, these apply to all stages and all
  generators. These options will be overridden first by any generator options,
  and then by any options specified by the user.
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
      type: 'universal',
      enabled: true,
      allow_drag: false
    },
    physics: {
      enabled: true,
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
  Internal engine settings, not to be confused with options. Represents the run-
  time state of the Extrovert engine. We group them into an 'eng' object for no
  reason other than to avoid having a lot of variables scattered about.
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
  The one and only ultrafied combined options object. Once init_options has been
  called, this will contain the final, authoritative, combined set of engine +
  generator + user options.
  */
  var opts = null;



  /**
  An alias to EXTROVERT.Utils. Prevents us from having to say EXTROVERT.Utils.xxx
  all over the place.
  */
  var _utils = null;



  /**
  Initialize the Extrovert library and get some 3D up in that grill. This is the
  main entry point for the Extrovert library and is responsible for creating and
  starting the initial scene.
  @method init
  @param options Options specified by the user.
  */
  my.init = function( options ) {

    // Set up our alias to the utility library.
    _utils = EXTRO.Utils;

    // Quick exit if the user requests a specific renderer and the browser
    // doesn't support it or if neither renderer type is supported.
    eng.supportsWebGL = _utils.detectWebGL();
    eng.supportsCanvas = _utils.detectCanvas();
    if(( !eng.supportsWebGL && !eng.supportsCanvas ) ||
       ( options.renderer === 'WebGL' && !eng.supportsWebGL ) ||
       ( options.renderer === 'Canvas' && !eng.supportsCanvas ))
      return false;

    // Remove some troublesome stuff from the shader on IE. Needs work.
    // https://github.com/mrdoob/three.js/issues/4843#issuecomment-43957698
    var ua = window.navigator.userAgent;
    if( ~ua.indexOf('MSIE ') || ~ua.indexOf('Trident/') ) {
      Object.keys(THREE.ShaderLib).forEach(function (key) { // [3]
        THREE.ShaderLib[key].fragmentShader =
        THREE.ShaderLib[key].fragmentShader.replace('#extension GL_EXT_frag_depth : enable', '');
      });
    }

    // Initialize all the things
    init_options( options );
    init_renderer( opts );
    init_world( opts, eng );
    init_canvas( opts );
    init_physics( opts );
    init_controls( opts, eng );
    init_events();
    //init_timer();
    init_avatar( opts.avatar );
    start();

    // Since we use a false return as a quick signal for "can't render"
    // above, we've gotta return true here even though it's meaningless.
    return true;
  };



  /**
  Initialize engine options. Merge user, generator, and engine options into a
  new combined options object and carry across other important settings.
  @method init_options
  */
  function init_options( user_opts ) {
    eng.log = _utils.log;

    // -------------------------------------------------------------------------
    // Create a valid generator based on user options
    // -------------------------------------------------------------------------

    // Handle the 'generator' option. This can be the name of any valid generator,
    // or an options object with a .name field specifying any valid generator, or
    // undefined.

    if( !user_opts.generator )
      eng.generator = new EXTRO.float();
    else if (typeof user_opts.generator == 'string')
      eng.generator = new EXTRO[ user_opts.generator ]();
    else
      eng.generator = new EXTRO[ user_opts.generator.name ]();

    // -------------------------------------------------------------------------
    // Safely merge engine, generator, and user options into a combined options
    // object without modifying any of the original/source options.
    // -------------------------------------------------------------------------

    // Merge default ENGINE and GENERATOR options into a new options object such
    // that GENERATOR options override default ENGINE options.
    opts = _utils.extend(true, { }, defaults, eng.generator.options );

    // Merge USER options onto the combined ENGINE/GENERATOR options such that
    // the USER options take precedence.
    opts = _utils.extend(true, opts, user_opts );

    // If the user specified a generator using simple syntax (generator: 'wall')
    // then opts.generator is currently a string. Replace that string with the
    // full options object from the specified generator.
    if( typeof opts.generator === 'string' ) {
      opts.generator = _utils.extend(true, opts.generator, eng.generator.options.generator);
    }

    // -------------------------------------------------------------------------
    // Set up physics.
    // -------------------------------------------------------------------------

    // If physics are enabled, pass through the locations of necessary scripts.
    // These are required by the physics library; nothing to do with Extrovert.
    if( opts.physics.enabled ) {
      Physijs.scripts.worker = opts.physics.physijs.worker;
      Physijs.scripts.ammo = opts.physics.physijs.ammo;
    }

    // -------------------------------------------------------------------------
    // Set up rasterizer.
    // -------------------------------------------------------------------------

    // Set up the rasterizer. If a string was specified, instantiate a rasterizer
    // called `paint_` plus whatever the string was. Otherwise if the user passed
    // in a rasterizer OBJECT, use that directly. Lastly, if no rasterizer was
    // specified, use the <img> rasterizer.
    if( typeof opts.rasterizer == 'string' )
      eng.rasterizer = new EXTRO[ 'paint_' + opts.rasterizer ]();
    else
      eng.rasterizer = opts.rasterizer || new EXTRO.paint_img();

    // Return the combined, ultrafied options object.
    return opts;
  }



  /**
  Generate the "world". Prototype version. Refactor/rearchitect.
  @method init_world
  */
  function init_world( options, eng ) {

    // TODO: CORS stuff.
    //THREE.ImageUtils.crossOrigin = '*';
    //THREE.Loader.prototype.crossOrigin = '*';

    // Start off by creating the scene object. Is this part of creating the
    // 'world'? No.
    EXTRO.create_scene( options );

    // Set up the camera -- also not part of the 'world'.
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

    // Initialize the generator. Every generator exposes an .init method.
    // Call it.
    eng.generator.init && eng.generator.init( options, eng );

    // Create any predefined scene objects. These are objects added to the
    // scene via JSON options etc.
    create_scene_objects( eng.scene, options );

    // We have to do an explicit update here because auto updates won't happen
    // until the scene starts rendering, which it ain't, yet.
    eng.scene.updateMatrix();

    // -------------------------------------------------------------------------
    // Examine the SOURCE data
    // -------------------------------------------------------------------------

    // Default the container element to the entire body. Usually this will be
    // overridden by options.src.container but if not, the default behavior is
    // that the entire page is the container.
    var cont = document.body;

    // Handle the options.src.container option, if any. This can either be a CSS
    // selector, a valid DOM element, or undefined.
    //    options.src.container = '#source'; // valid
    //    options.src.container = getElementById('#source'); // also valid
    //    options.src.container = undefined; // also valid

    if( options.src && options.src.container ) {
      cont = ( typeof options.src.container === 'string' ) ?
        _utils.$( options.src.container ) : options.src.container;
      if( cont.length !== undefined) cont = cont[0];
    }

    // Handle the options.src.selector option, if any. This can be either a
    // valid CSS selector, a single element, an array of elements, or undefined.
    //    options.src.selector = 'img'; // string selector
    //    options.src.selector = getElementById('#some-image'); // DOM element
    //    options.src.selector = querySelector('img'); // array of DOM elements
    //    options.src.selector = undefined; // not specified

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

    // If no options.src is specified at all, then we're dealing with arbitrary
    // data. The generator will know what to do.
    else {
      // No options.src? Dealing with arbitrary off-page data
      eng.generator.generate();
    }

    // -------------------------------------------------------------------------
    // Transform the data
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // Set final camera position and orientation. Some generators depend on a
    // particular cam position for layouting, so we don't mess with it until
    // after everything's been created.
    // -------------------------------------------------------------------------

    var oc = options.camera;
    oc.rotation && eng.camera.rotation.set( oc.rotation[0], oc.rotation[1], oc.rotation[2] );
    oc.position && eng.camera.position.set( oc.position[0], oc.position[1], oc.position[2] );

    // -------------------------------------------------------------------------
    // Set up LIGHTING.
    // We do this after final cam positioning because the default light position,
    // if the user doesn't specify one, is wherever the camera is located.
    // -------------------------------------------------------------------------
    EXTRO.fiat_lux( options.lights );
  }



  /**
  Initialize keyboard and mouse controls for the scene. Right now this is a bit
  of a formality.
  @method init_controls
  */
  function init_controls( opts, eng ) {
    eng.controls = my.create_controls( opts.controls, eng.camera, eng.renderer.domElement );
    return eng.controls;
  }



  /**
  Initialize the renderer, which can either be a WebGL renderer (the default)
  or a Canvas renderer (good for fallbacks).
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
  @method init_canvas
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
  Create a mouse/keyboard control type from a generic description. Extrovert
  supports several control schemes, some of which are loosely based on control
  examples from THREE.js.
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
    else if( control_opts.type === 'firstperson' ) {
      controls = new THREE.FirstPersonControls( camera, domElement );
    }
    else if( control_opts.type === 'pointerlock' ) {
      controls = new THREE.PointerLockControls( camera );
    }
    else if( control_opts.type === 'universal' ) {
      controls = new EXTRO.UniversalControls( camera, undefined, control_opts );
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
  Initialize the top-level Scene object. Currently this will either be a THREE.Scene
  object or, if physics is enabled, a Physijs.Scene object.
  @method init_scene
  */
  my.create_scene = function( scene_opts ) {
    eng.scene = scene_opts.physics.enabled ? new Physijs.Scene() : new THREE.Scene();
    return eng.scene;
  };



  /**
  Create predefined scene objects, meaning custom objects that are placed in the
  scene via options, by either the user or the generator.
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
  Create a material from a generic description.
  @method createMaterial
  */
  my.createMaterial = function( desc ) {
    var mat = new THREE.MeshLambertMaterial({ color: desc.color || 0xFFFFFF, map: desc.tex || null });
    return opts.physics.enabled && !desc.noPhysics ?
      Physijs.createMaterial( mat, desc.friction, desc.restitution )
      : mat;
  };



  /**
  Create a six-sided material from an array of materials.
  @method createCubeMaterial
  */
  my.createCubeMaterial = function( faceMaterials ) {
    return new THREE.MeshFaceMaterial( faceMaterials );
  };



  /**
  Create a mesh object from a generic description. Currently only supports box
  and plane meshes; add others as necessary.
  @method create_object
  */
  my.create_object = function( desc ) {
    // Set up vars with reasonable defaults for color, opacity, transparency.
    var mesh = null, geo = null, mat = null;
    var rgb = desc.color || 0xFFFFFF;
    var opac = desc.opacity || 1.0;
    var trans = desc.transparent || false;
    // Create Box-type meshes
    if( desc.type === 'box' ) {
      geo = new THREE.BoxGeometry( desc.dims[0], desc.dims[1], desc.dims[2] );
      mat = desc.mat || new THREE.MeshLambertMaterial( { color: rgb, opacity: opac, transparent: trans } );
      mesh = create_mesh(geo, 'Box', mat, false, desc.mass);
    }
    // Create Plane-type meshes
    else if( desc.type === 'plane' ) {
      geo = new THREE.PlaneBufferGeometry( desc.dims[0], desc.dims[1] );
      mat = desc.mat || new THREE.MeshBasicMaterial( { color: rgb, opacity: opac, transparent: trans } );
      mesh = create_mesh( geo, null, mat, true, desc.mass );
    }
    // Set object position and rotation (only if explicitly specified)
    if( desc.pos )
      mesh.position.set( desc.pos[0], desc.pos[1], desc.pos[2] );
    if( desc.rot )
      mesh.rotation.set( desc.rot[0], desc.rot[1], desc.rot[2] );
    // Set visibility flag
    if( desc.visible === false )
      mesh.visible = false;
    // Turn off shadows for now.
    mesh.castShadow = mesh.receiveShadow = false;
    return mesh;
  };



  /**
  Helper function to create a specific mesh type.
  @method create_mesh
  @param geo A THREE.XxxxGeometry object.
  @param mesh_type Either 'Box' or 'Plane'.
  @param mat A THREE.XxxxMaterial object.
  @param force_simple A flag to force using a THREE.Mesh instead of a Physijs.Mesh.
  @param mass The mass of the object, if physics is enabled.
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
    /*eng.renderer.domElement.*/document.addEventListener( 'keydown', onKeyDown, false );
    /*eng.renderer.domElement.*/document.addEventListener( 'keyup', onKeyUp, false );
    window.addEventListener( 'mousewheel', onMouseWheel, false );
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
  Create a physical representation of the user's identity.
  */
  function init_avatar( avOpts ) {
    if( avOpts && avOpts.enabled ) {
      var avatar = my.create_object( avOpts );
      eng.camera.position.set(0,0,0);
      avatar.add( eng.camera );
      eng.scene.add( avatar );
      eng.objects.push( avatar );
    }
  }



  /**
  Start the simulation.
  @method start
  */
  function start() {
    window.requestAnimFrame =            //[5]
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
    // var time = Date.now() / 1000.0;
    // var elapsed = time - eng.last_time;
    // eng.last_time = time;

    if( !opts.move_with_physics ) {
       // Maintain the __dirtyPosition flag while dragging
      if( eng.selected !== null ) {
        eng.selected.__dirtyPosition = true;
      }
       // Maintain the __dirtyPosition flag on touched objects
      for ( var i = 0, l = eng.objects.length; i < l; i ++ ) {
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
  Create one or more lights from a generic description. Supports ambient, point,
  spotlight, and hemisphere lighting. Add additional types as necessary.
  @method fiat_lux
  @param light_opts A valid object representing a light.
  */
  my.fiat_lux = function( light_opts ) {

    if( !light_opts || light_opts.length === 0 )
      return;

    var lights = [];
    var new_light = null;

    for( var idx = 0; idx < light_opts.length; idx++ ) {
      var val = light_opts[ idx ];
      if( val.type === 'ambient' )
        new_light = new THREE.AmbientLight( val.color );
      else if (val.type === 'point')
        new_light = new THREE.PointLight( val.color, val.intensity, val.distance );
      else if (val.type === 'spotlight')
        new_light = create_spotlight( val );
      else if (val.type === 'hemisphere')
        new_light = new THREE.HemisphereLight( val.color, val.groundColor, val.intensity );
      else
        return;

      if( val.type !== 'ambient' && val.type !== 'hemisphere' ) {
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
    eng.raycaster.setFromCamera( EXTRO.to_ndc( posX, posY, 0.5, new THREE.Vector3() ), eng.camera );
    var intersects = eng.raycaster.intersectObject( placement_plane || eng.placement_plane );
    return (intersects.length > 0) ? intersects[0].point : null;
  };



  /**
  Calculate the position, in world coordinates, of the specified (x,y) screen
  location, at the specified Z. Currently broken.
  @method calc_position2
  */
  my.calc_position2 = function( posX, posY, unused ) {
    var vector = new THREE.Vector3();
    //vector.set(
        // ( event.clientX / window.innerWidth ) * 2 - 1,
        // - ( event.clientY / window.innerHeight ) * 2 + 1,
        // 0.5 );
    vector = EXTRO.to_ndc( posX, posY, 0.5, vector );
    vector.unproject( eng.camera );
    var dir = vector.sub( eng.camera.position ).normalize();
    var distance = -eng.camera.position.z / dir.z;
    var pos = eng.camera.position.clone().add( dir.multiplyScalar( distance ) );
  };




  /**
  Apply a force to an object at a specific point. If physics is disabled, has no
  effect.
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

    // Get the (x,y) mouse coordinates relative to the container
    var xpos = e.offsetX === undefined ? e.layerX : e.offsetX; //[1]
    var ypos = e.offsetY === undefined ? e.layerY : e.offsetY;

    // Convert to normalized device coordinates
    eng.mouse = EXTRO.to_ndc( xpos, ypos, 0.5, eng.mouse );

    // Set up our ray depending on whether the camera is the child of a
    // transformed object or not.
    if ( !opts.avatar ) {
      eng.raycaster.setFromCamera( eng.mouse, eng.camera );
    }
    else {
      //http://stackoverflow.com/a/28873205
      var cameraPosition = new THREE.Vector3();
      cameraPosition.setFromMatrixPosition( eng.camera.matrixWorld ); // world position
      eng.raycaster.ray.origin.copy( cameraPosition );
      eng.raycaster.ray.direction.set( eng.mouse.x, eng.mouse.y, 0.5 ).unproject( eng.camera ).sub( cameraPosition ).normalize();
    }

    // Cast a ray to see what objects were clicked.
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
         apply_force( intersects[0] ); // [4]
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
    eng.mouse = EXTRO.to_ndc( xpos, ypos, 0.5, eng.mouse );
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
  Handle the 'keydown' event.
  @method onKeyDown
  */
  function onKeyDown( e ) {
    eng.controls && eng.controls.enabled && eng.controls.keydown( e );
  }



  /**
  Handle the 'keyup' event.
  @method onKeyUp
  */
  function onKeyUp( e ) {
    eng.controls && eng.controls.enabled && eng.controls.keyup( e );
  }



  /**
  Handle the 'mousewheel' event.
  @method onMouseWheel
  */
  function onMouseWheel( e ) {
    eng.controls && eng.controls.enabled && eng.controls.mousewheel( e );
  }



  /**
  Retrieve the position, in 3D space, of a recruited HTML element.
  @method get_position
  */
  my.get_position = function( val, opts, eng ) {

    // Safely get the position of the HTML element [1] relative to its parent
    var src_cont = (typeof opts.src.container === 'string') ?
      _utils.$( opts.src.container ) : opts.src.container;
    if(src_cont.length !== undefined) src_cont = src_cont[0];
    var parent_pos = _utils.offset( src_cont );
    var child_pos = _utils.offset( val );
    var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

    // Get the position of the element's left-top and right-bottom corners in
    // WORLD coords, based on where the camera is.
    var topLeft = EXTRO.calc_position( pos.left, pos.top, eng.placement_plane );
    var botRight = EXTRO.calc_position( pos.left + val.offsetWidth, pos.top + val.offsetHeight, eng.placement_plane );

    // Calculate WORLD dimensions of the lement.
    var block_width = Math.abs( botRight.x - topLeft.x );
    var block_height = Math.abs( topLeft.y - botRight.y );
    var block_depth = Math.abs( topLeft.z - botRight.z );

    // Offset by the half-height/width so the corners line up and get out.
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
  Handle the window 'resize' event.
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
  my.to_ndc = function( posX, posY, posZ, coords ) {
    coords.x = ( posX / eng.width ) * 2 - 1;
    coords.y = - ( posY / eng.height ) * 2 + 1;
    coords.z = posZ;
    return coords;
  };



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
// [4]: Process physical interaction events on mousedown instead of mouseup.
//
// [5]: Shim window.requestAnimation to window.requestAnim. Kitchen-sink version
//      here: https://github.com/chrisdickinson/raf
//
