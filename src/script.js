import "./style.css";
import {
  Vector2,
  Vector3,
  Scene,
  Group,
  BoxBufferGeometry,
  ConeBufferGeometry,
  Raycaster,
  DirectionalLight,
  AmbientLight,
  PerspectiveCamera,
  Mesh,
  SphereGeometry,
  MeshLambertMaterial,
  MeshNormalMaterial,
  AudioListener,
  PositionalAudio,
  AudioLoader,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import Stats from "three/examples/jsm/libs/stats.module";
import { GUI } from "dat.gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PositionalAudioHelper } from "./PositionalAudioHelper";

const stats = Stats();
document.body.appendChild(stats.dom);

// load headphone model
const loader = new GLTFLoader();
loader.load(
  "./headphones.glb",
  function (gltf) {
    const headphones = gltf.scene.children[0];
    headphones.scale.setScalar(5);
    headphones.position.z -= 1.2;
    headphones.position.y += 0.5;
    scene.add(gltf.scene);
  },
  undefined,
  function (error) {
    console.error(error);
  }
);

// mouse position and raycasting
const pointer = new Vector2();
const raycaster = new Raycaster();
function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
window.addEventListener("pointermove", onPointerMove);

// canvas
const canvas = document.querySelector("canvas.webgl");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// scene & lights
const scene = new Scene();
const directionalLight = new DirectionalLight(0xffffff, 0.1);
scene.add(directionalLight);
const ambientLight = new AmbientLight("#AA4A44", 0.9);
scene.add(ambientLight);

// camera
const camera = new PerspectiveCamera(51, 1, 0.1, 2000);
camera.position.z = 20;
scene.add(camera);

// Head in the middle of the screen
const head = new Mesh(new SphereGeometry(1, 20), new MeshLambertMaterial(), {
  color: "#000000",
});

// Wall to demonstrate oclusion
const wall = new Mesh(
  new BoxBufferGeometry(10, 5, 1),
  new MeshLambertMaterial(),
  { color: "#ff00ff" }
);
wall.rotateOnAxis(new Vector3(0, 1, 0), Math.PI / 2);
wall.translateZ(-3);
const wallProps = {
  show: false,
};

// positional audio
const listener = new AudioListener();
const sound = new PositionalAudio(listener);
const audioLoader = new AudioLoader();
const directionalCone = {
  innerAngle: 360,
  outerAngle: 0,
  outerGain: 0,
};
const soundProps = {
  refDistance: 1,
  distanceModel: "inverse",
  panningModel: "HRTF",
};

audioLoader.load("./forest.mp3", function (buffer) {
  sound.setBuffer(buffer);
  sound.setLoop(true);
  sound.setVolume(10);
  sound.setDirectionalCone(
    directionalCone.innerAngle,
    directionalCone.outerAngle,
    directionalCone.outerGain
  );
  sound.setRefDistance(soundProps.refDistance);
  sound.setDistanceModel(soundProps.distanceModel);
});
const positionalAudioHelper = new PositionalAudioHelper(sound, 20, 100, 100);

positionalAudioHelper.material[0].setValues({ visible: true });

sound.rotateOnAxis(new Vector3(1, 0, 0), Math.PI / 2);

// Source object
const cubeGeo = new BoxBufferGeometry(0.5, 0.5, 0.5, 5, 5, 5);
const sourcePivotMesh1 = new Mesh(cubeGeo, new MeshNormalMaterial());
scene.add(sourcePivotMesh1);

const coneProps = { height: 3 };
const cone1Geo = new ConeBufferGeometry(1, coneProps.height, 32);
cone1Geo.translate(0, -(coneProps.height / 2), 0);
const source1 = new Mesh(cone1Geo, new MeshNormalMaterial({ wireframe: true }));
source1.name = "source1";
source1.add(sound);

sourcePivotMesh1.add(source1);
sourcePivotMesh1.name = "audioSwitch1";

const source1Group = new Group();
source1Group.add(sourcePivotMesh1);
source1Group.position.x += 7;
source1Group.rotateOnAxis(new Vector3(0, 0, 1), -(Math.PI / 2));

const headPivotGroup = new Group();
headPivotGroup.add(source1Group);

scene.add(headPivotGroup);
scene.add(head);

// Renderer
const renderer = new WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);

