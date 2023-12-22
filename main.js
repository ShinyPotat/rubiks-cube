// Importaciones de Three.js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Configuración inicial de la escena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbebcbe);

// Configuración de la cámara
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.lookAt(0, 0, 0);
camera.position.set(18, 18, 18);

// Configuración del renderizador
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Constantes para los cubos
const gap = 0.5;
const cubeSize = 5;
const colors = {
  white: new THREE.MeshBasicMaterial({ color: "#fcfcfc" }),
  red: new THREE.MeshBasicMaterial({ color: "#ff0000" }),
  blue: new THREE.MeshBasicMaterial({ color: "#0000ff" }),
  orange: new THREE.MeshBasicMaterial({ color: "#ff8c00" }),
  green: new THREE.MeshBasicMaterial({ color: "#008000" }),
  yellow: new THREE.MeshBasicMaterial({ color: "#ffff00" }),
  black: new THREE.MeshBasicMaterial({ color: "#000000" }),
};

// Creación de los cubos en la escena
createRubik();

// Configuración de los controles de órbita y raycaster para interacción
const orbitControls = new OrbitControls(camera, renderer.domElement);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedCube = null;
let initialPointer = null;

// Manejo de eventos del mouse
document.addEventListener("mousedown", onMouseDown, false);
document.addEventListener("mouseup", onMouseUp, false);
document.addEventListener("mousemove", onMouseMove, false);

// Bucle principal del juego
gameLoop();

// Función para crear todos los cubos
function createRubik() {
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        createSingleCube(x, y, z);
      }
    }
  }
}

// Función para crear un único cubo
function createSingleCube(x, y, z) {
  const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const material = [
    x === 2 ? colors.white : colors.black, // izquierda
    x === 0 ? colors.yellow : colors.black, // derecha
    y === 2 ? colors.blue : colors.black, // arriba
    y === 0 ? colors.orange : colors.black, // abajo
    z === 2 ? colors.green : colors.black, // adelante
    z === 0 ? colors.red : colors.black, // atrás
  ];
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(
    (x - 1) * (cubeSize + gap),
    (y - 1) * (cubeSize + gap),
    (z - 1) * (cubeSize + gap)
  );

  // Crear y añadir bordes al cubo
  var lineGeometry = new THREE.EdgesGeometry(cube.geometry);
  var lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 5,
  });
  var border = new THREE.LineSegments(lineGeometry, lineMaterial);
  cube.add(border);

  scene.add(cube);
}

function restartSelected() {
  selectedCube = null;
  scene.children
    .filter((child) => child.type === "Mesh")
    .forEach((mesh) => {
      mesh.children[0].material.color = new THREE.Color(0x000000);
    });
}

function onMouseUp(event) {
  orbitControls.enabled = true;
  restartSelected();
  initialPointer = null;
}

// Función auxiliar para actualizar el raycaster y obtener los objetos intersectados
function updateRaycasterAndGetIntersects(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  return raycaster.intersectObjects(scene.children, false)
    .filter((intersect) => intersect.object.type === "Mesh");
}

function onMouseDown(event) {
  restartSelected();

  const intersects = updateRaycasterAndGetIntersects(event);

  if (intersects.length > 0) {
    orbitControls.enabled = false;

    selectedCube = intersects[0].object;
    selectedCube.children[0].material.color = new THREE.Color(0xff0000);

    initialPointer = pointer;
  }
}

function onMouseMove(event) {
  if (selectedCube === null) {
    return;
  }

  const intersects = updateRaycasterAndGetIntersects(event);

  if (intersects.length > 0) {
    const secondCube = intersects[0].object;

    if (selectedCube === secondCube) {
      return;
    }

    secondCube.children[0].material.color = new THREE.Color(0xff0000);

    // TODO: no detecta bien el cursor
    const secondPointer = pointer;

    const difference = initialPointer.distanceToSquared(secondPointer);
  }
}


// Bucle principal del juego
function gameLoop() {
  requestAnimationFrame(gameLoop);
  orbitControls.update();
  renderer.render(scene, camera);
}
