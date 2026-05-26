// P31 Smallball: Dynamic Atmosphere System
// Time of day, weather, and environmental effects
// Realistic lighting transitions and atmospheric scattering

import * as THREE from 'three';

// ============================================
// TIME OF DAY SYSTEM
// ============================================

export enum TimeOfDay {
  DAWN = 'dawn',           // 5:00 AM - Sunrise
  MORNING = 'morning',     // 8:00 AM - Morning light
  NOON = 'noon',           // 12:00 PM - Midday sun
  AFTERNOON = 'afternoon', // 3:00 PM - Afternoon gold
  SUNSET = 'sunset',       // 6:00 PM - Golden hour
  TWILIGHT = 'twilight',   // 8:00 PM - Blue hour
  NIGHT = 'night',         // 10:00 PM - Stadium lights
}

export interface AtmosphereConfig {
  time: TimeOfDay;
  skyColor: THREE.Color;
  sunColor: THREE.Color;
  sunIntensity: number;
  ambientIntensity: number;
  fogDensity: number;
  fogColor: THREE.Color;
  shadowOpacity: number;
  grassColor: THREE.Color;
  stadiumLights: boolean;
}

export const TIME_CONFIGS: Record<TimeOfDay, AtmosphereConfig> = {
  [TimeOfDay.DAWN]: {
    time: TimeOfDay.DAWN,
    skyColor: new THREE.Color(0xff9966),
    sunColor: new THREE.Color(0xffddaa),
    sunIntensity: 0.8,
    ambientIntensity: 0.4,
    fogDensity: 0.003,
    fogColor: new THREE.Color(0xffccaa),
    shadowOpacity: 0.3,
    grassColor: new THREE.Color(0x5a7c49),
    stadiumLights: false,
  },
  [TimeOfDay.MORNING]: {
    time: TimeOfDay.MORNING,
    skyColor: new THREE.Color(0x87ceeb),
    sunColor: new THREE.Color(0xffffee),
    sunIntensity: 1.2,
    ambientIntensity: 0.6,
    fogDensity: 0.001,
    fogColor: new THREE.Color(0xccddff),
    shadowOpacity: 0.5,
    grassColor: new THREE.Color(0x4a7c59),
    stadiumLights: false,
  },
  [TimeOfDay.NOON]: {
    time: TimeOfDay.NOON,
    skyColor: new THREE.Color(0x4fa4e4),
    sunColor: new THREE.Color(0xffffff),
    sunIntensity: 1.5,
    ambientIntensity: 0.7,
    fogDensity: 0.0005,
    fogColor: new THREE.Color(0xaaccff),
    shadowOpacity: 0.7,
    grassColor: new THREE.Color(0x4a8c59),
    stadiumLights: false,
  },
  [TimeOfDay.AFTERNOON]: {
    time: TimeOfDay.AFTERNOON,
    skyColor: new THREE.Color(0x6699cc),
    sunColor: new THREE.Color(0xfff5e6),
    sunIntensity: 1.3,
    ambientIntensity: 0.6,
    fogDensity: 0.001,
    fogColor: new THREE.Color(0xccddee),
    shadowOpacity: 0.6,
    grassColor: new THREE.Color(0x4a7c59),
    stadiumLights: false,
  },
  [TimeOfDay.SUNSET]: {
    time: TimeOfDay.SUNSET,
    skyColor: new THREE.Color(0xff7744),
    sunColor: new THREE.Color(0xffaa55),
    sunIntensity: 0.9,
    ambientIntensity: 0.5,
    fogDensity: 0.002,
    fogColor: new THREE.Color(0xffaa88),
    shadowOpacity: 0.4,
    grassColor: new THREE.Color(0x6a5c39),
    stadiumLights: false,
  },
  [TimeOfDay.TWILIGHT]: {
    time: TimeOfDay.TWILIGHT,
    skyColor: new THREE.Color(0x445577),
    sunColor: new THREE.Color(0x6688aa),
    sunIntensity: 0.3,
    ambientIntensity: 0.3,
    fogDensity: 0.003,
    fogColor: new THREE.Color(0x445566),
    shadowOpacity: 0.2,
    grassColor: new THREE.Color(0x3a5c49),
    stadiumLights: true,
  },
  [TimeOfDay.NIGHT]: {
    time: TimeOfDay.NIGHT,
    skyColor: new THREE.Color(0x0a0a1a),
    sunColor: new THREE.Color(0x111122),
    sunIntensity: 0.1,
    ambientIntensity: 0.15,
    fogDensity: 0.005,
    fogColor: new THREE.Color(0x1a1a2e),
    shadowOpacity: 0.1,
    grassColor: new THREE.Color(0x2d5016),
    stadiumLights: true,
  },
};

