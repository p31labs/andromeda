import React, { useState, useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Sierpinski Progressive Disclosure Navigation System
 * 
 * Implements fractal-based navigation that reveals information hierarchies
 * through recursive disclosure patterns, inspired by Sierpinski triangle geometry.
 * This provides an intuitive way to navigate complex information spaces.
 */

interface SierpinskiNode {
  id: string;
  label: string;
  level: number;
  position: [number, number, number];
  children?: SierpinskiNode[];
  metadata?: {
    type: 'room' | 'terminal' | 'dashboard' | 'tool';
    description: string;
    icon?: string;
    color?: string;
  };
}

interface SierpinskiNavigationProps {
  rootNode: SierpinskiNode;
  onNodeSelect?: (node: SierpinskiNode) => void;
  maxDepth?: number;
  scale?: number;
  animationSpeed?: number;
}

export const SierpinskiNavigation: React.FC<SierpinskiNavigationProps> = ({
  rootNode,
  onNodeSelect,
  maxDepth = 4,
  scale = 5,
  animationSpeed = 1.0
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootNode.id]));
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { camera } = useThree();
  const animationRef = useRef(0);

  // Generate Sierpinski triangle geometry for navigation nodes
  const generateSierpinskiNodes = (
    parent: SierpinskiNode,
    depth: number = 0,
    maxDepth: number = 4
  ): SierpinskiNode[] => {
    if (depth >= maxDepth || !parent.children) {
      return [];
    }

    const nodes: SierpinskiNode[] = [];
    
    // Calculate positions based on Sierpinski triangle geometry
    const childCount = parent.children.length;
    const angleStep = (2 * Math.PI) / childCount;
    
    parent.children.forEach((child, index) => {
      // Sierpinski positioning logic
      const radius = scale * Math.pow(0.7, depth + 1);
      const angle = index * angleStep + (depth * 0.5);
      
      const x = parent.position[0] + radius * Math.cos(angle);
      const y = parent.position[1] + radius * Math.sin(angle);
      const z = parent.position[2] - depth * 2;
      
      const node: SierpinskiNode = {
        ...child,
        position: [x, y, z],
        level: depth + 1
      };

      nodes.push(node);
      
      // Recursively generate children
      if (expandedNodes.has(parent.id)) {
        nodes.push(...generateSierpinskiNodes(node, depth + 1, maxDepth));
      }
    });

    return nodes;
  };

  const allNodes = generateSierpinskiNodes(rootNode, 0, maxDepth);

  // Handle node interactions
  const handleNodeClick = (node: SierpinskiNode) => {
    setSelectedNode(node.id);
    onNodeSelect?.(node);

    // Toggle expansion for non-leaf nodes
    if (node.children && node.children.length > 0) {
      setExpandedNodes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(node.id)) {
          newSet.delete(node.id);
        } else {
          newSet.add(node.id);
        }
        return newSet;
      });
    }
  };

  const handleNodeHover = (nodeId: string | null) => {
    setHoveredNode(nodeId);
  };

  // Animation loop for dynamic effects
  useFrame((state, delta) => {
    animationRef.current += delta * animationSpeed;
    
    // Subtle pulsing animation for nodes
    const pulse = Math.sin(animationRef.current) * 0.1 + 1;
    
    // Update camera position based on selection
    if (selectedNode) {
      const selected = allNodes.find(n => n.id === selectedNode);
      if (selected) {
        // Smooth camera movement towards selected node
        const targetPos = new THREE.Vector3(...selected.position);
        camera.position.lerp(targetPos.clone().add(new THREE.Vector3(0, 0, 10)), 0.05);
        camera.lookAt(targetPos);
      }
    }
  });

  return (
    <group>
      {/* Render navigation nodes */}
      {allNodes.map((node) => (
        <group key={node.id} position={node.position}>
          {/* 3D Node Geometry */}
          <mesh
            onClick={() => handleNodeClick(node)}
            onPointerOver={() => handleNodeHover(node.id)}
            onPointerOut={() => handleNodeHover(null)}
            scale={hoveredNode === node.id ? 1.2 : 1.0}
          >
            <icosahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial
              color={node.metadata?.color || '#00ffff'}
              emissive={hoveredNode === node.id ? '#ffffff' : '#000000'}
              emissiveIntensity={hoveredNode === node.id ? 0.5 : 0.1}
              transparent={true}
              opacity={0.8}
            />
          </mesh>

          {/* Connection lines to children */}
          {node.children && node.children.length > 0 && expandedNodes.has(node.id) && (
            <group>
              {node.children.map((child, index) => {
                const childIndex = allNodes.findIndex(n => n.id === child.id);
                if (childIndex === -1) return null;

                const childNode = allNodes[childIndex];
                return (
                  <line key={`line-${node.id}-${child.id}`}>
                    <bufferGeometry>
                      <bufferAttribute
                        attach="attributes-position"
                        array={new Float32Array([
                          0, 0, 0,
                          childNode.position[0] - node.position[0],
                          childNode.position[1] - node.position[1],
                          childNode.position[2] - node.position[2]
                        ])}
                        count={2}
                        itemSize={3}
                      />
                    </bufferGeometry>
                    <lineBasicMaterial
                      color="#333333"
                      transparent={true}
                      opacity={0.3}
                    />
                  </line>
                );
              })}
            </group>
          )}

          {/* HTML Overlay for labels */}
          <Html position={[0, 0.8, 0]} center>
            <div
              className={`p-2 rounded-lg text-white text-sm font-bold transition-all duration-300 ${
                hoveredNode === node.id ? 'bg-blue-600 scale-110' : 'bg-black bg-opacity-50'
              }`}
              style={{
                transform: `scale(${hoveredNode === node.id ? 1.1 : 1.0})`,
                boxShadow: hoveredNode === node.id ? '0 0 10px #00ffff' : 'none'
              }}
            >
              {node.label}
              {node.children && node.children.length > 0 && (
                <span className="ml-2 text-xs opacity-75">
                  {expandedNodes.has(node.id) ? '▼' : '▶'}
                </span>
              )}
            </div>
          </Html>

          {/* Metadata tooltip */}
          {hoveredNode === node.id && node.metadata && (
            <Html position={[0, 1.5, 0]} center>
              <div className="bg-gray-900 bg-opacity-90 p-3 rounded-lg text-xs text-gray-300 max-w-xs">
                <div className="font-bold text-white mb-1">{node.metadata.type}</div>
                <div className="text-gray-400">{node.metadata.description}</div>
              </div>
            </Html>
          )}
        </group>
      ))}

      {/* Central hub indicator */}
      <mesh position={rootNode.position}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.8} />
      </mesh>

      {/* Animated background grid */}
      <gridHelper
        args={[50, 50, '#004444', '#002222']}
        position={[0, -10, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  );
};

