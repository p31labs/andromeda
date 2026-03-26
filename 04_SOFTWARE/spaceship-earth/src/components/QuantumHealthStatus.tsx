/**
 * P31 Labs - Quantum Health Status Component
 * Traffic Light UI for SIC-POVM biological tomography
 * Displays the Collapse Directive output in Kilo's neuro-inclusive format
 */

import React, { useEffect } from 'react';
import { useQuantumStore, useHypoPTSwarm } from '../stores/quantumStore';

/**
 * Status indicator colors matching P31 brand palette
 */
const STATUS_COLORS = {
    OPTIMAL: {
        bg: '#00FF88',
        glow: '0 0 20px #00FF88, 0 0 40px #00FF88',
        text: '#050510'
    },
    ATTENTION: {
        bg: '#F59E0B',
        glow: '0 0 20px #F59E0B, 0 0 40px #F59E0B',
        text: '#050510'
    },
    CRASH_WARNING: {
        bg: '#EF4444',
        glow: '0 0 20px #EF4444, 0 0 40px #EF4444',
        text: '#FFFFFF'
    }
};

/**
 * Traffic Light display component
 */
export function QuantumTrafficLight() {
    const { lastPayload, tomographyConfidence, agentCount, agentOverlap } = useQuantumStore();
    
    if (!lastPayload) {
        return (
            <div className="quantum-traffic-light quantum-empty">
                <div className="status-light empty"></div>
                <span className="status-text">Waiting for data...</span>
            </div>
        );
    }
    
    const colors = STATUS_COLORS[lastPayload.status];
    
    return (
        <div 
            className="quantum-traffic-light"
            style={{
                backgroundColor: colors.bg,
                boxShadow: colors.glow
            }}
        >
            <div className="status-indicator">
                <div className="status-light" style={{ backgroundColor: colors.text }}></div>
            </div>
            
            <div className="status-content">
                <span className="status-label" style={{ color: colors.text }}>
                    {lastPayload.status.replace('_', ' ')}
                </span>
                <span className="status-metric" style={{ color: colors.text }}>
                    {lastPayload.primaryMetric.toFixed(1)} {lastPayload.metricLabel}
                </span>
                {lastPayload.actionableAdvice && (
                    <span className="status-advice" style={{ color: colors.text }}>
                        {lastPayload.actionableAdvice}
                    </span>
                )}
            </div>
            
            <div className="status-meta">
                <span className="confidence">
                    {(tomographyConfidence * 100).toFixed(0)}% confidence
                </span>
                <span className="agents">
                    {agentCount} agents | {(agentOverlap * 100).toFixed(1)}% overlap
                </span>
            </div>
            
            {lastPayload.pqcSecured && (
                <div className="pqc-badge">
                    🔒 PQC Secured
                </div>
            )}
        </div>
    );
}

/**
 * Quantum status panel with controls
 */
export function QuantumStatusPanel() {
    const {
        dimension,
        agentCount,
        agentOverlap,
        lastPayload,
        tomographyQuality,
        isMonitoring,
        currentReading,
        initializeSwarm,
        addCalcium,
        executeTomography,
        generateKeys,
        startMonitoring,
        stopMonitoring,
        reset
    } = useHypoPTSwarm();
    
    // Auto-initialize swarm
    useEffect(() => {
        initializeSwarm(dimension);
    }, []);
    
    // Simulate incoming data
    const handleAddReading = () => {
        const calcium = 6 + Math.random() * 4; // 6-10 mg/dL
        addCalcium(calcium);
    };
    
    const handleTomography = async () => {
        try {
            await executeTomography();
        } catch (err) {
            console.error('Tomography failed:', err);
        }
    };
    
    return (
        <div className="quantum-panel">
            <h2>🔬 P31 Quantum Health Monitor</h2>
            
            <div className="panel-section">
                <h3>SIC-POVM Swarm Status</h3>
                <div className="swarm-stats">
                    <div className="stat">
                        <span className="stat-label">Dimension (d)</span>
                        <span className="stat-value">{dimension}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Agents</span>
                        <span className="stat-value">{agentCount}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Overlap</span>
                        <span className="stat-value">{(agentOverlap * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
            
            <div className="panel-section">
                <h3>Current Reading</h3>
                {currentReading ? (
                    <div className="reading">
                        <span>Calcium: {currentReading.calcium?.toFixed(1)} mg/dL</span>
                        <span>{new Date(currentReading.timestamp).toLocaleTimeString()}</span>
                    </div>
                ) : (
                    <span className="empty">No readings yet</span>
                )}
            </div>
            
            <div className="panel-section">
                <h3>Controls</h3>
                <div className="controls">
                    <button onClick={handleAddReading}>
                        + Add Calcium Reading
                    </button>
                    <button onClick={handleTomography} disabled={!currentReading}>
                        Execute Tomography
                    </button>
                    <button onClick={generateKeys}>
                        Generate PQC Keys
                    </button>
                    <button onClick={isMonitoring ? stopMonitoring : startMonitoring}>
                        {isMonitoring ? 'Stop' : 'Start'} Monitoring
                    </button>
                    <button onClick={reset} className="danger">
                        Reset
                    </button>
                </div>
            </div>
            
            <div className="panel-section">
                <h3>Traffic Light Output</h3>
                <QuantumTrafficLight />
            </div>
            
            {lastPayload?.metadata && (
                <div className="panel-section">
                    <h3>Tomography Metadata</h3>
                    <div className="metadata">
                        <span>Quality: {tomographyQuality}</span>
                        <span>Swarm Size: {(lastPayload.metadata as any).swarmSize}</span>
                        <span>Confidence: {((lastPayload.metadata as any).confidence * 100).toFixed(1)}%</span>
                    </div>
                </div>
            )}
            
            <div className="panel-footer">
                <span>🔺 It's okay to be a little wonky.</span>
            </div>
        </div>
    );
}

export default QuantumStatusPanel;