// ============================================
// SKY GRADIENT SYSTEM
// ============================================

export class SkySystem extends THREE.Mesh {
  declare material: THREE.ShaderMaterial;
  private sunPosition: THREE.Vector3;

  constructor() {
    const geometry = new THREE.SphereGeometry(500, 32, 32);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        sunPosition: { value: new THREE.Vector3(0, 100, 100) },
        sunColor: { value: new THREE.Color(0xffffee) },
        sunSize: { value: 50 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunPosition;
        uniform vec3 sunColor;
        uniform float sunSize;
        varying vec3 vWorldPosition;

        void main() {
          float h = normalize(vWorldPosition).y;

          // Gradient sky
          vec3 skyColor = mix(bottomColor, topColor, max(0.0, h));

          // Sun
          float sunDist = distance(vWorldPosition, sunPosition);
          float sunGlow = 1.0 - smoothstep(0.0, sunSize, sunDist);
          sunGlow = pow(sunGlow, 2.0);
          skyColor = mix(skyColor, sunColor, sunGlow);

          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    super(geometry, material);
    this.material = material;
    this.sunPosition = new THREE.Vector3(0, 100, 100);
  }

  setTimeOfDay(config: AtmosphereConfig, sunPosition: THREE.Vector3): void {
    this.material.uniforms.topColor.value.copy(config.skyColor);
    this.material.uniforms.bottomColor.value.copy(config.fogColor);
    this.material.uniforms.sunPosition.value.copy(sunPosition);
    this.material.uniforms.sunColor.value.copy(config.sunColor);
  }

  updateSunPosition(elevation: number, azimuth: number): void {
    // elevation: 0-90 (horizon to zenith)
    // azimuth: 0-360 (north, east, south, west)
    const rad = THREE.MathUtils.degToRad(azimuth);
    const elev = THREE.MathUtils.degToRad(elevation);

    const r = 300;
    const x = r * Math.cos(elev) * Math.sin(rad);
    const y = r * Math.sin(elev);
    const z = r * Math.cos(elev) * Math.cos(rad);

    this.sunPosition.set(x, y, z);
    this.material.uniforms.sunPosition.value.copy(this.sunPosition);
  }
}

// ============================================
// STADIUM LIGHTING SYSTEM
// ============================================

export class StadiumLightingSystem extends THREE.Group {
  private lights: THREE.SpotLight[] = [];
  private isEnabled: boolean = false;
  private targetIntensity: number = 2;
  private currentIntensity: number = 0;

  constructor() {
    super();

    // Create 4 light towers (standard MLB stadium layout)
    const positions = [
      { x: 150, z: 150 },
      { x: -150, z: 150 },
      { x: 150, z: -150 },
      { x: -150, z: -150 },
    ];

    positions.forEach(pos => {
      const light = new THREE.SpotLight(0xffffee, 0); // Start off
      light.position.set(pos.x, 100, pos.z);
      light.target.position.set(0, 0, 0);
      light.angle = Math.PI / 4;
      light.penumbra = 0.3;
      light.decay = 1;
      light.distance = 400;
      light.castShadow = true;
      light.shadow.mapSize.width = 2048;
      light.shadow.mapSize.height = 2048;

      this.add(light);
      this.add(light.target);
      this.lights.push(light);
    });
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.targetIntensity = enabled ? 2 : 0;
  }

  update(deltaTime: number): void {
    // Smooth intensity transition
    const diff = this.targetIntensity - this.currentIntensity;
    if (Math.abs(diff) > 0.01) {
      this.currentIntensity += diff * deltaTime * 2;

      this.lights.forEach(light => {
        light.intensity = this.currentIntensity;
      });
    }
  }

  flicker(): void {
    // Random flicker for dramatic effect
    this.lights.forEach(light => {
      light.intensity = this.currentIntensity * (0.95 + Math.random() * 0.1);
    });
  }
}

// ============================================
// WEATHER SYSTEM
// ============================================

export enum WeatherCondition {
  CLEAR = 'clear',
  PARTLY_CLOUDY = 'partly_cloudy',
  OVERCAST = 'overcast',
  LIGHT_RAIN = 'light_rain',
  HEAVY_RAIN = 'heavy_rain',
  FOG = 'fog',
}

export interface WeatherConfig {
  condition: WeatherCondition;
  windDirection: THREE.Vector3;
  windSpeed: number; // mph
  precipitation: number; // 0-1
  cloudCover: number; // 0-1
  fogDensity: number;
  temperature: number; // Fahrenheit
}

export const DEFAULT_WEATHER: WeatherConfig = {
  condition: WeatherCondition.CLEAR,
  windDirection: new THREE.Vector3(1, 0, 0),
  windSpeed: 5,
  precipitation: 0,
  cloudCover: 0,
  fogDensity: 0.001,
  temperature: 72,
};

export class WeatherSystem extends THREE.Group {
  private config: WeatherConfig;
  private clouds: THREE.Group;
  private rainSystem: THREE.Points | null = null;
  private rainCount: number = 5000;

  constructor() {
    super();

    this.config = { ...DEFAULT_WEATHER };

    // Cloud layer
    this.clouds = this.createCloudLayer();
    this.add(this.clouds);
  }

  private createCloudLayer(): THREE.Group {
    const group = new THREE.Group();

    // Create cloud billboards
    for (let i = 0; i < 20; i++) {
      const cloud = this.createCloud();
      cloud.position.set(
        (Math.random() - 0.5) * 400,
        80 + Math.random() * 40,
        (Math.random() - 0.5) * 400
      );
      group.add(cloud);
    }

    return group;
  }

  private createCloud(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(30, 15);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    const cloud = new THREE.Mesh(geometry, material);
    cloud.rotation.x = -Math.PI / 4;

    return cloud;
  }

  setWeather(config: WeatherConfig): void {
    this.config = config;

    // Update cloud cover
    this.clouds.visible = config.cloudCover > 0;
    this.clouds.children.forEach((cloud, i) => {
      const mesh = cloud as THREE.Mesh;
      (mesh.material as THREE.Material).transparent = true;
      mesh.visible = i < config.cloudCover * 20;
    });

    // Update rain
    if (config.precipitation > 0) {
      this.createRain();
    } else {
      this.removeRain();
    }
  }

  private createRain(): void {
    if (this.rainSystem) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = Math.random() * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
    });

    this.rainSystem = new THREE.Points(geometry, material);
    this.add(this.rainSystem);
  }

