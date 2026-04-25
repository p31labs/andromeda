export const MeshGlowShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: [0.024, 0.784, 0.859] },
    uSpoonDeficitExponent: { value: 1.0 },
    uPingDelta: { value: 0.0 },
    uJitter: { value: 0.0 },
    uViewVector: { value: [0, 0, 1] }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDir;
    uniform vec3 uViewVector;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vViewDir = normalize(uViewVector);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uSpoonDeficitExponent;
    uniform float uPingDelta;
    uniform float uJitter;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDir;
    void main() {
      float fresnel = pow(1.0 - dot(vNormal, vViewDir), uSpoonDeficitExponent * 2.5 + 1.0);
      float pulse = sin(uTime * 3.0 + uPingDelta * 10.0) * 0.15 + 0.85;
      pulse *= 1.0 + uJitter * 0.5;
      vec3 baseColor = uColor;
      float coherenceFactor = 1.0 - uPingDelta * 0.5 - uJitter * 0.3;
      baseColor.r += (1.0 - coherenceFactor) * 0.3;
      baseColor.g *= coherenceFactor;
      baseColor.b *= coherenceFactor;
      float intensity = fresnel * pulse * (0.5 + uSpoonDeficitExponent * 0.5);
      vec3 glow = baseColor * intensity;
      float noise = fract(sin(dot(vWorldPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
      glow += baseColor * noise * 0.05 * intensity;
      gl_FragColor = vec4(glow, intensity * 0.8);
    }`
}
