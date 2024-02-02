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
const gap = 0.25;
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

// Crear variabes globales
let selectedCube = null;
let secondCube = null;
let firstCubeCenter = null;
let normalVector = null;

// Variables para la animación
let isAnimating = false;
let animationGroup;
let rotationAxis;
let targetRotation = 0;
let currentRotation = 0;
let rotationSpeed = 0.1;

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
  secondCube = null;
  scene.children
    .filter(
      (child) => child.type === "Mesh" && child.geometry.type != "PlaneGeometry"
    )
    .forEach((mesh) => {
      mesh.children[0].material.color = new THREE.Color(0x000000);
    });
}

function onMouseUp(event) {
  orbitControls.enabled = true;
  restartSelected();
}

// Función auxiliar para actualizar el raycaster y obtener los objetos intersectados
function updateRaycasterAndGetIntersects(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  return raycaster
    .intersectObjects(scene.children, false)
    .filter((intersect) => intersect.object.type === "Mesh");
}

function onMouseDown(event) {
  const intersects = updateRaycasterAndGetIntersects(event);

  if (intersects.length > 0) {
    orbitControls.enabled = false;

    selectedCube = intersects[0].object;

    firstCubeCenter = getCubeCenter(selectedCube);
    normalVector = getNormalVector(intersects[0]);
  }
}

function onMouseMove(event) {
  // No está animando
  if (isAnimating) return;

  // No se ha clickado aún
  if (selectedCube === null) {
    return;
  }

  // Ya hay un segundo objeto cruzado
  if (secondCube != null) {
    return;
  }

  const intersects = updateRaycasterAndGetIntersects(event);

  if (intersects.length > 0) {
    secondCube = intersects[0].object;

    if (selectedCube === secondCube) {
      secondCube = null;
      return;
    }

    let secondCubeCenter = getCubeCenter(secondCube);

    const centersVector = new THREE.Vector3().subVectors(
      secondCubeCenter,
      firstCubeCenter
    );

    const plane = createPlaneFromVectors(normalVector, centersVector);

    const selectedCubes = getCubesInPlane(plane);

    if (selectedCubes.length != 9) {
      secondCube = null;
      return;
    }

    selectedCube.children[0].material.color = new THREE.Color(0xff0000);
    secondCube.children[0].material.color = new THREE.Color(0xff0000);

    // Crear grupo para rotar todos los cubos
    const group = new THREE.Group();
    scene.add(group);

    selectedCubes.forEach((cube) => {
      group.add(cube);
    });

    const rotationAngle = Math.PI / 2;

    startRotationAnimation(group, plane.normal, rotationAngle);
  }
}

function startRotationAnimation(group, axis, angle) {
  if (isAnimating) return; // Evita iniciar una nueva animación si ya está en curso

  animationGroup = group;
  rotationAxis = axis;
  targetRotation = angle;
  currentRotation = 0;
  isAnimating = true;

  animateRotation();
}

function animateRotation() {
  if (!isAnimating) return;

  // Calcula el ángulo de rotación para este frame
  let step = rotationSpeed;
  currentRotation += step;

  if (currentRotation >= targetRotation) {
    step -= currentRotation - targetRotation; // Ajusta el último paso de rotación
    isAnimating = false;
  }

  animationGroup.rotateOnWorldAxis(rotationAxis, step);

  if (isAnimating) {
    requestAnimationFrame(animateRotation);
  } else {
    // Finalizar animación: desmonta los cubos del grupo y limpia
    while (animationGroup.children.length > 0) {
      const child = animationGroup.children[0];
      child.updateMatrixWorld(); // Asegura que la transformación del child sea actualizada
      scene.attach(child); // Vuelve a adjuntar el cubo a la escena directamente
    }
    scene.remove(animationGroup);
    restartSelected();
  }
}

function getCubesInPlane(plane) {
  // Margen de deteccion
  const epsilon = 0.1;
  const intersectingCubes = [];

  // Comprobar todos los cubos de la escena
  scene.children.forEach((child) => {
    if (child.isMesh && child.geometry.type === "BoxGeometry") {
      // Calcula el centro del cubo
      const cubeCenter = getCubeCenter(child);

      // Comprueba si el centro del cubo está lo suficientemente cerca del plano
      if (Math.abs(plane.distanceToPoint(cubeCenter)) < epsilon) {
        intersectingCubes.push(child);
      }
    }
  });

  return intersectingCubes;
}

function createPlaneFromVectors(vector1, vector2) {
  // Calcula la normal del plano como el producto de ambos vectores
  const normal = new THREE.Vector3().crossVectors(vector1, vector2).normalize();

  // Usar el primer vector como punto en el plano
  const pointOnPlane = firstCubeCenter;

  // Crear el plano
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    normal,
    pointOnPlane
  );

  return plane;
}

// Calcula la normal del cubo seleccionado
function getNormalVector(intersect) {
  const face = intersect.face;
  const normal = face.normal.clone();
  return normal;
}

// Calcula el centro de un cubo
function getCubeCenter(mesh) {
  var middle = new THREE.Vector3();
  var geometry = mesh.geometry;

  geometry.computeBoundingBox();

  middle.x = geometry.boundingBox.max.x + geometry.boundingBox.min.x;
  middle.y = geometry.boundingBox.max.y + geometry.boundingBox.min.y;
  middle.z = geometry.boundingBox.max.z + geometry.boundingBox.min.z;

  // Aplica la transformación del objeto para obtener las coordenadas del mundo
  middle.applyMatrix4(mesh.matrixWorld);

  return middle;
}

// Bucle principal del juego
function gameLoop() {
  requestAnimationFrame(gameLoop);
  orbitControls.update();
  renderer.render(scene, camera);
}
