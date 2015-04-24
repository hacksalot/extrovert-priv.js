/**
The built-in tile generator for Extrovert.js.
@module gen-tile.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, extro) {

  extro.tile = function() {

    var _opts = null;
    var _eng = null;
    var _side_mat = null;
    var _noun = null;

    return {

      options: {
        name: 'tile',
        material: { color: 0xFF8844, friction: 0.2, restitution: 1.0 },
        block: { depth: 'height' },
        click_force: 900000,
        rows: 10,
        cols: 10,
        dims: [250, 100, 2]
      },

      init: function( genOpts, eng ) {
        _opts = genOpts;
        _eng = eng;
        extro.createPlacementPlane( [0,0,200] );
        _side_mat = extro.createMaterial( genOpts.material );
      },

      generate: function( noun, elems ) {
        _noun = noun;
        for( var i = 0; i < elems.length; i++ ) {
          var obj = elems[ i ];
          var row = i / _opts.cols;
          var col = i % _opts.cols;
          var tilePos = [ col * _opts.dims[0], row * _opts.dims[1], 0 ];
          var rast = null;
          if( noun.rasterizer ) {
            if( typeof noun.rasterizer === 'string' )
              rast = new extro['paint_' + noun.rasterizer]();
            else
              rast = noun.rasterizer;
          }
          else {
            rast = extro.getRasterizer( obj );
          }
          var tileTexture = rast.paint(( noun.adapt && noun.adapt(obj) ) || obj, { width: _opts.dims[0], height: _opts.dims[1] } );
          var tileMat = extro.createMaterial({ tex: tileTexture, friction: 0.2, restitution: 1.0 });
          extro.createObject({ type: 'box', pos: tilePos, dims: this.options.dims, mat: tileMat, mass: 1000 });
        }
      }

    };
  };

}(window, extro));
