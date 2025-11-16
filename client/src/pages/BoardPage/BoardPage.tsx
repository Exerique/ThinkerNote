import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import Board, { BoardRef } from '../../components/Board/Board';
import Toolbar from '../../components/Toolbar/Toolbar';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import SkeletonNote from '../../components/SkeletonNote/SkeletonNote';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import styles from './BoardPage.module.css';

const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const { getCurrentBoard, setCurrentBoardId } = useApp();
  const { requestSync, sendCreateNote } = useWebSocket();
  const boardRef = useRef<BoardRef>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  // Track synced boards with timestamps for cache invalidation
  const syncedBoardsRef = useRef<Map<string, number>>(new Map());
  const SYNC_CACHE_DURATION = 5000; // 5 seconds cache

  useEffect(() => {
    if (boardId) {
      setCurrentBoardId(boardId);
      
      const now = Date.now();
      const lastSyncTime = syncedBoardsRef.current.get(boardId);
      const shouldSync = !lastSyncTime || (now - lastSyncTime) > SYNC_CACHE_DURATION;
      
      // Request sync if board is new or cache is stale
      if (shouldSync) {
        setIsLoading(true);
        requestSync(boardId);
        syncedBoardsRef.current.set(boardId, now);
        
        // Simulate loading delay for skeleton screen
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 300);
        
        return () => clearTimeout(timer);
      } else {
        setIsLoading(false);
      }
    }
  }, [boardId, setCurrentBoardId, requestSync]);

  // Force re-sync when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && boardId) {
        const now = Date.now();
        const lastSyncTime = syncedBoardsRef.current.get(boardId);
        
        // Only sync if cache is stale (more than 5 seconds old)
        if (!lastSyncTime || (now - lastSyncTime) > SYNC_CACHE_DURATION) {
          requestSync(boardId);
          syncedBoardsRef.current.set(boardId, now);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [boardId, requestSync]);

  const currentBoard = getCurrentBoard();

  const handleZoomIn = () => {
    boardRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    boardRef.current?.zoomOut();
  };

  const handleResetZoom = () => {
    boardRef.current?.resetZoom();
  };

  const handleFitToScreen = () => {
    boardRef.current?.fitToScreen();
  };

  const handleNewNote = () => {
    if (!currentBoard) return;
    
    // Get the current viewport center from the board ref
    const viewportCenter = boardRef.current?.getViewportCenter();
    
    // Create note at center of viewport or fallback to default
    sendCreateNote({
      boardId: currentBoard.id,
      x: viewportCenter?.x ?? 500,
      y: viewportCenter?.y ?? 500,
    });
  };

  const handleZoomChange = (scale: number) => {
    setZoomLevel(scale);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      handler: handleNewNote,
      description: 'Create new note',
    },
    {
      key: '=',
      ctrl: true,
      handler: handleZoomIn,
      description: 'Zoom in',
    },
    {
      key: '-',
      ctrl: true,
      handler: handleZoomOut,
      description: 'Zoom out',
    },
    {
      key: '0',
      ctrl: true,
      handler: handleResetZoom,
      description: 'Reset zoom',
    },
    {
      key: 'f',
      ctrl: true,
      handler: handleFitToScreen,
      description: 'Fit to screen',
    },
  ]);

  if (!currentBoard) {
    return <LoadingSpinner message="Loading board..." />;
  }

  return (
    <div className={styles.boardPage}>
      <Toolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitToScreen={handleFitToScreen}
        onNewNote={handleNewNote}
        zoomLevel={zoomLevel}
      />
      {isLoading ? (
        <div className={styles.skeletonContainer}>
          <SkeletonNote />
          <SkeletonNote />
          <SkeletonNote />
        </div>
      ) : (
        <Board ref={boardRef} onZoomChange={handleZoomChange} />
      )}
    </div>
  );
};

export default BoardPage;
