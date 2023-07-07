import * as THREE from 'three';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { getWindowAI } from 'window.ai';
import { v4 as uuidv4 } from 'uuid';
import { io } from "socket.io-client";
import * as TWEEN from '@tweenjs/tween.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// TODO: not sure if this is working, React or Vite may be calling this twice
let emitPlayerInterval = null;
let socket = null;

export function startGenDemo(config) {
    const WORLD_ID = '1'; // TODO: parameterize this

    const setGenerateObjectsHandler = config.setGenerateObjectsHandler;
    const setScreenshotObjectHandler = config.setScreenshotObjectHandler;

    const generatedObjects = [];

    const clock = new THREE.Clock();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88ccee);
    // scene.fog = new THREE.Fog(0x88ccee, 0, 50);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ';

    const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 5);
    fillLight1.position.set(2, 1, 1);
    scene.add(fillLight1);

    // ambient light
    const ambientLight = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 5);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 8);
    scene.add(directionalLight2);

    // TODO: might have broken shadows because environment is large and the values are too small to account for the range
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(- 5, 25 * 100, - 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.left = - 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = - 30;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.radius = 4;
    directionalLight.shadow.bias = - 0.00006;
    // scene.add(directionalLight);

    const container = document.getElementById('container');

    // Reset container because useEffect / Vite will rerun this code.
    // If React.StrictMode is used, this code will run twice.
    // TODO: look into React Three Fiber, maybe help with this
    container.innerHTML = '';

    THREE.ColorManagement.enabled = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.useLegacyLights = false;

    renderer.outputColorSpace = THREE.SRGBColorSpace; // optional with post-processing

    container.appendChild(renderer.domElement);

    const stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

    const GRAVITY = 30;

    const NUM_SPHERES = 100;
    const SPHERE_RADIUS = 0.2;

    const STEPS_PER_FRAME = 5;

    const sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
    const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xdede8d });

    const spheres = [];
    let sphereIdx = 0;

    for (let i = 0; i < NUM_SPHERES; i++) {

        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.castShadow = true;
        sphere.receiveShadow = true;

        scene.add(sphere);

        spheres.push({
            mesh: sphere,
            collider: new THREE.Sphere(new THREE.Vector3(0, - 100, 0), SPHERE_RADIUS),
            velocity: new THREE.Vector3()
        });

    }

    let worldOctree = new Octree();

    // TODO: change height off the ground based on the loaded environment
    const CAPSULE_HEIGHT_OFF_GROUND = 75;
    const CAPSULE_Y1 = 0.35 + CAPSULE_HEIGHT_OFF_GROUND;
    const CAPSULE_Y2 = 1 + CAPSULE_HEIGHT_OFF_GROUND;
    const INIT_CAPSULE_Y1 = 0.35 - 10;
    const INIT_CAPSULE_Y2 = 1 - 10;

    const playerCollider = new Capsule(new THREE.Vector3(0, INIT_CAPSULE_Y1, 0), new THREE.Vector3(0, INIT_CAPSULE_Y2, 0), 0.35);

    const playerVelocity = new THREE.Vector3();
    const playerDirection = new THREE.Vector3();

    let playerOnFloor = false;
    let mouseTime = 0;

    const keyStates = {};

    const vector1 = new THREE.Vector3();
    const vector2 = new THREE.Vector3();
    const vector3 = new THREE.Vector3();

    document.addEventListener('keydown', (event) => {

        keyStates[event.code] = true;

    });

    document.addEventListener('keyup', (event) => {

        keyStates[event.code] = false;

    });

    container.addEventListener('mousedown', () => {

        document.body.requestPointerLock();

        mouseTime = performance.now();

    });

    document.addEventListener('mouseup', () => {

        if (document.pointerLockElement !== null) throwBall();

    });

    document.body.addEventListener('mousemove', (event) => {

        if (document.pointerLockElement === document.body) {

            camera.rotation.y -= event.movementX / 500;
            camera.rotation.x -= event.movementY / 500;

        }

    });

    window.addEventListener('resize', onWindowResize);

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

    }

    function getPlayerPosition() {
        return camera.position;
    }

    function getPlayerQuaternion() {
        return camera.quaternion;
    }

    const playerId = uuidv4();
    const players = {};

    // TODO: parameterize socket endpoint
    let socketEndpoint = 'http://localhost:6483';

    if (!socket) {
        socket = io(socketEndpoint);
    }

    socket.on('position', function (msg) {
        // console.log(msg);

        try {
            updatePlayerInfo(msg);
        } catch (e) {
            console.error(e);
        }
        // showChatMessage(msg);
    });

    function generateCube() {
        const cubeSize = 2;
        const boxGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize).toNonIndexed();

        let position = boxGeometry.attributes.position;
        const colorsBox = [];

        const color = new THREE.Color();

        for (let i = 0, l = position.count; i < l; i++) {

            color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75, THREE.SRGBColorSpace);
            colorsBox.push(color.r, color.g, color.b);

        }

        boxGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsBox, 3));


        const boxMaterial = new THREE.MeshPhongMaterial({ specular: 0xffffff, flatShading: true, vertexColors: true });
        boxMaterial.color.setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75, THREE.SRGBColorSpace);

        const box = new THREE.Mesh(boxGeometry, boxMaterial);

        return box;
    }

    function loadAvatar(callback) {
        let model = generateCube();

        const modelSize = 0.4;
        model.scale.set(modelSize, modelSize, modelSize);

        callback(model);
    }

    function updatePlayerInfo(info) {
        const playerId = info.playerId;

        console.log('updatePlayerInfo', info);

        if (!players[playerId]) {
            // set info here to prevent race condition of loading multiple avatars for same player ID
            players[playerId] = {
                info: info,
                avatar: null,
                timestamp: Date.now()
            };

            loadAvatar(function (model) {
                // let model = gltf.scene;
                scene.add(model);

                console.log('Loading avatar for player ID: ' + playerId);

                players[playerId].avatar = model;

                var position = info.position;
                model.position.set(
                    position.x,
                    position.y,
                    position.z
                );

                var quaternion = info.quaternion;
                model.quaternion.set(
                    quaternion.x,
                    quaternion.y,
                    quaternion.z,
                    quaternion.w
                );
            });
        } else {
            var avatar = players[playerId].avatar;

            if (avatar) {

                console.log('Updating avatar for player ID: ' + playerId);

                var position = info.position;
                var quaternion = info.quaternion;
                var deltaTime = Date.now() - players[playerId].timestamp;
                players[playerId].timestamp = Date.now();

                const coords = {
                    x: avatar.position.x,
                    y: avatar.position.y,
                    z: avatar.position.z
                };

                const tween = new TWEEN.Tween(avatar.position) // Create a new tween that modifies 'coords'.
                    .to({
                        x: position.x,
                        y: position.y,
                        z: position.z,
                    }, deltaTime) // Move to (300, 200) in 1 second.
                    .easing(TWEEN.Easing.Linear.None) // Use an easing function to make the animation smooth.
                    .onUpdate(() => {
                        // Called after tween.js updates 'coords'.
                        // Move 'box' to the position described by 'coords' with a CSS translation.
                        // box.style.setProperty('transform', `translate(${coords.x}px, ${coords.y}px)`)
                    })
                    .start() // Start the tween immediately.
            }

            players[playerId].info = info;
        }
    }

    function emitPlayerInfo() {
        var pos = getPlayerPosition();
        var quat = getPlayerQuaternion();

        socket.emit('position', {
            playerId: playerId,
            position: {
                x: pos.x,
                y: pos.y,
                z: pos.z
            },
            quaternion: {
                x: quat.x,
                y: quat.y,
                z: quat.z,
                w: quat.w
            },
            roomId: WORLD_ID
        });
    }

    // TODO: dynamically change delay based on number of players in room, to reduce lagginess
    // Can increase delay if two players are farther apart
    clearInterval(emitPlayerInterval); // clear so we don't have multiple intervals running when React or Vite refreshes the page
    emitPlayerInterval = setInterval(emitPlayerInfo, 500);

    function throwBall() {

        // disable throwing ball for now, since need code to sync across multiplayer
        return;

        const sphere = spheres[sphereIdx];

        camera.getWorldDirection(playerDirection);

        sphere.collider.center.copy(playerCollider.end).addScaledVector(playerDirection, playerCollider.radius * 1.5);

        // throw the ball with more force if we hold the button longer, and if we move forward

        const impulse = 15 + 30 * (1 - Math.exp((mouseTime - performance.now()) * 0.001));

        sphere.velocity.copy(playerDirection).multiplyScalar(impulse);
        sphere.velocity.addScaledVector(playerVelocity, 2);

        sphereIdx = (sphereIdx + 1) % spheres.length;

    }

    function playerCollisions() {

        const result = worldOctree.capsuleIntersect(playerCollider);

        playerOnFloor = false;

        if (result) {

            playerOnFloor = result.normal.y > 0;

            if (!playerOnFloor) {

                playerVelocity.addScaledVector(result.normal, - result.normal.dot(playerVelocity));

            }

            playerCollider.translate(result.normal.multiplyScalar(result.depth));

        }

    }

    function updatePlayer(deltaTime) {

        let damping = Math.exp(- 4 * deltaTime) - 1;

        if (!playerOnFloor) {

            playerVelocity.y -= GRAVITY * deltaTime;

            // small air resistance
            damping *= 0.1;

        }

        playerVelocity.addScaledVector(playerVelocity, damping);

        const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
        playerCollider.translate(deltaPosition);

        playerCollisions();

        camera.position.copy(playerCollider.end);

    }

    function playerSphereCollision(sphere) {

        const center = vector1.addVectors(playerCollider.start, playerCollider.end).multiplyScalar(0.5);

        const sphere_center = sphere.collider.center;

        const r = playerCollider.radius + sphere.collider.radius;
        const r2 = r * r;

        // approximation: player = 3 spheres

        for (const point of [playerCollider.start, playerCollider.end, center]) {

            const d2 = point.distanceToSquared(sphere_center);

            if (d2 < r2) {

                const normal = vector1.subVectors(point, sphere_center).normalize();
                const v1 = vector2.copy(normal).multiplyScalar(normal.dot(playerVelocity));
                const v2 = vector3.copy(normal).multiplyScalar(normal.dot(sphere.velocity));

                playerVelocity.add(v2).sub(v1);
                sphere.velocity.add(v1).sub(v2);

                const d = (r - Math.sqrt(d2)) / 2;
                sphere_center.addScaledVector(normal, - d);

            }

        }

    }

    function spheresCollisions() {

        for (let i = 0, length = spheres.length; i < length; i++) {

            const s1 = spheres[i];

            for (let j = i + 1; j < length; j++) {

                const s2 = spheres[j];

                const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
                const r = s1.collider.radius + s2.collider.radius;
                const r2 = r * r;

                if (d2 < r2) {

                    const normal = vector1.subVectors(s1.collider.center, s2.collider.center).normalize();
                    const v1 = vector2.copy(normal).multiplyScalar(normal.dot(s1.velocity));
                    const v2 = vector3.copy(normal).multiplyScalar(normal.dot(s2.velocity));

                    s1.velocity.add(v2).sub(v1);
                    s2.velocity.add(v1).sub(v2);

                    const d = (r - Math.sqrt(d2)) / 2;

                    s1.collider.center.addScaledVector(normal, d);
                    s2.collider.center.addScaledVector(normal, - d);

                }

            }

        }

    }

    function updateSpheres(deltaTime) {

        spheres.forEach(sphere => {

            sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

            const result = worldOctree.sphereIntersect(sphere.collider);

            if (result) {

                sphere.velocity.addScaledVector(result.normal, - result.normal.dot(sphere.velocity) * 1.5);
                sphere.collider.center.add(result.normal.multiplyScalar(result.depth));

            } else {

                sphere.velocity.y -= GRAVITY * deltaTime;

            }

            const damping = Math.exp(- 1.5 * deltaTime) - 1;
            sphere.velocity.addScaledVector(sphere.velocity, damping);

            playerSphereCollision(sphere);

        });

        spheresCollisions();

        for (const sphere of spheres) {

            sphere.mesh.position.copy(sphere.collider.center);

        }

    }

    function getForwardVector() {

        camera.getWorldDirection(playerDirection);
        playerDirection.y = 0;
        playerDirection.normalize();

        return playerDirection;

    }

    function getSideVector() {

        camera.getWorldDirection(playerDirection);
        playerDirection.y = 0;
        playerDirection.normalize();
        playerDirection.cross(camera.up);

        return playerDirection;

    }

    function controls(deltaTime) {

        // gives a bit of air control
        const speedDelta = deltaTime * (playerOnFloor ? 25 : 8);

        if (keyStates['KeyW']) {

            playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));

        }

        if (keyStates['KeyS']) {

            playerVelocity.add(getForwardVector().multiplyScalar(- speedDelta));

        }

        if (keyStates['KeyA']) {

            playerVelocity.add(getSideVector().multiplyScalar(- speedDelta));

        }

        if (keyStates['KeyD']) {

            playerVelocity.add(getSideVector().multiplyScalar(speedDelta));

        }

        if (playerOnFloor) {

            if (keyStates['Space']) {

                playerVelocity.y = 15;

            }

        }

    }

    const generate3DObject = async (inputText) => {
        let ai;
        try {
            ai = await getWindowAI();
            if (!ai) {
                alert('window.ai not found');
                throw new Error('window.ai not found');
            }
        } catch (error) {
            console.error(error);
        }

        console.log('generating...')

        const promptObject = { prompt: inputText };

        console.log('promptObject', promptObject);

        const output = await ai.BETA_generate3DObject(promptObject, {
            extension: "ply",
            numInferenceSteps: 16,
        });

        console.log('generate3DObject output', output);

        return output[0].uri;
    };

    let currentEnvironmentScene = null;
    let currentEnvironmentPrompt = null;
    let currentEnvironmentDataURI = null;
    let octreeHelper = null;

    function saveEnvironmentPly() {
        const filename = `${currentEnvironmentPrompt}.ply`;
        const link = document.createElement('a');
        link.download = filename;
        link.href = currentEnvironmentDataURI;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    window.saveEnvironmentPly = saveEnvironmentPly;

    window.generateNewObject = generateNewObject;

    function addToGeneratedObjects(prompt, plyURI) {
        const newObject = {
            prompt: prompt,
            plyURI: plyURI,
            timestamp: Date.now(),
            id: uuidv4()
        };
        generatedObjects.push(newObject);
        setGenerateObjectsHandler(generatedObjects);
        setScreenshotObjectHandler(newObject);
    }

    async function queryObjects() {
        const worldId = WORLD_ID;

        // query objects table for rows with matching world_id
        const response = await fetch(`http://localhost:6483/query_objects?worldId=${worldId}`);

        console.log('query_objects response', response);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    async function uploadPly(prompt, plyURI, object) {
        console.log('uploading ply');
        console.log(plyURI);

        // call game server with upload_ply endpoint
        const response = await fetch('http://localhost:6483/upload_ply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                worldId: WORLD_ID,
                prompt: prompt,
                plyUri: plyURI,
                object: object
            })
        });

        console.log('upload_ply response', response);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    }

    async function registerObject(object) {
        const plyURI = getObjectUrl(object);

        // TODO: read object position, rotation, scale
        const position = object.object.position;
        const rotation = object.object.rotation;
        const scale = object.object.scale;

        const plyLoader = new PLYLoader();
        plyLoader.load(plyURI, function (geometry) {

            console.log('ply loaded', geometry);

            geometry.computeVertexNormals();

            var material = new THREE.MeshStandardMaterial({
                vertexColors: true
            });
            const mesh = new THREE.Mesh(geometry, material);

            mesh.position.x = position.x;
            mesh.position.y = position.y;
            mesh.position.z = position.z;

            mesh.rotation.x = rotation.x;
            mesh.rotation.y = rotation.y;
            mesh.rotation.z = rotation.z;

            mesh.scale.x = scale.x;
            mesh.scale.y = scale.y;
            mesh.scale.z = scale.z;

            mesh.castShadow = true;
            mesh.receiveShadow = true;

            scene.add(mesh);
        });
    }

    async function generateNewObject(inputText) {
        const plyURI = await generate3DObject(inputText);

        const playerDirection = getForwardVector();
        const newObjectPosition = new THREE.Vector3();
        newObjectPosition.copy(playerCollider.end).addScaledVector(playerDirection, playerCollider.radius * 3);

        const ROT_X = - Math.PI / 2;
        const SCALE = 1;

        await uploadPly(inputText, plyURI, {
            type: 'object',
            position: {
                x: newObjectPosition.x,
                y: newObjectPosition.y,
                z: newObjectPosition.z
            },
            rotation: {
                x: ROT_X,
                y: 0,
                z: 0
            },
            scale: {
                x: SCALE,
                y: SCALE,
                z: SCALE
            }
        });

        addToGeneratedObjects(inputText, plyURI);

        const plyLoader = new PLYLoader();
        plyLoader.load(plyURI, function (geometry) {

            console.log('ply loaded', geometry);

            geometry.computeVertexNormals();

            var material = new THREE.MeshStandardMaterial({
                vertexColors: true
            });
            const mesh = new THREE.Mesh(geometry, material);

            mesh.rotation.x = ROT_X;
            mesh.scale.multiplyScalar(SCALE);

            mesh.castShadow = true;
            mesh.receiveShadow = true;

            mesh.position.copy(newObjectPosition);

            scene.add(mesh);
        });
    }

    const ENVIRONMENT_ROT_X = - Math.PI / 2;
    const ENVIRONMENT_SCALE = 100;

    async function generateNewEnvironment(inputText) {

        const plyURI = await generate3DObject(inputText);

        await uploadPly(inputText, plyURI, {
            type: 'environment',
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            rotation: {
                x: ENVIRONMENT_ROT_X,
                y: 0,
                z: 0
            },
            scale: {
                x: ENVIRONMENT_SCALE,
                y: ENVIRONMENT_SCALE,
                z: ENVIRONMENT_SCALE
            }
        });

        addToGeneratedObjects(inputText, plyURI);

        currentEnvironmentPrompt = inputText;
        currentEnvironmentDataURI = plyURI;

        if (currentEnvironmentScene) {
            scene.remove(currentEnvironmentScene);
        }

        if (octreeHelper) {
            scene.remove(octreeHelper);
        }

        // TODO: maybe a way to clear an Octree? Or create a subclass to do that
        worldOctree = new Octree();

        loadPlyEnvironment(plyURI, () => {
            console.log('new environment loaded');

            octreeHelper = new OctreeHelper(worldOctree);
            octreeHelper.visible = false;
            scene.add(octreeHelper);

            // reset player's xyz position
            respawnPlayerPosition();
        });
    }

    function loadPlyEnvironment(plyURI, callback) {
        const plyLoader = new PLYLoader();
        plyLoader.load(plyURI, function (geometry) {

            console.log('ply loaded', geometry);

            geometry.computeVertexNormals();

            var material = new THREE.MeshStandardMaterial({
                vertexColors: true
            });
            const mesh = new THREE.Mesh(geometry, material);

            mesh.rotation.x = ENVIRONMENT_ROT_X;
            mesh.scale.multiplyScalar(ENVIRONMENT_SCALE);

            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const meshScene = new THREE.Scene();

            currentEnvironmentScene = meshScene;

            meshScene.add(mesh);

            scene.add(meshScene);

            console.log('mesh from ply', mesh);

            worldOctree.fromGraphNode(meshScene);

            meshScene.traverse(child => {

                if (child.isMesh) {

                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.material.map) {

                        child.material.map.anisotropy = 4;

                    }

                }

            });

            callback();
        });
    }

    window.generate3DObject = generate3DObject;
    window.generateNewEnvironment = generateNewEnvironment;

    function getObjectUrl(object) {
        return `https://w3s.link/ipfs/${object.cid}/${object.filename}`;
    }

    function findMostRecentEnvironment(objects) {
        const filteredObjects = objects.filter(obj => obj.object.type == 'environment');

        if (filteredObjects.length == 0) {
            return null; // No objects with the given name found
        }

        // Sort objects by timestamp in descending order
        filteredObjects.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return filteredObjects[0]; // Return the most recent object
    }

    async function loadScene() {

        console.log('loading scene');

        const queryObjectsResponse = await queryObjects();
        const objects = queryObjectsResponse.objects;

        console.log('queryObjectsResponse', queryObjectsResponse);

        const environmentObject = findMostRecentEnvironment(objects);

        let plyURI = './models/ply/an underwater temple.ply';

        if (environmentObject) {
            plyURI = getObjectUrl(environmentObject);
            respawnPlayerPosition();
        }

        // TODO: make loading screen where you load all the objects first before entering scene
        // loop through objects with type object
        for (const object of objects) {
            if (object.object.type == 'object') {
                registerObject(object);
            }
        }

        // TODO: read object position, rotation, scale

        loadPlyEnvironment(plyURI, () => {
            octreeHelper = new OctreeHelper(worldOctree);
            octreeHelper.visible = false;
            scene.add(octreeHelper);

            const gui = new GUI({ width: 200 });
            gui.add({ debug: false }, 'debug')
                .onChange(function (value) {
                    octreeHelper.visible = value;
                });

            animate();
        });
    }

    loadScene();

    function respawnPlayerPosition() {
        playerCollider.start.set(0, CAPSULE_Y1, 0);
        playerCollider.end.set(0, CAPSULE_Y2, 0);
        playerCollider.radius = 0.35;
        camera.position.copy(playerCollider.end);
        camera.rotation.set(0, 0, 0);
    }

    function teleportPlayerIfOob() {

        const LEVEL = -200;
        if (camera.position.y <= LEVEL) {
            respawnPlayerPosition();
        }

    }

    let secondsPassed;
    let oldTimeStamp;

    function animate() {
        var timeStamp = Date.now();

        if (!oldTimeStamp) {
            oldTimeStamp = timeStamp;
            requestAnimationFrame(animate);
            return;
        }
        // Calculate the number of seconds passed since the last frame
        secondsPassed = (timeStamp - oldTimeStamp) / 1000.0;
        oldTimeStamp = timeStamp;

        const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;

        // we look for collisions in substeps to mitigate the risk of
        // an object traversing another too quickly for detection.

        for (let i = 0; i < STEPS_PER_FRAME; i++) {

            controls(deltaTime);

            updatePlayer(deltaTime);

            updateSpheres(deltaTime);

            teleportPlayerIfOob();

        }

        renderer.render(scene, camera);

        stats.update();

        requestAnimationFrame(animate);

        TWEEN.update();

        const playerRotationSpeed = 5;
        const rotationStep = playerRotationSpeed * secondsPassed;

        for (const pId in players) {
            var p = players[pId];

            if (p.avatar) {
                p.avatar.quaternion.rotateTowards(new THREE.Quaternion(
                    p.info.quaternion.x,
                    p.info.quaternion.y,
                    p.info.quaternion.z,
                    p.info.quaternion.w
                ), rotationStep);
            }
        }
    }

    window.addEventListener('resize', onWindowResize, false);

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

    }
}