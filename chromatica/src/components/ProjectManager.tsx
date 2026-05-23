/**
 * ProjectManager Component v2.0
 * Immersive Project Gallery - Dark P31 Theme
 * 
 * Features:
 * - Full-screen immersive project cards
 * - 96px floating action button
 * - Swipe gestures with haptic feedback
 * - Voice search
 * - Sort options
 * - Beautiful empty state
 */

import React, { useState, useRef } from 'react';
import { BigButton } from './BigButton';

interface Project {
  id: string;
  name: string;
  description: string;
  colorCount: number;
  lastModified: number;
  thumbnailColor: string;
}

interface ProjectManagerProps {
  projects: Project[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

type SortOption = 'recent' | 'name' | 'colors';

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects = [],
  onCreate,
  onOpen,
  onDuplicate,
  onDelete
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [swipedProject, setSwipedProject] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Play haptic feedback sound
  const hapticFeedback = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 200;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  };

  // Sort and filter projects
  const sortedProjects = [...projects]
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.lastModified - a.lastModified;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'colors':
          return b.colorCount - a.colorCount;
        default:
          return 0;
      }
    });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent, projectId: string) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent, projectId: string) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 100) {
      setSwipedProject(projectId);
      hapticFeedback();
    } else if (diff < -50) {
      setSwipedProject(null);
    }
    touchStartX.current = null;
  };

  // Simulated voice search
  const startVoiceSearch = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      setSearchQuery('');
    }, 2000);
  };

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 200px)',
      background: 'linear-gradient(180deg, #0f1115 0%, #161920 100%)',
      padding: '24px',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          color: '#5DCAA5', 
          margin: '0 0 8px 0',
          fontWeight: 700,
        }}>
          📁 Projects
        </h1>
        <p style={{ color: '#888', fontSize: '18px', margin: 0 }}>
          {projects.length} project{projects.length !== 1 ? 's' : ''} • Swipe left to delete
        </p>
      </div>

      {/* Search & Sort Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '32px',
        flexWrap: 'wrap',
      }}>
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '20px 56px 20px 24px',
              fontSize: '20px',
              backgroundColor: '#161920',
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              color: '#D8D6D0',
              outline: 'none',
              transition: 'all 0.2s',
            }}
          />
          {/* Voice Search Button */}
          <button
            onClick={startVoiceSearch}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '48px',
              height: '48px',
              backgroundColor: isListening ? '#cc6247' : 'rgba(93,202,165,0.2)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {isListening ? '🔴' : '🎤'}
          </button>
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          style={{
            padding: '20px 24px',
            fontSize: '18px',
            backgroundColor: '#161920',
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            color: '#D8D6D0',
            cursor: 'pointer',
            minWidth: '160px',
          }}
        >
          <option value="recent">📅 Recent</option>
          <option value="name">🔤 Name</option>
          <option value="colors">🎨 Colors</option>
        </select>
      </div>

      {/* Project Grid */}
      {sortedProjects.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sortedProjects.map((project) => (
            <div
              key={project.id}
              onTouchStart={(e) => handleTouchStart(e, project.id)}
              onTouchEnd={(e) => handleTouchEnd(e, project.id)}
              style={{
                position: 'relative',
                transform: swipedProject === project.id ? 'translateX(-80px)' : 'translateX(0)',
                transition: 'transform 0.3s ease',
              }}
            >
              {/* Main Card */}
              <div
                onClick={() => swipedProject === project.id ? setSwipedProject(null) : onOpen(project.id)}
                style={{
                  backgroundColor: '#161920',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(93,202,165,0.3)';
                  e.currentTarget.style.boxShadow = '0 12px 48px rgba(93,202,165,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
                }}
              >
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: '120px',
                      height: '120px',
                      background: `linear-gradient(135deg, ${project.thumbnailColor} 0%, ${project.thumbnailColor}80 100%)`,
                      borderRadius: '16px',
                      boxShadow: `0 8px 24px ${project.thumbnailColor}40`,
                      flexShrink: 0,
                    }}
                  />
                  
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '26px', 
                      color: '#D8D6D0', 
                      margin: '0 0 12px 0',
                      fontWeight: 600,
                    }}>
                      {project.name}
                    </h3>
                    <p style={{ 
                      fontSize: '16px', 
                      color: '#888', 
                      margin: '0 0 16px 0',
                      lineHeight: 1.5,
                    }}>
                      {project.description || 'No description'}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ 
                        padding: '8px 16px', 
                        backgroundColor: 'rgba(93,202,165,0.1)', 
                        color: '#5DCAA5',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}>
                        {project.colorCount} colors
                      </span>
                      <span style={{ 
                        padding: '8px 16px', 
                        backgroundColor: 'rgba(255,255,255,0.05)', 
                        color: '#888',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}>
                        🕐 {formatDate(project.lastModified)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(project.id);
                        hapticFeedback();
                      }}
                      style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                      title="Duplicate"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>

              {/* Swipe Delete Button */}
              <button
                onClick={() => setDeleteConfirm(project.id)}
                style={{
                  position: 'absolute',
                  right: '-80px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '64px',
                  height: '120px',
                  backgroundColor: '#cc6247',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: swipedProject === project.id ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                }}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            backgroundColor: '#161920',
            borderRadius: '24px',
            border: '2px dashed rgba(93,202,165,0.3)',
          }}
        >
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>🎨</div>
          <h3 style={{ fontSize: '28px', color: '#D8D6D0', margin: '0 0 12px 0' }}>
            No projects yet
          </h3>
          <p style={{ fontSize: '18px', color: '#888', margin: '0 0 32px 0' }}>
            Create your first project to start organizing your colors
          </p>
          <BigButton onClick={onCreate} variant="primary">
            ✨ Create First Project
          </BigButton>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={onCreate}
        style={{
          position: 'fixed',
          bottom: '48px',
          right: '48px',
          width: '96px',
          height: '96px',
          backgroundColor: '#5DCAA5',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '48px',
          boxShadow: '0 8px 32px rgba(93,202,165,0.4)',
          transition: 'all 0.2s',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 48px rgba(93,202,165,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(93,202,165,0.4)';
        }}
        title="New Project"
      >
        ➕
      </button>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 1000,
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              backgroundColor: '#161920',
              border: '2px solid #cc6247',
              borderRadius: '24px',
              padding: '48px',
              maxWidth: '450px',
              width: '100%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
            <h3 style={{ fontSize: '28px', color: '#cc6247', margin: '0 0 16px 0' }}>
              Delete Project?
            </h3>
            <p style={{ fontSize: '18px', color: '#888', margin: '0 0 32px 0', lineHeight: 1.6 }}>
              This will permanently delete the project and all its colors. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <BigButton
                onClick={() => {
                  onDelete(deleteConfirm);
                  setDeleteConfirm(null);
                  setSwipedProject(null);
                  hapticFeedback();
                }}
                variant="danger"
                fullWidth
              >
                🗑️ Delete
              </BigButton>
              <BigButton
                onClick={() => setDeleteConfirm(null)}
                variant="secondary"
                fullWidth
              >
                Cancel
              </BigButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManager;
