// P31 Smallball: 3D Training Environment Rendering
// Immersive facility backgrounds for each training station
// Three.js-based with dynamic lighting and atmospheric effects

import * as THREE from 'three';

// ============================================
// TRAINING FACILITY ENVIRONMENTS
// ============================================

export type TrainingFacilityTier = 'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX';

export interface FacilityEnvironment {
  scene: THREE.Group;
  camera: THREE.PerspectiveCamera;
  lighting: THREE.Group;
  update: (time: number) => void;
}

// ============================================
// IRON MIKE - BATTING CAGE
// ============================================

export function createBattingCageEnvironment(tier: TrainingFacilityTier): FacilityEnvironment {
  const scene = new THREE.Group();

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(30, 40);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: tier === 'PRO_COMPLEX' ? 0x2a2a2a : 0x4a4a4a,
    roughness: 0.8,
    metalness: tier === 'PRO_COMPLEX' ? 0.2 : 0.0,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Cage netting (wireframe)
  const cageGeometry = new THREE.BoxGeometry(20, 15, 35, 4, 2, 4);
  const cageMaterial = new THREE.MeshBasicMaterial({
    color: 0x333333,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const cage = new THREE.Mesh(cageGeometry, cageMaterial);
  cage.position.y = 7.5;
  scene.add(cage);

  // Iron Mike machine
  const machineGroup = new THREE.Group();
  machineGroup.position.set(0, 0, -12);

  // Base
  const baseGeo = new THREE.CylinderGeometry(2, 2.5, 1, 16);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.5;
  machineGroup.add(base);

  // Arm
  const armGeo = new THREE.BoxGeometry(0.5, 4, 0.5);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5 });
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.position.y = 4;
  machineGroup.add(arm);

  // Wheel housing
  const wheelGeo = new THREE.CylinderGeometry(1, 1, 2, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 });
  const wheel = new THREE.Mesh(wheelGeo, wheelMat);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(0, 6, 1);
  machineGroup.add(wheel);

  scene.add(machineGroup);

  // Baseball bucket
  const bucketGeo = new THREE.CylinderGeometry(1.5, 1.2, 3, 16);
  const bucketMat = new THREE.MeshStandardMaterial({ color: 0xff6600 });
  const bucket = new THREE.Mesh(bucketGeo, bucketMat);
  bucket.position.set(5, 1.5, 8);
  scene.add(bucket);

  // Baseballs in bucket
  for (let i = 0; i < 8; i++) {
    const ballGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(
      5 + (Math.random() - 0.5) * 1.5,
      2.5 + Math.random() * 1,
      8 + (Math.random() - 0.5) * 1.5
    );
    scene.add(ball);
  }

  // Equipment based on tier
  if (tier === 'HS_GYM' || tier === 'PRO_COMPLEX') {
    // Weighted bats rack
    const rackGeo = new THREE.BoxGeometry(4, 0.2, 1);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(-8, 4, 5);
    rack.rotation.z = 0.3;
    scene.add(rack);

    // Bats
    for (let i = 0; i < 5; i++) {
      const batGeo = new THREE.CylinderGeometry(0.08, 0.05, 3, 8);
      const batMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const bat = new THREE.Mesh(batGeo, batMat);
      bat.position.set(-9 + i * 0.5, 4.5, 5);
      bat.rotation.z = 0.3;
      scene.add(bat);
    }
  }

  if (tier === 'PRO_COMPLEX') {
    // Video screens
    const screenGeo = new THREE.BoxGeometry(8, 4, 0.2);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x001133, emissiveIntensity: 0.3 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 10, -17);
    scene.add(screen);

    // High-speed cameras
    for (const pos of [[-8, 8, 0], [8, 8, 0], [0, 12, -5]]) {
      const camGeo = new THREE.BoxGeometry(0.5, 0.5, 1);
      const camMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const cam = new THREE.Mesh(camGeo, camMat);
      cam.position.set(pos[0], pos[1], pos[2]);
      cam.lookAt(0, 3, 0);
      scene.add(cam);
    }
  }

  // Lighting
  const lighting = new THREE.Group();

  // Ambient
  const ambient = new THREE.AmbientLight(0x404040, 0.3);
  lighting.add(ambient);

  // Overhead lights
  for (let x = -8; x <= 8; x += 8) {
    const light = new THREE.SpotLight(0xffffee, tier === 'PRO_COMPLEX' ? 2 : 1);
    light.position.set(x, 14, 0);
    light.angle = Math.PI / 3;
    light.penumbra = 0.3;
    lighting.add(light);
  }

  // Backdrop light
  const backdropLight = new THREE.DirectionalLight(0xaaccff, 0.5);
  backdropLight.position.set(0, 5, -20);
  lighting.add(backdropLight);

  scene.add(lighting);

  // Camera
  const camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 100);
  camera.position.set(0, 3, 10);
  camera.lookAt(0, 3, 0);

  return {
    scene,
    camera,
    lighting,
    update: (time: number) => {
      // Subtle Iron Mike idle animation
      machineGroup.rotation.y = Math.sin(time * 0.5) * 0.02;
    },
  };
}

