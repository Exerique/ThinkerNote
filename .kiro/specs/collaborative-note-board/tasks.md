# Implementation Plan

- [x] 1. Initialize project structure and dependencies





  - Create monorepo structure with separate client and server directories
  - Initialize React TypeScript project for client
  - Initialize Node.js TypeScript project for server
  - Install and configure all required dependencies (React, Socket.io, Matter.js, Framer Motion, Express)
  - Set up TypeScript configurations for both client and server
  - Create shared types package for common interfaces
  - _Requirements: 15.1, 15.2_

- [x] 2. Implement data models and type definitions





  - Define TypeScript interfaces for Board, Note, Image, Sticker models
  - Define WebSocket message types and payloads
  - Create validation schemas for all data models
  - Export shared types for use in both client and server
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 10.1_

- [x] 3. Build backend server foundation





  - [x] 3.1 Set up Express server with WebSocket support


    - Create Express application with CORS configuration
    - Initialize Socket.io server attached to Express
    - Configure server to listen on configurable port (default 3001)
    - Add health check endpoint
    - _Requirements: 9.1, 9.2_
  
  - [x] 3.2 Implement file-based persistence service


    - Create data directory structure for storing boards
    - Implement JSON file read/write operations with error handling
    - Add atomic write functionality with backup creation
    - Implement auto-save mechanism (every 30 seconds)
    - Add server startup data loading
    - _Requirements: 9.5_
  
  - [x] 3.3 Build state manager for in-memory data


    - Create in-memory store for all boards and notes
    - Implement CRUD operations for boards
    - Implement CRUD operations for notes
    - Add validation for all state mutations
    - Implement last-write-wins conflict resolution
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 11.2_
  
  - [x] 3.4 Implement WebSocket event handlers


    - Handle client connection and disconnection events
    - Implement room-based communication (one room per board)
    - Create handlers for note:create, note:update, note:delete, note:move events
    - Create handlers for board:create, board:delete, board:rename events
    - Implement sync:request and sync:response for reconnection
    - Broadcast updates to all clients in the same room
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 3.5 Create REST API endpoints


    - Implement GET /api/boards endpoint
    - Implement POST /api/boards endpoint
    - Implement DELETE /api/boards/:id endpoint
    - Implement PUT /api/boards/:id endpoint
    - Implement GET /api/boards/:id/notes endpoint
    - Add request validation and error handling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Build frontend application foundation





  - [x] 4.1 Set up React application structure


    - Create component directory structure
    - Set up React Router for board navigation
    - Configure CSS Modules for styling
    - Create global styles and theme variables
    - Set up context providers for global state
    - _Requirements: 15.1, 15.5_
  
  - [x] 4.2 Implement WebSocket client connection


    - Create Socket.io client instance with configuration
    - Implement connection state management (connected, disconnected, reconnecting)
    - Add reconnection logic with exponential backoff
    - Create event listeners for all WebSocket message types
    - Implement message queue for offline changes
    - Add sync mechanism for reconnection
    - _Requirements: 9.2, 9.3, 9.4_
  
  - [x] 4.3 Create App component and routing


    - Implement root App component with WebSocket initialization
    - Set up routing for board selection
    - Create loading states for initial data fetch
    - Add error boundary for crash recovery
    - Implement connection status indicator
    - _Requirements: 1.3, 15.4_

