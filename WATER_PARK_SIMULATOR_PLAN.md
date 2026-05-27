# Water Park Simulator - Build Plan

## Overview
This document outlines the plan for building a water park simulator leveraging Three.js and React Three Fiber, building upon existing patterns in the P31 codebase.

## Technical Stack
- **Rendering**: Three.js with React Three Fiber (@react-three/fiber)
- **State Management**: Zustand (used in BONDING) or React Context
- **Physics**: Cannon.js or custom fluid dynamics for water simulation
- **UI**: Tailwind CSS (already configured in phos/)
- **Build**: Vite/Astro (phos/ uses Astro)

## Core Components to Implement

### 1. Water Simulation System
Based on the Water.js examples found in node_modules:
- Custom water shader for realistic reflection/refraction
- Wave simulation using Gerstner waves or FFT-based approach
- Water interaction with objects (buoyancy, displacement)
- Fluid dynamics for slides and pools

### 2. Environmental Systems
- Terrain generation for water park layout
- Sky, lighting, and atmospheric effects
- Landscape elements (plants, buildings, pathways)
- Weather system (sun, clouds, optional rain)

### 3. Ride Systems
- Water slides with configurable paths and physics
- Wave pools with programmable wave patterns
- Lazy rivers with current simulation
- Splash zones and interactive water features
- Kids' play areas with gentle interactions

### 4. Visitor/Agent System
- Simple AI agents representing park visitors
- Pathfinding for navigation between attractions
- Queue systems for popular rides
- Basic behaviors (eating, resting, riding)

### 5. Interaction Systems
- User controls for camera navigation
- Interactive elements (tickets, food purchases, locker rentals)
- Day/night cycle with lighting changes
- Sound system integration (ambient, ride-specific)

## Implementation Approach

### Phase 1: Foundation
1. Set up Three.js scene with React Three Fiber in phos/ or new package
2. Implement basic water plane using modified Water.js shader
3. Create terrain generation for park layout
4. Implement basic lighting and sky system

### Phase 2: Core Attractions
1. Build water slide system with path following
2. Create wave pool with Gerstner wave simulation
3. Implement lazy river with directional flow
4. Add basic pool structures with configurable depth

### Phase 3: Enhancements
1. Add visitor agents with simple AI
2. Implement interactive elements (ticket gates, food stalls)
3. Add sound system and environmental audio
4. Implement day/night cycle and weather effects

### Phase 4: Polish & Optimization
1. Optimize performance with LOD and instancing
2. Add post-processing effects (bloom, color grading)
3. Implement mobile-responsive controls
4. Add UI overlay for park info and controls

## Integration Points
- Could integrate with PHOSOrb for atmospheric controls
- Could use existing Genesis Gate for telemetry
- Could leverage existing Three.js utility packages
- Could use existing Zustand patterns from BONDING

## Dependencies to Add
- three (already available via node_modules)
- @react-three/fiber
- @react-three/drei
- zustand (for state management, following BONDING pattern)
- cannon-es or similar physics engine
- gsap for animations (if needed)

## File Structure Suggestion
```
/packages/water-park-simulator
  /src
    /components
      WaterSimulation.tsx
      TerrainGenerator.tsx
      SlideSystem.tsx
      WavePool.tsx
      LazyRiver.tsx
      VisitorAgent.tsx
      ParkEnvironment.tsx
    /systems
      PhysicsSystem.ts
      VisitorAI.ts
      AudioSystem.ts
    /shaders
      WaterShader.glsl
      SlideShader.glsl
    /utils
      ParkConfig.ts
      Pathfinding.ts
```

## Development Notes
1. Leverage existing Three.js examples in node_modules as starting point
2. Follow React Three Fiber patterns from AbyssalNodeScene.tsx
3. Use Zustand for state management following p31-bonding pattern
4. Consider performance - water simulation can be GPU intensive
5. Test with various water complexities (calm pools vs turbulent slides)

## Next Steps
1. Create new package: packages/water-park-simulator
2. Set up basic Three.js + React Three Fiber environment
3. Implement water plane based on existing Water.js examples
4. Build terrain and basic park layout
5. Add first attraction (simple pool or slide)