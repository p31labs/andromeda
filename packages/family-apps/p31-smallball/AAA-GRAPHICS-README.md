# P31 Smallball: AAA Graphics Upgrade

This document describes the cinema-quality graphics system added to Smallball, providing MLB broadcast-style visuals with physically-based rendering, dynamic atmosphere, and cinematic camera work.

## Quick Start

```tsx
import { AAAGraphicsCanvas, BroadcastAngle, TimeOfDay } from './components/AAAGraphicsCanvas';

// Drop-in replacement for your existing 3D canvas
<AAAGraphicsCanvas
  quality="HIGH"
  initialAngle={BroadcastAngle.CENTER_FIELD}
  timeOfDay={TimeOfDay.AFTERNOON}
  showDebugUI={true}
/>
```

## New Files Added

### Core Graphics Engine
- `src/engine/graphics-aaa-core.ts` - PBR materials, stadium architecture, grass wind shaders
- `src/engine/graphics-post-processing.ts` - Bloom, depth of field, color grading
- `src/engine/graphics-cinematic-camera.ts` - 17 broadcast camera angles with smooth transitions
- `src/engine/graphics-particles-aaa.ts` - Hit sparks, dust clouds, fireworks, weather
- `src/engine/graphics-atmosphere.ts` - Time of day, weather, sky system
- `src/engine/graphics-volumetrics.ts` - God rays, light shafts, lens flares
- `src/engine/graphics-aaa-integration.ts` - Unified API tying everything together

### React Integration
- `src/components/AAAGraphicsCanvas.tsx` - Drop-in React component with debug UI

## Features

### 1. PBR Field Rendering
- **Procedural grass** with normal maps, roughness, and mowing patterns
- **Dirt/clay materials** with realistic displacement and clumping
- **Warning track** with crushed rubber texture
- **Foul poles** with proper pentagonal bases and netting
- **Stadium architecture** including:
  - Seating bowls (20 tiers, 24 sections)
  - Dugouts with benches and fences
  - Scoreboard with emissive display
  - Light towers (4-position MLB standard)

### 2. Post-Processing Pipeline
- **Bloom** - Unreal-style threshold-based bloom for stadium lights
- **Depth of Field** - Cinematic focus with bokeh
- **Color Grading** - Contrast, saturation, temperature control with vignette

### 3. Cinematic Camera System
17 broadcast-style angles inspired by MLB broadcasts:

**Primary Angles:**
- `CENTER_FIELD` - Classic broadcast view
- `HOME_PLATE` - Batter's perspective
- `FIRST_BASE` / `THIRD_BASE` - Dugout views

**Dramatic Angles:**
- `CATCHER_CAM` - Behind the mask
- `LOW_FIRST` / `LOW_THIRD` - Ground level diving plays
- `WALK_OFF` - Dramatic low celebration angle
- `BLIMP` - Aerial overview

**Dynamic:**
- `BALL_FOLLOW` - Tracks ball with velocity lead
- `ORBIT` - Rotates around action

All angles support smooth transitions with easing functions and camera shake for impact moments.

### 4. Particle Effects
- **Hit Sparks** - Heat-based color grading (white hot to cool red)
- **Dust Clouds** - Slide and dive kick-ups
- **Chalk Bursts** - Foul line/base sliding
- **Fireworks** - Home run/walk-off celebrations
- **Weather** - Rain and snow systems

### 5. Dynamic Atmosphere
**Time of Day:**
- Dawn (5AM) - Sunrise colors
- Morning (8AM) - Clear sky
- Noon (12PM) - Harsh shadows
- Afternoon (3PM) - Warm gold
- Sunset (6PM) - Golden hour
- Twilight (8PM) - Blue hour
- Night (10PM) - Stadium lights

**Weather:**
- Clear, partly cloudy, overcast
- Light/heavy rain with wind drift
- Fog with density control
- Dynamic cloud billboards

All transitions are smoothly interpolated over 2 seconds.

### 6. Volumetric Lighting
- **God Rays** - Light shafts from stadium towers
- **Lens Flares** - Sun glare effects
- **Atmospheric Scattering** - Sky gradient with Rayleigh approximation

## Quality Presets

| Preset | Shadow Map | Post-Proc | Particles | Performance |
|--------|------------|-----------|-------------|-------------|
| LOW | 1024 | Off | 5,000 | Mobile |
| MEDIUM | 2048 | On | 25,000 | Mid-range |
| HIGH | 4096 | On + Bloom | 100,000 | Desktop |
| ULTRA | 8192 | All effects | 250,000 | High-end |

## API Reference

### AAAGraphicsEngine (Main Class)

```typescript
// Create engine
const engine = new AAAGraphicsEngine(canvas, config);

// Camera control
engine.setCameraAngle(BroadcastAngle.CENTER_FIELD, 'SMOOTH');
engine.followBall(ballPosition, velocity);
engine.triggerGameMoment('CONTACT'); // Triggers camera + effects

// Atmosphere
engine.setTimeOfDay(TimeOfDay.SUNSET);
engine.setWeather({
  condition: 'light_rain',
  windSpeed: 10,
  windDirection: new THREE.Vector3(1, 0, 0),
});

// Particles
engine.emitHitSparks(position, direction, exitVelo);
engine.emitSlideDust(position, velocity);
engine.celebrateVictory(homePlatePosition);

// Quality
engine.setQuality('ULTRA');

// Lifecycle
engine.start();  // Begin render loop
engine.stop();   // Pause
engine.dispose(); // Cleanup
```

### Game Moments (Camera Automation)

The camera director automatically switches angles based on gameplay:

```typescript
engine.triggerGameMoment('PRE_PITCH');  // CENTER_FIELD
engine.triggerGameMoment('PITCH');       // CATCHER_CAM
engine.triggerGameMoment('SWING');       // HOME_PLATE
engine.triggerGameMoment('CONTACT');     // LOW_FIRST + shake
engine.triggerGameMoment('BALL_IN_AIR'); // BALL_FOLLOW
engine.triggerGameMoment('CELEBRATION'); // WALK_OFF
```

## Integration with Existing Smallball

The AAA graphics system is a **drop-in replacement** for the existing Three.js setup:

1. Replace `graphics-core.ts` usage with `AAAGraphicsEngine`
2. Replace sprite-based players with the new particle-driven system
3. Hook into your game events to call `triggerGameMoment()`
4. Add `setTimeOfDay()` calls based on game schedule

## Performance Tips

1. **Use quality presets** - Let users choose based on their hardware
2. **Disable volumetrics on mobile** - Heavy GPU cost
3. **Limit particle count** - Use LOD for distant effects
4. **Pool render targets** - Avoid allocating during gameplay

## Future Enhancements

Potential additions for true AAA quality:
- Real-time player models (GLTF format)
- Cloth simulation for jerseys
- Dynamic reflections on wet surfaces
- HDR skyboxes
- Ray-traced shadows (WebGPU)

## Credits

This graphics system brings broadcast-quality baseball visuals to the web using:
- Three.js for rendering
- Custom GLSL shaders for effects
- MLB broadcast camera positions as reference
- Physically-based rendering principles
