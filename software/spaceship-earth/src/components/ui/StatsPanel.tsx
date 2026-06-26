  const fpsColor = metrics.fps >= 55 ? 'var(--color-phosphor)' : metrics.fps >= 40 ? '#FFD700' : '#FF4444';


    const handleMouseUp = () => setIsDragging(false);

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
          <div style={{
            display: 'flex',
            <span style={{
              color: performanceMonitor.getPerformanceLevel() === 'high' ? 'var(--color-phosphor)' :
