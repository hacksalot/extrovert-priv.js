/**
An Extrovert.js generator for a 3D image gallery.
@module gen-gallery.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, THREE, EXTRO) {

  EXTRO.gallery = function() {

    var _opts = null;
    var _eng = null;
    var _side_mat = null;

    return {

      init: function( merged_options, eng ) {
        _opts = merged_options;
        _eng = eng;
        EXTRO.create_placement_plane( [0,0,200] );
        _side_mat = EXTRO.createMaterial( _opts.generator.material );
      },

      transform: function( obj ) {
        return EXTRO.get_position( obj, _opts, _eng );
      },

      rasterize: function( obj ) {
        var texture = _eng.rasterizer.paint( obj, _opts );
        var material = EXTRO.createMaterial({ tex: texture, friction: 0.2, restitution: 1.0 });
        return new THREE.MeshFaceMaterial([ _side_mat, _side_mat, _side_mat, _side_mat, material, material ]);
      },

      generate: function( obj ) {
        var pos_info = this.transform( obj );
        var mat_info = this.rasterize( obj );
        var mesh = EXTRO.create_object({ type: 'box', pos: pos_info.pos, dims: [pos_info.width, pos_info.height, pos_info.depth], mat: mat_info, mass: 1000 });
        if( _opts.generator.lookat ) {
          mesh.lookAt( new THREE.Vector3( _opts.generator.lookat[0], _opts.generator.lookat[1], _opts.generator.lookat[2]) );
        }
        return mesh;
      },

      options: {
        generator: {
          name: 'gallery',
          material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
        },
        camera: { position: [0,0,3200], far: 10000 },
        lights: [
          //{ type: 'point', color: 0xffffff, intensity: 1, distance: 10000, pos: [0,0,3200] },
          //{ type: 'point', color: 0xffffff, intensity: 0.25, distance: 1000, pos: [0,0,300] },
          { type: 'ambient', color: 0xffffff }
        ],
        block: { depth: 20 }
      },

      init_cam_opts: { position: [0,0,800] }
    };
  };

}(window, THREE, EXTRO));
