/**
A simple Extrovert HTML rasterizer.
@module paint-simple-html.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, THREE, EXTRO) {

  EXTRO.paint_element = function () {
    return {
      paint: function( val, opts ) {
        var _utils = EXTROVERT.Utils;

        // Get the element content
        //var title_elem = val.querySelector( opts.src.title );
        //var title = title_elem.innerHTML;//.text();//.trim();
        //var content_elem = val.querySelector( opts.src.content );
        //var content = content_elem.innerHTML;//text();//.trim();

        // Create a canvas element. TODO: Reuse a single canvas.
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = val.offsetWidth;
        canvas.height = val.offsetHeight;

        // Fill the canvas with the background color
        //var bkColor = $val.css('background-color');
        var bkColor = _utils.get_computed_style(val, 'background-color');
        if(bkColor === 'rgba(0, 0, 0, 0)')
          bkColor = 'rgb(0,0,0)';
        context.fillStyle = bkColor;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Create a texture from the canvas
        var texture = new THREE.Texture( canvas );
        texture.needsUpdate = true;
        return {
          tex: texture,
          mat: new THREE.MeshLambertMaterial( { map: texture } )
        };
      }
    };
  };

}(window, THREE, EXTRO));
