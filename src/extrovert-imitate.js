/**
An Extrovert.js generator that attempts to represent a 2D web page in 3D.
@module extrovert-imitate.js
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
   @class The built-in 'imitate' generator.
   */
   EXTROVERT.imitate = function() {
      return {
         generate: function( options, eng ) {
            init_objects( options, eng );
         }
      };
   };


   /**
   Initialize scene props and objects. TODO: clean up object allocations.
   @method init_objects
   */
   function init_objects( opts, eng ) {

      EXTROVERT.create_scene( opts );
      EXTROVERT.create_camera( opts.camera );
      var lights = [];
      lights[0] = { type: 'ambient', color: 0xFFFFFFF };
      //lights[1] = { type: 'point', color: 0xFFFFFFFF, intensity: 1.0, distance: 10000 };
      EXTROVERT.fiat_lux( lights );

      eng.drag_plane = new THREE.Mesh(
         new THREE.PlaneBufferGeometry( 2000, 2000, 8, 8 ),
         new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.25, transparent: true } ));
      eng.drag_plane.visible = false;
      //scene.add( eng.drag_plane ); // Not required
      eng.log.msg("Building intersection plane: %o", eng.drag_plane);

      // A visible plane that can be collided with
      if( true ) {
         var plane2 = opts.physics.enabled ?
            new Physijs.BoxMesh(
               new THREE.BoxGeometry(2000,2000,10),
               new THREE.MeshBasicMaterial( { color: 0x333333 } ), 0 )
            :
            new THREE.Mesh(
               new THREE.BoxGeometry(2000,2000,10),
               new THREE.MeshBasicMaterial( { color: 0x333333, opacity: 1.0, transparent: false } )
            );
         plane2.position.z = -500;
         plane2.receiveShadow = true; // TODO: not working
         eng.scene.add( plane2 );
         eng.log.msg("Building base plane: %o", plane2);
      }

      // A hidden plane for object placement
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
      //eng.scene.add( eng.placement_plane ); // Not required
      eng.scene.updateMatrix();
      eng.placement_plane.updateMatrix();
      eng.placement_plane.updateMatrixWorld();
      eng.log.msg("Building placement plane: %o", eng.placement_plane);

      init_cards( opts, eng );
   }



   /**
   Initialize all card objects. TODO: Optionally load dedicated per-face
   textures for cards. TODO: Fix texture kludge.
   @method init_cards
   */
   function init_cards( opts, eng ) {
      $( opts.src.selector ).each( function( idx, val ) {
         init_card( idx, val, opts, eng );
      });
   }



   /**
   Adjust textures for simple mode to allow continuation of the texture around
   the sides of the cube/object.
   @method patch_textures
   */
   function patch_textures( cubeGeo ) {

      for (i = 0; i < cubeGeo.faces.length ; i++) {
         var face = cubeGeo.faces[ i ];
         var v1 = cubeGeo.vertices[ face.a ],
             v2 = cubeGeo.vertices[ face.b ],
             v3 = cubeGeo.vertices[ face.c ];
         var fvu = cubeGeo.faceVertexUvs[0][i];
         // Quick kludge for textures on non-front faces. Replace with correct
         // mapping, wrapping, or dedicated textures.
         if(face.normal.y > 0.9) {
            fvu[0].x = fvu[0].y = fvu[1].x = fvu[1].y = fvu[2].x = fvu[2].y = 0.99;
         }
         else if(face.normal.y < -0.9) {
            fvu[0].x = fvu[0].y = fvu[1].x = fvu[1].y = fvu[2].x = fvu[2].y = 0.01;
         }
         else if(face.normal.x > 0.9 || face.normal.x < -0.9) {
            fvu[0].x = fvu[0].x > 0.5 ? 0.02 : 0.00;
            fvu[1].x = fvu[1].x > 0.5 ? 0.02 : 0.00;
            fvu[2].x = fvu[2].x > 0.5 ? 0.02 : 0.00;
         }
      }
      cubeGeo.uvsNeedUpdate = true;
   }



   /**
   Initialize a single card object. TODO: Clean up material/geo handling.
   @method init_card
   */
   function init_card( idx, val, opts, eng ) {

      //var first_elem = $( card_elements[0] );
      //var pos = $(val).offset();
      //http://bugs.jquery.com/ticket/11606
      //var pos = $(val).position();
      //if( $(val).css('float') == 'left' )
      var parent_pos = $( opts.container ).offset();
      var child_pos = $( val ).offset();
      var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

      //var realPos = getPosition( val );
      //var pos = { left: realPos.offsetLeft, top: realPos.offsetTop };
      var topLeft = EXTROVERT.calc_position( pos.left, pos.top, eng.placement_plane );
      var botRight = EXTROVERT.calc_position( pos.left + $(val).width(), pos.top + $(val).height(), eng.placement_plane );
      var block_width = Math.abs( botRight.x - topLeft.x );
      var block_height = Math.abs( topLeft.y - botRight.y );
      var cube_geo = new THREE.BoxGeometry( block_width, block_height, opts.block.depth );
      patch_textures( cube_geo );

      //var worldPos = calc_position( pos.left, pos.top, eng.placement_plane );
      var rep = eng.rasterizer( $(val), opts );
      var x = topLeft.x;
      var y = topLeft.y;
      var z = topLeft.z;
      // Offset, in simple mode, to match screen position
      x += (block_width / 2);
      y -= (block_height / 2);
      z -= (opts.block.depth / 2);

      var material = (!opts.physics.enabled || !opts.physics.materials) ?
         rep.mat : Physijs.createMaterial( rep.mat, 0.2, 1.0 );

      var mesh = opts.physics.enabled ?
         new Physijs.BoxMesh( cube_geo, material, 1000 ) :
         new THREE.Mesh( cube_geo, material );

      mesh.position.set( x, y, z );
      mesh.castShadow = mesh.receiveShadow = true;
      eng.scene.add( mesh );

      if (!opts.physics.enabled) {
         mesh.velocity = new THREE.Vector3(
            (Math.random() - 0.5) / 5,
            (Math.random() - 0.5) / 5,
            (Math.random() - 0.5) / 5);
      }
      else {
         if( 0 ) {
            var scale = 0.5;
            mesh.setAngularVelocity(new THREE.Vector3(
               scale*(Math.random() - 0.5),
               scale*(Math.random() - 0.5),
               scale*(Math.random() - 0.5)));
         }
      }

      mesh.elem = $(val);
      eng.card_coll.push( mesh );
      eng.log.msg("Created element %d (%f, %f, %f): %o.", idx, x, y, z, mesh);
      return mesh;
   }



   /**
   Module return.
   */
   //return my;



}(window, $, THREE, EXTROVERT));
