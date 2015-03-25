/**
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
    var cube_geo = new THREE.BoxGeometry( pos_info.width, pos_info.height, pos_info.depth );
    var mesh = opts.physics.enabled ?
      new Physijs.BoxMesh( cube_geo, materials, 1000 ) :
      new THREE.Mesh( cube_geo, materials );
    mesh.position.copy( pos_info.pos );
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
