import { CanvasTexture } from 'three';

export const generateBloomTexture = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get 2D context for canvas');
  }

  const gradient = context.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  return new CanvasTexture(canvas);
};
