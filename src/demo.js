import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from './loadMixamoAnimation.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { WindowAILLM } from './window_ai_llm';
import { GenerativeAgent } from './generative_agent';
import sceneConfig from './scene_config.json';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function startDemo() {
    console.log("sceneConfig", sceneConfig);

    const AVATAR_ID_1 = 'avatar1';
    const AVATAR_ID_2 = 'avatar2';

    const animations = [
        'Idle',
        'Jumping',
        'Chicken Dance',
        'Gangnam Style',
        'Samba Dancing',
        'Silly Dancing',
        'Snake Hip Hop Dance',
        'Twist Dance',
        'Wave Hip Hop Dance',

        // 'Running',
        // 'Walking',
    ];

    async function runConversation(agents, initialObservation) {
        // Runs a conversation between agents
        let [, observation, animation] = await agents[1].generateReaction(initialObservation);

        if (animation) {
            playAnimation(agents[1]._id, agents[1].currentAnimation);
        }

        window.receiveChatMessage({
            message: observation,
        });

        console.log(observation);
        let turns = 0;
        while (true) {
            let breakDialogue = false;
            for (const agent of agents) {
                const [stayInDialogue, newObservation, newAnimation] = await agent.generateDialogueResponse(observation);
                console.log(newObservation);
                observation = newObservation;
                if (!stayInDialogue) {
                    breakDialogue = true;
                }

                window.receiveChatMessage({
                    message: observation,
                });

                console.log(newObservation);
                if (newAnimation) {
                    playAnimation(agent._id, agent.currentAnimation);
                }
            }
            if (breakDialogue) {
                break;
            }
            turns += 1;

            await sleep(3000);
        }
    }

    async function runAgents() {
        const llm = new WindowAILLM({});
        const agent1 = new GenerativeAgent({
            name: 'Alice',
            age: 25,
            traits: '',
            llm: llm,
            currentAnimation: 'Idle',
            animations: animations,
        });
        const agent2 = new GenerativeAgent({
            name: 'Bob',
            age: 25,
            traits: '',
            llm: llm,
            currentAnimation: 'Idle',
            animations: animations,
        });

        agent1._id = AVATAR_ID_1;
        agent2._id = AVATAR_ID_2;

        runConversation([agent1, agent2], 'You are on a dance floor. There is another person near you. You are encouraged to dance.');
    }

    // runAgents();

    function getAnimationUrl(name) {
        return `./animations/${name}.fbx`;
    }

    const avatarMap = {};

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;

    // https://blender.stackexchange.com/questions/34728/materials-from-blender-to-three-js-colors-seem-to-be-different
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;

    document.body.appendChild(renderer.domElement);

    // camera
    const camera = new THREE.PerspectiveCamera(30.0, window.innerWidth / window.innerHeight, 0.1, 2000.0);
    camera.position.set(0.0, 1.0, 5.0);

    // camera controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.target.set(0.0, 1.0, 0.0);
    controls.update();

    // scene
    const scene = new THREE.Scene();

    // light
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    scene.background = new THREE.Color(sceneConfig.background.color);

    if (sceneConfig.background.skybox_path) {
        // load cubemap
        const skybox = new THREE.CubeTextureLoader()
            .setPath(sceneConfig.background.skybox_path)
            .load([
                'px.jpg',
                'nx.jpg',
                'py.jpg',
                'ny.jpg',
                'pz.jpg',
                'nz.jpg',
            ]);
        scene.background = skybox;
    }

    // TODO: reorient panorama skybox to match orentation of cubemap skybox
    // TODO: support rotation of skybox on scene config
    if (sceneConfig.background.skybox_url) {
        // load panorama
        let texture = new THREE.TextureLoader().load(sceneConfig.background.skybox_url);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
    }

    // const defaultModelUrl = './models/VRM1_Constraint_Twist_Sample.vrm';
    // const defaultModelUrl = './models/Male1.vrm';
    // const defaultModelUrl = './models/Female1.vrm';
    const model1Url = sceneConfig.character.vrm_url;
    // const model2Url = './models/Male1.vrm';

    // gltf and vrm
    let currentVrm = undefined;
    let currentAnimationUrl = undefined;
    let currentMixer = undefined;

    const helperRoot = new THREE.Group();
    helperRoot.renderOrder = 10000;
    // scene.add(helperRoot);

    function disposeVRM(vrm) {
        scene.remove(vrm.scene);

        VRMUtils.deepDispose(vrm.scene);
    }

    function loadVRM(modelUrl, callback) {

        const loader = new GLTFLoader();
        loader.crossOrigin = 'anonymous';

        helperRoot.clear();

        loader.register((parser) => {

            return new VRMLoaderPlugin(parser, { helperRoot: helperRoot, autoUpdateHumanBones: true });

        });

        loader.load(
            // URL of the VRM you want to load
            modelUrl,

            // called when the resource is loaded
            (gltf) => {

                console.log('Loaded gltf');

                // calling these functions greatly improves the performance
                VRMUtils.removeUnnecessaryVertices(gltf.scene);
                VRMUtils.removeUnnecessaryJoints(gltf.scene);

                const vrm = gltf.userData.vrm;

                console.log('vrm:');
                console.log(vrm);

                /*
                if (currentVrm) {

                    scene.remove(currentVrm.scene);

                    VRMUtils.deepDispose(currentVrm.scene);

                }
                */

                // put the model to the scene
                // currentVrm = vrm;
                // scene.add(vrm.scene);

                // Disable frustum culling
                vrm.scene.traverse((obj) => {

                    obj.frustumCulled = false;

                });

                /*
                if (currentAnimationUrl) {

                    loadFBX(currentAnimationUrl);

                }
                */

                // rotate if the VRM is VRM0.0
                VRMUtils.rotateVRM0(vrm);

                console.log(vrm);

                callback(null, {
                    gltf: gltf,
                    vrm: vrm,
                });

            },

            // called while loading is progressing
            (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),

            // called when loading has errors
            (error) => {
                console.error('Error loading gltf')
                console.error(error)
            },
        );

    }

    function playAnimation(id, animation) {
        const avatar = avatarMap[id];

        if (!avatar) {
            console.error('Avatar not found: ' + id);
            return;
        }

        const animationAction = avatar.animationActions[animation];

        if (!animationAction) {
            console.error('Animation action not found: ' + animation);
            return;
        }

        // skip if already playing same animation
        if (avatar.currentAnimationAction == animationAction) {
            return;
        }

        // fade out current animation
        const DURATION = 0.5;

        if (avatar.currentAnimationAction) {
            animationAction.reset();
            avatar.currentAnimationAction
                .crossFadeTo(animationAction, DURATION, true)
                .play();
        } else {
            animationAction.reset();
            animationAction.play();
        }

        avatar.currentAnimationAction = animationAction;
    }

    async function createAvatar(id, modelUrl) {
        const avatar = {
            id: id,
            modelUrl: modelUrl,
            gltf: undefined,
            vrm: undefined,
            mixer: undefined,
            animationActions: {},
            currentAnimationAction: null
        };

        avatarMap[id] = avatar;

        const data = await (function () {
            return new Promise((resolve, reject) => {
                loadVRM(modelUrl, (error, data) => {
                    resolve(data);
                });
            })
        })();

        avatar.gltf = data.gltf;
        avatar.vrm = data.vrm;
        avatar.mixer = new THREE.AnimationMixer(data.vrm.scene);
        avatar.mixer.timeScale = params.timeScale;

        // load animations
        for (var i = 0; i < animations.length; i++) {
            const animation = animations[i];
            const animationUrl = getAnimationUrl(animation);

            console.log('Loading animation: ' + animationUrl);

            const clip = await (function () {
                return new Promise((resolve, reject) => {
                    loadMixamoAnimation(animationUrl, avatar.vrm).then((clip) => {
                        resolve(clip);
                    });
                })
            })();

            avatar.animationActions[animation] = avatar.mixer.clipAction(clip);
        }

        return avatar;
    }

    async function initializeAvatars() {
        const avatar1 = await createAvatar(AVATAR_ID_1, model1Url);
        scene.add(avatar1.vrm.scene);
        avatar1.vrm.scene.position.set(0, 0, 0);
        // avatar1.vrm.scene.rotation.y = Math.PI / 2;

        playAnimation(AVATAR_ID_1, 'Idle');
    }

    initializeAvatars();

    // mixamo animation
    function loadFBX(animationUrl) {

        currentAnimationUrl = animationUrl;

        // create AnimationMixer for VRM
        currentMixer = new THREE.AnimationMixer(currentVrm.scene);

        // Load animation
        loadMixamoAnimation(animationUrl, currentVrm).then((clip) => {

            // Apply the loaded animation to mixer and play
            currentMixer.clipAction(clip).play();
            currentMixer.timeScale = params.timeScale;

        });

    }

    // helpers
    const gridColor = sceneConfig.grid.color;
    const gridHelper = new THREE.GridHelper(
        sceneConfig.grid.size, 
        sceneConfig.grid.divisions,
        gridColor,
        gridColor);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(5);
    // scene.add(axesHelper);

    // animate
    const clock = new THREE.Clock();

    function animate() {

        requestAnimationFrame(animate);

        const deltaTime = clock.getDelta();

        // loop through avatarMap
        for (var id in avatarMap) {
            const avatar = avatarMap[id];

            if (avatar.mixer) {
                avatar.mixer.update(deltaTime);
            }

            if (avatar.vrm) {
                avatar.vrm.update(deltaTime);
            }
        }

        renderer.render(scene, camera);

    }

    animate();

    const params = {

        timeScale: 1.0,

    };

    window.addEventListener('resize', onWindowResize, false);

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

    }
}