import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note as NoteType, Sticker } from '../../../../shared/src/types';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { usePhysicsContext } from '../../contexts/PhysicsContext';
import { useTransform } from '../../contexts/TransformContext';
import { useApp } from '../../contexts/AppContext';
import { websocketService } from '../../services/websocket';
import Tooltip from '../Tooltip/Tooltip';
import ProgressIndicator from '../ProgressIndicator/ProgressIndicator';
import styles from './Note.module.css';

interface NoteProps {
  note: NoteType;
}

const SOLID_COLORS = [
  '#FFD60A', // Yellow
  '#FF9F0A', // Orange
  '#FF453A', // Red
  '#FF375F', // Pink
  '#BF5AF2', // Purple
  '#0A84FF', // Blue
  '#5AC8FA', // Teal
  '#32D74B', // Green
];

const GRADIENTS = [
  'linear-gradient(135deg, #FF9F0A 0%, #FF375F 100%)', // Sunset
  'linear-gradient(135deg, #5AC8FA 0%, #0A84FF 100%)', // Ocean
  'linear-gradient(135deg, #32D74B 0%, #30D158 100%)', // Forest
  'linear-gradient(135deg, #BF5AF2 0%, #FF375F 100%)', // Twilight
  'linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)', // Dawn
];

const FONT_SIZES = {
  small: '13px',
  medium: '15px',
  large: '17px',
};

const STICKER_EMOJIS = [
  '❤️', '😊', '😂', '😍', '🥰', '😎', '🤔', '😴',
  '⭐', '✨', '🔥', '💡', '✅', '❌', '⚠️', '📌',
  '🎨', '🎵', '📷', '🎯'
];