// ============================================
// TRACK & SLEDS - SPEED TRAINING
// ============================================

export function createTrackEnvironment(tier: TrainingFacilityTier): FacilityEnvironment {
  const scene = new THREE.Group();

  // Track surface
  const trackGeo = new THREE.PlaneGeometry(10, 50);
  const trackMat = new THREE.MeshStandardMaterial({
    color: tier === 'PRO_COMPLEX' ? 0xcc0000 : 0x8b4513,
    roughness: 0.9,
  });
  const track = new THREE.Mesh(trackGeo, trackMat);
  track.rotation.x = -Math.PI / 2;
  scene.add(track);

  // Lane markings
  const lineGeo = new THREE.PlaneGeometry(0.1, 50);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const x of [-2, 0, 2]) {
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.01, 0);
    scene.add(line);
  }

  // Sleds
  for (let i = 0; i < 4; i++) {
    const sledGroup = new THREE.Group();
    sledGroup.position.set((i - 1.5) * 2.5, 0, 15);

    // Sled base
    const baseGeo = new THREE.BoxGeometry(1.5, 0.5, 2);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.25;
    sledGroup.add(base);

    // Weights on sled
    const weightGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
    const weightMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7 });
    for (let j = 0; j < 3; j++) {
      const weight = new THREE.Mesh(weightGeo, weightMat);
      weight.position.set(0, 0.6 + j * 0.25, 0);
      sledGroup.add(weight);
    }

    scene.add(sledGroup);
  }

  // Starting blocks
  const blockGeo = new THREE.BoxGeometry(0.8, 0.3, 0.5);
  const blockMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  for (let i = 0; i < 3; i++) {
    const block = new THREE.Mesh(blockGeo, blockMat);
    block.position.set((i - 1) * 2, 0.15, -20);
    scene.add(block);
  }

  // Finish line
  const finishGeo = new THREE.PlaneGeometry(10, 0.5);
  const finishMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const finish = new THREE.Mesh(finishGeo, finishMat);
  finish.rotation.x = -Math.PI / 2;
  finish.position.set(0, 0.02, 22);
  scene.add(finish);

  // Timing equipment (tier-based)
  if (tier !== 'SANDLOT') {
    const timerGeo = new THREE.BoxGeometry(3, 2, 0.5);
    const timerMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const timer = new THREE.Mesh(timerGeo, timerMat);
    timer.position.set(6, 3, 22);
    scene.add(timer);

    // Digital display
    const displayGeo = new THREE.PlaneGeometry(2, 1);
    const displayMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const display = new THREE.Mesh(displayGeo, displayMat);
    display.position.set(6, 3, 21.74);
    scene.add(display);
  }

  // Bleachers for higher tiers
  if (tier === 'PRO_COMPLEX') {
    for (let row = 0; row < 3; row++) {
      const bleacherGeo = new THREE.BoxGeometry(20, 1, 2);
      const bleacherMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
      const bleacher = new THREE.Mesh(bleacherGeo, bleacherMat);
      bleacher.position.set(0, row * 1.5, 30 + row);
      scene.add(bleacher);
    }
  }

  // Environment - sky
  const skyGeo = new THREE.SphereGeometry(100, 32, 32);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Lighting
  const lighting = new THREE.Group();
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(10, 50, 20);
  sun.castShadow = true;
  lighting.add(sun);

  const ambient = new THREE.AmbientLight(0x404040, 0.5);
  lighting.add(ambient);

  scene.add(lighting);

  // Camera
  const camera = new THREE.PerspectiveCamera(70, 16/9, 0.1, 200);
  camera.position.set(0, 3, -15);
  camera.lookAt(0, 1, 20);

  return {
    scene,
    camera,
    lighting,
    update: (time: number) => {
      // Wind effect on finish line banner (if exists)
    },
  };
}