/**
 * Sierpinski Navigation Controller
 * Provides UI controls and state management for the navigation system
 */
export const SierpinskiController: React.FC<{
  onNavigate?: (path: string[]) => void;
  currentPath?: string[];
}> = ({ onNavigate, currentPath = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'room' | 'terminal' | 'dashboard' | 'tool'>('all');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search logic
  };

  const handleFilterChange = (type: typeof filterType) => {
    setFilterType(type);
    // Implement filter logic
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilterType('all');
    onNavigate?.([]);
  };

  return (
    <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
      <h3 className="text-lg font-bold mb-3">Sierpinski Navigation</h3>
      
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full p-2 bg-gray-800 rounded text-white"
        />
      </div>

      {/* Filters */}
      <div className="mb-3">
        <label className="block text-sm mb-2">Filter by type:</label>
        <select
          aria-label="Filter by type"
          value={filterType}
          onChange={(e) => handleFilterChange(e.target.value as typeof filterType)}
          className="w-full p-2 bg-gray-800 rounded text-white"
        >
          <option value="all">All Types</option>
          <option value="room">Rooms</option>
          <option value="terminal">Terminals</option>
          <option value="dashboard">Dashboards</option>
          <option value="tool">Tools</option>
        </select>
      </div>

      {/* Current Path */}
      {currentPath.length > 0 && (
        <div className="mb-3">
          <label className="block text-sm mb-2">Current Path:</label>
          <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
            {currentPath.join(' → ')}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 bg-gray-600 hover:bg-gray-500 p-2 rounded text-sm"
        >
          Reset View
        </button>
        <button
          onClick={() => onNavigate?.(['home'])}
          className="flex-1 bg-blue-600 hover:bg-blue-500 p-2 rounded text-sm"
        >
          Home
        </button>
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-400">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Interactive Node</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span>Expandable Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Selected Node</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Example usage data structure
 */
export const createExampleNavigationData = (): SierpinskiNode => ({
  id: 'root',
  label: 'Spaceship Earth',
  level: 0,
  position: [0, 0, 0],
  children: [
    {
      id: 'delta',
      label: 'Delta Cockpit',
      level: 1,
      position: [0, 0, 0],
      metadata: {
        type: 'room',
        description: 'Primary command and control interface',
        color: '#00ffff'
      },
      children: [
        {
          id: 'tri-state-camera',
          label: 'Tri-State Camera',
          level: 2,
          position: [0, 0, 0],
          metadata: {
            type: 'tool',
            description: 'Three-mode spatial navigation system',
            color: '#ff00ff'
          }
        },
        {
          id: 'quantum-dashboard',
          label: 'Quantum Dashboard',
          level: 2,
          position: [0, 0, 0],
          metadata: {
            type: 'dashboard',
            description: 'Real-time quantum state monitoring',
            color: '#ffff00'
          }
        }
      ]
    },
    {
      id: 'node-zero',
      label: 'Node Zero',
      level: 1,
      position: [0, 0, 0],
      metadata: {
        type: 'terminal',
        description: 'Core system management interface',
        color: '#ff0000'
      }
    }
  ]
});