- [x] 5. Implement Sidebar component





  - [x] 5.1 Build board list display


    - Create board list UI with scrollable container
    - Display board names with selection highlighting
    - Implement board selection handler
    - Add empty state when no boards exist
    - _Requirements: 1.2, 1.3_
  
  - [x] 5.2 Add board management controls

    - Create "New Board" button with input dialog
    - Implement board creation handler
    - Add delete button for each board with confirmation dialog
    - Implement board rename functionality with inline editing
    - _Requirements: 1.1, 1.4, 1.5_
  
  - [x] 5.3 Implement sidebar toggle and animations

    - Create toggle button for showing/hiding sidebar
    - Add slide animation using Framer Motion (300ms)
    - Persist sidebar state to localStorage
    - Adjust board viewport width when sidebar toggles
    - Set default collapsed state for screens < 768px
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 5.4 Add search functionality

    - Create search input field in sidebar
    - Implement real-time filtering of notes by content
    - Highlight matching notes on the board
    - Add clear search button
    - Implement case-insensitive matching
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 6. Implement Board component and canvas





  - [x] 6.1 Create infinite canvas container


    - Integrate React-Zoom-Pan-Pinch library
    - Configure infinite panning boundaries
    - Set up canvas coordinate system
    - Add background grid pattern
    - _Requirements: 5.4, 13.3_
  
  - [x] 6.2 Implement zoom controls


    - Add zoom in/out buttons to toolbar
    - Implement mouse wheel zoom handler (10% per increment)
    - Set zoom limits (25% to 400%)
    - Center zoom on cursor position
    - Add fit-to-screen button
    - _Requirements: 13.1, 13.2, 13.4, 13.5_
  
  - [x] 6.3 Add note creation via double-click


    - Implement double-click event handler on canvas
    - Calculate click position in canvas coordinates
    - Create new note at click position
    - Send note:create message to server
    - Animate new note appearance
    - _Requirements: 2.1, 7.3_
  
  - [x] 6.4 Add toolbar with controls


    - Create toolbar component with fixed positioning
    - Add "New Note" button
    - Add zoom controls
    - Add connection status indicator with color coding
    - Style toolbar with minimal design
    - _Requirements: 2.2, 13.4, 15.1_

- [x] 7. Implement Note component





  - [x] 7.1 Create basic note structure and rendering


    - Build note container with draggable wrapper
    - Implement collapsed and expanded states
    - Add click handler to toggle expansion
    - Display content preview in collapsed state (first 50 characters)
    - Render full content in expanded state
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [x] 7.2 Implement text editing

    - Add contentEditable div for text input
    - Implement onChange handler to capture text updates
    - Send note:update message to server on blur
    - Support 10,000+ character capacity
    - Add character count indicator
    - _Requirements: 2.3_
  
  - [x] 7.3 Add drag-and-drop functionality

    - Implement onMouseDown handler to start drag
    - Track mouse movement during drag
    - Update note position in real-time
    - Send note:move message to server on drag end
    - Auto-pan viewport when dragging near edges
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [x] 7.4 Implement delete functionality

    - Add delete button to note header
    - Show confirmation dialog before deletion
    - Send note:delete message to server
    - Animate note removal (fade out and scale down)
    - Remove note from local state
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 7.4_
  
  - [x] 7.5 Add visual customization controls

    - Create customization panel overlay
    - Implement color picker with 8 preset solid colors
    - Implement gradient selector with 4 preset gradients
    - Add font size selector (small, medium, large)
    - Apply selected styles to note
    - Send note:update message to server
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 7.6 Implement image upload and display

    - Add image upload button to note toolbar
    - Validate file type (JPEG, PNG, GIF) and size (max 10MB)
    - Convert uploaded image to Base64 data URL
    - Add image to note's images array
    - Render images within note container
    - Display error toast for invalid uploads
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 7.7 Add sticker functionality

    - Create sticker library panel with 20 emoji stickers
    - Implement sticker selection and addition to note
    - Allow sticker positioning within note (drag-and-drop)
    - Implement sticker resizing (0.5x to 2.0x scale)
    - Add remove button for each sticker
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 7.8 Add editing indicator for collaboration

    - Display visual indicator when note is being edited by remote user
    - Show user identifier or color badge
    - Update indicator in real-time based on WebSocket messages
    - Clear indicator when editing ends
    - _Requirements: 8.5_

