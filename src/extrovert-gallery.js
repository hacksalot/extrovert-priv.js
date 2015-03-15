/**
An Extrovert.js generator for a 3D image gallery.
@module extrovert-gallery.js
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
   @class The built-in 'gallery' generator.
   */
   EXTROVERT.gallery = function() {
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
      var lights = opts.lights || [{ type: 'point', color: 0xFFFFFFFF, intensity: 1.0, distance: 10000 }];
      EXTROVERT.fiat_lux( lights );

      eng.drag_plane = new THREE.Mesh(
         new THREE.PlaneBufferGeometry( 2000, 2000, 8, 8 ),
         new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.25, transparent: true } ));
      eng.drag_plane.visible = false;
      //scene.add( eng.drag_plane ); // Not required
      eng.log.msg("Building intersection plane: %o", eng.drag_plane);

      // A visible plane that can be collided with
      if( true ) {

         var frustum_planes = EXTROVERT.calc_frustum( eng.camera );
         //var planeWidth = 2000;
         //var planeHeight = 2000;
         var planeWidth = frustum_planes.farPlane.topRight.x - frustum_planes.farPlane.topLeft.x;
         var planeHeight = frustum_planes.farPlane.topRight.y - frustum_planes.farPlane.botRight.y;

         var plane_tex = opts.background ?
            THREE.ImageUtils.loadTexture( opts.background ) : null;

         var plane2 = opts.physics.enabled ?
            new Physijs.BoxMesh(
               new THREE.BoxGeometry(planeWidth, planeHeight, 10),
               new THREE.MeshLambertMaterial( { color: 0xFFFFFF, map: plane_tex } ), 0 )
            :
            new THREE.Mesh(
               new THREE.BoxGeometry(planeWidth,planeHeight,10),
               new THREE.MeshLambertMaterial( { color: 0x333333, map: plane_tex, opacity: 1.0, transparent: false } )
            );
         //plane2.position.z = -500;
         plane2.position.z = frustum_planes.farPlane.topRight.z;
         plane2.receiveShadow = false; // TODO: not working
         plane2.updateMatrix();
         plane2.updateMatrixWorld();
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
      eng.side_mat = Physijs.createMaterial( new THREE.MeshLambertMaterial({ color: 0x440000 }), 0.2, 1.0 );
      $( opts.src.selector ).each( function( idx, val ) {
         init_card( idx, val, opts, eng );
      });
   }



   /**
   Initialize a single card object. TODO: Clean up material/geo handling.
   @method init_card
   */
   function init_card( idx, val, opts, eng ) {

      //var pos = $(val).offset();
      //var pos = $(val).position();
      //http://bugs.jquery.com/ticket/11606
      var parent_pos = $( opts.container ).offset();
      var child_pos = $( val ).offset();
      var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

      var topLeft = EXTROVERT.calc_position( pos.left, pos.top, eng.placement_plane );
      var botRight = EXTROVERT.calc_position( pos.left + $(val).width(), pos.top + $(val).height(), eng.placement_plane );
      var block_width = Math.abs( botRight.x - topLeft.x );
      var block_height = Math.abs( topLeft.y - botRight.y );
      var cube_geo = new THREE.BoxGeometry( block_width, block_height, opts.block.depth );
      // Mess up face normals to get more interesting shading
      var dapple = false;
      if( dapple ) {
         cube_geo.computeFaceNormals();
         cube_geo.computeVertexNormals();
      }
      var x = topLeft.x;
      var y = topLeft.y;
      var z = topLeft.z;
      // Offset, in simple mode, to match screen position
      x += (block_width / 2);
      y -= (block_height / 2);
      z -= (opts.block.depth / 2);

      var texture = eng.rasterizer( $(val), opts );

      var material = (!opts.physics.enabled || !opts.physics.materials) ?
         texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );

      var materials = new THREE.MeshFaceMaterial([
         eng.side_mat,
         eng.side_mat,
         eng.side_mat,
         eng.side_mat,
         material,
         material
      ]);

      var mesh = opts.physics.enabled ?
         new Physijs.BoxMesh( cube_geo, materials, 1000 ) :
         new THREE.Mesh( cube_geo, materials );

      mesh.position.set( x, y, z );
      mesh.castShadow = mesh.receiveShadow = false;
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
