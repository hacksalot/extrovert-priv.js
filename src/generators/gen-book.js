/**
A "book" generator for Extrovert.js.
@module gen-book.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, extro) {

  extro.book = function() {



    var _opts = null;
    var _eng = null;
    var _side_mat = null;
    var _noun = null;
    var LOGGING = true;



    
    /**
    Adjust textures for simple mode to allow continuation of the texture around
    the sides of the cube/object.
    @method patch_textures
    */
    function patchTextures( cubeGeo ) {

      for (i = 0; i < cubeGeo.faces.length ; i++) {
         var face = cubeGeo.faces[ i ];
         var fvu = cubeGeo.faceVertexUvs[0][i];
         // Quick kludge for textures on non-front faces. Replace with correct
         // mapping, wrapping, or dedicated textures.
         if( Math.abs( face.normal.z ) > 0.9) {
            for( var fv = 0; fv < 3; fv++ ) {
              if( Math.abs( fvu[fv].y ) < 0.01 ) {
                fvu[ fv ].y = 0.37;
              }
            }
         }
      }
      cubeGeo.uvsNeedUpdate = true;
    }



    return {



      options: {
        name: 'book',
        material: { color: 0xFF8844, friction: 0.2, restitution: 1.0 },
        block: { depth: 'height' },
        clickForce: 900000,
        rows: 10, cols: 10,
        dims: [512, 814, 20], // Std paperback = 4.25 x 6.75
        pagify: true,
        cover: null
      },



      init: function( genOpts, eng ) {
        _opts = genOpts;
        _eng = eng;
        extro.createPlacementPlane( [0,0,200] );
        _side_mat = extro.createMaterial( genOpts.material );
      },



      generate: function( noun, elems ) {

        LOGGING && _eng.log.msg('book.generate( %o, %o )', noun, elems);
        _noun = noun;

        for( var i = 0; i < elems.length; i++ ) {

          var obj = elems[ i ];
          var rast = null;

          if( noun.rasterizer ) {
            if( typeof noun.rasterizer === 'string' )
              rast = new extro['paint_' + noun.rasterizer]();
            else
              rast = noun.rasterizer;
          }
          else {
            rast = new extro.paint_plain_text_stream();
            //rast = extro.getRasterizer( obj );
          }

          if( _opts.pagify ) {
            var done = false;
            var info = { };

            var tileTextures = rast.paint(( noun.adapt && noun.adapt(obj) ) || obj,
              { width: 512, // Force power-of-2 textures
                height: 1024,
                bkColor: _opts.bkColor,
                textColor: _opts.textColor }, info );

            for( tt = 0; tt < tileTextures.length; tt++ ) {

              var tilePos = [0, 0, -(tt * _opts.dims[2]) ];
              var tileMat = extro.createMaterial({ tex: tileTextures[tt], friction: 0.2, restitution: 1.0 });
              var mesh = extro.createObject({ type: 'box', pos: tilePos, dims: this.options.dims, mat: tileMat, mass: 1000 });
              patchTextures( mesh.geometry );
           
              
              LOGGING && _eng.log.msg('Generating page %o at position %f, %f, %f', mesh, tilePos[0], tilePos[1], tilePos[2]);

            }
          }
        }
      }



    };
  };

}(window, extrovert));