- [x] 8. Implement physics engine integration





  - [x] 8.1 Set up Matter.js physics world


    - Initialize Matter.js engine and world
    - Configure gravity (set to zero for 2D board)
    - Set up render loop synchronized with React
    - Create physics bodies for each note
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 8.2 Implement momentum and friction


    - Calculate velocity when note is released after drag
    - Apply momentum to physics body
    - Configure friction coefficient for gradual slowdown
    - Ensure movement completes within 2 seconds
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [x] 8.3 Add collision detection and response


    - Enable collision detection between note bodies
    - Implement bounce behavior on collision
    - Prevent note overlap with collision response forces
    - Sync physics positions back to React state
    - _Requirements: 6.3, 6.4_
  
  - [x] 8.4 Optimize physics performance


    - Implement spatial partitioning for collision detection
    - Disable physics for off-screen notes
    - Limit physics updates to 60fps
    - Add error handling for physics engine failures
    - _Requirements: 6.5, 7.5_

- [x] 9. Implement animations and transitions





  - [x] 9.1 Add note state transition animations


    - Animate note expansion/collapse with Framer Motion
    - Use 300ms duration with ease-in-out easing
    - Animate note creation with scale-up effect (400ms spring)
    - Animate note deletion with fade-out and scale-down (300ms)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 9.2 Implement smooth remote update animations


    - Interpolate note position changes from remote users
    - Use spring animation for natural movement
    - Avoid jarring jumps when receiving updates
    - Maintain 30+ fps during animations
    - _Requirements: 8.3, 7.5_
  
  - [x] 9.3 Add sidebar and panel animations


    - Animate sidebar slide in/out (300ms ease-in-out)
    - Animate customization panel appearance
    - Animate sticker library panel
    - Add hover effects on interactive elements
    - _Requirements: 12.2, 7.1_

- [x] 10. Implement error handling and resilience





  - [x] 10.1 Add client-side error handling


    - Wrap physics calculations in try-catch blocks
    - Implement React Error Boundaries around Note components
    - Display fallback UI for crashed components
    - Add "Reload Note" button in error fallback
    - Log errors to console with stack traces
    - _Requirements: 15.3, 15.4_
  
  - [x] 10.2 Handle WebSocket connection errors


    - Display connection status in toolbar (connected, disconnected, reconnecting)
    - Implement exponential backoff for reconnection (3s, 6s, 12s, max 30s)
    - Queue local changes during disconnection
    - Sync queued changes upon reconnection
    - Show toast notification on connection state changes
    - _Requirements: 9.3, 9.4_
  
  - [x] 10.3 Add server-side error handling


    - Wrap file system operations in try-catch with retry logic (3 attempts)
    - Validate all incoming WebSocket messages against schemas
    - Send error responses to clients for invalid messages
    - Log all errors with timestamps to file
    - Create data directory on startup if missing
    - _Requirements: 9.5_
  
  - [x] 10.4 Implement image upload error handling


    - Validate file size before processing (max 10MB)
    - Validate file type against allowed formats
    - Display specific error messages in toast notifications
    - Disable upload button during processing
    - Handle Base64 conversion errors gracefully
    - _Requirements: 4.4, 4.5_

- [x] 11. Add accessibility and UX polish





  - [x] 11.1 Implement keyboard navigation


    - Add keyboard shortcuts for common actions (Ctrl+N for new note, Delete for delete note)
    - Ensure all interactive elements are keyboard accessible
    - Add focus indicators for keyboard navigation
    - Implement tab order for logical navigation
    - _Requirements: 15.2, 15.5_
  


  - [x] 11.2 Add tooltips and help text
    - Add tooltips to all toolbar buttons
    - Add tooltips to customization controls
    - Display help text for empty states
    - Show keyboard shortcuts in tooltips
    - _Requirements: 15.2_
  
  - [x] 11.3 Implement loading states


    - Add loading spinner for initial data fetch
    - Show loading indicator for operations > 200ms
    - Display progress indicator for image uploads
    - Add skeleton screens for board loading
    - _Requirements: 15.4_
  
  - [x] 11.4 Add responsive design


    - Ensure layout works on different screen sizes
    - Adjust sidebar behavior for mobile (default collapsed)
    - Make touch gestures work for drag and zoom
    - Test on tablets and mobile devices
    - _Requirements: 12.5_