// ============================================
// BULLPEN - PITCHING
// ============================================

export function createBullpenEnvironment(tier: TrainingFacilityTier): FacilityEnvironment {
  const scene = new THREE.Group();

  // Mound
  const moundGeo = new THREE.CylinderGeometry(2.5, 3, 0.5, 32);
  const moundMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
  const mound = new THREE.Mesh(moundGeo, moundMat);
  mound.position.set(0, 0.25, 0);
  scene.add(mound);

  // Rubber
  const rubberGeo = new THREE.BoxGeometry(0.5, 0.05, 0.3);
  const rubberMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const rubber = new THREE.Mesh(rubberGeo, rubberMat);
  rubber.position.set(0, 0.51, 0);
  scene.add(rubber);

  // Home plate area
  const plateGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.05, 5);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(0, 0.025, 18.44); // 60'6" in scaled units
  plate.scale.set(0.5, 1, 0.5);
  scene.add(plate);

  // Target zone (strike zone mat)
  const targetGeo = new THREE.PlaneGeometry(2, 2);
  const targetMat = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.2,
  });
  const target = new THREE.Mesh(targetGeo, targetMat);
  target.rotation.x = -Math.PI / 2;
  target.position.set(0, 2.5, 18.44);
  scene.add(target);

  // Targets for Bullpen game
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.RingGeometry(0.5 + i * 0.3, 0.6 + i * 0.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xff0000 : i === 1 ? 0xffaa00 : 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 2.5, 18.44);
    scene.add(ring);
  }

  // Fencing
  const fenceGeo = new THREE.BoxGeometry(40, 8, 1);
  const fenceMat = new THREE.MeshBasicMaterial({
    color: 0x333333,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const fence = new THREE.Mesh(fenceGeo, fenceMat);
  fence.position.set(0, 4, 25);
  scene.add(fence);

  // Ball bucket
  const bucketGeo = new THREE.CylinderGeometry(1, 0.8, 2, 16);
  const bucketMat = new THREE.MeshStandardMaterial({ color: 0xff6600 });
  const bucket = new THREE.Mesh(bucketGeo, bucketMat);
  bucket.position.set(3, 1, 0);
  scene.add(bucket);

  // Equipment based on tier
  if (tier === 'HS_GYM' || tier === 'PRO_COMPLEX') {
    // Radar gun
    const radarGeo = new THREE.BoxGeometry(0.5, 0.3, 0.3);
    const radarMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const radar = new THREE.Mesh(radarGeo, radarMat);
    radar.position.set(-3, 2, 10);
    scene.add(radar);

    // Speed display
    const speedGeo = new THREE.PlaneGeometry(1, 0.5);
    const speedMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const speed = new THREE.Mesh(speedGeo, speedMat);
    speed.position.set(-3, 2.3, 9.74);
    scene.add(speed);
  }

  if (tier === 'PRO_COMPLEX') {
    // Tracking cameras
    for (const pos of [[-5, 8, 5], [5, 8, 5], [0, 8, 15]]) {
      const camGeo = new THREE.BoxGeometry(0.4, 0.3, 0.4);
      const camMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const cam = new THREE.Mesh(camGeo, camMat);
      cam.position.set(pos[0], pos[1], pos[2]);
      cam.lookAt(0, 2, 18);
      scene.add(cam);
    }

    // Rapsodo/similar tracking device
    const trackGeo = new THREE.BoxGeometry(2, 0.5, 2);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.position.set(0, 0.25, 15);
    scene.add(track);
  }

  // Lighting
  const lighting = new THREE.Group();
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  lighting.add(sun);

  const ambient = new THREE.AmbientLight(0x404040, 0.6);
  lighting.add(ambient);

  scene.add(lighting);

  // Camera
  const camera = new THREE.PerspectiveCamera(50, 16/9, 0.1, 100);
  camera.position.set(0, 4, -5);
  camera.lookAt(0, 2, 18);

  return {
    scene,
    camera,
    lighting,
    update: () => {},
  };
}

// ============================================
// POP-FLY - FIELDING
// ============================================

export function createFieldingEnvironment(tier: TrainingFacilityTier): FacilityEnvironment {
  const scene = new THREE.Group();

  // Field grass
  const fieldGeo = new THREE.CircleGeometry(40, 32);
  const fieldMat = new THREE.MeshStandardMaterial({
    color: 0x4a7c59,
    roughness: 1.0,
  });
  const field = new THREE.Mesh(fieldGeo, fieldMat);
  field.rotation.x = -Math.PI / 2;
  scene.add(field);

  // Pop-fly machine
  const machineGroup = new THREE.Group();
  machineGroup.position.set(0, 0, -15);

  // Base
  const baseGeo = new THREE.BoxGeometry(2, 1, 2);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.5;
  machineGroup.add(base);

  // Launch tube
  const tubeGeo = new THREE.CylinderGeometry(0.5, 0.5, 3, 16);
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  tube.position.y = 2;
  tube.rotation.x = -0.3;
  machineGroup.add(tube);

  // Ball hopper
  const hopperGeo = new THREE.CylinderGeometry(2, 0.5, 3, 16, 1, true);
  const hopperMat = new THREE.MeshStandardMaterial({ color: 0x666666, side: THREE.DoubleSide });
  const hopper = new THREE.Mesh(hopperGeo, hopperMat);
  hopper.position.y = 3.5;
  machineGroup.add(hopper);

  scene.add(machineGroup);

  // Fielding positions
  const positions = [
    { x: 0, z: 0, name: 'P' },
    { x: 0, z: 15, name: 'C' },
    { x: 15, z: 0, name: '1B' },
    { x: 10, z: 10, name: '2B' },
    { x: -10, z: 10, name: 'SS' },
    { x: -15, z: 0, name: '3B' },
    { x: 25, z: -5, name: 'LF' },
    { x: 0, z: -30, name: 'CF' },
    { x: -25, z: -5, name: 'RF' },
  ];

  positions.forEach(pos => {
    // Position marker
    const markerGeo = new THREE.RingGeometry(2, 2.5, 32);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(pos.x, 0.02, pos.z);
    scene.add(marker);
  });

  // Glove rack
  const rackGeo = new THREE.BoxGeometry(0.2, 6, 2);
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const rack = new THREE.Mesh(rackGeo, rackMat);
  rack.position.set(10, 3, -15);
  rack.rotation.z = 0.1;
  scene.add(rack);

  // Gloves on rack
  for (let i = 0; i < 6; i++) {
    const gloveGeo = new THREE.BoxGeometry(0.8, 0.3, 0.8);
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const glove = new THREE.Mesh(gloveGeo, gloveMat);
    glove.position.set(10 + i * 0.3, 1 + i, -15);
    glove.rotation.z = 0.1;
    scene.add(glove);
  }

  // Lighting
  const lighting = new THREE.Group();
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(20, 40, 10);
  sun.castShadow = true;
  lighting.add(sun);

  const ambient = new THREE.AmbientLight(0x404040, 0.5);
  lighting.add(ambient);

  scene.add(lighting);

  // Camera
  const camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 200);
  camera.position.set(0, 15, 20);
  camera.lookAt(0, 2, 0);

  return {
    scene,
    camera,
    lighting,
    update: (time: number) => {
      // Machine idle animation
      machineGroup.rotation.y = Math.sin(time * 0.3) * 0.05;
    },
  };
}

