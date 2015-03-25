/**
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
    var mesh = EXTROVERT.create_object({ type: 'box', dims: [pos_info.width, pos_info.height, pos_info.depth], mass: 1000, mat: materials });
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
