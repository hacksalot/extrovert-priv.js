/**
An Extrovert.js generator for HTML rendering.
@module gen-page.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, THREE, EXTRO) {

  EXTRO.page = function() {

    var _opts = null;
    var _eng = null;
    var _side_mat = null;

    return {

      init: function( merged_options, eng ) {
        _opts = merged_options;
        _eng = eng;
      },

      transform: function( obj ) {

      },

      rasterize: function( obj ) {

      },

      generate: function( obj ) {
        var planeMaterial   = new THREE.MeshBasicMaterial({color: 0x000000, opacity: 0.1, side: THREE.DoubleSide });
        var planeWidth = 360;
        var planeHeight = 120;
        var planeGeometry = new THREE.PlaneGeometry( planeWidth, planeHeight );
        var planeMesh= new THREE.Mesh( planeGeometry, planeMaterial );
        planeMesh.position.y += planeHeight/2;
        // add it to the standard (WebGL) scene
        _eng.scene.add(planeMesh);

        // create a new scene to hold CSS
        cssScene = new THREE.Scene();
        _eng.css_scene = cssScene;
        // create the iframe to contain webpage
        var element	= document.createElement('iframe');
        // webpage to be loaded into iframe
        element.src	= "http://localhost:9000/index.html";
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
        _eng.css_renderer = rendererCSS;
        rendererCSS.setSize( window.innerWidth, window.innerHeight );
        rendererCSS.domElement.style.position = 'absolute';
        rendererCSS.domElement.style.top	  = 0;
        rendererCSS.domElement.style.margin	  = 0;
        rendererCSS.domElement.style.padding  = 0;
        document.body.appendChild( rendererCSS.domElement );
        // when window resizes, also resize this renderer
        //THREEx.WindowResize(rendererCSS, camera);
        _eng.renderer.domElement.style.position = 'absolute';
        _eng.renderer.domElement.style.top      = 0;
        // make sure original renderer appears on top of CSS renderer
        _eng.renderer.domElement.style.zIndex   = 1;
        rendererCSS.domElement.appendChild( _eng.renderer.domElement );

        _eng.camera.position.set(0,150,400);
        _eng.camera.lookAt( _eng.scene.position );
      },

      options: {
        generator: {
          name: 'page',
          material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
        },
        physics: { enabled: false },
        target: { action: 'none' }
      }
    };
  };

}(window, THREE, EXTRO));
