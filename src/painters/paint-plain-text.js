/**
A simple Extrovert HTML rasterizer.
@module paint-plain-text.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, THREE, EXTROVERT) {

  EXTROVERT.paint_plain_text = function () {
    return {
      paint: function( val, opts ) {

        var _utils = EXTROVERT.Utils;

        // Get the element content
        var title_elem = val.querySelector( opts.src.title );
        var title = title_elem.innerHTML;//.text();//.trim();
        var content_elem = val.querySelector( opts.src.content );
        var content = content_elem.innerHTML;//text();//.trim();

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

        // For photo backgrounds:
        // var images = $val.children('img');
        // if(images.length > 0)
        // context.drawImage(images.get(0),0,0, canvas.width, canvas.height);
        var has_photo = false;

        // Compute the size of the title text
        context.font = _utils.get_computed_style( title_elem, 'font');

        context.fillStyle = _utils.get_computed_style( title_elem, 'color');
        //context.textBaseline = 'top';
        var title_line_height = 24;
        var num_lines = _utils.wrap_text( context, title, 10, 10 + title_line_height, canvas.width - 20, title_line_height, true );

        // Paint the title's background panel
        context.fillStyle = has_photo ? "rgba(0,0,0,0.75)" : _utils.shade_blend( -0.25, bkColor );
        context.fillRect(0,0, canvas.width, 20 + num_lines * title_line_height);

        // Paint the title text
        context.fillStyle = _utils.get_computed_style( title_elem, 'color');
        _utils.wrap_text( context, title, 10, 10 + title_line_height, canvas.width - 20, title_line_height, false );

        // Paint the content text
        context.font = _utils.get_computed_style( content_elem, 'font');

        var shim = '<div id="_fetchSize" style="display: none;">Sample text</div>';
        _utils.$( opts.src.container ).insertAdjacentHTML('beforeend', shim);
        //$( opts.src.container ).append( shim );
        //line_height = shim.text("x").height();
        shim = EXTROVERT.Utils.$('#_fetchSize');
        shim.innerHTML = 'x';
        var line_height = shim.offsetHeight;

        //var TestDivLineHeight = $("#TestDiv").css("font-size", "12px").css("line-height", "1.25").text("x").height();
        var massaged_content = content.replace('\n',' ');

        _utils.wrap_text( context, massaged_content, 10, 20 + (num_lines * title_line_height) + line_height, canvas.width - 20, line_height, false );

        // Create a texture from the canvas
        var texture = new THREE.Texture( canvas );
        texture.needsUpdate = true;
        return {
          tex: texture,
          mat: new THREE.MeshLambertMaterial( { map: texture/*, side: THREE.DoubleSide*/ } )
        };
      }
    };
  };

}(window, THREE, EXTROVERT));
