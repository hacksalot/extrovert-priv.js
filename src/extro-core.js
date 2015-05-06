/**!
Extrovert.js is a 3D front-end for websites, blogs, and web-based apps.
@author James Devlin | james@indevious.com
@version 0.1.0
@module extro-core
*/

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module with a dependency on 'b'.
    define(['b'], function (b) {
      return (root.extrovert = factory(b));
    });
  } else if (typeof exports === 'object') {
    // CommonJS. Support basic CJS enviroments w/ module.exports.
    module.exports = factory(require('b'));
  } else {
    // Global. Expose our module object.
    root.extrovert = factory(root.b);
  }
}(this, function (b) {

  /**
  Define the module object and set the version number.
  */
  var my = { version: '0.1.0' };

  /**
  Default engine options. These are overridden by user options.
  */
  var defaults = {
    renderer: 'Any',
    gravity: [0,0,0],
    camera: {
      fov: 35,
      near: 1,
      far: 10000,
      position: [0,0,200]
      //positionScreen: [4000,4000,200]
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
    block: { depth: 1 },
    move_with_physics: true,
    clickForce: 900000,
    onload: null,
    onerror: null,
    created: null,
    clicked: null,
    lights: [
      { type: 'ambient', color: 0xffffff }
    ]//,
    // transforms: [
      // { type: 'extrude', src: 'img' }
    // ]
  };

  /**
  Internal engine settings, not to be confused with options. Represents the run-
  time state of the Extrovert engine. We group them into an 'eng' object for no
  reason other than to avoid having a lot of private variables scattered about.
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
    target: 'body'
  };

  /**
  The one and only ultrafied combined options object. Once initOptions has been
  called, this will contain the final, authoritative, combined set of engine +
  generator + user options.
  */
  var _opts = null;

  /**
  An alias to extrovert.Utils.
  */
  var _utils = null;

  /**
  An alias to our logging facilities.
  */
  var _log = null;

  /**
  A global flag that controls whether log statements are executed, ignored, or
  stripped from the source output.
  */
  my.LOGGING = true;

  /**
  Initialize the Extrovert library and get some 3D up in that grill.
  @method init
  @param target Target selector, DOM node, or DOM collection.
  @param options Transformation options.
  */
  my.init = function( target, options ) {

    _utils = extrovert.Utils;
    _log = eng.log = _utils.log;
    options = options || { };
    my.provider = my.threeJsProvider;
    my.LOGGING && _log.msg('Extrovert %s', my.version);
    my.LOGGING && _log.msg('User options: %o', options );

    // Quick exit if the user requests a specific renderer and the browser
    // doesn't support it or if neither renderer type is supported.
    eng.supportsWebGL = _utils.detectWebGL();
    eng.supportsCanvas = _utils.detectCanvas();
    if( ( !eng.supportsWebGL && !eng.supportsCanvas ) ||
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
    initOptions( target, options );
    initRenderer( _opts );
    initWorld( _opts, eng );
    initCanvas( _opts );
    initPhysics( _opts );
    initControls( _opts, eng );
    initEvents();
    //initTimer();
    initAvatar( _opts.avatar );
    start();

    // Since we use a false return as a quick signal for "can't render"
    // above, we've gotta return true here even though it's meaningless.
    return true;
  };

  /**
  Simple jQuery plugin support (if jQuery is present).
  */
  var $ = window.jQuery;
  if( $ ) {
    $.fn.extrovert = function( opts ) {
      return this.each(function() {
        my.init( this, opts );
      });
    };
  }

  /**
  Initialize engine options. Merge user, generator, and engine options into a
  new combined options object and carry across other important settings.
  @method initOptions
  */
  function initOptions( target, user_opts ) {

    eng.target = target;
    eng.userOpts = user_opts;

    // Merge USER options onto DEFAULT options without modifying either.
    _opts = eng.opts = my.options = _utils.extend(true, { }, defaults, user_opts );

    // If physics are enabled, pass through the locations of necessary scripts.
    // These are required by the physics library; nothing to do with Extrovert.
    if( _opts.physics.enabled ) {
      Physijs.scripts.worker = _opts.physics.physijs.worker;
      Physijs.scripts.ammo = _opts.physics.physijs.ammo;
    }

    // Preload rasterizers
    eng.rasterizers = {
      img: new extrovert.paint_img(),
      element: new extrovert.paint_element(),
      plain_text: new extrovert.paint_plain_text()
    };

    // Return the combined, ultrafied options object.
    return _opts;
  }

  /**
  Return an appropriate rasterizer for the given object.
  @method getRasterizer
  */
  my.getRasterizer = function( obj ) {
    var r = null;
    if( obj instanceof HTMLImageElement )
      r = eng.rasterizers.img;
    else if (obj.nodeType !== undefined )
      r = eng.rasterizers.elem;
    else if (extrovert.Utils.isPlainObject( obj ) )
      r = eng.rasterizers.plain_text;
    return r;
  };

  /**
  Initialize a generator from a transformation description.
  @method initGenerator
  @param transformOptions A single transformation description from the
  `transforms` array passed in by the user, if any.

      {
        type: 'extrude',
        rasterizer: 'element',
        etc: "..."
      }

  */
  function initGenerator( transformOptions ) {
    // Create the generator object
    // options.generator can be the name of any valid generator, or an options
    // object with a .name field specifying any valid generator, or undefined.
    var gen = null;
    if( !transformOptions.type )
      gen = new extrovert.extrude();
    else if (typeof transformOptions === 'string')
      gen = new extrovert[ transformOptions ]();
    else
      gen = new extrovert[ transformOptions.type ]();

    // Initialize the generator with merged options
    var mergedOptions = _utils.extend(true, { }, defaults, gen.options );
    mergedOptions = _utils.extend(true, { }, mergedOptions, eng.userOpts );
    mergedOptions = _utils.extend(true, { }, mergedOptions, transformOptions );
    gen.init && gen.init( mergedOptions, eng );

    return gen;
  }

  /**
  Generate the "world".
  @method initWorld
  */
  function initWorld( opts, eng ) {

    // TODO: CORS stuff.
    //THREE.ImageUtils.crossOrigin = '*';
    //THREE.Loader.prototype.crossOrigin = '*';

    extrovert.createScene( opts );

    // Create the camera
    var ico = opts.init_cam_opts ? _utils.extend(true, {}, opts.camera, opts.init_cam_opts ) : opts.camera;
    if( ico.type === 'orthographic' ) {
      ico.left = ico.left || eng.width / - 2;
      ico.right = ico.right || eng.width / 2;
      ico.top = ico.top || eng.height / 2;
      ico.bottom = ico.bottom || eng.height / - 2;
    }
    else {
      ico.aspect = eng.width / eng.height;
    }
    var cam = my.provider.createCamera( ico );
    extrovert.LOGGING && _log.msg('Created camera at [%f,%f,%f]: %o', cam.position.x, cam.position.y, cam.position.z, cam);
    eng.camera = cam;

    // Create an invisible plane for drag and drop
    // TODO: Only create this if drag-drop controls are enabled
    // This should be up to the XxxxxControls object.
    if( opts.controls.allow_drag ) {
      eng.drag_plane = extrovert.createObject( {
        type: 'plane',
        dims: [2000,2000,8],
        visible: false,
        color: 0x000000,
        opacity: 0.25,
        transparent: true } );
    }

    // Create any predefined scene objects. These are objects added to the
    // scene via JSON opts etc.
    createScenePrimitives( eng.scene, opts );

    // We have to do an explicit update here because auto updates won't happen
    // until the scene starts rendering, which it ain't, yet. TODO: still necessary?
    eng.scene.updateMatrix();

    // Massage the transformations.
    var tforms = (opts.transform || opts.transforms) || // Either spelling
      [{ type: 'extrude', src: 'img'/*, container: 'body'*/}]; // Default if missing
    tforms = ( !_utils.isArray( tforms ) ) ? [ tforms ] : tforms; // Force array

    // Transform!
    tforms.reduce( function( obj, trans, idx ) {
      var src = trans.src || '*';
      var cont = trans.container || (opts.src && opts.src.container) || opts.container || document.body;
      if( typeof cont === 'string' ) {
        cont = _utils.$( cont );
        if(cont.length !== undefined) cont = cont[0];
      }
      var elems = ( typeof src === 'string' ) ?
        cont.querySelectorAll( src ) : src;

      // Create a generator and run the transform
      var gen = initGenerator( trans );
      gen.generate( trans, elems );

      // opts.creating && opts.creating( elem, mesh );
      // opts.created && opts.created( elem, mesh );
    }, { });

    // Set final camera position and orientation. Some generators depend on a
    // particular cam position for layouting, so we don't mess with it until
    // after everything's been created.
    var oc = opts.camera;
    oc.rotation && eng.camera.rotation.set( oc.rotation[0], oc.rotation[1], oc.rotation[2], 'YXZ' );

    var camPos;
    if( oc.positionScreen ) {
      var srcCont = (opts.src && opts.src.container) || opts.container || document.body;
      if( typeof srcCont === 'string' ) {
        srcCont = _utils.$( srcCont );
        if(srcCont.length !== undefined) srcCont = srcCont[0];
      }
      var parent_pos = _utils.offset( srcCont );
      var child_pos = { left: oc.positionScreen[0], top: oc.positionScreen[1] };
      var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };
      var rect = srcCont.getBoundingClientRect();
      var extents = { width: rect.right - rect.left, height: rect.bottom - rect.top };
      var worldPos = my.screenToWorldEx( oc.positionScreen[0], oc.positionScreen[1], null, extents );
      oc.position[0] = worldPos.x;
      oc.position[1] = worldPos.y;
      //oc.position[2] = worldPos.z;
      oc.position[2] = oc.positionScreen[2];
    }
    else if ( oc.positionNDC ) {
      oc.position = my.ndcToWorld( oc.positionNDC );
    }

    if( oc.position ) {
      eng.camera.position.set( oc.position[0], oc.position[1], oc.position[2] );
      extrovert.LOGGING && _log.msg('Camera moved to [%f,%f,%f]: %o', oc.position[0], oc.position[1], oc.position[2], cam);
    }

    // Set up LIGHTING.
    // We do this after final cam positioning because the default light position,
    // if the user doesn't specify one, is wherever the camera is located.
    extrovert.fiatLux( opts.lights );
  }

  /**
  Initialize keyboard and mouse controls for the scene. Right now this is a bit
  of a formality.
  @method initControls
  */
  function initControls( opts, eng ) {
    eng.controls = my.createControls( opts.controls, eng.camera, eng.renderer.domElement );
    return eng.controls;
  }

  /**
  Initialize the renderer, which can either be a WebGL renderer (the default)
  or a Canvas renderer (good for fallbacks).
  @method initRenderer
  */
  function initRenderer( opts ) {

    if( eng.target ) {
      var cont = (typeof eng.target === 'string') ?
        _utils.$( eng.target ): eng.target;
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

    my.LOGGING && _log.msg("Creating '%s' renderer with size %d x %d.", rendName, eng.width, eng.height);

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
  @method initCanvas
  */
  function initCanvas( opts ) {
    if( eng.target ) {
      var action = opts.action || 'append';
      var target_container = (typeof eng.target === 'string') ?
        _utils.$( eng.target ) : eng.target;
      if( target_container.length !== undefined ) target_container = target_container[0];

      if( action === 'replace' ) {
        while (target_container.firstChild) { //http://stackoverflow.com/a/3955238
          target_container.removeChild(target_container.firstChild);
        }
      }

      if ( action !== 'replaceWith' ) {
        target_container.appendChild( eng.renderer.domElement );
      } else {
        target_container.parentNode.insertBefore( eng.renderer.domElement, target_container );
        target_container.parentNode.removeChild( target_container );
      }
    }
  }

  /**
  Create a mesh object from a generic description. Currently only supports box
  and plane meshes; add others as necessary.
  @method createObject
  */
  my.createObject = function( desc ) {
    my.LOGGING && _log.msg('Creating object %o at [%f,%f,%f].', desc, desc.pos[0], desc.pos[1], desc.pos[2] );
    var mesh = my.provider.createObject( desc );
    eng.scene.add( mesh );
    eng.objects.push( mesh );
    mesh.updateMatrix();
    mesh.updateMatrixWorld();
    return mesh;
  };

  /**
  Create a mouse/keyboard control type from a generic description. Extrovert
  supports several control schemes, some of which are loosely based on control
  examples from THREE.js.
  @method createControls
  */
  my.createControls = function( control_opts, camera, domElement ) {
    if( control_opts.type === 'universal' ) {
      return new extrovert.UniversalControls( camera, undefined, control_opts );
    }
    return null;
  };

  /**
  Initialize the top-level Scene object. Currently this will either be a THREE.Scene
  object or, if physics is enabled, a Physijs.Scene object.
  @method createScene
  */
  my.createScene = function( scene_opts ) {
    eng.scene = scene_opts.physics.enabled ? new Physijs.Scene() : new THREE.Scene();
    return eng.scene;
  };

  /**
  Create predefined scene objects, meaning custom objects that are placed in the
  scene via options, by either the user or the generator.
  @method createScenePrimitives
  */
  function createScenePrimitives( scene, scene_opts ) {
    if( scene_opts.scene && scene_opts.scene.items ) {
      for(var i = 0; i < scene_opts.scene.items.length; i++) {
        var mesh = my.createObject( scene_opts.scene.items[ i ] );
        scene.add( mesh );
      }
    }
  }

  /**
  Initialize the physics system.
  @method initPhysics
  */
  function initPhysics( opts ) {
    if( opts.physics.enabled ) {
      eng.gravity.set( opts.gravity[0], opts.gravity[1], opts.gravity[2] );
      eng.scene.setGravity( eng.gravity );
      eng.scene.addEventListener('update', update);
    }
  }

  /**
  Set up event handlers and emitters.
  @method initEvents
  */
  function initEvents() {
    // Register Extrovert-specific events
    _utils.registerEvent('extro.objectClick');

    // Subscribe to standard events
    eng.renderer.domElement.addEventListener( 'mousedown', onMouseDown, false );
    eng.renderer.domElement.addEventListener( 'mouseup', onMouseUp, false );
    eng.renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );
    /*eng.renderer.domElement.*/document.addEventListener( 'keydown', onKeyDown, false );
    /*eng.renderer.domElement.*/document.addEventListener( 'keyup', onKeyUp, false );
    eng.renderer.domElement.addEventListener( 'wheel', onMouseWheel, false );
    window.addEventListener( 'resize', window_resize, false );
  }

  /**
  Initialize the scene timer. TODO: Improve simulation timing and structure.
  TODO: integrate with Three.Clock() and eng.clock.
  @method initTimer
  */
  function initTimer() {
    eng.start_time = eng.last_time = Date.now() / 1000.0;
  }

  /**
  Create a physical representation of the user's identity. For now this is just
  an invisible box or capsule that can be collided with.
  @method initAvatar
  */
  function initAvatar( avOpts ) {
    if( avOpts && avOpts.enabled ) {
      var avatar = my.createObject( avOpts );
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

    _opts.onload && _opts.onload(); // Fire the 'onload' event
    animate();
  }

  /**
  Request animation of the scene. Called directly only once, at the start of the
  simulation. Thereafter, called whenever requestAnimationFrame decides.
  @method animate
  */
  function animate() {
    requestAnimFrame( animate );
    render();
  }

  /**
  Update the scene physics. Only called when physics are enabled.
  @method update
  */
  function update() {
    eng.scene.simulate();
  }

  /**
  Render the scene.
  @method render
  */
  function render() {

    // Update physics and controls
    _opts.physics.enabled && update();
    eng.controls && eng.controls.enabled && eng.controls.update( eng.clock.getDelta() );

    // Housekeeping for Phyijs's __dirtyPosition flag. Refactor this.
    if( !_opts.move_with_physics ) {
       // Maintain the __dirtyPosition flag while dragging and after touching
      if( eng.selected !== null ) {
        eng.selected.__dirtyPosition = true;
      }
      for ( var i = 0, l = eng.objects.length; i < l; i ++ ) {
        if( eng.objects[ i ].has_been_touched ) {
          eng.objects[ i ].__dirtyPosition = true;
        }
      }
    }

    // Render everything
    eng.renderer.clear();
    eng.css_renderer && eng.css_renderer.render( eng.css_scene, eng.camera );
    eng.renderer.render( eng.scene, eng.camera );
  }

  /**
  Create one or more lights from a generic description. Supports ambient, point,
  spotlight, and hemisphere lighting. Add additional types as necessary.
  @method fiatLux
  @param light_opts A valid object representing a light.
  */
  my.fiatLux = function( light_opts ) {

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
        new_light = createSpotlight( val );
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
  @method createSpotlight
  */
  function createSpotlight( light ) {
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
  @method screenToWorld
  */
  my.screenToWorld = function( posX, posY, placement_plane ) {
    eng.raycaster.setFromCamera( extrovert.toNDC( posX, posY, 0.5, new THREE.Vector2() ), eng.camera );
    var p = placement_plane || eng.placement_plane;
    var intersects = eng.raycaster.intersectObject( p );
    return (intersects.length > 0) ? intersects[0].point : null;
  };

  /**
  Calculate the position, in world coordinates, of the specified (x,y) screen
  location, at whatever point it intersects with the placement_plane.
  @method screenToWorldEx
  */
  my.screenToWorldEx = function( posX, posY, placement_plane, extents ) {
    eng.raycaster.setFromCamera( extrovert.toNDCEx( [posX, posY, 0.5], new THREE.Vector2(), extents ), eng.camera );
    var p = placement_plane || eng.placement_plane;
    var intersects = eng.raycaster.intersectObject( p );
    return (intersects.length > 0) ? intersects[0].point : null;
  };

  /**
  Calculate the position, in world coordinates, of the specified (x,y) screen
  location, at whatever point it intersects with the placement_plane.
  @method ndcToWorld
  */
  my.ndcToWorld = function( pos, placement_plane ) {
    var temp = new THREE.Vector3(pos[0], pos[1], pos[2]);
    eng.raycaster.setFromCamera( temp, eng.camera );
    var p = placement_plane || eng.placement_plane;
    var intersects = eng.raycaster.intersectObject( p );
    return (intersects.length > 0) ?
      [ intersects[0].point.x, intersects[0].point.y, intersects[0].point.z ]
      : null;
  };

  /**
  Calculate the position, in world coordinates, of the specified (x,y) screen
  location, at the specified Z. Currently broken.
  @method screenToWorld2
  */
  // my.screenToWorld2 = function( posX, posY, unused ) {
    // var vector = new THREE.Vector3();
    // vector = extrovert.toNDC( posX, posY, 0.5, vector );
    // vector.unproject( eng.camera );
    // var dir = vector.sub( eng.camera.position ).normalize();
    // var distance = -eng.camera.position.z / dir.z;
    // var pos = eng.camera.position.clone().add( dir.multiplyScalar( distance ) );
  // };

  /**
  Apply a force to an object at a specific point. If physics is disabled, has no
  effect.
  @method applyForce
  */
  function applyForce( thing ) {
    if( _opts.physics.enabled ) {
      var rotation_matrix = new THREE.Matrix4().extractRotation( thing.object.matrix );
      var effect = thing.face.normal.clone().negate().multiplyScalar( _opts.clickForce ).applyMatrix4( rotation_matrix );
      var force_offset = thing.point.clone().sub( thing.object.position );
      thing.object.applyImpulse( effect, force_offset );
    }
  }

  /**
  Handle the 'mousedown' event.
  @method onMouseDown
  */
  function onMouseDown( e ) {

    e.preventDefault();

    // Get the (x,y) mouse coordinates relative to the container
    var xpos = e.offsetX === undefined ? e.layerX : e.offsetX; //[1]
    var ypos = e.offsetY === undefined ? e.layerY : e.offsetY;

    // Convert to normalized device coordinates
    eng.mouse = extrovert.toNDC( xpos, ypos, 0.5, eng.mouse );

    // Set up our ray depending on whether the camera is the child of a
    // transformed object or not.
    if ( !_opts.avatar ) {
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

      // Fire the 'objectClicked' event/callback if an actual object was clicked
      // and short circuit processing if the handler returns false.
      if( _opts.objectClicked && false === _opts.objectClicked( e, intersects ))
        return;

      if( e.ctrlKey ) {
        eng.selected = intersects[ 0 ].object;
        eng.selected.has_been_touched = true;
        eng.drag_plane.position.copy( eng.selected.position );
        eng.offset.copy( intersects[ 0 ].point ).sub( eng.selected.position );
        if( _opts.physics.enabled ) {
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
        applyForce( intersects[0] ); // [4]
      }
    }

    _opts.clicked && _opts.clicked( e, eng.selected );

    // Pass the click to the controller
    if( eng.controls && eng.controls.enabled ) {
      eng.controls.mousedown( e );
    }
  }

  /**
  Handle the 'mousemove' event. TODO: physics integration.
  @method onMouseMove
  */
  function onMouseMove( e ) {
    if( eng.controls && eng.controls.enabled ) {
      eng.controls.mousemove( e );
      return;
    }

    e.preventDefault();
    var xpos = e.offsetX === undefined ? e.layerX : e.offsetX; //[1]
    var ypos = e.offsetY === undefined ? e.layerY : e.offsetY;
    eng.mouse = extrovert.toNDC( xpos, ypos, 0.5, eng.mouse );
    if ( eng.selected ) {
      eng.raycaster.setFromCamera( eng.mouse, eng.camera );
      var intersects = eng.raycaster.intersectObject( eng.drag_plane );
      if( _opts.move_with_physics ) {
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
  @method onMouseUp
  */
  function onMouseUp( e ) {
    if( eng.controls && eng.controls.enabled ) {
      eng.controls.mouseup( e );
      return;
    }
    e.preventDefault();
    if( eng.selected && _opts.physics.enabled ) {
      if( _opts.physics.enabled ) {
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
  Retrieve 3D position info for a specific HTML DOM element.
  @method getPosition
  @param val Any DOM element.
  @param container A DOM element or CSS selector for the container element.
  @param zDepth The depth of the HTML element in world units.
  */
  my.getPosition = function( val, container, zDepth ) {

    // Safely get the position of the HTML element [1] relative to its parent
    var src_cont = (typeof container === 'string') ?
      _utils.$( container ) : container;
    if(src_cont.length !== undefined) src_cont = src_cont[0];
    var parent_pos = _utils.offset( src_cont );
    var child_pos = _utils.offset( val );
    var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

    // Get the position of the element's left-top and right-bottom corners in
    // WORLD coords, based on where the camera is.
    var topLeft = extrovert.screenToWorld( pos.left, pos.top, eng.placement_plane );
    var botRight = extrovert.screenToWorld( pos.left + val.offsetWidth, pos.top + val.offsetHeight, eng.placement_plane );
    // Calculate dimensions of the element (in world units)
    var block_width = Math.abs( botRight.x - topLeft.x );
    var block_height = Math.abs( topLeft.y - botRight.y );

    if(zDepth === 'width')
      zDepth = block_width;
    else if (zDepth === 'height')
      zDepth = block_height;

    var block_depth = zDepth || Math.abs( topLeft.z - botRight.z ) || 1.0;

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
  Retrieve 3D position info for a specific HTML DOM element.
  @method getPositionDirect
  @param val Any DOM element.
  @param container A DOM element or CSS selector for the container element.
  @param zDepth The depth of the HTML element in world units.
  */
  my.getPositionDirect = function( val, container, zDepth, forceZ ) {

    // Safely get the position of the HTML element [1] relative to its parent
    var src_cont = (typeof container === 'string') ?
      _utils.$( container ) : container;
    if(src_cont.length !== undefined) src_cont = src_cont[0];
    var parent_pos = _utils.offset( src_cont );
    var child_pos = _utils.offset( val );
    var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

    // Get the position of the element's left-top and right-bottom corners
    var topLeft = { x: pos.left, y: pos.top, z: forceZ || 0.0 };
    var botRight = { x: pos.left + val.offsetWidth, y: pos.top + val.offsetHeight, z: forceZ || 0.0 };
    // Calculate dimensions of the element (in world units)
    var block_width = Math.abs( botRight.x - topLeft.x );
    var block_height = Math.abs( topLeft.y - botRight.y );
    // Adjust depth based on options
    if(zDepth === 'width')
      zDepth = block_width;
    else if (zDepth === 'height')
      zDepth = block_height;
    var block_depth = zDepth || Math.abs( topLeft.z - botRight.z ) || 1.0;

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
  @method createPlacementPlane
  */
  my.createPlacementPlane = function( pos, dims ) {
    dims = dims || [200000,200000,1];
    var geo = new THREE.BoxGeometry(dims[0], dims[1], dims[2]);
    eng.placement_plane = _opts.physics.enabled ?
      new Physijs.BoxMesh( geo, new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ), 0 ) :
      new THREE.Mesh( geo, new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ));
    eng.placement_plane.visible = false;
    pos && eng.placement_plane.position.set( pos[0], pos[1], pos[2] );
    // TODO: Figure out which update calls are necessary
    eng.scene.updateMatrix();
    eng.placement_plane.updateMatrix();
    eng.placement_plane.updateMatrixWorld();
    my.LOGGING && _log.msg('Created placement plane at [%o]: %o', eng.placement_plane.position, eng.placement_plane);
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
  Load an image as a texture. Defers to THREE for now.
  @method loadTexture
  */
  my.loadTexture = function( src ) {
    return THREE.ImageUtils.loadTexture( src );
  };

  /**
  Convert the specified screen coordinates to normalized device coordinates
  (NDC) ranging from -1.0 to 1.0 along each axis.
  @method toNDC
  */
  my.toNDC = function( posX, posY, posZ, coords ) {
    coords.x = ( posX / eng.width ) * 2 - 1;
    coords.y = - ( posY / eng.height ) * 2 + 1;
    coords.z = posZ;
    return coords;
  };

  /**
  Convert the specified screen coordinates to normalized device coordinates
  (NDC) ranging from -1.0 to 1.0 along each axis.
  @method toNDCEx
  */
  my.toNDCEx = function( pos, coords, extents ) {
    coords.x = ( pos[0] / (extents.width || eng.width) ) * 2 - 1;
    coords.y = - ( pos[1] / (extents.height || eng.height) ) * 2 + 1;
    coords.z = pos[2];
    return coords;
  };

  /**
  Module return.
  */
  return my;

}));

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
