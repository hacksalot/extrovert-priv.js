/**
An Extrovert.js generator for HTML rendering.
@module gen-page.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, THREE, EXTROVERT) {

  EXTROVERT.page = function() {

    var _opts = null;
    var _eng = null;
    var _side_mat = null;

    return {

      init: function( merged_options, eng ) {
        _opts = merged_options;
        _eng = eng;
        EXTROVERT.create_placement_plane( [0,0,200] );
        var mat = new THREE.MeshLambertMaterial({ color: _opts.generator.material.color });
        _side_mat = _opts.physics.enabled ?
          Physijs.createMaterial( mat, _opts.generator.material.friction, _opts.generator.material.restitution ) : mat;
      },

      transform: function( obj ) {
        return EXTROVERT.get_position( obj, _opts, _eng );
      },

      rasterize: function( obj ) {
        var texture = _eng.rasterizer.paint( obj, _opts );
        var material = (!_opts.physics.enabled || !_opts.physics.materials) ?
          texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
        return new THREE.MeshFaceMaterial([ _side_mat, _side_mat, _side_mat, _side_mat, material, material ]);
      },

      generate: function( obj ) {
        var pos_info = this.transform( obj );
        var mat_info = this.rasterize( obj );
        var mesh = EXTROVERT.create_object({ type: 'box', pos: pos_info.pos, dims: [pos_info.width, pos_info.height, pos_info.depth], mat: mat_info, mass: 1000 });
        if( _opts.generator.lookat )
          mesh.lookAt( new THREE.Vector3( _opts.generator.lookat[0], _opts.generator.lookat[1], _opts.generator.lookat[2]) );
        return mesh;
      },

      options: {
        generator: {
          name: 'page',
          material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
        },
        camera: { position: [0,0,800] },
        block: { depth: 100 }
      }
    };
  };

  function a() {
    // create a new scene to hold CSS
    cssScene = new THREE.Scene();
    // create the iframe to contain webpage
    var element	= document.createElement('iframe');
    // webpage to be loaded into iframe
    element.src	= "index.html";
    // width of iframe in pixels
    var elementWidth = 1024;
    // force iframe to have same relative dimensions as planeGeometry
    var aspectRatio = planeHeight / planeWidth;
    var elementHeight = elementWidth * aspectRatio;
    element.style.width  = elementWidth + "px";
    element.style.height = elementHeight + "px";

    // create a CSS3DObject to display element
    var cssObject = new THREE.CSS3DObject( element );
    // synchronize cssObject position/rotation with planeMesh position/rotation
    cssObject.position = planeMesh.position;
    cssObject.rotation = planeMesh.rotation;
    // resize cssObject to same size as planeMesh (plus a border)
    var percentBorder = 0.05;
    cssObject.scale.x /= (1 + percentBorder) * (elementWidth / planeWidth);
    cssObject.scale.y /= (1 + percentBorder) * (elementWidth / planeWidth);
    cssScene.add(cssObject);

    // create a renderer for CSS
    rendererCSS	= new THREE.CSS3DRenderer();
    rendererCSS.setSize( window.innerWidth, window.innerHeight );
    rendererCSS.domElement.style.position = 'absolute';
    rendererCSS.domElement.style.top	  = 0;
    rendererCSS.domElement.style.margin	  = 0;
    rendererCSS.domElement.style.padding  = 0;
    document.body.appendChild( rendererCSS.domElement );
    // when window resizes, also resize this renderer
    THREEx.WindowResize(rendererCSS, camera);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top      = 0;
    // make sure original renderer appears on top of CSS renderer
    renderer.domElement.style.zIndex   = 1;
    rendererCSS.domElement.appendChild( renderer.domElement );
  }

}(window, THREE, EXTROVERT));
