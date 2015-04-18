/**
The built-in extrusion generator for Extrovert.js.
@module gen-wall.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, EXTRO) {

  EXTRO.extrude = function() {

    var _opts, _eng, _side_mat, _noun;

    return {

      options: {
        name: 'extrude',
        material: { color: 0xFF8844, friction: 0.2, restitution: 1.0 },
        block: { depth: 'height' }
      },

      init: function( merged_options, eng ) {
        _opts = merged_options;
        _eng = eng;
        _side_mat = EXTRO.createMaterial( merged_options.material );
        EXTRO.createPlacementPlane( [0,0,200] );
      },

      transform: function( obj ) {
        var posInfo = EXTRO.getPosition( obj, _noun.container, _eng );
        if(!_opts.block.depth)
          posInfo.depth = posInfo.height;
        else if( _opts.block.depth === 'height' )
          posInfo.depth = posInfo.height;
        else if (_opts.block.depth === 'width' )
          posInfo.depth = posInfo.width;
        else if (_opts.block.depth > 0)
          posInfo.depth = _opts.block.depth;
        return posInfo;
      },

      rasterize: function( obj ) {
        var rast = null;
        if( _noun.rasterizer ) {
          rast = ( typeof _noun.rasterizer === 'string' ) ?
            new EXTRO['paint_' + _noun.rasterizer]() : _noun.rasterizer;
        }
        rast = rast || EXTRO.getRasterizer( obj );

        var tileTexture = rast.paint(( _noun.adapt && _noun.adapt(obj) ) || obj );
        var material = EXTRO.createMaterial({ tex: tileTexture, friction: 0.2, restitution: 1.0 });
        var matArray;
        if( !_opts.block.depth || _opts.block.depth === 'height' )
          matArray = [ _side_mat, _side_mat, material, material, material, material ];
        else if (_opts.block.depth === 'width' )
          matArray = [ material, material, _side_mat, _side_mat, material, material ];
        else
          matArray = [ _side_mat, _side_mat, _side_mat, _side_mat, material, material ];

        return EXTRO.createCubeMaterial( matArray );
      },

      generate: function( noun, elems ) {
        _noun = noun;
        for( var i = 0; i < elems.length; i++ ) {
          var obj = elems[ i ];
          var pos_info = this.transform( obj );
          var mat_info = this.rasterize( obj );
          EXTRO.createObject({ type: 'box', pos: pos_info.pos, dims: [pos_info.width, pos_info.height, pos_info.depth], mat: mat_info, mass: 1000 });
        }
      }

    };
  };

}(window, EXTRO));