const Note: React.FC<NoteProps> = ({ note }) => {
  const { sendUpdateNote, sendDeleteNote, sendMoveNote, sendEditingStart, sendEditingEnd } = useWebSocket();
  const { applyMomentum, setNoteStatic, setNotePosition } = usePhysicsContext();
  const { screenToBoard } = useTransform();
  const { addToast } = useApp();
  const [isExpanded, setIsExpanded] = useState(note.isExpanded);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [showCustomization, setShowCustomization] = useState(false);
  const [showStickerLibrary, setShowStickerLibrary] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [content, setContent] = useState(note.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
  const [stickerDragStart, setStickerDragStart] = useState({ x: 0, y: 0 });
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track velocity for momentum
  const lastPositionRef = useRef({ x: note.x, y: note.y });
  const lastTimeRef = useRef(Date.now());
  const velocityRef = useRef({ x: 0, y: 0 });
  
  // Track if we're in physics motion (after drag release)
  const isInPhysicsMotionRef = useRef(false);
  const physicsMotionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounce content updates
  const contentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync position with prop changes (from remote updates)
  // Use smooth animation for remote updates
  // Only update if the position difference is significant (more than 5px)
  // This prevents fighting with local drag updates and physics motion
  useEffect(() => {
    if (!isDragging && !isInPhysicsMotionRef.current) {
      const dx = Math.abs(note.x - position.x);
      const dy = Math.abs(note.y - position.y);
      
      // Only sync if position changed significantly (remote update)
      if (dx > 5 || dy > 5) {
        setPosition({ x: note.x, y: note.y });
      }
    }
  }, [note.x, note.y, isDragging, position.x, position.y]);

  // Sync content with prop changes
  useEffect(() => {
    if (!isEditing) {
      setContent(note.content);
    }
  }, [note.content, isEditing]);

  // Sync expanded state
  useEffect(() => {
    setIsExpanded(note.isExpanded);
  }, [note.isExpanded]);

  const handleToggleExpand = (e: React.MouseEvent) => {
    // Don't toggle if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[contenteditable]') ||
      target.closest('input') ||
      target.closest(`.${styles.customizationPanel}`) ||
      target.closest(`.${styles.stickerLibrary}`)
    ) {
      return;
    }

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    sendUpdateNote({
      noteId: note.id,
      updates: { isExpanded: newExpanded },
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't start drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[contenteditable]') ||
      target.closest('input') ||
      target.closest(`.${styles.customizationPanel}`) ||
      target.closest(`.${styles.stickerLibrary}`)
    ) {
      return;
    }

    setIsDragging(true);
    
    // Convert screen coordinates to board coordinates
    const boardPos = screenToBoard(e.clientX, e.clientY);
    setDragStart({
      x: boardPos.x - position.x,
      y: boardPos.y - position.y,
    });
    
    // Make note static in physics world during drag
    setNoteStatic(note.id, true);
    
    // Reset velocity tracking
    lastPositionRef.current = position;
    lastTimeRef.current = Date.now();
    velocityRef.current = { x: 0, y: 0 };
    
    // Capture pointer for touch events
    if (noteRef.current) {
      noteRef.current.setPointerCapture(e.pointerId);
    }
    
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    let lastNetworkUpdate = Date.now();
    const networkUpdateThrottle = 50; // Send position updates every 50ms (20 updates/sec)
    let rafId: number | null = null;
    let pendingPosition: { x: number; y: number } | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTimeRef.current;
      
      // Convert screen coordinates to board coordinates
      const boardPos = screenToBoard(e.clientX, e.clientY);
      const newX = boardPos.x - dragStart.x;
      const newY = boardPos.y - dragStart.y;
      
      // Calculate velocity for momentum
      if (deltaTime > 0 && deltaTime < 100) { // Ignore large time gaps
        const deltaX = newX - lastPositionRef.current.x;
        const deltaY = newY - lastPositionRef.current.y;
        
        velocityRef.current = {
          x: deltaX / deltaTime * 16.67, // Normalize to 60fps
          y: deltaY / deltaTime * 16.67,
        };
        
        lastPositionRef.current = { x: newX, y: newY };
        lastTimeRef.current = currentTime;
      }
      
      // Store pending position for RAF update
      pendingPosition = { x: newX, y: newY };
      
      // Update DOM directly for immediate visual feedback
      if (noteRef.current) {
        noteRef.current.style.left = `${newX}px`;
        noteRef.current.style.top = `${newY}px`;
      }
      
      // Batch React state updates with RAF
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (pendingPosition) {
            setPosition(pendingPosition);
            setNotePosition(note.id, pendingPosition.x, pendingPosition.y);
          }
          rafId = null;
        });
      }
      
      // Throttle network updates to avoid flooding
      if (currentTime - lastNetworkUpdate >= networkUpdateThrottle) {
        sendMoveNote({
          noteId: note.id,
          x: Math.round(newX),
          y: Math.round(newY),
        });
        lastNetworkUpdate = currentTime;
      }
    };

    const handlePointerUp = () => {
      // Cancel any pending RAF
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      // Apply final pending position
      if (pendingPosition) {
        setPosition(pendingPosition);
        setNotePosition(note.id, pendingPosition.x, pendingPosition.y);
      }
      
      setIsDragging(false);
      
      // Re-enable physics for the note
      setNoteStatic(note.id, false);
      
      // Apply momentum if velocity is significant
      const speed = Math.sqrt(
        velocityRef.current.x * velocityRef.current.x + 
        velocityRef.current.y * velocityRef.current.y
      );
      
      if (speed > 1) {
        // Mark that we're in physics motion
        isInPhysicsMotionRef.current = true;
        
        // Clear any existing timeout
        if (physicsMotionTimeoutRef.current) {
          clearTimeout(physicsMotionTimeoutRef.current);
        }
        
        // Apply physics momentum
        applyMomentum(note.id, velocityRef.current.x, velocityRef.current.y);
        
        // Clear physics motion flag after animation completes (estimate 2 seconds)
        physicsMotionTimeoutRef.current = setTimeout(() => {
          isInPhysicsMotionRef.current = false;
        }, 2000);
      } else {
        // Just send final position
        const finalX = pendingPosition?.x ?? position.x;
        const finalY = pendingPosition?.y ?? position.y;
        sendMoveNote({
          noteId: note.id,
          x: Math.round(finalX),
          y: Math.round(finalY),
        });
      }
      
      // Reset velocity
      velocityRef.current = { x: 0, y: 0 };
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, dragStart, position, note.id, sendMoveNote, applyMomentum, setNoteStatic, setNotePosition]);

  const handleContentChange = useCallback(() => {
    if (contentEditableRef.current) {
      // Use textContent for plain text to prevent XSS
      const newContent = contentEditableRef.current.textContent || '';
      // Keep local state in sync while editing so React re-renders don't wipe the text
      setContent(newContent);

      // Debounce content updates (500ms) for real-time collaboration
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }

      contentUpdateTimeoutRef.current = setTimeout(() => {
        if (newContent !== note.content) {
          sendUpdateNote({
            noteId: note.id,
            updates: { content: newContent },
          });
        }
      }, 500);
    }
  }, [note.content, note.id, sendUpdateNote]);

  const handleContentBlur = useCallback(() => {
    setIsEditing(false);
    sendEditingEnd(note.id);
    if (contentEditableRef.current) {
      // Use textContent for plain text to prevent XSS
      const newContent = contentEditableRef.current.textContent || '';
      // Update local state on blur
      setContent(newContent);
      if (newContent !== note.content) {
        sendUpdateNote({
          noteId: note.id,
          updates: { content: newContent },
        });
      }
    }
  }, [note.content, note.id, sendUpdateNote, sendEditingEnd]);

  const handleContentFocus = useCallback(() => {
    setIsEditing(true);
    sendEditingStart(note.id);
  }, [note.id, sendEditingStart]);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(() => {
    sendDeleteNote({ noteId: note.id });
  }, [note.id, sendDeleteNote]);

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleColorChange = (color: string) => {
    sendUpdateNote({
      noteId: note.id,
      updates: { backgroundColor: color },
    });
  };

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    sendUpdateNote({
      noteId: note.id,
      updates: { fontSize: size },
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input
    e.target.value = '';

    // Check image limit (max 5 images per note)
    const MAX_IMAGES = 5;
    if (note.images.length >= MAX_IMAGES) {
      addToast({
        message: `Maximum ${MAX_IMAGES} images per note allowed.`,
        type: 'error',
        duration: 4000,
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addToast({
        message: 'Invalid file type. Please upload JPEG, PNG, or GIF images.',
        type: 'error',
        duration: 4000,
      });
      return;
    }

    // Validate file size (10MB)
    // Note: Base64 encoding increases size by ~33%, so 10MB file becomes ~13MB in memory
    // TODO: Consider implementing proper file storage (file system or cloud) for better performance
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      addToast({
        message: `File size (${sizeMB}MB) exceeds 10MB limit.`,
        type: 'error',
        duration: 4000,
      });
      return;
    }

    // Set uploading state
    setIsUploadingImage(true);
    setUploadProgress(0);

    // Convert to Base64
    const reader = new FileReader();
    
    // Track progress during file read
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
      }
    };
    
    reader.onload = (event) => {
      try {
        const dataUrl = event.target?.result as string;
        
        if (!dataUrl || typeof dataUrl !== 'string') {
          throw new Error('Invalid data URL');
        }

        // Set to 100% before processing
        setUploadProgress(100);

        const newImage = {
          id: `img-${Date.now()}`,
          url: dataUrl,
          width: 200,
          height: 150,
          x: 0,
          y: 0,
        };

        sendUpdateNote({
          noteId: note.id,
          updates: {
            images: [...note.images, newImage],
          },
        });

        addToast({
          message: 'Image uploaded successfully',
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        console.error('Error processing image:', error);
        addToast({
          message: 'Error processing image. Please try again.',
          type: 'error',
          duration: 4000,
        });
      } finally {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      addToast({
        message: 'Error reading file. Please try again.',
        type: 'error',
        duration: 4000,
      });
      setIsUploadingImage(false);
      setUploadProgress(0);
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error starting file read:', error);
      addToast({
        message: 'Error reading file. Please try again.',
        type: 'error',
        duration: 4000,
      });
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleAddSticker = (emoji: string) => {
    // Randomize initial position to prevent stacking
    const randomX = Math.floor(Math.random() * (note.width - 60)) + 10;
    const randomY = Math.floor(Math.random() * (note.height - 100)) + 50;
    
    const newSticker: Sticker = {
      id: `sticker-${Date.now()}`,
      type: emoji,
      x: randomX,
      y: randomY,
      scale: 1,
    };

    sendUpdateNote({
      noteId: note.id,
      updates: {
        stickers: [...note.stickers, newSticker],
      },
    });

    setShowStickerLibrary(false);
  };

  const handleRemoveSticker = (stickerId: string) => {
    sendUpdateNote({
      noteId: note.id,
      updates: {
        stickers: note.stickers.filter(s => s.id !== stickerId),
      },
    });
  };

  const handleStickerResize = (stickerId: string, newScale: number) => {
    sendUpdateNote({
      noteId: note.id,
      updates: {
        stickers: note.stickers.map(s =>
          s.id === stickerId ? { ...s, scale: newScale } : s
        ),
      },
    });
  };

  const handleStickerPointerDown = (e: React.PointerEvent, sticker: Sticker) => {
    e.stopPropagation(); // Don't drag the note
    e.preventDefault();
    
    setDraggingStickerId(sticker.id);
    setStickerDragStart({
      x: e.clientX - sticker.x,
      y: e.clientY - sticker.y,
    });
  };

  useEffect(() => {
    if (!draggingStickerId) return;

    const handleStickerMove = (e: PointerEvent) => {
      const sticker = note.stickers.find(s => s.id === draggingStickerId);
      if (!sticker) return;

      // Calculate new position relative to note
      const newX = Math.max(0, Math.min(note.width - 60, e.clientX - stickerDragStart.x));
      const newY = Math.max(0, Math.min(note.height - 60, e.clientY - stickerDragStart.y));

      // Update sticker position
      sendUpdateNote({
        noteId: note.id,
        updates: {
          stickers: note.stickers.map(s =>
            s.id === draggingStickerId ? { ...s, x: newX, y: newY } : s
          ),
        },
      });
    };

    const handleStickerUp = () => {
      setDraggingStickerId(null);
    };

    document.addEventListener('pointermove', handleStickerMove);
    document.addEventListener('pointerup', handleStickerUp);
    document.addEventListener('pointercancel', handleStickerUp);

    return () => {
      document.removeEventListener('pointermove', handleStickerMove);
      document.removeEventListener('pointerup', handleStickerUp);
      document.removeEventListener('pointercancel', handleStickerUp);
    };
  }, [draggingStickerId, stickerDragStart, note.stickers, note.id, note.width, note.height, sendUpdateNote]);

  const getPreviewContent = () => {
    if (!content) return 'New note...';
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  const characterCount = content.length;
  const isRemoteEditing = note.editingBy && note.editingBy !== websocketService.getUserId();

  // Handle keyboard shortcuts for note
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if note is focused (has focus-visible class or is being interacted with)
      if (!noteRef.current?.matches(':focus-within')) {
        return;
      }

      // Ctrl+Delete to delete note (avoids conflict with text editing)
      if (e.key === 'Delete' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleDelete();
      }

      // Escape key to close panels
      if (e.key === 'Escape') {
        setShowCustomization(false);
        setShowStickerLibrary(false);
        setShowDeleteConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (physicsMotionTimeoutRef.current) {
        clearTimeout(physicsMotionTimeoutRef.current);
      }
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <motion.div
        ref={noteRef}
        className={`${styles.note} ${isDragging ? styles.dragging : ''} ${isExpanded ? styles.expanded : styles.collapsed}`}
        data-note
        tabIndex={0}
        role="article"
        aria-label={`Note: ${content || 'Empty note'}`}
        aria-live="polite"
        style={{
          width: `${note.width}px`,
          minHeight: `${note.height}px`,
          background: note.backgroundColor,
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onPointerDown={handlePointerDown}
        onClick={handleToggleExpand}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          height: isExpanded ? 'auto' : '100px'
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.8,
          transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
        }}
        transition={{
          opacity: { type: 'spring', stiffness: 300, damping: 20, duration: 0.4 },
          scale: { type: 'spring', stiffness: 300, damping: 20, duration: 0.4 },
          height: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] },
          layout: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
        }}
        layout
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerButtons}>
            <Tooltip content="Customize Note">
              <button
                className={styles.iconButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCustomization(!showCustomization);
                }}
                aria-label="Customize Note"
              >
                🎨
              </button>
            </Tooltip>
            <Tooltip content={isUploadingImage ? 'Uploading...' : 'Add Image'}>
              <button
                className={styles.iconButton}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isUploadingImage) {
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Add Image"
                disabled={isUploadingImage}
                style={{ opacity: isUploadingImage ? 0.5 : 1 }}
              >
                {isUploadingImage ? '⏳' : '📷'}
              </button>
            </Tooltip>
            <Tooltip content="Add Sticker">
              <button
                className={styles.iconButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStickerLibrary(!showStickerLibrary);
                }}
                aria-label="Add Sticker"
              >
                ⭐
              </button>
            </Tooltip>
            <Tooltip content="Delete Note" shortcut="Delete">
              <button
                className={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                aria-label="Delete Note"
              >
                ✕
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div
          className={styles.content}
          style={{
            fontSize: FONT_SIZES[note.fontSize],
          }}
        >
          {isExpanded ? (
            <>
              <div
                ref={contentEditableRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentChange}
                onBlur={handleContentBlur}
                onFocus={handleContentFocus}
                onClick={(e) => e.stopPropagation()}
                className={styles.editableContent}
              >{content}</div>
              
              {/* Character count */}
              <div className={styles.characterCount}>
                {characterCount.toLocaleString()} characters
              </div>

              {/* Images */}
              {note.images.length > 0 && (
                <div className={styles.images}>
                  {note.images.map((image) => (
                    <img
                      key={image.id}
                      src={image.url}
                      alt=""
                      className={styles.image}
                      style={{
                        width: `${image.width}px`,
                        height: `${image.height}px`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Stickers */}
              {note.stickers.length > 0 && (
                <div className={styles.stickers}>
                  {note.stickers.map((sticker) => (
                    <div
                      key={sticker.id}
                      className={styles.sticker}
                      style={{
                        fontSize: `${28 * sticker.scale}px`,
                        left: `${sticker.x}px`,
                        top: `${sticker.y}px`,
                        cursor: draggingStickerId === sticker.id ? 'grabbing' : 'grab',
                      }}
                      onPointerDown={(e) => handleStickerPointerDown(e, sticker)}
                    >
                      <span style={{ pointerEvents: 'none' }}>{sticker.type}</span>
                      <div className={styles.stickerControls}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStickerResize(sticker.id, Math.max(0.5, sticker.scale - 0.25));
                          }}
                          className={styles.stickerButton}
                        >
                          −
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStickerResize(sticker.id, Math.min(2.0, sticker.scale + 0.25));
                          }}
                          className={styles.stickerButton}
                        >
                          +
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSticker(sticker.id);
                          }}
                          className={styles.stickerButton}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.preview}>{getPreviewContent()}</div>
          )}
        </div>

        {/* Remote editing indicator */}
        {isRemoteEditing && (
          <div className={styles.editingIndicator}>
            <span className={styles.editingBadge}>✏️ Being edited</span>
          </div>
        )}

        {/* Upload progress indicator */}
        {isUploadingImage && (
          <div className={styles.uploadProgress}>
            <ProgressIndicator 
              progress={uploadProgress} 
              message="Uploading image..." 
              size="small"
            />
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
      </motion.div>

      {/* Customization Panel */}
      <AnimatePresence>
        {showCustomization && (
          <motion.div
            className={styles.customizationPanel}
            style={{
              left: `${position.x + note.width + 10}px`,
              top: `${position.y}px`,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.panelHeader}>Customize</div>
            
            {/* Solid Colors */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Colors</div>
              <div className={styles.colorGrid}>
                {SOLID_COLORS.map((color) => (
                  <button
                    key={color}
                    className={styles.colorButton}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Gradients */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Gradients</div>
              <div className={styles.colorGrid}>
                {GRADIENTS.map((gradient, index) => (
                  <button
                    key={index}
                    className={styles.colorButton}
                    style={{ background: gradient }}
                    onClick={() => handleColorChange(gradient)}
                    title={`Gradient ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Font Size</div>
              <div className={styles.fontSizeButtons}>
                <button
                  className={`${styles.fontSizeButton} ${note.fontSize === 'small' ? styles.active : ''}`}
                  onClick={() => handleFontSizeChange('small')}
                >
                  Small
                </button>
                <button
                  className={`${styles.fontSizeButton} ${note.fontSize === 'medium' ? styles.active : ''}`}
                  onClick={() => handleFontSizeChange('medium')}
                >
                  Medium
                </button>
                <button
                  className={`${styles.fontSizeButton} ${note.fontSize === 'large' ? styles.active : ''}`}
                  onClick={() => handleFontSizeChange('large')}
                >
                  Large
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticker Library */}
      <AnimatePresence>
        {showStickerLibrary && (
          <motion.div
            className={styles.stickerLibrary}
            style={{
              left: `${position.x + note.width + 10}px`,
              top: `${position.y}px`,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.panelHeader}>Stickers</div>
            <div className={styles.stickerGrid}>
              {STICKER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className={styles.stickerOption}
                  onClick={() => handleAddSticker(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className={styles.deleteDialog}
            style={{
              left: `${position.x}px`,
              top: `${position.y + note.height + 10}px`,
            }}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              opacity: { duration: 0.2 },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogText}>Delete this note?</div>
            <div className={styles.dialogButtons}>
              <button className={styles.cancelButton} onClick={cancelDelete}>
                Cancel
              </button>
              <button className={styles.confirmButton} onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Note;