// ============================================
// FILM ROOM - ANALYSIS
// ============================================

export function createFilmRoomEnvironment(tier: TrainingFacilityTier): FacilityEnvironment {
  const scene = new THREE.Group();

  // Room dimensions
  const roomWidth = tier === 'PRO_COMPLEX' ? 20 : 15;
  const roomDepth = tier === 'PRO_COMPLEX' ? 25 : 18;
  const roomHeight = 8;

  // Floor
  const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.9,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

  // Back wall
  const backWallGeo = new THREE.PlaneGeometry(roomWidth, roomHeight);
  const backWall = new THREE.Mesh(backWallGeo, wallMat);
  backWall.position.set(0, roomHeight/2, -roomDepth/2);
  scene.add(backWall);

  // Side walls
  const sideWallGeo = new THREE.PlaneGeometry(roomDepth, roomHeight);

  const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-roomWidth/2, roomHeight/2, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(roomWidth/2, roomHeight/2, 0);
  scene.add(rightWall);

  // Main screen
  const screenSize = tier === 'PRO_COMPLEX' ? 12 : 8;
  const screenGeo = new THREE.PlaneGeometry(screenSize, screenSize * 9/16);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: 0x001133,
    emissiveIntensity: 0.5,
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, roomHeight/2, -roomDepth/2 + 0.1);
  scene.add(screen);

  // Secondary screens (pro only)
  if (tier === 'PRO_COMPLEX') {
    for (let i = 0; i < 2; i++) {
      const smallScreenGeo = new THREE.PlaneGeometry(4, 3);
      const smallScreenMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0x001122,
        emissiveIntensity: 0.3,
      });
      const smallScreen = new THREE.Mesh(smallScreenGeo, smallScreenMat);
      smallScreen.position.set(i === 0 ? -7 : 7, 5, -roomDepth/2 + 0.1);
      scene.add(smallScreen);
    }
  }

  // Seating
  const rows = tier === 'SANDLOT' ? 1 : tier === 'HS_GYM' ? 2 : 3;
  for (let row = 0; row < rows; row++) {
    const seatGeo = new THREE.BoxGeometry(roomWidth - 2, 1, 2);
    const seatMat = new THREE.MeshStandardMaterial({
      color: tier === 'PRO_COMPLEX' ? 0x660000 : 0x444444,
    });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.5, roomDepth/2 - 3 - row * 3);
    scene.add(seat);

    // Individual chairs for pro
    if (tier === 'PRO_COMPLEX') {
      for (let i = 0; i < 8; i++) {
        const chairGeo = new THREE.BoxGeometry(1, 1.5, 1);
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x880000 });
        const chair = new THREE.Mesh(chairGeo, chairMat);
        chair.position.set(-7 + i * 2, 0.75, roomDepth/2 - 3 - row * 3);
        scene.add(chair);
      }
    }
  }

  // Projector (for non-sandlot tiers)
  if (tier !== 'SANDLOT') {
    const projGeo = new THREE.BoxGeometry(1, 0.5, 0.5);
    const projMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const proj = new THREE.Mesh(projGeo, projMat);
    proj.position.set(0, roomHeight - 1, 0);
    proj.lookAt(0, roomHeight/2, -roomDepth/2);
    scene.add(proj);

    // Projector beam
    const beamGeo = new THREE.ConeGeometry(2, roomHeight/2 - 1, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, roomHeight - 2, -roomDepth/4);
    scene.add(beam);
  }

  // Lighting
  const lighting = new THREE.Group();

  // Ambient (dim for film room)
  const ambient = new THREE.AmbientLight(0x202020, 0.3);
  lighting.add(ambient);

  // Screen glow
  const screenGlow = new THREE.PointLight(0x4488ff, 1, 15);
  screenGlow.position.set(0, roomHeight/2, -roomDepth/2 + 2);
  lighting.add(screenGlow);

  // Ceiling lights (dim)
  const ceilingLight = new THREE.PointLight(0xffffee, 0.3, 20);
  ceilingLight.position.set(0, roomHeight - 1, 0);
  lighting.add(ceilingLight);

  scene.add(lighting);

  // Camera
  const camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 100);
  camera.position.set(0, 3, roomDepth/2 - 2);
  camera.lookAt(0, roomHeight/2, -roomDepth/2);

  return {
    scene,
    camera,
    lighting,
    update: (time: number) => {
      // Subtle screen flicker
      (screenMat as THREE.MeshStandardMaterial).emissiveIntensity =
        0.5 + Math.sin(time * 10) * 0.02;
    },
  };
}

// ============================================
// ENVIRONMENT FACTORY
// ============================================

export function createTrainingEnvironment(
  station: 'IRON_MIKE' | 'TRACK_SLEDS' | 'BULLPEN' | 'POP_FLY' | 'FILM_ROOM',
  tier: TrainingFacilityTier
): FacilityEnvironment {
  switch (station) {
    case 'IRON_MIKE':
      return createBattingCageEnvironment(tier);
    case 'TRACK_SLEDS':
      return createTrackEnvironment(tier);
    case 'BULLPEN':
      return createBullpenEnvironment(tier);
    case 'POP_FLY':
      return createFieldingEnvironment(tier);
    case 'FILM_ROOM':
      return createFilmRoomEnvironment(tier);
    default:
      return createBattingCageEnvironment(tier);
  }
}
