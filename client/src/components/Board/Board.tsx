import React, { useRef, useImperativeHandle, forwardRef, useEffect, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { AnimatePresence } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { PhysicsProvider, usePhysicsContext } from '../../contexts/PhysicsContext';
import { TransformProvider, useTransform } from '../../contexts/TransformContext';
import Note from '../Note/Note';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';
import styles from './Board.module.css';

export interface BoardRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToScreen: () => void;
  getViewportCenter: () => { x: number; y: number } | null;
}

interface BoardProps {
  onZoomChange?: (scale: number) => void;
}

const BoardContent = forwardRef<BoardRef, BoardProps>(({ onZoomChange }, ref) => {
  const { getCurrentBoard } = useApp();
  const { sendCreateNote } = useWebSocket();
  const transformWrapperRef = useRef<any>(null);
  const currentBoard = getCurrentBoard();
  const { addOrUpdateNote, removeNote, setViewportBounds } = usePhysicsContext();
  const { setTransformState } = useTransform();
  const previousNoteIdsRef = useRef<Set<string>>(new Set());

  // Sync notes with physics engine
  // Use note IDs to avoid re-rendering on every note update
  const noteIds = useMemo(() => 
    currentBoard?.notes.map(note => note.id).join(',') || '', 
    [currentBoard?.notes]
  );
  
  useEffect(() => {
    if (!currentBoard) return;

    const currentNoteIds = new Set(currentBoard.notes.map(note => note.id));
    
    // Add or update all notes in physics world
    currentBoard.notes.forEach((note) => {
      addOrUpdateNote(note);
    });

    // Remove notes that no longer exist
    previousNoteIdsRef.current.forEach((noteId) => {
      if (!currentNoteIds.has(noteId)) {
        removeNote(noteId);
      }
    });

    // Update the previous note IDs
    previousNoteIdsRef.current = currentNoteIds;
  }, [noteIds, currentBoard, addOrUpdateNote, removeNote]);

  // Clean up physics bodies when board changes
  useEffect(() => {
    return () => {
      // Remove all physics bodies for the current board when unmounting or switching boards
      previousNoteIdsRef.current.forEach((noteId) => {
        removeNote(noteId);
      });
      previousNoteIdsRef.current.clear();
    };
  }, [currentBoard?.id, removeNote]);

  // Initialize transform state on mount
  useEffect(() => {
    if (transformWrapperRef.current?.instance?.transformState && transformWrapperRef.current?.instance?.wrapperComponent) {
      const state = transformWrapperRef.current.instance.transformState;
      const rect = transformWrapperRef.current.instance.wrapperComponent.getBoundingClientRect();
      setTransformState({
        scale: state.scale,
        positionX: state.positionX,
        positionY: state.positionY,
        offsetX: rect.left,
        offsetY: rect.top,
      });
    }
  }, [setTransformState]);

  // Expose zoom control methods to parent
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      transformWrapperRef.current?.zoomIn(0.1);
    },
    zoomOut: () => {
      transformWrapperRef.current?.zoomOut(0.1);
    },
    resetZoom: () => {
      transformWrapperRef.current?.resetTransform();
    },
    fitToScreen: () => {
      transformWrapperRef.current?.centerView(1);
    },
    getViewportCenter: () => {
      const transformState = transformWrapperRef.current?.instance?.transformState;
      if (!transformState) return null;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate center of viewport in canvas coordinates
      const centerX = (viewportWidth / 2 - transformState.positionX) / transformState.scale;
      const centerY = (viewportHeight / 2 - transformState.positionY) / transformState.scale;
      
      return { x: Math.round(centerX), y: Math.round(centerY) };
    },
  }));

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent if clicking on a note
    const target = e.target as HTMLElement;
    if (target.closest('[data-note]')) {
      return;
    }

    if (!currentBoard) return;

    // Get the canvas element and its bounding rect
    const canvasElement = e.currentTarget;
    const rect = canvasElement.getBoundingClientRect();

    // Get the transform state
    const transformState = transformWrapperRef.current?.instance?.transformState;
    if (!transformState) return;

    // Calculate position in canvas coordinates
    const x = (e.clientX - rect.left - transformState.positionX) / transformState.scale;
    const y = (e.clientY - rect.top - transformState.positionY) / transformState.scale;

    // Send create note message
    sendCreateNote({
      boardId: currentBoard.id,
      x: Math.round(x),
      y: Math.round(y),
    });
  };

  const handleTransformChange = (ref: any) => {
    // Update transform state for notes during transformation
    if (ref?.state && ref?.instance?.wrapperComponent) {
      const rect = ref.instance.wrapperComponent.getBoundingClientRect();
      setTransformState({
        scale: ref.state.scale,
        positionX: ref.state.positionX,
        positionY: ref.state.positionY,
        offsetX: rect.left,
        offsetY: rect.top,
      });
    }
  };

  const handleZoomChange = (ref: any) => {
    if (onZoomChange && ref.state) {
      onZoomChange(ref.state.scale);
    }
    
    // Update transform state for notes
    handleTransformChange(ref);
    
    // Update viewport bounds for physics optimization
    updateViewportBounds(ref);
  };

  const updateViewportBounds = (ref: any) => {
    if (!ref?.state) return;
    
    const { scale, positionX, positionY } = ref.state;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate visible area in canvas coordinates
    const minX = -positionX / scale;
    const minY = -positionY / scale;
    const maxX = minX + viewportWidth / scale;
    const maxY = minY + viewportHeight / scale;
    
    setViewportBounds({ minX, minY, maxX, maxY });
  };

  return (
    <div className={styles.board}>
      <TransformWrapper
        ref={transformWrapperRef}
        initialScale={1}
        minScale={0.25}
        maxScale={4}
        limitToBounds={false}
        centerOnInit={false}
        wheel={{ step: 0.1 }}
        panning={{ 
          velocityDisabled: true,
          disabled: false
        }}
        pinch={{ 
          step: 5,
          disabled: false
        }}
        doubleClick={{ 
          disabled: true // We handle double-click manually
        }}
        onTransformed={handleTransformChange}
        onZoomStop={handleZoomChange}
        onPanningStop={handleZoomChange}
        centerZoomedOut={false}
      >
        <TransformComponent
          wrapperClass={styles.transformWrapper}
          contentClass={styles.transformContent}
        >
          <div
            className={styles.canvas}
            onDoubleClick={handleCanvasDoubleClick}
          >
            {/* Background grid pattern */}
            <div className={styles.grid} />
            
            {/* Render notes */}
            <AnimatePresence mode="popLayout">
              {currentBoard?.notes.map((note) => (
                <ErrorBoundary key={`${currentBoard.id}-${note.id}`}>
                  <Note note={note} />
                </ErrorBoundary>
              ))}
            </AnimatePresence>
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
});

BoardContent.displayName = 'BoardContent';

// Wrap with PhysicsProvider
const Board = forwardRef<BoardRef, BoardProps>((props, ref) => {
  const { sendMoveNote } = useWebSocket();
  
  const handlePhysicsPositionUpdate = (noteId: string, x: number, y: number) => {
    sendMoveNote({
      noteId,
      x: Math.round(x),
      y: Math.round(y),
    });
  };

  return (
    <TransformProvider>
      <PhysicsProvider enabled={true} onPositionUpdate={handlePhysicsPositionUpdate}>
        <BoardContent {...props} ref={ref} />
      </PhysicsProvider>
    </TransformProvider>
  );
});

Board.displayName = 'Board';

export default Board;