  private removeRain(): void {
    if (this.rainSystem) {
      this.remove(this.rainSystem);
      this.rainSystem = null;
    }
  }

  update(deltaTime: number, camera: THREE.Camera): void {
    // Face clouds to camera
    this.clouds.children.forEach(cloud => {
      cloud.lookAt(camera.position);
    });

    // Update rain
    if (this.rainSystem && this.config.precipitation > 0) {
      const positions = this.rainSystem.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 3;

        // Fall down
        positions[idx + 1] -= 80 * deltaTime * (1 + this.config.precipitation);

        // Wind drift
        positions[idx] += this.config.windDirection.x * this.config.windSpeed * deltaTime;
        positions[idx + 2] += this.config.windDirection.z * this.config.windSpeed * deltaTime;

        // Reset
        if (positions[idx + 1] < 0) {
          positions[idx] = (Math.random() - 0.5) * 400;
          positions[idx + 1] = 200;
          positions[idx + 2] = (Math.random() - 0.5) * 400;
        }
      }

      this.rainSystem.geometry.attributes.position.needsUpdate = true;
    }
  }

  getWindAtHeight(height: number): THREE.Vector3 {
    // Wind varies with height (boundary layer effect)
    const factor = Math.min(1, height / 100);
    return this.config.windDirection.clone().multiplyScalar(this.config.windSpeed * factor);
  }
}

// ============================================
// ATMOSPHERE MANAGER
// ============================================

