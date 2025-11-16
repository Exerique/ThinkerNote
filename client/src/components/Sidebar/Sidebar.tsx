import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import Tooltip from '../Tooltip/Tooltip';
import styles from './Sidebar.module.css';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { boards, currentBoardId, setCurrentBoardId, addToast, addBoard, deleteBoard } = useApp();
  const { sendCreateBoard, sendDeleteBoard, sendRenameBoard } = useWebSocket();
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load from localStorage or default based on screen size
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.innerWidth < 768;
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardName, setEditingBoardName] = useState('');
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  
  const newBoardInputRef = useRef<HTMLInputElement>(null);
  const editBoardInputRef = useRef<HTMLInputElement>(null);

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Focus input when dialog opens
  useEffect(() => {
    if (showNewBoardDialog && newBoardInputRef.current) {
      newBoardInputRef.current.focus();
    }
  }, [showNewBoardDialog]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingBoardId && editBoardInputRef.current) {
      editBoardInputRef.current.focus();
      editBoardInputRef.current.select();
    }
  }, [editingBoardId]);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleBoardSelect = (boardId: string) => {
    setCurrentBoardId(boardId);
    navigate(`/board/${boardId}`);
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    
    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName.trim() }),
      });
      
      if (response.ok) {
        const board = await response.json();
        // Add board to local state immediately
        addBoard(board);
        // Broadcast to other clients via WebSocket
        sendCreateBoard({ boardId: board.id, name: board.name });
        setNewBoardName('');
        setShowNewBoardDialog(false);
        // Navigate to the new board
        handleBoardSelect(board.id);
      } else {
        // Show error message to user
        addToast({
          message: 'Failed to create board. Please try again.',
          type: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Failed to create board:', error);
      // Show error message to user
      addToast({
        message: 'Failed to create board. Please check your connection.',
        type: 'error',
        duration: 4000,
      });
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Delete from local state immediately
        deleteBoard(boardId);
        // Broadcast to other clients via WebSocket
        sendDeleteBoard({ boardId });
        setDeletingBoardId(null);
        // Navigate to home if deleting current board
        if (currentBoardId === boardId) {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
      addToast({
        message: 'Failed to delete board. Please try again.',
        type: 'error',
        duration: 4000,
      });
    }
  };

  const handleStartRename = (boardId: string, currentName: string) => {
    setEditingBoardId(boardId);
    setEditingBoardName(currentName);
  };

  const handleRenameBoard = async (boardId: string) => {
    if (!editingBoardName.trim() || editingBoardName === boards.find(b => b.id === boardId)?.name) {
      setEditingBoardId(null);
      return;
    }
    
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingBoardName.trim() }),
      });
      
      if (response.ok) {
        sendRenameBoard({ boardId, name: editingBoardName.trim() });
        setEditingBoardId(null);
      }
    } catch (error) {
      console.error('Failed to rename board:', error);
    }
  };

  const handleCancelRename = () => {
    setEditingBoardId(null);
    setEditingBoardName('');
  };

  // Filter boards and notes based on search query
  // Use useMemo to ensure filtering updates when boards or search changes
  const filteredBoards = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return boards;
    }
    
    const query = searchQuery.toLowerCase();
    return boards.filter(board => {
      // Check if board name matches
      if (board.name.toLowerCase().includes(query)) {
        return true;
      }
      // Check if any note content matches
      return board.notes.some(note => 
        note.content.toLowerCase().includes(query)
      );
    });
  }, [boards, searchQuery]);

  return (
    <>
      <motion.aside
        className={styles.sidebar}
        initial={false}
        animate={{
          width: isCollapsed ? 0 : 280,
          opacity: isCollapsed ? 0 : 1,
        }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0.0, 0.2, 1],
        }}
      >
        <div className={styles.header}>
          <h2>Boards</h2>
          <Tooltip content="Create New Board">
            <button
              className={styles.newBoardButton}
              onClick={() => setShowNewBoardDialog(true)}
              aria-label="Create New Board"
            >
              +
            </button>
          </Tooltip>
        </div>

        {/* Search Input */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className={styles.clearSearchButton}
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Board List */}
        <div className={styles.content}>
          {filteredBoards.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? (
                <p>No boards or notes match your search</p>
              ) : (
                <p>No boards yet. Create one to get started!</p>
              )}
            </div>
          ) : (
            <motion.ul 
              className={styles.boardList}
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
            >
              {filteredBoards.map((board) => (
                <motion.li 
                  key={board.id} 
                  className={styles.boardItem}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  transition={{
                    duration: 0.3,
                    ease: [0.4, 0.0, 0.2, 1]
                  }}
                >
                  {editingBoardId === board.id ? (
                    <div className={styles.editContainer}>
                      <input
                        ref={editBoardInputRef}
                        type="text"
                        className={styles.editInput}
                        value={editingBoardName}
                        onChange={(e) => setEditingBoardName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameBoard(board.id);
                          } else if (e.key === 'Escape') {
                            handleCancelRename();
                          }
                        }}
                        onBlur={() => handleRenameBoard(board.id)}
                      />
                    </div>
                  ) : (
                    <>
                      <button
                        className={`${styles.boardButton} ${
                          currentBoardId === board.id ? styles.active : ''
                        }`}
                        onClick={() => handleBoardSelect(board.id)}
                        onDoubleClick={() => handleStartRename(board.id, board.name)}
                        title={board.name}
                      >
                        <span className={styles.boardName}>{board.name}</span>
                        {searchQuery && board.notes.some(note => 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase())
                        ) && (
                          <span className={styles.matchBadge}>
                            {board.notes.filter(note => 
                              note.content.toLowerCase().includes(searchQuery.toLowerCase())
                            ).length}
                          </span>
                        )}
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => setDeletingBoardId(board.id)}
                        title="Delete board"
                      >
                        ×
                      </button>
                    </>
                  )}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </div>
      </motion.aside>

      {/* Toggle Button */}
      <Tooltip content={isCollapsed ? 'Show Sidebar' : 'Hide Sidebar'} position="right">
        <button
          className={`${styles.toggleButton} ${isCollapsed ? styles.collapsed : ''}`}
          onClick={handleToggleSidebar}
          aria-label={isCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
        >
          {isCollapsed ? '›' : '‹'}
        </button>
      </Tooltip>

      {/* New Board Dialog */}
      <AnimatePresence>
        {showNewBoardDialog && (
          <motion.div
            className={styles.dialogOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowNewBoardDialog(false)}
          >
            <motion.div
              className={styles.dialog}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Create New Board</h3>
              <input
                ref={newBoardInputRef}
                type="text"
                className={styles.dialogInput}
                placeholder="Board name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateBoard();
                  } else if (e.key === 'Escape') {
                    setShowNewBoardDialog(false);
                  }
                }}
              />
              <div className={styles.dialogActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowNewBoardDialog(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.createButton}
                  onClick={handleCreateBoard}
                  disabled={!newBoardName.trim()}
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deletingBoardId && (
          <motion.div
            className={styles.dialogOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDeletingBoardId(null)}
          >
            <motion.div
              className={styles.dialog}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Delete Board</h3>
              <p>Are you sure you want to delete "{boards.find(b => b.id === deletingBoardId)?.name}"?</p>
              <p className={styles.warningText}>This action cannot be undone.</p>
              <div className={styles.dialogActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setDeletingBoardId(null)}
                >
                  Cancel
                </button>
                <button
                  className={styles.deleteConfirmButton}
                  onClick={() => handleDeleteBoard(deletingBoardId)}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
