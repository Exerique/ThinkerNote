# Payload Unwrapping and Canvas Offset Fixes

## Overview
Fixed 2 critical bugs that prevented real-time collaboration from working and caused coordinate conversion errors when the board was inside a layout with sidebars/headers.

## Bugs Fixed

### 1. Drag Conversions Ignore Canvas Screen Offset ✅
**Problem**: The coordinate conversion only tracked the transform's scale and translation but ignored the canvas element's position in the viewport. When the board was inside a layout with a sidebar or header, the canvas bounding box was no longer at (0, 0), causing drag operations to warp notes toward the origin.

**Root Cause**:
- `TransformContext` only stored `scale`, `positionX`, `positionY` from react-zoom-pan-pinch
- `screenToBoard` assumed pointer coordinates started at viewport origin (0, 0)
- The canvas element's actual position (`rect.left`, `rect.top`) was never considered
- Every drag/zoom got an incorrect offset injected into the conversion

**Solution**:
- Added `offsetX` and `offsetY` to `TransformState` to track canvas bounding rect
- Board component now captures `getBoundingClientRect()` from the wrapper component
- Updated `screenToBoard` to subtract canvas offset before applying transform: `(screenX - offsetX - positionX) / scale`
- Updated `boardToScreen` to add canvas offset after applying transform: `boardX * scale + positionX + offsetX`
- Transform state updates on every transformation and on mount

**Files Changed**:
- `client/src/contexts/TransformContext.tsx`
- `client/src/components/Board/Board.tsx`

**Technical Details**:
```typescript
// TransformState now includes canvas offset
interface TransformState {
  scale: number;
  positionX: number;
  positionY: number;
  offsetX: number; // Canvas bounding rect left
  offsetY: number; // Canvas bounding rect top
}

// Capture canvas position
const rect = ref.instance.wrapperComponent.getBoundingClientRect();
setTransformState({
  scale: ref.state.scale,
  positionX: ref.state.positionX,
  positionY: ref.state.positionY,
  offsetX: rect.left,
  offsetY: rect.top,
});

// Correct conversion
const screenToBoard = (screenX: number, screenY: number) => {
  return {
    x: (screenX - transformState.offsetX - transformState.positionX) / transformState.scale,
    y: (screenY - transformState.offsetY - transformState.positionY) / transformState.scale,
  };
};
```

### 2. Inbound WebSocket Events Never Reach State Layer ✅
**Problem**: None of the real-time collaboration features worked because the client was double-wrapping WebSocket messages. The server sent a full `WSMessage` object, but the client wrapped it again, causing all handlers to read from the wrong payload level.

**Root Cause**:
- Server emits: `{ type, payload: actualData, timestamp, userId }`
- Client received this and wrapped it again: `{ type, payload: serverMessage, timestamp, userId }`
- Handlers expected `message.payload` to be the actual data (Note, Board, etc.)
- But `message.payload` was actually the entire server message
- So `message.payload.noteId` was undefined (it was at `message.payload.payload.noteId`)

**Impact**:
- Typing in notes: Local updates worked, but server responses were ignored, causing text to revert
- Color changes, images, stickers: Only visible after full refresh
- New notes: Never appeared because `note.boardId` was undefined
- Drag updates: Collaborators never saw movement
- Editing indicator: Never appeared because `noteId`/`userId` were undefined
- Board operations: Create/delete/rename never propagated to other users

**Solution**:
- Fixed `websocketService` to extract the actual payload from server message
- Changed from `payload: payload` to `payload: serverMessage.payload`
- Updated handlers to expect correct payload types:
  - `note:created` → full Note object
  - `note:updated` → full Note object (not UpdateNotePayload)
  - `note:moved` → { noteId, x, y }
  - `board:renamed` → full Board object (not RenameBoardPayload)
  - All other events already had correct structure

**Files Changed**:
- `client/src/services/websocket.ts`
- `client/src/contexts/WebSocketContext.tsx`

**Technical Details**:
```typescript
// Before: Double-wrapped payload
this.socket!.on(serverEvent, (payload: any) => {
  const message: WSMessage = {
    type: messageType,
    payload, // This is already a full WSMessage!
    timestamp: Date.now(),
    userId: payload.userId || 'unknown',
  };
  this.handleMessage(message);
});

// After: Correctly unwrapped
this.socket!.on(serverEvent, (serverMessage: any) => {
  const message: WSMessage = {
    type: messageType,
    payload: serverMessage.payload, // Extract actual payload
    timestamp: serverMessage.timestamp || Date.now(),
    userId: serverMessage.userId || 'unknown',
  };
  this.handleMessage(message);
});

// Handler fix: Expect full Note, not UpdateNotePayload
const handleNoteUpdate = (message: WSMessage) => {
  const note = message.payload as Note;
  updateNote(note.id, note);
};
```

## Testing Recommendations

1. **Canvas Offset**:
   - Verify sidebar is visible (board is not at 0,0)
   - Drag a note
   - Verify it follows cursor precisely without warping
   - Pan and zoom, then drag again
   - Verify no offset errors

2. **Real-Time Collaboration**:
   - Open two browser windows side-by-side
   - Type in a note in one window
   - Verify text appears in real-time in the other window
   - Change note color/add image/add sticker
   - Verify changes appear immediately in both windows
   - Drag a note in one window
   - Verify smooth movement in the other window

3. **Editing Indicator**:
   - Click to edit a note in one window
   - Verify "✏️ Being edited" appears in the other window
   - Stop editing
   - Verify indicator disappears

4. **Board Operations**:
   - Create a board in one window
   - Verify it appears in the other window's sidebar
   - Rename a board
   - Verify name updates in both windows
   - Delete a board
   - Verify it disappears from both sidebars

## Performance Considerations

- Canvas offset is captured on every transform update (zoom/pan)
- `getBoundingClientRect()` is a synchronous DOM operation but very fast
- Payload unwrapping happens once per message, no additional overhead
- All handlers now process correct data types, eliminating undefined checks

## Benefits

1. **Accurate Positioning**: Notes follow cursor precisely regardless of layout
2. **Real-Time Collaboration**: All features now work as designed
3. **Editing Awareness**: Users can see who's editing what
4. **Board Sync**: Multi-user board management works correctly
5. **Type Safety**: Handlers receive correctly typed payloads
