import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note as NoteType, Sticker } from '../../../../shared/src/types';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { usePhysicsContext } from '../../contexts/PhysicsContext';
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
  const { sendUpdateNote, sendDeleteNote, sendMoveNote } = useWebSocket();
  const { applyMomentum, setNoteStatic, setNotePosition } = usePhysicsContext();
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
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track velocity for momentum
  const lastPositionRef = useRef({ x: note.x, y: note.y });
  const lastTimeRef = useRef(Date.now());
  const velocityRef = useRef({ x: 0, y: 0 });

  // Sync position with prop changes (from remote updates)
  // Use smooth animation for remote updates
  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: note.x, y: note.y });
    }
  }, [note.x, note.y, isDragging]);

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
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
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

    const handlePointerMove = (e: PointerEvent) => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTimeRef.current;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
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
      
      setPosition({ x: newX, y: newY });
      
      // Update physics position during drag
      setNotePosition(note.id, newX, newY);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      
      // Re-enable physics for the note
      setNoteStatic(note.id, false);
      
      // Apply momentum if velocity is significant
      const speed = Math.sqrt(
        velocityRef.current.x * velocityRef.current.x + 
        velocityRef.current.y * velocityRef.current.y
      );
      
      if (speed > 1) {
        // Apply physics momentum
        applyMomentum(note.id, velocityRef.current.x, velocityRef.current.y);
      } else {
        // Just send final position
        sendMoveNote({
          noteId: note.id,
          x: Math.round(position.x),
          y: Math.round(position.y),
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
      setContent(newContent);
    }
  }, []);

  const handleContentBlur = useCallback(() => {
    setIsEditing(false);
    if (contentEditableRef.current) {
      // Use textContent for plain text to prevent XSS
      const newContent = contentEditableRef.current.textContent || '';
      if (newContent !== note.content) {
        sendUpdateNote({
          noteId: note.id,
          updates: { content: newContent },
        });
      }
    }
  }, [note.content, note.id, sendUpdateNote]);

  const handleContentFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

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
    
    // Show indeterminate progress since encoding time is not tracked
    reader.onload = (event) => {
      try {
        const dataUrl = event.target?.result as string;
        
        if (!dataUrl || typeof dataUrl !== 'string') {
          throw new Error('Invalid data URL');
        }

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

  const getPreviewContent = () => {
    if (!content) return 'New note...';
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  // Only count characters if content is not empty or placeholder
  const characterCount = content && content !== 'Type here...' ? content.length : 0;
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
        }}
        onPointerDown={handlePointerDown}
        onClick={handleToggleExpand}
        initial={{ opacity: 0, scale: 0, x: position.x, y: position.y }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          x: position.x,
          y: position.y,
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
          x: isDragging ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 25 },
          y: isDragging ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 25 },
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
              >
                {content || 'Type here...'}
              </div>
              
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
                      }}
                    >
                      <span>{sticker.type}</span>
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
            initial={{ opacity: 0, scale: 0.9, x: position.x + note.width + 10, y: position.y }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: position.x + note.width + 10,
              y: position.y
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
              x: { type: 'spring', stiffness: 200, damping: 25 },
              y: { type: 'spring', stiffness: 200, damping: 25 }
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
            initial={{ opacity: 0, scale: 0.9, x: position.x + note.width + 10, y: position.y }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: position.x + note.width + 10,
              y: position.y
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
              x: { type: 'spring', stiffness: 200, damping: 25 },
              y: { type: 'spring', stiffness: 200, damping: 25 }
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
            initial={{ opacity: 0, x: position.x, y: position.y + note.height }}
            animate={{ 
              opacity: 1, 
              x: position.x,
              y: position.y + note.height + 10
            }}
            exit={{ opacity: 0, y: position.y + note.height }}
            transition={{ 
              opacity: { duration: 0.2 },
              x: { type: 'spring', stiffness: 200, damping: 25 },
              y: { duration: 0.2 }
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
