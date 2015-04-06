/**
An Extrovert.js generator for a floating scene.
@module gen-float.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, THREE, EXTRO) {

  EXTRO.float = function() {

    var _opts = null, _eng = null;

    return {
      init: function( merged_options, eng ) {
        _opts = merged_options;
        _eng = eng;
        var frustum_planes = EXTRO.Utils.calcFrustum( _eng.camera );
        merged_options.scene.items[0].dims[0] = frustum_planes.farPlane.topRight.x - frustum_planes.farPlane.topLeft.x;
        merged_options.scene.items[0].dims[2] = frustum_planes.farPlane.topRight.y - frustum_planes.farPlane.botRight.y;
        EXTRO.create_placement_plane( [0,200,0], [200000,1,200000] );
      },
      transform: function( val ) {

        var posInfo = EXTRO.get_position( val, _opts, _eng );
        posInfo.pos[1] += (posInfo.height / 2);
        posInfo.height = _opts.block.depth;
        posInfo.pos[1] -= posInfo.height / 2;
        posInfo.pos[2] += posInfo.depth;
        return posInfo;

        // Get the position of the HTML element [1]
        // var src_cont = (typeof _opts.src.container === 'string') ?
          // EXTRO.Utils.$( _opts.src.container ) : _opts.src.container;
        // if(src_cont.length !== undefined) src_cont = src_cont[0];
        // var parent_pos = EXTRO.Utils.offset( src_cont );
        // var child_pos = EXTRO.Utils.offset( val );
        // var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };
        // // Get the position in world coords relative to camera
        // var topLeft = EXTRO.calc_position( pos.left, pos.top, _eng.placement_plane );
        // var botRight = EXTRO.calc_position( pos.left + val.offsetWidth, pos.top + val.offsetHeight, _eng.placement_plane );

        // // These return the topLeft and bottomRight coordinates of the MAIN FACE of the thing in WORLD coords

        // var block_width = Math.abs( botRight.x - topLeft.x );
        // var block_height = _opts.block.depth;
        // var block_depth = Math.abs( topLeft.z - botRight.z );

        // // Offset by the half-height/width so the corners line up
        // return {
          // pos: [
             // topLeft.x + (block_width / 2),
             // topLeft.y - (block_height / 2),
             // topLeft.z + (block_depth / 2) ],
          // width: block_width,
          // height: block_height,
          // depth: block_depth
        // };
      },
      rasterize: function( obj ) {
        var texture = _eng.rasterizer.paint( obj, _opts );
        var material = (!_opts.physics.enabled || !_opts.physics.materials) ?
          texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
        return new THREE.MeshFaceMaterial([ material, material, material, material, material, material ]);
      },
      generate: function( obj ) {
        var pos_info = this.transform( obj );
        var mat_info = this.rasterize( obj );
        var mesh = EXTRO.create_object({ type: 'box', pos: pos_info.pos, dims: [pos_info.width, pos_info.height, pos_info.depth], mat: mat_info, mass: 1000 });
        if( _opts.generator.lookat )
          mesh.lookAt( new THREE.Vector3( _opts.generator.lookat[0], _opts.generator.lookat[1], _opts.generator.lookat[2]) );
        return mesh;
      },
      options: {
        generator: {
          name: 'float',
          material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
        },
        scene: { items: [ { type: 'box', pos: [0,150,0], dims: [-1,10,-1], mass: 0 } ] },
        camera: {
          position: [0,300,200],
          rotation: [-(Math.PI / 4),0,0]
        },
        block: { depth: 100 },
        lights: [
          { type: 'point', color: 0xffffff, intensity: 1, distance: 10000 },
          { type: 'point', color: 0xffffff, intensity: 0.25, distance: 1000, pos: [0,300,0] },
        ]
      },
      init_cam_opts: {
        position: [0,400,0],
        lookat: [0,0,0],
        up: [0,0,-1]
      }
    };
  };

}(window, THREE, EXTRO));