export class AtmosphereManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  public sky: SkySystem;
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemisphereLight: THREE.HemisphereLight;
  public stadiumLights: StadiumLightingSystem;
  public weather: WeatherSystem;

  private currentConfig: AtmosphereConfig;
  private targetConfig: AtmosphereConfig;
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    // Create atmosphere components
    this.sky = new SkySystem();
    this.scene.add(this.sky);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(100, 200, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -200;
    this.sunLight.shadow.camera.right = 200;
    this.sunLight.shadow.camera.top = 200;
    this.sunLight.shadow.camera.bottom = -200;
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c59, 0.4);
    this.scene.add(this.hemisphereLight);

    this.stadiumLights = new StadiumLightingSystem();
    this.scene.add(this.stadiumLights);

    this.weather = new WeatherSystem();
    this.scene.add(this.weather);

    // Initialize with morning
    this.currentConfig = TIME_CONFIGS[TimeOfDay.MORNING];
    this.targetConfig = this.currentConfig;
    this.applyConfig(this.currentConfig);
  }

  setTimeOfDay(time: TimeOfDay, duration: number = 2): void {
    this.targetConfig = TIME_CONFIGS[time];
    this.isTransitioning = true;
    this.transitionProgress = 0;
  }

  setWeather(weather: WeatherConfig): void {
    this.weather.setWeather(weather);

    // Adjust fog based on weather
    this.scene.fog = new THREE.FogExp2(
      this.currentConfig.fogColor,
      weather.fogDensity
    );
  }

  update(deltaTime: number): void {
    // Handle time of day transition
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / 2; // 2 second transition

      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
        this.currentConfig = this.targetConfig;
      }

      // Interpolate configs
      const t = this.easeInOutCubic(this.transitionProgress);
      const interpolated = this.interpolateConfig(this.currentConfig, this.targetConfig, t);
      this.applyConfig(interpolated);
    }

    // Update stadium lights
    this.stadiumLights.update(deltaTime);

    // Update weather
    this.weather.update(deltaTime, this.camera);

    // Update sky sun position based on time
    this.updateSunPosition();
  }

  private applyConfig(config: AtmosphereConfig): void {
    // Update lights
    this.sunLight.color.copy(config.sunColor);
    this.sunLight.intensity = config.sunIntensity;
    this.ambientLight.intensity = config.ambientIntensity;
    this.hemisphereLight.color.copy(config.skyColor);
    this.hemisphereLight.groundColor.copy(config.grassColor);

    // Update fog
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color.copy(config.fogColor);
      (this.scene.fog as THREE.FogExp2).density = config.fogDensity;
    } else {
      this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    }

    // Update stadium lights
    this.stadiumLights.setEnabled(config.stadiumLights);

    // Update sky
    this.sky.setTimeOfDay(config, this.sunLight.position);
  }

  private interpolateConfig(from: AtmosphereConfig, to: AtmosphereConfig, t: number): AtmosphereConfig {
    return {
      time: to.time,
      skyColor: from.skyColor.clone().lerp(to.skyColor, t),
      sunColor: from.sunColor.clone().lerp(to.sunColor, t),
      sunIntensity: THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t),
      ambientIntensity: THREE.MathUtils.lerp(from.ambientIntensity, to.ambientIntensity, t),
      fogDensity: THREE.MathUtils.lerp(from.fogDensity, to.fogDensity, t),
      fogColor: from.fogColor.clone().lerp(to.fogColor, t),
      shadowOpacity: THREE.MathUtils.lerp(from.shadowOpacity, to.shadowOpacity, t),
      grassColor: from.grassColor.clone().lerp(to.grassColor, t),
      stadiumLights: t > 0.5 ? to.stadiumLights : from.stadiumLights,
    };
  }

  private updateSunPosition(): void {
    // Calculate sun position based on time of day
    const timeMap: Record<TimeOfDay, { elevation: number; azimuth: number }> = {
      [TimeOfDay.DAWN]: { elevation: 5, azimuth: 90 },
      [TimeOfDay.MORNING]: { elevation: 45, azimuth: 120 },
      [TimeOfDay.NOON]: { elevation: 90, azimuth: 180 },
      [TimeOfDay.AFTERNOON]: { elevation: 45, azimuth: 240 },
      [TimeOfDay.SUNSET]: { elevation: 5, azimuth: 270 },
      [TimeOfDay.TWILIGHT]: { elevation: -10, azimuth: 270 },
      [TimeOfDay.NIGHT]: { elevation: -30, azimuth: 180 },
    };

    const pos = timeMap[this.currentConfig.time];
    const rad = THREE.MathUtils.degToRad(pos.azimuth);
    const elev = THREE.MathUtils.degToRad(pos.elevation);

    const r = 200;
    this.sunLight.position.x = r * Math.cos(elev) * Math.sin(rad);
    this.sunLight.position.y = r * Math.sin(elev);
    this.sunLight.position.z = r * Math.cos(elev) * Math.cos(rad);

    this.sky.updateSunPosition(pos.elevation, pos.azimuth);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Trigger dramatic lighting moment
  triggerClutchLighting(): void {
    // Dim ambient, spotlight on home plate
    this.ambientLight.intensity = 0.1;
    this.sunLight.intensity = 0.3;

    // Could add a spotlight here for dramatic effect
  }

  restoreFromClutch(): void {
    this.applyConfig(this.currentConfig);
  }
}
