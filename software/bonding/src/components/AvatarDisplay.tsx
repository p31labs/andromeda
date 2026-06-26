function BadgeItem({
  badge,
  progress,
  isNew,
}: {


  return (
    <div
        background: progress.earned
          ? 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,212,255,0.1))'
          : 'rgba(255,255,255,0.05)',
        border: progress.earned
      <div className="badge-name" style={{
        fontSize: '12px',

            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'var(--color-phosphor)',
            }}>
              {level.title}
            </div>
            <div style={{
              fontSize: '12px',
          <div style={{
            fontSize: '14px',
            <div style={{
              fontSize: '11px',

          background: 'linear-gradient(90deg, var(--color-phosphor), #00D4FF)',
function StatsSummary({
  bonds,
  molecules,
  unique,
  familySessions,
  playMinutes,
}: {

          <span style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'var(--color-phosphor)',
          }}>
            {stat.value}
          </span>
          <span style={{
            fontSize: '10px',
function CelebrationOverlay({
  badge,
  onComplete
}: {
  badge: Badge;

        color: 'var(--color-phosphor)',


  const earnedCount = getEarnedBadgesCount(badgeCollection);
  const totalBadges = getTotalBadgesCount();
  const level = getLevelForBonds(totalBonds);



            background: 'linear-gradient(135deg, var(--color-phosphor), #00D4FF)',
            <div style={{
              fontSize: '14px',
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'var(--color-phosphor)',

          <span style={{
            fontWeight: 'bold',
            color: 'var(--color-phosphor)',
          }}>
            {earnedCount}
          </span>
          <span style={{

      {/* Level progress */}
      <LevelProgress bonds={totalBonds} />

      {/* Stats summary */}
      <StatsSummary

              <BadgeItem

      {/* Celebration overlay */}
      {showCelebration && (
        <CelebrationOverlay
export function AvatarCompact({
  bonds = 0,
}: {
    <button
export default AvatarDisplay;