- [-] 12. Implement comprehensive testing



  - [x] 12.1 Write unit tests for frontend components


    - Test Note component rendering with various props
    - Test customization panel color/gradient selection
    - Test sidebar board list filtering
    - Test physics manager collision detection
    - Test WebSocket message serialization
    - _Requirements: All_
  
  - [x] 12.2 Write unit tests for backend services



    - Test state manager CRUD operations
    - Test persistence service file operations
    - Test WebSocket message routing
    - Test API endpoint handlers
    - Test validation schemas
    - _Requirements: All_
  
  - [x] 12.3 Write integration tests





    - Test note creation flow end-to-end
    - Test drag-and-drop with physics
    - Test image upload and display
    - Test sticker addition and positioning
    - Test real-time update reception
    - Test WebSocket connection and broadcast
    - Test state persistence and loading
    - Test multi-client synchronization
    - _Requirements: All_
  
  - [x] 12.4 Write end-to-end tests





    - Test complete user workflow (create board → add notes → customize → collaborate)
    - Test real-time collaboration between two simulated clients
    - Test reconnection and state sync after disconnect
    - Test image upload across clients
    - Test physics interactions with multiple notes
    - _Requirements: All_
  
  - [x] 12.5 Perform performance testing





    - Test render performance with 100+ notes
    - Measure WebSocket message throughput
    - Test physics simulation frame rate with 50+ bodies
    - Monitor memory usage over 4+ hour session
    - Test file system write performance
    - _Requirements: 7.5, 15.3_
  
  - [x] 12.6 Conduct manual testing





    - Verify visual appearance matches design
    - Test animation smoothness (60fps target)
    - Verify physics interactions feel realistic
    - Test touch/trackpad gestures
    - Test responsive design on different screens
    - Verify color contrast for accessibility
    - Test keyboard navigation
    - Verify error messages are clear
    - _Requirements: 15.1, 15.2, 15.5_