const orbitControls = new OrbitControls(camera, renderer.domElement);
const controls = new TransformControls(camera, renderer.domElement);
controls.mode = "translate";
scene.add(controls);

// GUI
const gui = new GUI();
const firstFolder = gui.addFolder("Rotate source around center");
firstFolder.add(source1Group.rotation, "x", 0, Math.PI * 2).name("rotate X");
firstFolder.add(source1Group.rotation, "y", 0, Math.PI * 2).name("rotate Y");
firstFolder.add(source1Group.rotation, "z", 0, Math.PI * 2).name("rotate Z");

const secondFolder = gui.addFolder("Rotate source around head");
secondFolder.add(headPivotGroup.rotation, "x", 0, Math.PI * 2).name("rotate X");
secondFolder.add(headPivotGroup.rotation, "y", 0, Math.PI * 2).name("rotate Y");
secondFolder.add(headPivotGroup.rotation, "z", 0, Math.PI * 2).name("rotate Z");
secondFolder.add(headPivotGroup.position, "x", -14, 7, 0.1).name("translate X");
secondFolder.add(headPivotGroup.position, "y", -14, 7, 0.1).name("translate Y");
secondFolder.add(headPivotGroup.position, "z", -14, 7, 0.1).name("translate Z");

const soundSourceFolder = gui.addFolder("Sound source settings");

const setDirectionalCone = (directionalCone) => {
  sound.setDirectionalCone(
    directionalCone.innerAngle,
    directionalCone.outerAngle,
    directionalCone.outerGain
  );
};

soundSourceFolder
  .add(soundProps, "panningModel", ["HRTF", "equalpower"])
  .onChange((panningModel) => {
    sound.panner.panningModel = panningModel;
  })
  .name("Panning model}");

soundSourceFolder
  .add(soundProps, "refDistance", 1, 30)
  .onChange((refDist) => {
    const source1 = scene.getObjectByName("source1", true);
    const newConeGeo = new ConeBufferGeometry(1, refDist, 32);
    newConeGeo.translate(0, -(refDist / 2), 0);
    sound.setRefDistance(refDist);
    source1.geometry.copy(newConeGeo);
  })
  .name("Ref Distance");
soundSourceFolder
  .add(soundProps, "distanceModel", ["linear", "inverse", "exponential"])
  .onChange((distModel) => {
    sound.setDistanceModel(distModel);
  })
  .name("Distance model");
soundSourceFolder
  .add(directionalCone, "innerAngle", 0, 360)
  .name("Cone inner angle")
  .onChange(() => {
    setDirectionalCone(directionalCone);
  });
soundSourceFolder
  .add(directionalCone, "outerAngle", 0, 360)
  .name("Cone outer angle")
  .onChange(() => {
    setDirectionalCone(directionalCone);
  });
soundSourceFolder
  .add(directionalCone, "outerGain", 0, 1)
  .name("Cone outer gain")
  .onChange(() => {
    setDirectionalCone(directionalCone);
  });
soundSourceFolder
  .add(controls, "mode", ["rotate", "translate"])
  .name("controls");
soundSourceFolder.open();

const environmentFolder = gui.addFolder("Environemnt");
environmentFolder
  .add(wallProps, "show", ["no", "yes"])
  .onChange((showOrNo) => {
    showOrNo === "yes" ? scene.add(wall) : scene.remove(wall);
  })
  .name("Show wall");

// events
const onSelectSource = (e) => {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  const audioSwitch = intersects.find((o) => o.object.name === "audioSwitch1");
  if (audioSwitch) {
    if (sound.isPlaying) {
      sound.stop();
      sound.remove(positionalAudioHelper);
    } else {
      sound.play();
      sound.add(positionalAudioHelper);
    }
  }

  const source = intersects.find(
    (o) => o.object.name === "source1" || o.object.name === "source1Group"
  );

  source || audioSwitch
    ? (orbitControls.enabled = false)
    : (orbitControls.enabled = true);

  if (source) {
    controls.attach(source.object.parent.parent);
  } else {
    controls.detach();
  }
};
window.addEventListener("click", onSelectSource);

// Animate
const tick = () => {
  stats.update();
  positionalAudioHelper.update();
  gui.updateDisplay();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
};

const resetWindow = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
window.addEventListener("resize", resetWindow, false);
resetWindow();
tick();
