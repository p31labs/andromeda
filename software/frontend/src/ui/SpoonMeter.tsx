 *
export default function SpoonMeter({
  compact = false,
  showControls = false,
  size = 'md',
  hideLabel = false


  const state = getState();


  const color = getColor();

  // Size classes
  const sizeClasses = {
    sm: 'spoon-meter-sm',
    md: 'spoon-meter-md',
    lg: 'spoon-meter-lg',
  };



      <div
        <div
          className="spoon-meter-fill"
          style={{
        <div


      <span className="spoon-meter-value" style={{ color }}>
        {spoons.toFixed(1)}
      </span>

    <SpoonMeter
      showControls
      size="lg"
