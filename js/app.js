var APP = {

	Player: function () {

		var renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setPixelRatio( window.devicePixelRatio ); // TODO: Use player.setPixelRatio()

		var loader = new THREE.ObjectLoader();
		var camera, scene;
		

		var events = {};

		var dom = document.createElement( 'div' );
		dom.appendChild( renderer.domElement );

		this.dom = dom;
		this.canvas = renderer.domElement;

		this.width = 500;
		this.height = 500;

		this.load = function ( json ) {

			var project = json.project;

			if ( project.shadows !== undefined ) renderer.shadowMap.enabled = project.shadows;
			if ( project.shadowType !== undefined ) renderer.shadowMap.type = project.shadowType;
			if ( project.toneMapping !== undefined ) renderer.toneMapping = project.toneMapping;
			if ( project.toneMappingExposure !== undefined ) renderer.toneMappingExposure = project.toneMappingExposure;

			this.setScene( loader.parse( json.scene ) );
			this.setCamera( loader.parse( json.camera ) );

			events = {
				init: [],
				start: [],
				stop: [],
				keydown: [],
				keyup: [],
				pointerdown: [],
				pointerup: [],
				pointermove: [],
				update: []
			};

			var scriptWrapParams = 'player,renderer,scene,camera';
			var scriptWrapResultObj = {};

			for ( var eventKey in events ) {

				scriptWrapParams += ',' + eventKey;
				scriptWrapResultObj[ eventKey ] = eventKey;

			}

			var scriptWrapResult = JSON.stringify( scriptWrapResultObj ).replace( /\"/g, '' );

			for ( var uuid in json.scripts ) {

				var object = scene.getObjectByProperty( 'uuid', uuid, true );

				if ( object === undefined ) {

					console.warn( 'APP.Player: Script without object.', uuid );
					continue;

				}

				var scripts = json.scripts[ uuid ];

				for ( var i = 0; i < scripts.length; i ++ ) {

					var script = scripts[ i ];

					var functions = ( new Function( scriptWrapParams, script.source + '\nreturn ' + scriptWrapResult + ';' ).bind( object ) )( this, renderer, scene, camera );

					for ( var name in functions ) {

						if ( functions[ name ] === undefined ) continue;

						if ( events[ name ] === undefined ) {

							console.warn( 'APP.Player: Event type not supported (', name, ')' );
							continue;

						}

						events[ name ].push( functions[ name ].bind( object ) );

					}

				}

			}

			dispatch( events.init, arguments );

		/*var mouseX = (clientX / window.innerWidth);
   			var mouseY = - (clientY / window.innerHeight);*/

			var x = 0;
			var y = 1;
			var z = -4;

			var lightUuid = "42716ceb-0a15-41f2-956c-f2139413ba2b"; // UUID do objeto de luz
			var light = scene.getObjectByProperty('uuid', lightUuid);

			var newPosition = new THREE.Vector3(x, y, z); // Define as coordenadas x, y, z da nova posição
			light.position.copy(newPosition); // Atualiza a posição do objeto de luz

		};

		

		this.setCamera = function ( value ) {

			camera = value;
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();

		};

		this.setScene = function ( value ) {

			scene = value;

		};

		this.setPixelRatio = function ( pixelRatio ) {

			renderer.setPixelRatio( pixelRatio );

		};

		this.setSize = function ( width, height ) {

			this.width = width;
			this.height = height;

			if ( camera ) {

				camera.aspect = this.width / this.height;
				camera.updateProjectionMatrix();

			}

			renderer.setSize( width, height );

		};

		function dispatch( array, event ) {

			for ( var i = 0, l = array.length; i < l; i ++ ) {

				array[ i ]( event );

			}

		}

		var time, startTime, prevTime;

		function animate() {

			time = performance.now();

			try {

				dispatch( events.update, { time: time - startTime, delta: time - prevTime } );

			} catch ( e ) {

				console.error( ( e.message || e ), ( e.stack || '' ) );

			}

			renderer.render( scene, camera );

			prevTime = time;

		}

		this.play = function () {

			startTime = prevTime = performance.now();

			document.addEventListener( 'keydown', onKeyDown );
			document.addEventListener( 'keyup', onKeyUp );
			document.addEventListener( 'pointerdown', onPointerDown );
			document.addEventListener( 'pointerup', onPointerUp );
			document.addEventListener( 'pointermove', onPointerMove );

			dispatch( events.start, arguments );

			renderer.setAnimationLoop( animate );

		};

		this.stop = function () {

			document.removeEventListener( 'keydown', onKeyDown );
			document.removeEventListener( 'keyup', onKeyUp );
			document.removeEventListener( 'pointerdown', onPointerDown );
			document.removeEventListener( 'pointerup', onPointerUp );
			document.removeEventListener( 'pointermove', onPointerMove );

			dispatch( events.stop, arguments );

			renderer.setAnimationLoop( null );

		};

		this.render = function ( time ) {

			dispatch( events.update, { time: time * 1000, delta: 0 /* TODO */ } );

			renderer.render( scene, camera );

		};

		this.dispose = function () {

			renderer.dispose();

			camera = undefined;
			scene = undefined;

		};

		//

		function onKeyDown( event ) {

			dispatch( events.keydown, event );

		}

		function onKeyUp( event ) {

			dispatch( events.keyup, event );

		}

		function onPointerDown( event ) {

			dispatch( events.pointerdown, event );

		}

		function onPointerUp( event ) {

			dispatch( events.pointerup, event );

		}

		var mouseXPrev = 0;
		var mouseYPrev = 0;
		var lerpFactor = 0.6; // Fator de interpolação (quanto menor, mais suave será o movimento)

		function onPointerMove(event) {
			var mouseX = (event.clientX - (window.innerWidth / 2)) / (window.innerHeight / 10);
			var mouseY = (event.clientY - (window.innerHeight / 2)) / (window.innerHeight / 10);

			var x = mouseX;
			var y = 0.499; 
			var z = mouseY;

			// Calcular a nova posição usando interpolação
			var newX = lerp(mouseXPrev, x, lerpFactor);
			var newZ = lerp(mouseYPrev, z, lerpFactor);
			var newY =  y - (Math.abs(newZ)  + (Math.abs(newX) -5 ) / 0.4) + 1.5;

			var lightUuid = "42716ceb-0a15-41f2-956c-f2139413ba2b"; // UUID da luz
			var light = scene.getObjectByProperty('uuid', lightUuid);

			var newPosition = new THREE.Vector3(newX, y, newZ);
			light.position.copy(newPosition); // Atualiza a posição do objeto de luz

			mouseXPrev = newX;
			mouseYPrev = newZ;
		}

		// Função de interpolação (lerp)
		function lerp(a, b, t) {
			return a + (b - a) * t;
		}


		function isMobileDevice() {
			return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		}
		
		if (!isMobileDevice()) {
			// Coloque o código que deseja executar apenas se não for um dispositivo móvel aqui
			// console.log("Não é um dispositivo móvel!");
		} else {
			// console.log("É um dispositivo móvel!");
		}
		

		/*document.addEventListener('mouseenter', function(event) {
			var mouseX = (event.clientX / window.innerWidth) * 2 - 1;
			var mouseY = - (event.clientY / window.innerHeight) * 2 + 1;
		
			var vector = new THREE.Vector3(mouseX, mouseY, 0.5);
			vector.unproject(camera);
			var dir = vector.sub(camera.position).normalize();
			var distance = -camera.position.z / dir.z;
			var pos = camera.position.clone().add(dir.multiplyScalar(distance));
		
			var light = scene.getObjectByName('PointLight'); // Substitua 'PointLight' pelo nome da sua luz
			if (light) {
				light.position.copy(pos);
			}
		});
*/
	}

};

export { APP };
