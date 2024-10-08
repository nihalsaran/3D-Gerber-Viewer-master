/**
 * @author Eberhard Graether / http://egraether.com/
 * @note Edited by eddyb to provide object-centered controls instead of camera-centered.
 */

THREE.ObjectControls = function ( object, domElement ) {
    
    THREE.EventTarget.call( this );
    
    var _this = this,
    STATE = { NONE : -1, ROTATE : 0, ZOOM : 1, PAN : 2 };
    
    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;
    
    // API
    
    this.enabled = true;
    
    this.screen = { width: window.innerWidth, height: window.innerHeight, offsetLeft: 0, offsetTop: 0 };
    this.radius = ( this.screen.width + this.screen.height ) / 4;
    
    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.2;
    this.panSpeed = 0.3;
    
    this.noRotate = false;
    this.noZoom = false;
    this.noPan = false;
    
    this.staticMoving = false;
    this.dynamicDampingFactor = 0.2;
    
    this.minDistance = 0;
    this.maxDistance = Infinity;
    
    this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];
    
    // internals
    
    var lastPosition = new THREE.Vector3();
    
    var _keyPressed = false,
    _state = STATE.NONE,
    
    //_eye = new THREE.Vector3(),
    
    _rotateStart = new THREE.Vector3(),
    _rotateEnd = new THREE.Vector3(),
    
    _zoomStart = new THREE.Vector2(),
    _zoomEnd = new THREE.Vector2(),
    
    _panStart = new THREE.Vector2(),
    _panEnd = new THREE.Vector2();
    
    
    // methods
    
    this.handleEvent = function ( event ) {
        
        if ( typeof this[ event.type ] == 'function' ) {
            
            this[ event.type ]( event );
            
        }
        
    };
    
    this.getMouseOnScreen = function ( clientX, clientY ) {
        
        return new THREE.Vector2(
            ( clientX - _this.screen.offsetLeft ) / _this.radius * 0.5,
            ( clientY - _this.screen.offsetTop ) / _this.radius * 0.5
        );
        
    };
    
    this.getMouseProjectionOnBall = function ( clientX, clientY ) {
        
        var mouseOnBall = new THREE.Vector3(
            ( clientX - _this.screen.width * 0.5 - _this.screen.offsetLeft ) / _this.radius,
            ( _this.screen.height * 0.5 + _this.screen.offsetTop - clientY ) / _this.radius,
            0.0
        );
        
        var length = mouseOnBall.length();
        
        if ( length > 1.0 ) {
            
            mouseOnBall.normalize();
            
        } else {
            
            mouseOnBall.z = Math.sqrt( 1.0 - length * length );
            
        }
        
        var projection = _this.camera.up.clone().setLength( mouseOnBall.y );
        projection.addSelf( _this.camera.up.clone().crossSelf( _this.eye ).setLength( mouseOnBall.x ) );
        projection.addSelf( _this.eye.clone().setLength( mouseOnBall.z ) );
        
        return projection;//(new THREE.Quaternion).setFromEuler(_this.object.rotation.clone()/*.negate()*/).multiplyVector3(projection);
        
    };
    
    this.rotateCamera = function () {
        var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );

        if ( angle ) {

            var axis = ( new THREE.Vector3() ).cross( _rotateStart, _rotateEnd ).normalize();
            angle *= _this.rotateSpeed;
            
            if ( _this.staticMoving )
                _rotateStart = _rotateEnd;
            else {
                _rotateStart.multiplyScalar(1 - _this.dynamicDampingFactor).addSelf(_rotateEnd.clone().multiplyScalar(_this.dynamicDampingFactor));
                //var quaternion = new THREE.Quaternion();
                //quaternion.setFromAxisAngle( axis, angle * ( _this.dynamicDampingFactor - 1.0 ) );
                //quaternion.multiplyVector3( _rotateStart );

            }
            
            _this.object.useQuaternion = true;
            _this.object.quaternion.clone().inverse().multiplyVector3(axis);
            _this.object.quaternion.multiplySelf((new THREE.Quaternion).setFromAxisAngle(axis, angle));


        }
        
    };
    
    this.zoomCamera = function () {
        var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;
        
        if ( factor !== 1.0 && factor > 0.0 ) {
            _this.object.scale.multiplyScalar(factor);
            
            if ( _this.staticMoving )
                _zoomStart.copy(_zoomEnd);
            else
                _zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;
        }
    };
    
    this.panCamera = function () {
        
        var mouseChange = _panEnd.clone().subSelf( _panStart );
        
        if ( mouseChange.x || mouseChange.y ) {
            mouseChange.multiplyScalar( Math.abs(_this.object.position.y) * _this.panSpeed );
            
            var pan = _this.eye.clone().crossSelf( _this.camera.up ).setLength( mouseChange.x );
            pan.addSelf( _this.camera.up.clone().setLength( mouseChange.y ) );
            
            _this.object.position.subSelf( pan );
            
            if ( _this.staticMoving )
                _panStart = _panEnd;
            else
                _panStart.addSelf( mouseChange.sub( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );
            
        }
        
    };
    
    this.update = function () {
        if ( !_this.noRotate ) 
            _this.rotateCamera();
        if ( !_this.noZoom )
            _this.zoomCamera();
        if ( !_this.noPan )
            _this.panCamera();
    };
    
    // listeners
    
    function keydown( event ) {
        
        if ( ! _this.enabled ) return;
        
        if ( _state !== STATE.NONE ) {
            
            return;
            
        } else if ( event.keyCode === _this.keys[ STATE.ROTATE ] && !_this.noRotate ) {
            
            _state = STATE.ROTATE;
            
        } else if ( event.keyCode === _this.keys[ STATE.ZOOM ] && !_this.noZoom ) {
            
            _state = STATE.ZOOM;
            
        } else if ( event.keyCode === _this.keys[ STATE.PAN ] && !_this.noPan ) {
            
            _state = STATE.PAN;
            
        }
        
        if ( _state !== STATE.NONE ) {
            
            _keyPressed = true;
            
        }
        
    };
    
    function keyup( event ) {
        
        if ( ! _this.enabled ) return;
        
        if ( _state !== STATE.NONE ) {
            
            _state = STATE.NONE;
            
        }
        
    };
    
    function mousedown( event ) {
        
        if ( ! _this.enabled ) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        if ( _state === STATE.NONE ) {
            
            _state = event.button;
            
            if ( _state === STATE.ROTATE && !_this.noRotate ) {
                
                _rotateStart = _rotateEnd = _this.getMouseProjectionOnBall( event.clientX, event.clientY );
                
            } else if ( _state === STATE.ZOOM && !_this.noZoom ) {
                
                _zoomStart = _zoomEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
                
            } else if ( !_this.noPan ) {
                
                _panStart = _panEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
                
            }
            
        }
        
    };
    
    function mousemove( event ) {
        
        if ( ! _this.enabled ) return;
        
        if ( _keyPressed ) {
            
            _rotateStart = _rotateEnd = _this.getMouseProjectionOnBall( event.clientX, event.clientY );
            _zoomStart = _zoomEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
            _panStart = _panEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
            
            _keyPressed = false;
            
        }
        
        if ( _state === STATE.NONE ) {
            
            return;
            
        } else if ( _state === STATE.ROTATE && !_this.noRotate ) {
            
            _rotateEnd = _this.getMouseProjectionOnBall( event.clientX, event.clientY );
            
        } else if ( _state === STATE.ZOOM && !_this.noZoom ) {
            
            _zoomEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
            
        } else if ( _state === STATE.PAN && !_this.noPan ) {
            
            _panEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
            
        }
        
    };
    
    function mouseup( event ) {
        
        if ( ! _this.enabled ) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        _state = STATE.NONE;
        
    };

    function onMouseWheel(event) {
        if (!_this.enabled || _this.noZoom) return;
    
        event.preventDefault();
        event.stopPropagation();
    
        var delta = 0;
    
        if (event.wheelDelta) { // WebKit / Opera / Explorer 9
            delta = event.wheelDelta / 40;
        } else if (event.detail) { // Firefox
            delta = - event.detail / 3;
        }
    
        _zoomStart.y += delta * 0.01;
        _this.zoomCamera();
    }
    
    this.domElement.addEventListener('mousewheel', onMouseWheel, false);
    this.domElement.addEventListener('DOMMouseScroll', onMouseWheel, false); // firefox
    
    this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
    
    this.domElement.addEventListener( 'mousemove', mousemove, false );
    this.domElement.addEventListener( 'mousedown', mousedown, false );
    this.domElement.addEventListener( 'mouseup', mouseup, false );
    
    window.addEventListener( 'keydown', keydown, false );
    window.addEventListener( 'keyup', keyup, false );
    
};