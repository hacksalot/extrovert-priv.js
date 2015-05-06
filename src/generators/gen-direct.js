/**
The built-in passthrough generator for Extrovert.js.
@module gen-direct.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, extro) {

  extro.direct = function() {

    var _opts, _eng, _side_mat, _noun;

    return {

      options: {
        name: 'direct',
        material: { color: 0xFF8844, friction: 0.2, restitution: 1.0 },
        block: { depth: 10 },
        map: 'fit'
      },

      init: function( genOpts, eng ) {
        _opts = genOpts;
        _eng = eng;
        _side_mat = extro.provider.createMaterial( genOpts.material );
        extro.createPlacementPlane( [ 0,0,0 ] );
      },

      generate: function( noun, elems ) {
        _noun = noun;
        for( var i = 0; i < elems.length; i++ ) {
          var obj = elems[ i ];
          var pos_info = this.transform( obj );
          var mat_info = this.rasterize( obj );
          extro.createObject({ type: 'box', pos: pos_info.pos, dims: [pos_info.width, pos_info.height, pos_info.depth], mat: mat_info, mass: 1000 });
        }
      },

      transform: function( obj ) {
        var cont = _noun.container || (_eng.opts.src && _eng.opts.src.container) || document.body;
        return extro.getPositionDirect( obj, cont, _opts.block.depth, 0 );
      },

      rasterize: function( obj ) {
        var rast = null;
        if( _noun.rasterizer ) {
          rast = ( typeof _noun.rasterizer === 'string' ) ?
            new extro['paint_' + _noun.rasterizer]() : _noun.rasterizer;
        }
        rast = rast || extro.getRasterizer( obj );
        var tileTexture = rast.paint(( _noun.adapt && _noun.adapt(obj) ) || obj );

        var material = extro.provider.createMaterial({ tex: tileTexture, friction: 0.2, restitution: 0.0 });

        if( !_opts.map || _opts.map === 'all' ) {
          return material;
        }

        var matArray;
        if( _opts.map == 'fit' ) {
          if( !_opts.block.depth || _opts.block.depth === 'height' )
            matArray = [ _side_mat, _side_mat, material, material, material, material ];
          else if (_opts.block.depth === 'width' )
            matArray = [ material, material, _side_mat, _side_mat, material, material ];
          else
            matArray = [ _side_mat, _side_mat, _side_mat, _side_mat, material, material ];
        }

        return extro.provider.createCubeMaterial( matArray );
      }

    };
  };

}(window, extrovert));