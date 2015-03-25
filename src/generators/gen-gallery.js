/**
An Extrovert.js generator for a 3D image gallery.
@module gen-gallery.js
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
         name: 'gallery',
         material: { color: 0x440000, friction: 0.2, restitution: 1.0 }
      },
      camera: {
         fov: 35,
         near: 1,
         far: 10000,
         position: [0,0,3200]
      },
      lights: [
         { type: 'point', color: 0xffffff, intensity: 1, distance: 10000 },
         { type: 'point', color: 0xffffff, intensity: 0.25, distance: 1000, pos: [0,0,300] },
      ]
   };



   var _init_cam_opts = {
      position: [0,0,800]
   };


   /**
   @class The built-in 'gallery' generator.
   */
   EXTROVERT.gallery = function() {
      return {
         generate: function( options, eng ) {
            if( !options.generator || typeof options.generator == 'string' )
               options.generator = _def_opts.generator;
            init_objects( options, eng );
         },
         options: _def_opts,
         init_cam_opts: _init_cam_opts
      };
   };


   /**
   Initialize scene props and objects. TODO: clean up object allocations.
   @method init_objects
   */
   function init_objects( opts, eng ) {

      // Create the visible/collidable backplane. Place it on the
      // camera's back frustum plane so it always fills the viewport.
      if( true ) {

         var frustum_planes = EXTROVERT.Utils.calc_frustum( eng.camera );
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

      EXTROVERT.create_placement_plane( [0,0,200] );

      init_elements( opts, eng );
   }



   /**
   Initialize all card objects.
   @method init_cards
   */
   function init_elements( opts, eng ) {
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
      var pos_info = EXTROVERT.get_position( val, opts, eng );

      // Texture
      var texture = eng.rasterizer.paint( $(val), opts );
      var material = (!opts.physics.enabled || !opts.physics.materials) ?
         texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
      var materials = new THREE.MeshFaceMaterial([
         eng.side_mat, eng.side_mat, eng.side_mat, eng.side_mat,
         material, material
      ]);

      // Mesh
      //var mesh = EXTROVERT.create_object({ type: 'box', dims: [pos_info.width, pos_info.height, pos_info.depth], mass: 1000, mat: materials });
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
   Module return.
   */
   //return my;



}(window, $, THREE, EXTROVERT));

// [1] Don't rely exclusively on .offset() or .position()
//     See: http://bugs.jquery.com/ticket/11606
//     var pos = $(val).offset();
//     var pos = $(val).position();
