

EXTRO.UniversalControls = function ( object, domElement ) {

  this.object = object;
  this.domElement = domElement || document;
  this.enabled = true;
  this.mousePos = new THREE.Vector2();
  this.mousePosNDC = new THREE.Vector3();
  this.mousePosNewNDC = new THREE.Vector3();
  this.mouseDeltaNDC = new THREE.Vector3();
  this.isTracking = false;
  this.posChanged = false;
  this.movementSpeed = 1.0;

  this.mousedown = function( e ) {
    var posX = e.offsetX === undefined ? e.layerX : e.offsetX;
    var posY = e.offsetY === undefined ? e.layerY : e.offsetY;
    this.mousePos.set(posX, posY);
    this.mousePosNDC = EXTRO.to_ndc( posX, posY, 0.5, this.mousePosNDC );
    this.isTracking = true;
    this.posChanged = false;
  };

  this.mouseup = function( e ) {
    this.isTracking = false;
    this.posChanged = false;
  };

  this.mousemove = function( e ) {
    if( this.isTracking ) {
      e.preventDefault();
      var posX = e.offsetX === undefined ? e.layerX : e.offsetX;
      var posY = e.offsetY === undefined ? e.layerY : e.offsetY;
      if( posX === this.mousePos.x && posY === this.mousePos.y )
        return;
      this.mousePosNewNDC = EXTRO.to_ndc( posX, posY, 0.5, this.mousePosNewNDC );
      this.mouseDeltaNDC.subVectors( this.mousePosNDC, this.mousePosNewNDC );
      this.posChanged = true;
      this.mousePos.set( posX, posY );      
      this.mousePosNDC = EXTRO.to_ndc( posX, posY, 0.5, this.mousePosNDC );      
    }
  };
  
  var _wheelDelta;
  
  this.mousewheel = function( event ) {
		_wheelDelta = 0;
		if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9
			_wheelDelta = event.wheelDelta / 40;
		} else if ( event.detail ) { // Firefox
			_wheelDelta = - event.detail / 3;
		}
    this.object.translateZ( -_wheelDelta * 30 );
    event.preventDefault();
		event.stopPropagation();    
		// _this.dispatchEvent( startEvent );
		// _this.dispatchEvent( endEvent );
  };

  this.update = function( delta ) {
    if( this.isTracking && this.posChanged ) {
      this.mouseDeltaNDC.z = this.mouseDeltaNDC.x;
      this.mouseDeltaNDC.x = -this.mouseDeltaNDC.y;
      this.mouseDeltaNDC.y = this.mouseDeltaNDC.z;
      this.mouseDeltaNDC.z = 0;
      var vRot = this.object.rotation.toVector3().add( this.mouseDeltaNDC.multiplyScalar(0.65) );
      this.object.rotation.setFromVector3( vRot, 'YXZ' );
      this.posChanged = false;
    }

  };


	this.keydown = function( event ) {
		if ( !event.altKey ) {
			return;
		}
		event.preventDefault();
		switch ( event.keyCode ) {
			case 16: /* shift */ this.movementSpeedMultiplier = 0.1; break;
			case 87: /*W*/ this.moveState.forward = 1; break;
			case 83: /*S*/ this.moveState.back = 1; break;
			case 65: /*A*/ this.moveState.left = 1; break;
			case 68: /*D*/ this.moveState.right = 1; break;
			case 82: /*R*/ this.moveState.up = 1; break;
			case 70: /*F*/ this.moveState.down = 1; break;
			case 38: /*up*/ this.moveState.pitchUp = 1; break;
			case 40: /*down*/ this.moveState.pitchDown = 1; break;
			case 37: /*left*/ this.moveState.yawLeft = 1; break;
			case 39: /*right*/ this.moveState.yawRight = 1; break;
			case 81: /*Q*/ this.moveState.rollLeft = 1; break;
			case 69: /*E*/ this.moveState.rollRight = 1; break;
		}
	};

	this.keyup = function( event ) {
		switch ( event.keyCode ) {
			case 16: /* shift */ this.movementSpeedMultiplier = 1; break;
			case 87: /*W*/ this.moveState.forward = 0; break;
			case 83: /*S*/ this.moveState.back = 0; break;
			case 65: /*A*/ this.moveState.left = 0; break;
			case 68: /*D*/ this.moveState.right = 0; break;
			case 82: /*R*/ this.moveState.up = 0; break;
			case 70: /*F*/ this.moveState.down = 0; break;
			case 38: /*up*/ this.moveState.pitchUp = 0; break;
			case 40: /*down*/ this.moveState.pitchDown = 0; break;
			case 37: /*left*/ this.moveState.yawLeft = 0; break;
			case 39: /*right*/ this.moveState.yawRight = 0; break;
			case 81: /*Q*/ this.moveState.rollLeft = 0; break;
			case 69: /*E*/ this.moveState.rollRight = 0; break;
		}
	};

	function bind( scope, fn ) {
		return function () {
			fn.apply( scope, arguments );
		};
	}
  
  window.addEventListener( 'mousewheel', bind( this, this.mousewheel ), false );
	//window.addEventListener( 'keydown', bind( this, this.keydown ), false );
	//window.addEventListener( 'keyup',   bind( this, this.keyup ), false );  

};
