/**
 * Word Canvas Component
 * Physics-based word play area
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { WordPhysics } from '@p31/physics';
import type { WordBall, Word, SpoonState, Vector3 } from '@p31/physics';
import { SPOON_CONFIGS } from '../types';

interface WordCanvasProps {
  spoonState: SpoonState;
  wordBalls: WordBall[];
  selectedWordId: string | null;
  onWordBallsChange: (wordBalls: WordBall[]) => void;
  onSelectWord: (wordId: string | null) => void;
  onCollision: (wordA: Word, wordB: Word) => void;
}

export const WordCanvas: React.FC<WordCanvasProps> = ({
  spoonState,
  wordBalls,
  selectedWordId,
  onWordBallsChange,
  onSelectWord,
  onCollision,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const physicsRef = useRef<WordPhysics | null>(null);
  const wordMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const connectionLinesRef = useRef<THREE.Group>(new THREE.Group());
  const rafRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const draggedWordRef = useRef<string | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const config = SPOON_CONFIGS[spoonState];

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x100a15);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add connection lines group
    scene.add(connectionLinesRef.current);

    // Initialize physics
    const physics = new WordPhysics({
      bounds: { width: 20, height: 12, depth: 5 },
      magneticRange: config.magneticRange,
      similarityThreshold: config.similarityThreshold,
    });
    physics.onCollision(onCollision);
    physicsRef.current = physics;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      if (physicsRef.current) {
        physicsRef.current.step(0.016);
        updateVisuals();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Sync physics with word balls
  useEffect(() => {
    const physics = physicsRef.current;
    if (!physics) return;

    // Clear and re-add all words (inefficient but simple)
    physics.clear();
    wordBalls.forEach(ball => {
      physics.addWord(ball.word, ball.position);
      if (ball.isFrozen) {
        physics.freezeWord(ball.word.id, true);
      }
    });
  }, [wordBalls]);

  // Update spoon config
  useEffect(() => {
    physicsRef.current?.setSpoonConfig(spoonState);
  }, [spoonState]);

  // Update visual representation
  const updateVisuals = () => {
    const physics = physicsRef.current;
    const scene = sceneRef.current;
    if (!physics || !scene) return;

    const balls = physics.getWordBalls();
    const currentIds = new Set(balls.map(b => b.word.id));

    // Remove old meshes
    wordMeshesRef.current.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        scene.remove(mesh);
        wordMeshesRef.current.delete(id);
      }
    });

    // Update/create meshes
    balls.forEach(ball => {
      let mesh = wordMeshesRef.current.get(ball.word.id);

      if (!mesh) {
        mesh = createWordMesh(ball.word);
        scene.add(mesh);
        wordMeshesRef.current.set(ball.word.id, mesh);
      }

      // Update position
      mesh.position.set(ball.position.x, ball.position.y, ball.position.z);

      // Update selection highlight
      const isSelected = ball.word.id === selectedWordId;
      const highlightMesh = mesh.children.find(c => c.name === 'highlight') as THREE.Mesh;
      if (highlightMesh) {
        highlightMesh.visible = isSelected;
      }
    });

    // Update connection lines
    updateConnectionLines(balls);
  };

  const createWordMesh = (word: Word): THREE.Group => {
    const group = new THREE.Group();

    // Word bubble background
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: word.color,
      transparent: true,
      opacity: 0.8,
      shininess: 100,
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    // Selection highlight
    const highlightGeometry = new THREE.RingGeometry(0.9, 1.0, 32);
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlight.name = 'highlight';
    highlight.visible = false;
    group.add(highlight);

    // Text label (using canvas texture)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 128);
    ctx.font = 'bold 48px system-ui';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(word.text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(2, 1);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.z = 0.9;
    group.add(label);

    return group;
  };

  const updateConnectionLines = (balls: WordBall[]) => {
    const group = connectionLinesRef.current;
    if (!group) return;

    // Clear old lines
    while (group.children.length > 0) {
      const child = group.children[0];
      if ((child as THREE.Line).geometry) {
        (child as THREE.Line).geometry.dispose();
      }
      const material = (child as THREE.Line).material;
      if (material && !Array.isArray(material)) {
        material.dispose();
      }
      group.remove(child);
    }

    const physics = physicsRef.current;
    if (!physics) return;

    // Draw connections
    balls.forEach(ball => {
      const connections = physics.getConnectionsForWord(ball.word.id);
      connections.forEach(conn => {
        const other = balls.find(b => b.word.id === (conn.wordA === ball.word.id ? conn.wordB : conn.wordA));
        if (!other || ball.word.id > other.word.id) return; // Draw once

        const material = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: conn.strength * 0.3,
        });
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(ball.position.x, ball.position.y, ball.position.z),
          new THREE.Vector3(other.position.x, other.position.y, other.position.z),
        ]);
        const line = new THREE.Line(geometry, material);
        group.add(line);
      });
    });
  };

  // Input handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current || !cameraRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const meshes = Array.from(wordMeshesRef.current.values());
    const intersects = raycasterRef.current.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      const hit = intersects[0].object.parent;
      if (hit) {
        const wordId = Array.from(wordMeshesRef.current.entries())
          .find(([, mesh]) => mesh === hit)?.[0];
        if (wordId) {
          isDraggingRef.current = true;
          draggedWordRef.current = wordId;
          onSelectWord(wordId);
        }
      }
    } else {
      onSelectWord(null);
    }
  }, [onSelectWord]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !draggedWordRef.current || !containerRef.current || !cameraRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // Project to z=0 plane
    const planeNormal = new THREE.Vector3(0, 0, 1);
    const planeConstant = 0;
    const plane = new THREE.Plane(planeNormal, planeConstant);
    const target = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(plane, target);

    if (target) {
      const physics = physicsRef.current;
      if (physics) {
        physics.setPosition(draggedWordRef.current, {
          x: target.x,
          y: target.y,
          z: target.z,
        });
      }
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (draggedWordRef.current && physicsRef.current) {
      physicsRef.current.freezeWord(draggedWordRef.current, true);
    }
    isDraggingRef.current = false;
    draggedWordRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: isDraggingRef.current ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
};

export default WordCanvas;
