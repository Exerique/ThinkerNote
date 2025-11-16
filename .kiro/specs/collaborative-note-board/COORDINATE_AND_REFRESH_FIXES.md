# Coordinate System and Refresh Fixes

## Overview
Fixed 2 critical issues related to coordinate space conversion during drag operations and unwanted board refreshes caused by unstable function references.

## Bugs Fixed

### 1. Notes Warp to the Left While Dragging ✅
**Problem**: When the board was panned or zoomed, dragging notes caused them to warp toward the origin. The drag code used screen-space coordinates (clientX/clientY) directly without converting them to board-space coordinates, which are affected by the TransformWrapper's scale and translation.

**Root Cause**:
- The board canvas is wrapped in `react-zoom-pan-pinch` which applies CSS transforms
- Pointer coordinates are in screen space
- Note positions are stored in board space
- The drag calculation `newX = e.clientX - dragStart.x` assumed both were in the same coordinate system
- After panning/zooming, this mismatch caused visual warping

**Solution**:
- Created `TransformContext` to share transform state (scale, positionX, positionY) with all notes
- Added `screenToBoard()` and `boardToScreen()` conversion functions
- Updated Board component to track and broadcast transform changes on zoom/pan
- Modified Note drag handlers to convert screen coordinates to board coordinates before calculating position
- Conversion formula: `boardX = (screenX - positionX) / scale`

**Files Changed**:
- `client/src/contexts/TransformContext.tsx` (new file)
- `client/src/components/Board/Board.tsx`
- `client/src/components/Note/Note.tsx`

**Technical Details**:
```typescript
// TransformContext provides coordinate conversion
const screenToBoard = (screenX: number, screenY: number) => {
  return {
    x: (screenX - transformState.positionX) / transformState.scale,
    y: (screenY - transformState.positionY) / transformState.scale,
  };
};

// Note component uses conversion during drag
const handlePointerDown = (e: React.PointerEvent) => {
  const boardPos = screenToBoard(e.clientX, e.clientY);
  setDragStart({
    x: boardPos.x - position.x,
    y: boardPos.y - position.y,
  });
};

const handlePointerMove = (e: PointerEvent) => {
  const boardPos = screenToBoard(e.clientX, e.clientY);
  const newX = boardPos.x - dragStart.x;
  const newY = boardPos.y - dragStart.y;
  // ... update position
};
```

### 2. Board Keeps "Refreshing" on Its Own ✅
**Problem**: The board would randomly show the loading skeleton and re-sync even when the user didn't navigate away. This happened because the `requestSync` function reference changed on every render, triggering the BoardPage's useEffect dependency.

**Root Cause**:
- `WebSocketContext` created inline arrow functions in the value object
- The value object was recreated on every provider render
- Any AppContext state change (like note position updates) caused a re-render
- `requestSync` got a new function identity each time
- BoardPage's `useEffect` had `requestSync` in its dependency array
- React saw it as "different" and re-ran the effect
- If >5 seconds had passed, the cache check passed and triggered a full sync

**Solution**:
- Wrapped all WebSocket send functions in `React.useCallback` to stabilize their references
- Wrapped the entire context value object in `React.useMemo` with proper dependencies
- Functions now maintain the same identity across renders unless their actual dependencies change
- BoardPage effect only re-runs when boardId actually changes or user explicitly requests sync

**Files Changed**:
- `client/src/contexts/WebSocketContext.tsx`

**Technical Details**:
```typescript
// Before: New function on every render
const value = {
  requestSync: (boardId) => websocketService.requestSync(boardId),
  // ... other functions
};

// After: Stable function references
const requestSyncCallback = React.useCallback((boardId: string) => {
  websocketService.requestSync(boardId);
}, []);

const value = React.useMemo(() => ({
  requestSync: requestSyncCallback,
  // ... other stable functions
}), [requestSyncCallback, /* other deps */]);
```

## Testing Recommendations

1. **Coordinate Conversion**:
   - Pan the board to the right
   - Zoom in to 2x
   - Drag a note
   - Verify it follows the cursor smoothly without warping
   - Try different zoom levels (0.5x, 1x, 2x, 4x)
   - Try different pan positions

2. **No Unwanted Refreshes**:
   - Open a board
   - Drag notes around
   - Edit note content
   - Wait 10+ seconds
   - Verify the board doesn't show loading skeleton or refresh
   - Only explicit navigation should trigger sync

3. **Multi-Client Drag**:
   - Open two browser windows side-by-side
   - Pan/zoom differently in each window
   - Drag a note in one window
   - Verify the other window shows correct position (not warped)

## Performance Considerations

- Transform state updates only on zoom/pan stop, not during continuous movement
- Coordinate conversion is a simple mathematical operation (no DOM queries)
- Memoized context values prevent unnecessary re-renders
- Stable function references eliminate cascade re-renders in child components

## Benefits

1. **Accurate Drag Behavior**: Notes now follow the cursor precisely regardless of zoom/pan state
2. **Stable Performance**: Eliminated unnecessary re-renders and sync requests
3. **Better UX**: No more jarring refreshes or warping during interaction
4. **Scalable**: Transform context can be used for other coordinate-dependent features
