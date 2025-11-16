import React from 'react';
import ConnectionStatus from '../ConnectionStatus/ConnectionStatus';
import Tooltip from '../Tooltip/Tooltip';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitToScreen?: () => void;
  onNewNote?: () => void;
  zoomLevel?: number;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  onNewNote,
  zoomLevel = 1,
}) => {
  const formatZoomLevel = (level: number) => {
    return `${Math.round(level * 100)}%`;
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.controls}>
        {/* New Note Button */}
        {onNewNote && (
          <Tooltip content="Create New Note" shortcut="Ctrl+N">
            <button
              className={styles.primaryButton}
              onClick={onNewNote}
              aria-label="Create New Note"
            >
              <span className={styles.icon}>+</span>
              New Note
            </button>
          </Tooltip>
        )}

        {/* Zoom Controls */}
        <div className={styles.zoomControls}>
          {onZoomOut && (
            <Tooltip content="Zoom Out" shortcut="Ctrl+-">
              <button
                className={styles.iconButton}
                onClick={onZoomOut}
                aria-label="Zoom Out"
                disabled={zoomLevel <= 0.25}
              >
                <span className={styles.icon}>−</span>
              </button>
            </Tooltip>
          )}
          
          {onResetZoom && (
            <Tooltip content="Reset Zoom" shortcut="Ctrl+0">
              <button
                className={styles.zoomLevel}
                onClick={onResetZoom}
                aria-label="Reset Zoom"
              >
                {formatZoomLevel(zoomLevel)}
              </button>
            </Tooltip>
          )}
          
          {onZoomIn && (
            <Tooltip content="Zoom In" shortcut="Ctrl+=">
              <button
                className={styles.iconButton}
                onClick={onZoomIn}
                aria-label="Zoom In"
                disabled={zoomLevel >= 4}
              >
                <span className={styles.icon}>+</span>
              </button>
            </Tooltip>
          )}
        </div>

        {/* Fit to Screen Button */}
        {onFitToScreen && (
          <Tooltip content="Fit to Screen" shortcut="Ctrl+F">
            <button
              className={styles.iconButton}
              onClick={onFitToScreen}
              aria-label="Fit to Screen"
            >
              <span className={styles.icon}>⊡</span>
            </button>
          </Tooltip>
        )}
      </div>
      
      <div className={styles.status}>
        <ConnectionStatus />
      </div>
    </div>
  );
};

export default Toolbar;