- [x] 13. Fix identified bugs and issues






  - [x] 13.1 Critical Bugs - Data Integrity


    
    - [ ] **BUG-001: Double-click detection unreliable**
      - Location: `client/src/components/Board/Board.tsx:74-82`
      - Issue: Manual double-click detection using 300ms threshold is unreliable and can create notes on single clicks if timing is off
      - Impact: Users may accidentally create notes or fail to create notes when intended
      - Fix: Use native `onDoubleClick` event instead of manual timing logic, or increase threshold to 400ms and add click counter
      - Priority: HIGH
    
    - [ ] **BUG-002: Race condition in board sync**
      - Location: `client/src/pages/BoardPage/BoardPage.tsx:18-35`
      - Issue: `syncedBoardRef` prevents re-syncing when navigating away and back to same board, but board data might be stale
      - Impact: Users may see outdated data when returning to a previously viewed board
      - Fix: Add timestamp-based cache invalidation or force sync on visibility change
      - Priority: HIGH
    
    - [ ] **BUG-003: Note position sync conflicts during physics simulation**
      - Location: `client/src/services/physicsManager.ts:145-158`
      - Issue: Physics engine continuously sends position updates while note is moving, creating network spam and potential conflicts with remote updates
      - Impact: Excessive WebSocket traffic, potential position desync between clients
      - Fix: Throttle position updates to max 10 per second, or only send final position when velocity drops below threshold
      - Priority: HIGH
    
    - [ ] **BUG-004: Duplicate note creation still possible**
      - Location: `client/src/contexts/AppContext.tsx:67-79`
      - Issue: While duplicate check exists, rapid double-clicks or network delays can still create duplicates before first note is added to state
      - Impact: Multiple notes created from single action
      - Fix: Add debouncing to note creation, track pending note IDs, or use optimistic UI with server-side deduplication
      - Priority: MEDIUM
    
    - [ ] **BUG-005: Board deletion doesn't clean up physics bodies**
      - Location: `client/src/contexts/PhysicsContext.tsx` and `server/src/services/stateManager.ts:138-151`
      - Issue: When board is deleted, physics bodies for its notes are not removed from physics world
      - Impact: Memory leak, physics engine continues simulating deleted notes
      - Fix: Add cleanup in PhysicsContext when board changes, remove all notes from physics world
      - Priority: MEDIUM

  - [x] 13.2 Critical Bugs - State Management


    
    - [ ] **BUG-006: WebSocket message payload inconsistency**
      - Location: `client/src/contexts/WebSocketContext.tsx:71` and `server/src/websocket/handlers.ts:48-60`
      - Issue: Server wraps note in `payload` object but client expects note directly, causing confusion
      - Impact: Potential data access errors, inconsistent message handling
      - Fix: Standardize message format - server should send note directly in payload, not nested
      - Priority: HIGH
    
    - [ ] **BUG-007: No handling for concurrent note edits**
      - Location: `client/src/components/Note/Note.tsx:138-149` and `server/src/services/stateManager.ts:234-256`
      - Issue: Last-write-wins without any conflict detection or user notification
      - Impact: Users can silently overwrite each other's changes
      - Fix: Add version numbers or timestamps, show conflict warning, or implement operational transformation
      - Priority: HIGH
    
    - [ ] **BUG-008: editingBy field never set or cleared**
      - Location: `client/src/components/Note/Note.tsx:428`
      - Issue: Code checks for `note.editingBy` but this field is never set when user starts editing
      - Impact: Remote editing indicator never shows, defeating collaboration awareness
      - Fix: Send `note:editing:start` and `note:editing:end` messages, update state accordingly
      - Priority: MEDIUM
    
    - [ ] **BUG-009: Board state not updated when notes change**
      - Location: `client/src/contexts/AppContext.tsx:67-79`
      - Issue: When adding note, board's `updatedAt` timestamp is not updated in client state
      - Impact: Inconsistent state, potential sync issues
      - Fix: Update board's `updatedAt` when modifying its notes
      - Priority: LOW
    
    - [ ] **BUG-010: No cleanup of message handlers on unmount**
      - Location: `client/src/contexts/WebSocketContext.tsx:44-111`
      - Issue: While handlers are removed in cleanup, if component remounts quickly, duplicate handlers may accumulate
      - Impact: Multiple handler executions, duplicate state updates
      - Fix: Use handler references consistently, ensure cleanup runs before re-registration
      - Priority: MEDIUM

  - [x] 13.3 Critical Bugs - Physics Engine


    
    - [ ] **BUG-011: Physics engine uses deprecated Matter.js APIs**
      - Location: `client/src/services/physicsManager.ts:24-42`
      - Issue: Using deprecated `gravity`, `Grid`, and `broadphase` APIs that may be removed in future versions
      - Impact: Code will break when Matter.js updates, console warnings
      - Fix: Update to current Matter.js API - use `engine.gravity` instead of `world.gravity`, remove deprecated Grid usage
      - Priority: MEDIUM
    
    - [ ] **BUG-012: Physics error recovery clears all bodies**
      - Location: `client/src/services/physicsManager.ts:127-148`
      - Issue: On any physics error, all bodies are cleared but notes remain in React state, causing desync
      - Impact: Notes become non-interactive after physics error, require page refresh
      - Fix: Rebuild physics bodies from current note state instead of clearing, or trigger full re-sync
      - Priority: HIGH
    
    - [ ] **BUG-013: Collision handling can throw errors**
      - Location: `client/src/services/physicsManager.ts:60-98`
      - Issue: Division by zero possible when `distance === 0`, try-catch hides errors without recovery
      - Impact: Collisions may fail silently, notes can overlap
      - Fix: Add proper zero-distance handling, separate bodies slightly, log and report errors
      - Priority: MEDIUM
    
    - [ ] **BUG-014: Viewport bounds optimization never activated**
      - Location: `client/src/services/physicsManager.ts:161-192`
      - Issue: `setViewportBounds` is never called from any component, so optimization is inactive
      - Impact: Physics runs for all notes even when off-screen, poor performance with many notes
      - Fix: Call `setViewportBounds` from Board component on pan/zoom, pass viewport dimensions
      - Priority: HIGH
    
    - [ ] **BUG-015: Physics position updates conflict with drag**
      - Location: `client/src/components/Note/Note.tsx:189-234`
      - Issue: During drag, physics is set static but position updates from remote users can still move the note
      - Impact: Janky drag experience, note jumps during drag
      - Fix: Ignore remote position updates for notes currently being dragged by local user
      - Priority: MEDIUM

  - [x] 13.4 Critical Bugs - UI/UX Issues


    
    - [ ] **BUG-016: Note content not properly sanitized**
      - Location: `client/src/components/Note/Note.tsx:236-248`
      - Issue: ContentEditable uses `innerText` which doesn't preserve formatting, and no XSS protection
      - Impact: Potential XSS vulnerability, formatting lost
      - Fix: Use `textContent` for plain text or properly sanitize HTML if rich text needed
      - Priority: HIGH (Security)
    
    - [ ] **BUG-017: Customization panel position not updated during drag**
      - Location: `client/src/components/Note/Note.tsx:577-598`
      - Issue: Panel position is set on mount but doesn't update when note is dragged
      - Impact: Panel appears far from note after dragging
      - Fix: Update panel position in animation frame to follow note position
      - Priority: MEDIUM
    
    - [ ] **BUG-018: Image upload progress not accurate**
      - Location: `client/src/components/Note/Note.tsx:289-301`
      - Issue: FileReader.onprogress only tracks file reading, not Base64 encoding or network transmission
      - Impact: Progress bar completes before upload actually finishes
      - Fix: Show indeterminate progress or calculate encoding time, or remove progress bar
      - Priority: LOW
    
    - [ ] **BUG-019: Sticker positioning not persisted correctly**
      - Location: `client/src/components/Note/Note.tsx:338-348`
      - Issue: Stickers are created at fixed position (50, 50) with no drag-and-drop implementation
      - Impact: All stickers stack on top of each other, unusable
      - Fix: Implement sticker drag-and-drop, save position in state, or randomize initial position
      - Priority: HIGH
    
    - [ ] **BUG-020: Delete confirmation dialog position breaks on scroll**
      - Location: `client/src/components/Note/Note.tsx:665-686`
      - Issue: Dialog uses absolute positioning relative to note, but doesn't account for canvas transform
      - Impact: Dialog appears in wrong location when zoomed or panned
      - Fix: Use portal to render dialog at root level, calculate screen position
      - Priority: MEDIUM
    
    - [ ] **BUG-021: Character count includes placeholder text**
      - Location: `client/src/components/Note/Note.tsx:425` and `client/src/components/Note/Note.tsx:540-542`
      - Issue: When note is empty, "Type here..." placeholder is counted as content
      - Impact: Shows incorrect character count
      - Fix: Check if content equals placeholder before counting, or use separate state
      - Priority: LOW
    
    - [ ] **BUG-022: Sidebar search doesn't update when notes change**
      - Location: `client/src/components/Sidebar/Sidebar.tsx:103-117`
      - Issue: Search results are computed on render but don't re-filter when note content changes
      - Impact: Search results become stale
      - Fix: Use useMemo with proper dependencies, or force re-render on board updates
      - Priority: LOW

  - [x] 13.5 Critical Bugs - Performance Issues


    
    - [ ] **BUG-023: Excessive re-renders in Note component**
      - Location: `client/src/components/Note/Note.tsx`
      - Issue: Multiple useEffect hooks without proper dependencies, position updates trigger full re-renders
      - Impact: Poor performance with many notes, janky animations
      - Fix: Memoize expensive computations, use useCallback for handlers, optimize useEffect dependencies
      - Priority: HIGH
    
    - [ ] **BUG-024: Physics manager runs even when no notes moving**
      - Location: `client/src/services/physicsManager.ts:108-125`
      - Issue: Animation loop runs continuously at 60fps even when all notes are static
      - Impact: Unnecessary CPU usage, battery drain
      - Fix: Pause physics loop when all bodies are sleeping, resume on interaction
      - Priority: MEDIUM
    
    - [ ] **BUG-025: Board component re-renders on every note change**
      - Location: `client/src/components/Board/Board.tsx:28-50`
      - Issue: useEffect depends on `currentBoard?.notes` which is a new array on every update
      - Impact: Entire board re-renders when any note changes
      - Fix: Use note IDs array instead of notes array, or implement proper memoization
      - Priority: HIGH
    
    - [ ] **BUG-026: WebSocket sends redundant move messages**
      - Location: `client/src/components/Board/Board.tsx:172-177`
      - Issue: Every physics position update sends WebSocket message, even for tiny movements
      - Impact: Network spam, server overload with many users
      - Fix: Throttle messages to max 10/sec, or only send when movement > 5px
      - Priority: HIGH
    
    - [ ] **BUG-027: Large Base64 images cause memory issues**
      - Location: `client/src/components/Note/Note.tsx:289-330`
      - Issue: 10MB images converted to Base64 become ~13MB strings stored in memory and state
      - Impact: Memory bloat, slow serialization, large save files
      - Fix: Implement proper image storage (file system or cloud), store URLs instead of Base64
      - Priority: HIGH

  - [x] 13.6 Critical Bugs - Error Handling


    
    - [ ] **BUG-028: No error handling for failed board creation**
      - Location: `client/src/components/Sidebar/Sidebar.tsx:73-89`
      - Issue: If API call fails, no error message shown to user, dialog just closes
      - Impact: User thinks board was created but it wasn't
      - Fix: Add try-catch, show error toast, keep dialog open on failure
      - Priority: HIGH
    
    - [ ] **BUG-029: File system errors crash server**
      - Location: `server/src/services/persistence.ts:73-107`
      - Issue: Despite retry logic, final failure throws error that can crash server
      - Impact: Server crashes on disk full or permission errors
      - Fix: Return empty array on final failure instead of throwing, log critical error
      - Priority: HIGH
    
    - [ ] **BUG-030: WebSocket reconnection can create duplicate connections**
      - Location: `client/src/services/websocket.ts:42-56`
      - Issue: If `connect()` called while reconnection timer active, multiple connections possible
      - Impact: Duplicate message handling, memory leak
      - Fix: Clear reconnection timer in `connect()`, check existing connection state
      - Priority: MEDIUM
    
    - [ ] **BUG-031: No timeout for WebSocket operations**
      - Location: `client/src/services/websocket.ts` and `server/src/websocket/handlers.ts`
      - Issue: No timeout for message acknowledgment or response
      - Impact: Operations can hang indefinitely
      - Fix: Add timeout for critical operations, show error after 10 seconds
      - Priority: MEDIUM
    
    - [ ] **BUG-032: Error boundary doesn't reset on navigation**
      - Location: `client/src/components/Board/Board.tsx:147-151`
      - Issue: ErrorBoundary wraps each note but doesn't reset when navigating between boards
      - Impact: Once note crashes, it stays crashed even on different board
      - Fix: Add key prop to ErrorBoundary based on board ID, or implement reset mechanism
      - Priority: LOW

  - [x] 13.7 Critical Bugs - Accessibility


    
    - [ ] **BUG-033: Keyboard shortcuts don't work when note focused**
      - Location: `client/src/components/Note/Note.tsx:432-450`
      - Issue: Keyboard handler only works when note has `:focus-within`, but Delete key conflicts with text editing
      - Impact: Can't delete note while editing text, confusing UX
      - Fix: Use different key combo (Ctrl+Delete), or add "Delete Note" button
      - Priority: MEDIUM
    
    - [ ] **BUG-034: No ARIA labels for dynamic content**
      - Location: `client/src/components/Note/Note.tsx:456-471`
      - Issue: Note has static aria-label that doesn't update when content changes
      - Impact: Screen readers announce stale content
      - Fix: Update aria-label when content changes, or use aria-live region
      - Priority: MEDIUM
    
    - [ ] **BUG-035: Color picker has no keyboard navigation**
      - Location: `client/src/components/Note/Note.tsx:577-620`
      - Issue: Color buttons have no keyboard focus management or arrow key navigation
      - Impact: Keyboard users can't efficiently select colors
      - Fix: Implement arrow key navigation, add focus trap in panel
      - Priority: LOW
    
    - [ ] **BUG-036: Tooltips don't work on touch devices**
      - Location: `client/src/components/Tooltip/Tooltip.tsx` (assumed)
      - Issue: Hover-based tooltips don't show on touch devices
      - Impact: Mobile users miss helpful information
      - Fix: Show tooltip on long-press, or use different pattern for mobile
      - Priority: LOW

  - [x] 13.8 Edge Cases and Data Validation


    
    - [ ] **BUG-037: No validation for note position bounds**
      - Location: `server/src/services/stateManager.ts:199-228`
      - Issue: Notes can be created at negative coordinates or extremely large values
      - Impact: Notes can be lost off-canvas, potential integer overflow
      - Fix: Add position validation, clamp to reasonable bounds (-100000 to 100000)
      - Priority: MEDIUM
    
    - [ ] **BUG-038: Board name can be empty string after trim**
      - Location: `client/src/components/Sidebar/Sidebar.tsx:73-89`
      - Issue: Client checks `!newBoardName.trim()` but server might receive whitespace
      - Impact: Boards with empty names can be created
      - Fix: Ensure server-side validation matches client-side, reject empty names
      - Priority: LOW
    
    - [ ] **BUG-039: No limit on number of images per note**
      - Location: `client/src/components/Note/Note.tsx:289-330`
      - Issue: Users can upload unlimited images, each up to 10MB
      - Impact: Notes become huge, performance degrades, save files grow unbounded
      - Fix: Add limit (e.g., 5 images per note), show error when limit reached
      - Priority: MEDIUM
    
    - [ ] **BUG-040: Sticker scale can go negative or infinite**
      - Location: `client/src/components/Note/Note.tsx:354-368`
      - Issue: Math.max/min used but no validation on server side
      - Impact: Invalid sticker data can be saved
      - Fix: Add server-side validation for sticker scale (0.5 to 2.0)
      - Priority: LOW
    
    - [ ] **BUG-041: No handling for corrupted save file**
      - Location: `server/src/services/persistence.ts:44-107`
      - Issue: If JSON is corrupted, server returns empty array but doesn't restore from backup
      - Impact: Data loss when save file corrupted
      - Fix: Attempt to load from `.backup` file if main file is corrupted
      - Priority: HIGH
    
    - [ ] **BUG-042: Race condition in auto-save**
      - Location: `server/src/services/stateManager.ts:48-59`
      - Issue: If save takes longer than 30 seconds, multiple saves can run concurrently
      - Impact: File corruption, data loss
      - Fix: Use lock/flag to prevent concurrent saves, or use queue
      - Priority: HIGH

  - [x] 13.9 Testing and Documentation Gaps

    
    - [ ] **BUG-043: No tests for error recovery paths**
      - Location: Test files
      - Issue: Tests cover happy paths but not error scenarios
      - Impact: Bugs in error handling go undetected
      - Fix: Add tests for network failures, file system errors, invalid data
      - Priority: MEDIUM
    
    - [ ] **BUG-044: No performance benchmarks**
      - Location: Test files
      - Issue: No automated tests to catch performance regressions
      - Impact: Performance can degrade without detection
      - Fix: Add performance tests with thresholds (e.g., 100 notes < 16ms render)
      - Priority: LOW
    
    - [ ] **BUG-045: Missing API documentation**
      - Location: Documentation
      - Issue: No OpenAPI/Swagger docs for REST API
      - Impact: Hard for developers to understand API
      - Fix: Add API documentation with examples
      - Priority: LOW

- [ ] 14. Create deployment documentation
  - Create README with setup instructions
  - Document environment variables and configuration
  - Add instructions for running on local network
  - Document how to find local IP address
  - Create troubleshooting guide for common issues
  - _Requirements: 9.1, 9.2_
