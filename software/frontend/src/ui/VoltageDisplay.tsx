 *
import {
  COCKPIT_COLORS,
  VOLTAGE_THRESHOLDS,
  getVoltageTier,
  type VoltageTier,
  type CatchersMittSignal
const TIER_CONFIG: Record<VoltageTier, {
  color: string;
export default function VoltageDisplay({
  showMeter = true,
  compact = false,
  showLog = false

  const percentage = voltageLevel;


  const voltageColor = getVoltageColor();

            <div
              className="voltage-meter-fill"
              style={{
            <div
            <div

      <div className="voltage-info" style={{ borderColor: config.color }}>
        <span

            <span
              key={entry.id}
              className="voltage-log-entry"
              style={{
                color: entry.voltage_level <= VOLTAGE_THRESHOLDS.LOW_MAX
                  ? COCKPIT_COLORS.phosphorus
                  : entry.voltage_level <= VOLTAGE_THRESHOLDS.MODERATE_MAX
                    ? COCKPIT_COLORS.calcium_amber
                    : COCKPIT_COLORS.danger_red





        <div className="voltage-warning-actions">
          <button
          <button


  return (
    <div
      className="voltage-sequester"
      style={{


          <button

  const processSignal = (signal: CatchersMittSignal) => {
    // First update the store
    processVoltageSignal(signal);







