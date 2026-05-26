// ============================================
// 3D BOARD RENDERER (Three.js)
// ============================================

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import type { BoardState, BoardPiece, Position, Move, GameId } from '../types';
import { positionToAlgebraic, positionsEqual } from '../engine/board';

interface Board3DProps {
  state: BoardState;
  selectedPiece: BoardPiece | null;
  legalMoves: Move[];
  lastMove: Move | null;
  onSquareClick: (position: Position) => void;
  onPieceClick: (piece: BoardPiece) => void;
  highlightedSquares: Position[];
  showLegalMoves: boolean;
}

// Board configuration
const SQUARE_SIZE = 1;
const BOARD_HEIGHT = 0.2;
const PIECE_HEIGHT = 0.8;

const COLORS = {
  darkSquare: 0x4a3728,
  lightSquare: 0xd4c4a8,
  highlightLegal: 0x00ffff,
  highlightLast: 0xffd700,
  highlightCheck: 0xff0000,
  highlightSelected: 0x00ff00,
  whitePiece: 0xf5f5f5,
  blackPiece: 0x1a1a1a,
};

export function Board3D({
  state,
  selectedPiece,
  legalMoves,
  lastMove,
  onSquareClick,
  onPieceClick,
  highlightedSquares,
  showLegalMoves,
}: Board3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const boardGroupRef = useRef<THREE.Group | null>(null);
  const piecesGroupRef = useRef<THREE.Group | null>(null);
  const highlightsGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const squaresRef = useRef<THREE.Mesh[]>([]);
  const pieceMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    sceneRef.current = scene;

    // Camera (isometric view)
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(8, 10, 8);
    camera.lookAt(3.5, 0, 3.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Board group
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);
    boardGroupRef.current = boardGroup;

    // Pieces group
    const piecesGroup = new THREE.Group();
    scene.add(piecesGroup);
    piecesGroupRef.current = piecesGroup;

    // Highlights group
    const highlightsGroup = new THREE.Group();
    scene.add(highlightsGroup);
    highlightsGroupRef.current = highlightsGroup;

    // Create board squares
    createBoard(boardGroup);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Create board squares
  const createBoard = (group: THREE.Group) => {
    const squareGeometry = new THREE.BoxGeometry(SQUARE_SIZE, BOARD_HEIGHT, SQUARE_SIZE);
    squaresRef.current = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isDark = (row + col) % 2 === 1;
        const material = new THREE.MeshStandardMaterial({
          color: isDark ? COLORS.darkSquare : COLORS.lightSquare,
          roughness: 0.8,
          metalness: 0.1,
        });

        const square = new THREE.Mesh(squareGeometry, material);
        square.position.set(col * SQUARE_SIZE, 0, row * SQUARE_SIZE);
        square.userData = { row, col };
        square.receiveShadow = true;

        group.add(square);
        squaresRef.current.push(square);
      }
    }
  };

  // Create/update pieces
  useEffect(() => {
    if (!piecesGroupRef.current) return;

    const piecesGroup = piecesGroupRef.current;
    const pieceMeshes = pieceMeshesRef.current;

    // Remove captured pieces
    const currentPieceIds = new Set(state.pieces.filter(p => !p.isCaptured).map(p => p.id));
    for (const [id, mesh] of pieceMeshes) {
      if (!currentPieceIds.has(id)) {
        piecesGroup.remove(mesh);
        pieceMeshes.delete(id);
      }
    }

    // Add/update pieces
    for (const piece of state.pieces) {
      if (piece.isCaptured) continue;

      let mesh = pieceMeshes.get(piece.id);

      if (!mesh) {
        // Create new piece mesh
        mesh = createPieceMesh(piece, state.gameId);
        piecesGroup.add(mesh);
        pieceMeshes.set(piece.id, mesh);
      }

      // Update position (with animation support)
      const targetX = piece.position.col * SQUARE_SIZE;
      const targetZ = piece.position.row * SQUARE_SIZE;
      
      mesh.position.x = targetX;
      mesh.position.z = targetZ;

      // Highlight selected
      const isSelected = selectedPiece?.id === piece.id;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(isSelected ? COLORS.highlightSelected : 0x000000);
      material.emissiveIntensity = isSelected ? 0.3 : 0;
    }
  }, [state, selectedPiece]);

  // Create piece mesh based on type and game
  const createPieceMesh = (piece: BoardPiece, gameId: GameId): THREE.Mesh => {
    let geometry: THREE.BufferGeometry;
    let material: THREE.MeshStandardMaterial;

    const color = piece.color === 'WHITE' ? COLORS.whitePiece : COLORS.blackPiece;
    material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.2,
    });

    switch (gameId) {
      case 'chess':
        geometry = createChessPieceGeometry(piece.type);
        break;
      case 'checkers':
        geometry = createCheckersPieceGeometry(piece.type === 'CHECKER_KING');
        break;
      case 'othello':
        geometry = createOthelloPieceGeometry();
        break;
      default:
        geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = PIECE_HEIGHT / 2;
    mesh.castShadow = true;
    mesh.userData = { piece };

    return mesh;
  };

  // Chess piece geometries (simplified Staunton style)
  const createChessPieceGeometry = (type: string): THREE.BufferGeometry => {
    switch (type) {
      case 'PAWN':
        // Cone with sphere top
        const pawnGroup = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.3, 16));
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.4, 16));
        body.position.y = 0.35;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16));
        head.position.y = 0.65;
        
        // Merge geometries (simplified - just use cylinder for now)
        return new THREE.CylinderGeometry(0.2, 0.3, 0.6, 16);

      case 'ROOK':
        return new THREE.CylinderGeometry(0.25, 0.3, 0.7, 4);

      case 'KNIGHT':
        // Abstract horse head (cone)
        return new THREE.ConeGeometry(0.25, 0.7, 8);

      case 'BISHOP':
        // Slanted cone
        return new THREE.ConeGeometry(0.2, 0.8, 16);

      case 'QUEEN':
        return new THREE.CylinderGeometry(0.15, 0.3, 0.9, 16);

      case 'KING':
        // Cross on top represented by extra height
        return new THREE.CylinderGeometry(0.18, 0.32, 1, 16);

      default:
        return new THREE.BoxGeometry(0.4, 0.4, 0.4);
    }
  };

  const createCheckersPieceGeometry = (isKing: boolean): THREE.BufferGeometry => {
    if (isKing) {
      // King has a ring
      return new THREE.CylinderGeometry(0.3, 0.3, 0.15, 32);
    }
    return new THREE.CylinderGeometry(0.28, 0.28, 0.12, 32);
  };

  const createOthelloPieceGeometry = (): THREE.BufferGeometry => {
    return new THREE.CylinderGeometry(0.4, 0.4, 0.08, 32);
  };

  // Update highlights
  useEffect(() => {
    if (!highlightsGroupRef.current) return;

    const group = highlightsGroupRef.current;
    
    // Clear existing highlights
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Highlight legal moves
    if (showLegalMoves) {
      for (const move of legalMoves) {
        const highlight = createHighlightMesh(COLORS.highlightLegal, 0.5);
        highlight.position.set(
          move.to.col * SQUARE_SIZE,
          BOARD_HEIGHT + 0.01,
          move.to.row * SQUARE_SIZE
        );
        group.add(highlight);
      }
    }

    // Highlight last move
    if (lastMove) {
      const fromHighlight = createHighlightMesh(COLORS.highlightLast, 0.7);
      fromHighlight.position.set(
        lastMove.from.col * SQUARE_SIZE,
        BOARD_HEIGHT + 0.02,
        lastMove.from.row * SQUARE_SIZE
      );
      group.add(fromHighlight);

      const toHighlight = createHighlightMesh(COLORS.highlightLast, 0.7);
      toHighlight.position.set(
        lastMove.to.col * SQUARE_SIZE,
        BOARD_HEIGHT + 0.02,
        lastMove.to.row * SQUARE_SIZE
      );
      group.add(toHighlight);
    }

    // Highlight special squares
    for (const pos of highlightedSquares) {
      const highlight = createHighlightMesh(COLORS.highlightCheck, 0.6);
      highlight.position.set(
        pos.col * SQUARE_SIZE,
        BOARD_HEIGHT + 0.03,
        pos.row * SQUARE_SIZE
      );
      group.add(highlight);
    }
  }, [legalMoves, lastMove, highlightedSquares, showLegalMoves]);

  const createHighlightMesh = (color: number, opacity: number): THREE.Mesh => {
    const geometry = new THREE.PlaneGeometry(SQUARE_SIZE * 0.9, SQUARE_SIZE * 0.9);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  };

  // Handle click
  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // Check piece intersections
    if (piecesGroupRef.current) {
      const pieceIntersects = raycasterRef.current.intersectObjects(
        piecesGroupRef.current.children
      );
      if (pieceIntersects.length > 0) {
        const piece = pieceIntersects[0].object.userData.piece as BoardPiece;
        if (piece) {
          onPieceClick(piece);
          return;
        }
      }
    }

    // Check square intersections
    if (squaresRef.current.length > 0) {
      const squareIntersects = raycasterRef.current.intersectObjects(squaresRef.current);
      if (squareIntersects.length > 0) {
        const { row, col } = squareIntersects[0].object.userData;
        onSquareClick({ row, col });
      }
    }
  }, [onPieceClick, onSquareClick]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        cursor: 'pointer',
      }}
      onClick={handleClick}
    />
  );
}
