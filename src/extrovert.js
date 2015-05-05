/**!
Extrovert.js is a 3D front-end for websites, blogs, and web-based apps.
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@version 1.0
*/

(function (root, factory) {

  if (typeof define === 'function' && define.amd) {
    define(['b'], function (b) {
        return (root.extrovert = factory(b));
    });

  } else if (typeof exports === 'object') {
    module.exports = factory(require('b'));

  } else {
    root.extrovert = factory(root.b);

  }

}(this, function (b) {



  
  var my = { version: '0.1.0' };



  
  var defaults = {
    renderer: 'Any',
    gravity: [0,0,0],
    camera: {
      fov: 35,
      near: 1,
      far: 10000,
      position: [0,0,200]
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
    ]
  };



  
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



  
  var _opts = null;



  
  var _utils = null;



  
  var _log = null;



  
  my.LOGGING = true;



  
  my.init = function( target, options ) {

    _utils = extrovert.Utils;
    _log = eng.log = _utils.log;
    options = options || { };
    my.LOGGING && _log.msg('Extrovert %s', my.version);
    my.LOGGING && _log.msg('User options: %o', options );
    eng.supportsWebGL = _utils.detectWebGL();
    eng.supportsCanvas = _utils.detectCanvas();
    if( ( !eng.supportsWebGL && !eng.supportsCanvas ) ||
        ( options.renderer === 'WebGL' && !eng.supportsWebGL ) ||
        ( options.renderer === 'Canvas' && !eng.supportsCanvas ))
      return false;
    var ua = window.navigator.userAgent;
    if( ~ua.indexOf('MSIE ') || ~ua.indexOf('Trident/') ) {
      Object.keys(THREE.ShaderLib).forEach(function (key) {
        THREE.ShaderLib[key].fragmentShader =
        THREE.ShaderLib[key].fragmentShader.replace('#extension GL_EXT_frag_depth : enable', '');
      });
    }
    initOptions( target, options );
    initRenderer( _opts );
    initWorld( _opts, eng );
    initCanvas( _opts );
    initPhysics( _opts );
    initControls( _opts, eng );
    initEvents();
    initAvatar( _opts.avatar );
    start();
    return true;
  };



  
  var $ = window.jQuery;
  if( $ ) {
    $.fn.extrovert = function( opts ) {
      return this.each(function() {
        my.init( this, opts );
      });
    };
  }



  
  function initOptions( target, user_opts ) {

    eng.target = target;
    eng.userOpts = user_opts;
    _opts = eng.opts = _utils.extend(true, { }, defaults, user_opts );
    if( _opts.physics.enabled ) {
      Physijs.scripts.worker = _opts.physics.physijs.worker;
      Physijs.scripts.ammo = _opts.physics.physijs.ammo;
    }
    eng.rasterizers = {
      img: new extrovert.paint_img(),
      element: new extrovert.paint_element(),
      plain_text: new extrovert.paint_plain_text()
    };
    return _opts;
  }



  
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



  
  function initGenerator( transformOptions ) {
    var gen = null;
    if( !transformOptions.type )
      gen = new extrovert.extrude();
    else if (typeof transformOptions === 'string')
      gen = new extrovert[ transformOptions ]();
    else
      gen = new extrovert[ transformOptions.type ]();
    var mergedOptions = _utils.extend(true, { }, defaults, gen.options );
    mergedOptions = _utils.extend(true, { }, mergedOptions, eng.userOpts );
    mergedOptions = _utils.extend(true, { }, mergedOptions, transformOptions );
    gen.init && gen.init( mergedOptions, eng );

    return gen;
  }



  
  function initWorld( opts, eng ) {

    extrovert.createScene( opts );

    var ico = opts.init_cam_opts ? _utils.extend(true, {}, opts.camera, opts.init_cam_opts ) : opts.camera;
    extrovert.createCamera( ico );
    if( opts.controls.allow_drag ) {
      eng.drag_plane = extrovert.createObject( {
        type: 'plane',
        dims: [2000,2000,8],
        visible: false,
        color: 0x000000,
        opacity: 0.25,
        transparent: true } );
    }
    createScenePrimitives( eng.scene, opts );
    eng.scene.updateMatrix();
    var tforms = (opts.transform || opts.transforms) ||
      [{ type: 'extrude', src: 'img'/*, container: 'body'*/}];
    tforms = ( !_utils.isArray( tforms ) ) ? [ tforms ] : tforms;

    for( var idx = 0; idx < tforms.length; idx++ ) {
      var trans = tforms[ idx ];
      if( !trans ) continue;
      var src = trans.src || '*';
      var cont = trans.container || (opts.src && opts.src.container) || opts.container || document.body;
      if( typeof cont === 'string' ) {
        cont = _utils.$( cont );
        if(cont.length !== undefined) cont = cont[0];
      }
      var elems = ( typeof src === 'string' ) ?
        cont.querySelectorAll( src ) : src;
      var gen = initGenerator( trans );
      gen.generate( trans, elems );
    }
    var oc = opts.camera;
    oc.rotation && eng.camera.rotation.set( oc.rotation[0], oc.rotation[1], oc.rotation[2], 'YXZ' );
    oc.position && eng.camera.position.set( oc.position[0], oc.position[1], oc.position[2] );
    extrovert.fiatLux( opts.lights );
  }



  
  function initControls( opts, eng ) {
    eng.controls = my.createControls( opts.controls, eng.camera, eng.renderer.domElement );
    return eng.controls;
  }



  
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
    eng.renderer.domElement.setAttribute('tabindex', '0');
    eng.renderer.domElement.style += ' position: relative;';
  }



  
  function initCanvas( opts ) {
    if( eng.target ) {
      var action = opts.action || 'append';
      var target_container = (typeof eng.target === 'string') ?
        _utils.$( eng.target ) : eng.target;
      if( target_container.length !== undefined ) target_container = target_container[0];

      if( action === 'replace' ) {
        while (target_container.firstChild) {
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



  
  my.createControls = function( control_opts, camera, domElement ) {
    if( control_opts.type === 'universal' ) {
      return new extrovert.UniversalControls( camera, undefined, control_opts );
    }
    return null;
  };



  
  my.createCamera = function( copts ) {

    if( copts.type === 'orthographic' ) {
      copts.left = copts.left || eng.width / - 2;
      copts.right = copts.right || eng.width / 2;
      copts.top = copts.top || eng.height / 2;
      copts.bottom = copts.bottom || eng.height / - 2;
    }

    var cam = copts.type != 'orthographic' ?
      new THREE.PerspectiveCamera( copts.fov, eng.width / eng.height, copts.near, copts.far ) :
      new THREE.OrthographicCamera( copts.left, copts.right, copts.top, copts.bottom, copts.near, copts.far );
    eng.camera = cam;
    copts.position && cam.position.set( copts.position[0], copts.position[1], copts.position[2] );
    if( copts.up ) cam.up.set( copts.up[0], copts.up[1], copts.up[2] );
    if( copts.lookat ) cam.lookAt( new THREE.Vector3( copts.lookat[0], copts.lookat[1], copts.lookat[2] ) );
    cam.updateMatrix();
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    my.LOGGING && _log.msg('Created camera at %o: %o', cam.position, cam);
    return cam;
  };



  
  my.createScene = function( scene_opts ) {
    eng.scene = scene_opts.physics.enabled ? new Physijs.Scene() : new THREE.Scene();
    return eng.scene;
  };



  
  function createScenePrimitives( scene, scene_opts ) {
    if( scene_opts.scene && scene_opts.scene.items ) {
      for(var i = 0; i < scene_opts.scene.items.length; i++) {
        var mesh = my.createObject( scene_opts.scene.items[ i ] );
        scene.add( mesh );
      }
    }
  }



  
  my.createMaterial = function( desc ) {

    var mat = new THREE.MeshLambertMaterial({ color: desc.color || 0xFFFFFF, map: desc.tex || null });
    return (_opts.physics.enabled && !desc.noPhysics) ?
      Physijs.createMaterial( mat, desc.friction, desc.restitution )
      : mat;

  };



  
  my.createMaterialFromCanvas = function( canvas, needsUpdate ) {
    var texture = new THREE.Texture( canvas );
    texture.needsUpdate = needsUpdate || false;
    return { tex: texture, mat: new THREE.MeshLambertMaterial( { map: tex } ) };
  };



  
  my.createTextureFromCanvas = function( canvas, needsUpdate ) {
    var texture = new THREE.Texture( canvas );
    texture.needsUpdate = needsUpdate || false;
    return texture;
  };



  
  my.createCubeMaterial = function( faceMaterials ) {
    return new THREE.MeshFaceMaterial( faceMaterials );
  };



  
  my.createObject = function( desc ) {
    my.LOGGING && _log.msg('Creating object: %o', desc);
    var mesh = null, geo = null, mat = null;
    var rgb = desc.color || 0xFFFFFF;
    var opac = desc.opacity || 1.0;
    var trans = desc.transparent || false;
    if( desc.type === 'box' ) {
      geo = new THREE.BoxGeometry( desc.dims[0], desc.dims[1], desc.dims[2] );
      mat = desc.mat || new THREE.MeshLambertMaterial( { color: rgb, opacity: opac, transparent: trans } );
      mesh = createMesh(geo, 'Box', mat, false, desc.mass);
    }
    else if( desc.type === 'plane' ) {
      geo = new THREE.PlaneBufferGeometry( desc.dims[0], desc.dims[1] );
      mat = desc.mat || new THREE.MeshBasicMaterial( { color: rgb, opacity: opac, transparent: trans } );
      mesh = createMesh( geo, null, mat, true, desc.mass );
    }
    if( desc.pos )
      mesh.position.set( desc.pos[0], desc.pos[1], desc.pos[2] );
    if( desc.rot )
      mesh.rotation.set( desc.rot[0], desc.rot[1], desc.rot[2], 'YXZ' );
    if( desc.visible === false )
      mesh.visible = false;
    mesh.castShadow = mesh.receiveShadow = false;

    eng.scene.add( mesh );
    eng.objects.push( mesh );
    mesh.updateMatrix();
    mesh.updateMatrixWorld();

    return mesh;
  };



  
  function createMesh( geo, mesh_type, mat, force_simple, mass ) {
    return _opts.physics.enabled && !force_simple ?
      new Physijs[ mesh_type + 'Mesh' ]( geo, mat, mass ) : new THREE.Mesh(geo, mat);
  }



  
  function initPhysics( opts ) {
    if( opts.physics.enabled ) {
      eng.gravity.set( opts.gravity[0], opts.gravity[1], opts.gravity[2] );
      eng.scene.setGravity( eng.gravity );
      eng.scene.addEventListener('update', update);
    }
  }



  
  function initEvents() {
    eng.renderer.domElement.addEventListener( 'mousedown', onMouseDown, false );
    eng.renderer.domElement.addEventListener( 'mouseup', onMouseUp, false );
    eng.renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );
    /*eng.renderer.domElement.*/document.addEventListener( 'keydown', onKeyDown, false );
    /*eng.renderer.domElement.*/document.addEventListener( 'keyup', onKeyUp, false );
    eng.renderer.domElement.addEventListener( 'wheel', onMouseWheel, false );
    window.addEventListener( 'resize', window_resize, false );
  }



  
  function initTimer() {
    eng.start_time = eng.last_time = Date.now() / 1000.0;
  }



  
  function initAvatar( avOpts ) {
    if( avOpts && avOpts.enabled ) {
      var avatar = my.createObject( avOpts );
      eng.camera.position.set(0,0,0);
      avatar.add( eng.camera );
      eng.scene.add( avatar );
      eng.objects.push( avatar );
    }
  }



  
  function start() {
    window.requestAnimFrame =
      window.requestAnimationFrame       ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      function(/* function */ callback, /* DOMElement */ element){
        window.setTimeout(callback, 1000 / 60);
      };

    _opts.onload && _opts.onload();
    animate();
  }



  
  function animate() {
    requestAnimFrame( animate );
    render();
  }



  
  function update() {
    eng.scene.simulate();
  }



  
  function render() {
    _opts.physics.enabled && update();
    eng.controls && eng.controls.enabled && eng.controls.update( eng.clock.getDelta() );
    if( !_opts.move_with_physics ) {
      if( eng.selected !== null ) {
        eng.selected.__dirtyPosition = true;
      }
      for ( var i = 0, l = eng.objects.length; i < l; i ++ ) {
        if( eng.objects[ i ].has_been_touched ) {
          eng.objects[ i ].__dirtyPosition = true;
        }
      }
    }
    eng.renderer.clear();
    eng.css_renderer && eng.css_renderer.render( eng.css_scene, eng.camera );
    eng.renderer.render( eng.scene, eng.camera );
  }




  
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



  
  function createSpotlight( light ) {
    var spotLight = new THREE.SpotLight( light.color );
    spotLight.shadowCameraVisible = false;
    return spotLight;
  }



  
  my.calcPosition = function( posX, posY, placement_plane ) {
    eng.raycaster.setFromCamera( extrovert.toNDC( posX, posY, 0.5, new THREE.Vector2() ), eng.camera );
    var p = placement_plane || eng.placement_plane;
    var intersects = eng.raycaster.intersectObject( p );
    return (intersects.length > 0) ? intersects[0].point : null;
  };



  
  my.calcPosition2 = function( posX, posY, unused ) {
    var vector = new THREE.Vector3();
    vector = extrovert.toNDC( posX, posY, 0.5, vector );
    vector.unproject( eng.camera );
    var dir = vector.sub( eng.camera.position ).normalize();
    var distance = -eng.camera.position.z / dir.z;
    var pos = eng.camera.position.clone().add( dir.multiplyScalar( distance ) );
  };



  
  function applyForce( thing ) {
    if( _opts.physics.enabled ) {
      var rotation_matrix = new THREE.Matrix4().extractRotation( thing.object.matrix );
      var effect = thing.face.normal.clone().negate().multiplyScalar( _opts.clickForce ).applyMatrix4( rotation_matrix );
      var force_offset = thing.point.clone().sub( thing.object.position );
      thing.object.applyImpulse( effect, force_offset );
    }
  }



  
  function onMouseDown( e ) {

    e.preventDefault();
    var xpos = e.offsetX === undefined ? e.layerX : e.offsetX;
    var ypos = e.offsetY === undefined ? e.layerY : e.offsetY;
    eng.mouse = extrovert.toNDC( xpos, ypos, 0.5, eng.mouse );
    if ( !_opts.avatar ) {
      eng.raycaster.setFromCamera( eng.mouse, eng.camera );
    }
    else {
      var cameraPosition = new THREE.Vector3();
      cameraPosition.setFromMatrixPosition( eng.camera.matrixWorld );
      eng.raycaster.ray.origin.copy( cameraPosition );
      eng.raycaster.ray.direction.set( eng.mouse.x, eng.mouse.y, 0.5 ).unproject( eng.camera ).sub( cameraPosition ).normalize();
    }
    var intersects = eng.raycaster.intersectObjects( eng.objects );
    if( intersects.length !== 0 ) {
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
         applyForce( intersects[0] );
      }
      _opts.clicked && _opts.clicked( e, eng.selected );
    }

    if( eng.controls && eng.controls.enabled ) {
      eng.controls.mousedown( e );
    }
  }



  
  function onMouseMove( e ) {
    if( eng.controls && eng.controls.enabled ) {
      eng.controls.mousemove( e );
      return;
    }

    e.preventDefault();
    var xpos = e.offsetX === undefined ? e.layerX : e.offsetX;
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



  
  function onKeyDown( e ) {
    eng.controls && eng.controls.enabled && eng.controls.keydown( e );
  }



  
  function onKeyUp( e ) {
    eng.controls && eng.controls.enabled && eng.controls.keyup( e );
  }



  
  function onMouseWheel( e ) {
    eng.controls && eng.controls.enabled && eng.controls.mousewheel( e );
  }



  
  my.getPosition = function( val, container, zDepth ) {
    var src_cont = (typeof container === 'string') ?
      _utils.$( container ) : container;
    if(src_cont.length !== undefined) src_cont = src_cont[0];
    var parent_pos = _utils.offset( src_cont );
    var child_pos = _utils.offset( val );
    var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };
    var topLeft = extrovert.calcPosition( pos.left, pos.top, eng.placement_plane );
    var botRight = extrovert.calcPosition( pos.left + val.offsetWidth, pos.top + val.offsetHeight, eng.placement_plane );
    var block_width = Math.abs( botRight.x - topLeft.x );
    var block_height = Math.abs( topLeft.y - botRight.y );

    if(zDepth === 'width')
      zDepth = block_width;
    else if (zDepth === 'height')
      zDepth = block_height;

    var block_depth = zDepth || Math.abs( topLeft.z - botRight.z ) || 1.0;
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



  
  my.createPlacementPlane = function( pos, dims ) {
    dims = dims || [200000,200000,1];
    var geo = new THREE.BoxGeometry(dims[0], dims[1], dims[2]);
    eng.placement_plane = _opts.physics.enabled ?
      new Physijs.BoxMesh( geo, new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ), 0 ) :
      new THREE.Mesh( geo, new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ));
    eng.placement_plane.visible = false;
    pos && eng.placement_plane.position.set( pos[0], pos[1], pos[2] );
    eng.scene.updateMatrix();
    eng.placement_plane.updateMatrix();
    eng.placement_plane.updateMatrixWorld();
    my.LOGGING && _log.msg('Created placement plane at [%o]: %o', eng.placement_plane.position, eng.placement_plane);
    return eng.placement_plane;
  };



  
  function window_resize() {
    var rect = eng.renderer.domElement.parentNode.getBoundingClientRect();
    eng.width = rect.right - rect.left;
    eng.height = rect.bottom - rect.top;
    eng.camera.aspect = eng.width / eng.height;
    eng.camera.updateProjectionMatrix();
    eng.renderer.setSize( eng.width, eng.height );
  }



  
  my.loadTexture = function( src ) {
    return THREE.ImageUtils.loadTexture( src );
  };



  
  my.toNDC = function( posX, posY, posZ, coords ) {
    coords.x = ( posX / eng.width ) * 2 - 1;
    coords.y = - ( posY / eng.height ) * 2 + 1;
    coords.z = posZ;
    return coords;
  };



  
  return my;

}));
