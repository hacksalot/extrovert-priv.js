/**
An Extrovert.js generator that creates a 3D wall or tower.
@module gen-wall.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, EXTRO) {

  EXTRO.wall = function() {

    var _opts = null;
    var _eng = null;
    var _side_mat = null;

    return {

      init: function( merged_options, eng ) {
        _opts = merged_options;
        _eng = eng;
        EXTRO.create_placement_plane( [0,0,200] );
        _side_mat = EXTRO.createMaterial(_opts.generator.material);
      },

      transform: function( obj ) {
        var posInfo = EXTRO.get_position( obj, _opts, _eng );
        posInfo.depth = _opts.block.depth;
        return posInfo;
      },

      rasterize: function( obj ) {
        var texture = _eng.rasterizer.paint( obj, _opts );
        var material = EXTRO.createMaterial({ tex: texture, friction: 0.2, restitution: 1.0 });
        return EXTRO.createCubeMaterial([ _side_mat, _side_mat, _side_mat, _side_mat, material, material ]);
      },

      generate: function( obj ) {
        var pos_info = this.transform( obj );
        var mat_info = this.rasterize( obj );
        return EXTRO.create_object({ type: 'box', pos: pos_info.pos, dims: [pos_info.width, pos_info.height, pos_info.depth], mat: mat_info, mass: 1000 });
      },

      options: {
        generator: {
          name: 'wall',
          material: { color: 0xFF8844, friction: 0.2, restitution: 1.0 }
        },
        gravity: [0,-200,50],
        scene: { items: [ { type: 'box', pos: [0,0,0], dims: [40000,10,40000]/*, rot: [0.35,0,0]*/, mass: 0, color: 0x11cc00 } ] },
        camera: {
          far: 200000,
          position: [0,55,2000],
          rotation: [0.25,0,0]
        },
        controls: { target: [0,-1500, 0] },
        block: { depth: 100 },
        click_force: 900000,
        avatar: {
          enabled: true,
          type: 'box',
          dims: [100,100,100],
          pos: [0,55,2000],
          visible: true,
          color: 0x000000,
          opacity: 0.25,
          transparent: true
        }
      },

      init_cam_opts: { position: [0,2000,800] }
    };
  };

}(window, EXTRO));
