/**
An Extrovert.js generator for 3D extrusion.
@module gen-extrude.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   /**
   Module object.
   */
   //var my = {};


   /**
   Default options.
   */
   var _def_opts = {
      generator: {
         name: 'extrude',
         background: 'default_background.png',
         material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
      },
      camera: {
         fov: 35,
         near: 1,
         far: 2000,
         position: [0,0,800],
         rotation: [0,0,0],
         up: [0,0,-1]
      }      
   };


   /**
   @class The built-in 'gallery' generator.
   */
   EXTROVERT.extrude = function() {
      return {
         generate: function( options, eng ) {
            if( !options.generator || typeof options.generator == 'string' )
               options.generator = _def_opts.generator;
            init_objects( options, eng );
         },
         options: _def_opts
      };
   };


   /**
   Initialize scene props and objects. TODO: clean up object allocations.
   @method init_objects
   */
   function init_objects( opts, eng ) {

      EXTROVERT.create_scene( opts );
      EXTROVERT.create_camera( opts.camera );
      EXTROVERT.fiat_lux( opts.lights );

      // Create an invisible, untouchable drag plane for drag-drop
      // TODO: remove hard-coded numbers
      eng.drag_plane = new THREE.Mesh(
         new THREE.PlaneBufferGeometry( 2000, 2000, 8, 8 ),
         new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.25, transparent: true } ));
      eng.drag_plane.visible = false;
      eng.log.msg("Building intersection plane: %o", eng.drag_plane);

      // Create the visible/collidable backplane. Place it on the 
      // camera's back frustum plane so it always fills the viewport.
      if( true ) {

         var frustum_planes = EXTROVERT.calc_frustum( eng.camera );
         var planeWidth = frustum_planes.farPlane.topRight.x - frustum_planes.farPlane.topLeft.x;
         var planeHeight = frustum_planes.farPlane.topRight.y - frustum_planes.farPlane.botRight.y;

         var plane_tex = opts.generator.background ?
            THREE.ImageUtils.loadTexture( opts.generator.background ) : null;

         var plane2 = opts.physics.enabled ?
            new Physijs.BoxMesh(
               new THREE.BoxGeometry(planeWidth, planeHeight, 10),
               new THREE.MeshLambertMaterial( { color: 0xFFFFFF, map: plane_tex } ), 0 )
            :
            new THREE.Mesh(
               new THREE.BoxGeometry(planeWidth,planeHeight,10),
               new THREE.MeshLambertMaterial( { color: 0x333333, map: plane_tex, opacity: 1.0, transparent: false } )
            );
         plane2.position.z = frustum_planes.farPlane.topRight.z;
         plane2.receiveShadow = false; // TODO: not working
         plane2.updateMatrix();
         plane2.updateMatrixWorld();
         eng.scene.add( plane2 );
         eng.log.msg("Building base plane: %o", plane2);
      }

      // Create a hidden plane for object placement.
      // TODO: We don't actually need this plane. Replace with unproject at specified Z.
      eng.placement_plane = opts.physics.enabled ?
            new Physijs.BoxMesh(
               new THREE.BoxGeometry(200000,200000,1),
               new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ),
               0 ) :
            new THREE.Mesh(
               new THREE.BoxGeometry(200000,200000,1),
               new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } )
            );
      eng.placement_plane.visible = false;
      eng.placement_plane.position.z = 200;
      // TODO: Figure out which update calls are necessary
      eng.scene.updateMatrix();
      eng.placement_plane.updateMatrix();
      eng.placement_plane.updateMatrixWorld();
      eng.log.msg("Building placement plane: %o", eng.placement_plane);

      init_cards( opts, eng );
   }



   /**
   Initialize all card objects.
   @method init_cards
   */
   function init_cards( opts, eng ) {
      var mat = new THREE.MeshLambertMaterial({ color: opts.generator.material.color });
      eng.side_mat = Physijs.createMaterial( mat, opts.generator.material.friction, opts.generator.material.restitution );
      $( opts.src.selector ).each( function( idx, val ) {
         init_image( idx, val, opts, eng );
      });
   }



   /**
   Initialize a single card object. TODO: Clean up material/geo handling.
   @method init_card
   */
   function init_image( idx, val, opts, eng ) {

      // Position
      var pos_info = get_position( val, opts, eng );

      // Texture
      var texture = eng.rasterizer.paint( $(val), opts );
      var material = (!opts.physics.enabled || !opts.physics.materials) ?
         texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
      var materials = new THREE.MeshFaceMaterial([
         eng.side_mat, eng.side_mat, eng.side_mat, eng.side_mat,
         material, material
      ]);

      // Mesh
      var cube_geo = new THREE.BoxGeometry( pos_info.width, pos_info.height, pos_info.depth );      
      var mesh = opts.physics.enabled ?
         new Physijs.BoxMesh( cube_geo, materials, 1000 ) :
         new THREE.Mesh( cube_geo, materials );
      mesh.position.copy( pos_info.pos );         
      mesh.castShadow = mesh.receiveShadow = false;
      if( opts.generator.lookat )
         mesh.lookAt( new THREE.Vector3(opts.generator.lookat[0], opts.generator.lookat[1], opts.generator.lookat[2]) );
      mesh.elem = $(val);
      
      opts.creating && opts.creating( val, mesh );
      eng.scene.add( mesh );
      eng.card_coll.push( mesh );
      eng.log.msg("Created element %d (%f, %f, %f): %o.", idx, pos_info.pos.x, pos_info.pos.y, pos_info.pos.z, mesh);
      opts.created && opts.created( val, mesh );

      return mesh;
   }
   
   
   
   /**
   Retrieve the position, in 3D space, of a recruited HTML element.
   @method init_card
   */   
   function get_position( val, opts, eng ) {
   
      // Get the position of the HTML element [1]
      var parent_pos = $( opts.container ).offset();
      var child_pos = $( val ).offset();
      var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

      // From that, compute the position of the top-left and bottom-right corner
      // of the element as they would exist in 3D-land.
      var topLeft = EXTROVERT.calc_position( pos.left, pos.top, eng.placement_plane );
      var botRight = EXTROVERT.calc_position( pos.left + $(val).width(), pos.top + $(val).height(), eng.placement_plane );
      var block_width = Math.abs( botRight.x - topLeft.x );
      var block_height = Math.abs( topLeft.y - botRight.y );
      
      // Offset by the half-height/width so the corners line up
      return { 
         pos: new THREE.Vector3(
            topLeft.x + (block_width / 2),
            topLeft.y - (block_height / 2), 
            topLeft.z - (opts.block.depth / 2)),
         width: block_width,
         height: block_height,
         depth: opts.block.depth
      };
   }



   /**
   Module return.
   */
   //return my;



}(window, $, THREE, EXTROVERT));

// [1] Don't rely exclusively on .offset() or .position()
//     See: http://bugs.jquery.com/ticket/11606      
//     var pos = $(val).offset();
//     var pos = $(val).position();
