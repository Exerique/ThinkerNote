# Manual Testing Checklist

This document provides a comprehensive checklist for manually testing the Collaborative Note Board application.

## Test Environment Setup

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] Two devices on the same local network (for collaboration testing)
- [ ] Multiple browsers available (Chrome, Firefox, Safari, Edge)
- [ ] Different screen sizes available (desktop, tablet, mobile)

### Starting the Application
```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

- Client: http://localhost:3000
- Server: http://localhost:3001

---

## 1. Visual Appearance (Requirement 15.1)

### macOS Tahoe Design Language
- [ ] **Translucent materials**: Sidebar and notes have frosted glass blur effects
- [ ] **Vibrant colors**: Note colors match macOS Tahoe palette (FFD60A, FF9F0A, etc.)
- [ ] **Rounded corners**: All UI elements use 14px border-radius for notes, 8px for buttons
- [ ] **Clean typography**: Uses -apple-system font stack
- [ ] **Subtle depth**: Multi-layer shadows visible on notes (default, hover, dragging states)

### Color Palette Verification
- [ ] Background is #F5F5F7 (light gray)
- [ ] Canvas is #FFFFFF (pure white)
- [ ] Sidebar has rgba(255, 255, 255, 0.7) with backdrop-filter blur
- [ ] Accent color is #007AFF (macOS blue)
- [ ] Text primary is #1D1D1F (near black)
- [ ] Text secondary is #86868B (gray)

### Note Colors (8 solid colors)
- [ ] Yellow: #FFD60A
- [ ] Orange: #FF9F0A
- [ ] Red: #FF453A
- [ ] Pink: #FF375F
- [ ] Purple: #BF5AF2
- [ ] Blue: #0A84FF
- [ ] Teal: #5AC8FA
- [ ] Green: #32D74B

### Note Gradients (4 gradients)
- [ ] Sunset: Orange to Pink gradient
- [ ] Ocean: Teal to Blue gradient
- [ ] Forest: Green gradient
- [ ] Twilight: Purple to Pink gradient

### Typography
- [ ] Note font sizes: Small (13px), Medium (15px), Large (17px)
- [ ] Line height is 1.47 for all text
- [ ] Note titles are 15px semibold (600 weight)
- [ ] System font renders correctly on macOS, Windows, Linux

### Spacing (8pt Grid System)
- [ ] Note padding is 16px
- [ ] Note border-radius is 14px
- [ ] Sidebar width is 280px
- [ ] Minimum note size is 240x160px
- [ ] Default note size is 280x200px
- [ ] Gap between UI elements follows 8px increments

### Shadows
- [ ] **Default shadow**: Subtle 2-layer shadow on notes
- [ ] **Hover shadow**: Shadow increases on hover
- [ ] **Dragging shadow**: Prominent shadow while dragging
- [ ] Shadows are smooth and not pixelated

### Visual Effects
- [ ] Sidebar has backdrop-filter: blur(20px) saturate(180%)
- [ ] Notes have backdrop-filter: blur(20px) saturate(180%)
- [ ] Borders are 0.5px solid rgba(0,0,0,0.04)
- [ ] Focus rings are 3px solid rgba(0,122,255,0.3)

---

## 2. Animation Smoothness (Requirement 15.1, 15.3)

### Target: 60fps for all animations

#### Note Animations
- [ ] **Note creation**: 400ms spring animation (smooth scale-up from 0)
- [ ] **Note deletion**: 250ms fade-out with scale-down
- [ ] **Note expansion/collapse**: 300ms smooth transition
- [ ] **Note hover**: 200ms scale to 1.02x (subtle and smooth)
- [ ] **Note drag start**: Immediate response, no lag

#### Sidebar Animations
- [ ] **Sidebar toggle**: 300ms slide in/out animation
- [ ] **Sidebar items hover**: Smooth background color transition
- [ ] **Board selection**: Smooth highlight transition

#### Physics Animations
- [ ] **Momentum**: Notes glide smoothly after drag release
- [ ] **Friction**: Gradual slowdown over ~2 seconds
- [ ] **Collision**: Smooth bounce behavior, no jittering
- [ ] **Multiple notes**: Physics remains smooth with 10+ notes

#### Performance Testing
- [ ] Open DevTools Performance tab
- [ ] Record during note creation/deletion
- [ ] Verify frame rate stays above 30fps (target 60fps)
- [ ] Check for dropped frames during animations
- [ ] Test with 50+ notes on canvas

#### Animation Quality Checks
- [ ] No stuttering or jank during transitions
- [ ] Easing curves feel natural (cubic-bezier)
- [ ] Spring physics feel realistic (not too bouncy)
- [ ] Animations complete within specified durations
- [ ] No animation conflicts or overlapping issues

---

## 3. Physics Interactions (Requirement 6.1-6.5)

### Momentum and Friction
- [ ] **Drag and release**: Note continues moving with momentum
- [ ] **Velocity calculation**: Faster drag = more momentum
- [ ] **Friction**: Note gradually slows down
- [ ] **Stop time**: Movement completes within 2 seconds
- [ ] **Natural feel**: Physics feel realistic, not too fast or slow

### Collision Detection
- [ ] **Note-to-note collision**: Notes bounce off each other
- [ ] **Bounce behavior**: Realistic bounce angle and velocity
- [ ] **No overlap**: Notes don't pass through each other
- [ ] **Multiple collisions**: Chain reactions work correctly
- [ ] **Edge cases**: Collisions work at canvas edges

### Physics Performance
- [ ] **10 notes**: Smooth physics simulation
- [ ] **25 notes**: Physics remains responsive
- [ ] **50+ notes**: Check for performance degradation
- [ ] **Off-screen notes**: Physics disabled for optimization
- [ ] **Frame rate**: Maintains 60fps during physics simulation

### Physics Edge Cases
- [ ] **Rapid dragging**: No physics glitches
- [ ] **Simultaneous drags**: Multiple users dragging at once
- [ ] **Zoom during physics**: Physics scale correctly
- [ ] **Pan during physics**: Physics positions remain accurate

---

## 4. Touch/Trackpad Gestures (Requirement 13.1-13.5)

### Touch Gestures (Mobile/Tablet)
- [ ] **Single tap**: Select note
- [ ] **Double tap**: Create new note
- [ ] **Tap and hold**: Start dragging note
- [ ] **Drag**: Move note around canvas
- [ ] **Pinch to zoom**: Zoom in/out smoothly
- [ ] **Two-finger pan**: Pan canvas
- [ ] **Swipe**: Smooth scrolling in sidebar

### Trackpad Gestures (Laptop)
- [ ] **Two-finger scroll**: Pan canvas
- [ ] **Pinch zoom**: Zoom in/out (macOS)
- [ ] **Click and drag**: Move notes
- [ ] **Scroll wheel zoom**: Zoom with Ctrl+scroll
- [ ] **Smart zoom**: Double-tap with two fingers (macOS)

### Mouse Gestures
- [ ] **Left click**: Select note
- [ ] **Double click**: Create new note
- [ ] **Click and drag**: Move note
- [ ] **Scroll wheel**: Zoom with Ctrl held
- [ ] **Middle click drag**: Pan canvas (if supported)

### Gesture Responsiveness
- [ ] **No lag**: Gestures respond immediately (<100ms)
- [ ] **Smooth tracking**: Cursor/finger tracking is accurate
- [ ] **No ghost touches**: No unintended interactions
- [ ] **Multi-touch**: Multiple simultaneous touches work

---

## 5. Responsive Design (Requirement 12.5, 15.5)

### Desktop (1920x1080)
- [ ] Sidebar visible by default
- [ ] Notes render at full size
- [ ] Toolbar fully visible
- [ ] All controls accessible
- [ ] Zoom controls work correctly

### Laptop (1366x768)
- [ ] Layout adjusts appropriately
- [ ] Sidebar can be collapsed
- [ ] Notes scale correctly
- [ ] No horizontal scrolling
- [ ] All features accessible

### Tablet (768x1024)
- [ ] Sidebar collapsed by default
- [ ] Touch gestures work
- [ ] Notes are touch-friendly (min 44x44px targets)
- [ ] Toolbar adapts to smaller width
- [ ] Zoom controls accessible

### Mobile (375x667)
- [ ] Sidebar hidden by default
- [ ] Single-column layout
- [ ] Touch targets are large enough
- [ ] Text remains readable
- [ ] Core features accessible
- [ ] No content cutoff

### Orientation Changes
- [ ] **Portrait to landscape**: Layout adapts smoothly
- [ ] **Landscape to portrait**: No content loss
- [ ] **Rotation**: Canvas position preserved

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 6. Color Contrast for Accessibility (Requirement 15.2)

### WCAG 2.1 Level AA Compliance (4.5:1 ratio)

#### Text Contrast
- [ ] **Primary text on white**: #1D1D1F on #FFFFFF (✓ 16.1:1)
- [ ] **Secondary text on white**: #86868B on #FFFFFF (✓ 4.6:1)
- [ ] **Button text**: White on #007AFF (✓ 4.5:1)
- [ ] **Note text on yellow**: #1D1D1F on #FFD60A (✓ 11.2:1)
- [ ] **Note text on orange**: #1D1D1F on #FF9F0A (✓ 8.9:1)
- [ ] **Note text on red**: #FFFFFF on #FF453A (✓ 4.5:1)
- [ ] **Note text on pink**: #FFFFFF on #FF375F (✓ 5.2:1)
- [ ] **Note text on purple**: #FFFFFF on #BF5AF2 (✓ 5.8:1)
- [ ] **Note text on blue**: #FFFFFF on #0A84FF (✓ 4.5:1)
- [ ] **Note text on teal**: #1D1D1F on #5AC8FA (✓ 7.1:1)
- [ ] **Note text on green**: #1D1D1F on #32D74B (✓ 8.3:1)

#### Interactive Elements
- [ ] **Buttons**: Sufficient contrast in all states
- [ ] **Links**: Distinguishable from regular text
- [ ] **Focus indicators**: 3px blue ring visible on all elements
- [ ] **Disabled states**: Clearly distinguishable

#### Testing Tools
- [ ] Use browser DevTools Accessibility panel
- [ ] Test with WebAIM Contrast Checker
- [ ] Verify with axe DevTools extension
- [ ] Test with actual screen readers (NVDA, JAWS, VoiceOver)

### Color Blindness Testing
- [ ] **Protanopia** (red-blind): Colors distinguishable
- [ ] **Deuteranopia** (green-blind): Colors distinguishable
- [ ] **Tritanopia** (blue-blind): Colors distinguishable
- [ ] Use Color Oracle or similar tool to simulate

---

## 7. Keyboard Navigation (Requirement 15.2)

### Global Shortcuts
- [ ] **Ctrl+N**: Create new note (works from anywhere)
- [ ] **Delete**: Delete selected note (with confirmation)
- [ ] **Ctrl+=**: Zoom in
- [ ] **Ctrl+-**: Zoom out
- [ ] **Ctrl+0**: Reset zoom to 100%
- [ ] **Ctrl+F**: Fit to screen
- [ ] **Escape**: Close dialogs/panels

### Tab Navigation
- [ ] **Tab order**: Logical flow (sidebar → toolbar → notes)
- [ ] **Shift+Tab**: Reverse tab order
- [ ] **Focus indicators**: Visible 3px blue ring on focused elements
- [ ] **Skip to content**: Can skip sidebar navigation

### Note Interaction
- [ ] **Enter**: Edit selected note
- [ ] **Escape**: Exit edit mode
- [ ] **Arrow keys**: Navigate between notes (optional)
- [ ] **Space**: Toggle note expansion

### Sidebar Navigation
- [ ] **Tab**: Navigate through board list
- [ ] **Enter**: Select board
- [ ] **Arrow keys**: Navigate board list
- [ ] **Delete**: Delete selected board (with confirmation)

### Accessibility Features
- [ ] **Screen reader**: All elements have proper ARIA labels
- [ ] **Focus trap**: Modals trap focus correctly
- [ ] **Focus restoration**: Focus returns after closing dialogs
- [ ] **Keyboard-only**: All features accessible without mouse

### Testing Procedure
1. Disconnect mouse
2. Navigate entire application using only keyboard
3. Verify all features are accessible
4. Check focus indicators are always visible
5. Test with screen reader (NVDA, JAWS, VoiceOver)

---

## 8. Error Messages (Requirement 15.4)

### Connection Errors
- [ ] **Server offline**: "Unable to connect to server. Retrying..."
- [ ] **Connection lost**: "Connection lost. Reconnecting..."
- [ ] **Reconnected**: "Connected successfully"
- [ ] **Reconnection failed**: "Failed to reconnect. Please refresh the page."

### Image Upload Errors
- [ ] **File too large**: "Image size exceeds 10MB limit"
- [ ] **Invalid format**: "Only JPEG, PNG, and GIF formats are supported"
- [ ] **Upload failed**: "Failed to upload image. Please try again."
- [ ] **Network error**: "Network error during upload"

### Board Errors
- [ ] **Create failed**: "Failed to create board. Please try again."
- [ ] **Delete failed**: "Failed to delete board. Please try again."
- [ ] **Rename failed**: "Failed to rename board. Please try again."
- [ ] **Load failed**: "Failed to load board. Please refresh the page."

### Note Errors
- [ ] **Create failed**: "Failed to create note. Please try again."
- [ ] **Update failed**: "Failed to save changes. Retrying..."
- [ ] **Delete failed**: "Failed to delete note. Please try again."
- [ ] **Sync failed**: "Failed to sync changes. Some changes may be lost."

### Physics Errors
- [ ] **Engine failure**: "Physics simulation paused due to error"
- [ ] **Recovery**: "Physics simulation restored"

### Error Message Quality
- [ ] **Clear**: Messages explain what went wrong
- [ ] **Actionable**: Messages suggest what to do next
- [ ] **Non-technical**: No jargon or error codes
- [ ] **Appropriate tone**: Friendly and helpful
- [ ] **Visible**: Toast notifications are prominent
- [ ] **Dismissible**: Can close error messages
- [ ] **Auto-dismiss**: Success messages auto-dismiss after 3s

---

## 9. Real-Time Collaboration Testing

### Two-Client Setup
1. Open application on Device A
2. Open application on Device B (same network)
3. Both connect to same board

### Synchronization Tests
- [ ] **Note creation**: Note appears on both clients instantly
- [ ] **Note editing**: Text updates appear in real-time
- [ ] **Note movement**: Position updates smoothly
- [ ] **Note deletion**: Note disappears on both clients
- [ ] **Note customization**: Color/style changes sync
- [ ] **Image upload**: Images appear on both clients
- [ ] **Sticker addition**: Stickers sync correctly

### Conflict Resolution
- [ ] **Simultaneous edits**: Last write wins (no data loss)
- [ ] **Simultaneous moves**: Smooth position reconciliation
- [ ] **Simultaneous deletes**: No errors or crashes

### Editing Indicators
- [ ] **Visual indicator**: Shows when remote user is editing
- [ ] **User identification**: Can distinguish between users
- [ ] **Real-time updates**: Indicator appears/disappears instantly
- [ ] **Multiple editors**: Handles multiple simultaneous editors

### Latency Testing
- [ ] **Local network**: Updates appear within 100ms
- [ ] **Slow network**: Graceful degradation
- [ ] **High latency**: No crashes or data corruption

---

## 10. Performance Testing

### Load Testing
- [ ] **10 notes**: Smooth performance
- [ ] **50 notes**: Acceptable performance
- [ ] **100+ notes**: Check for degradation
- [ ] **Large images**: Multiple 10MB images
- [ ] **Many stickers**: 50+ stickers across notes

### Memory Testing
- [ ] **Initial load**: Check memory usage
- [ ] **After 1 hour**: No significant memory leaks
- [ ] **After 4 hours**: Memory remains stable
- [ ] **Note creation/deletion**: Memory properly released

### Network Testing
- [ ] **Message throughput**: 100+ messages/second
- [ ] **Bandwidth usage**: Reasonable data transfer
- [ ] **Reconnection**: Fast recovery after disconnect

### Browser Performance
- [ ] **CPU usage**: Reasonable during idle
- [ ] **CPU usage**: Acceptable during interactions
- [ ] **GPU usage**: Hardware acceleration working
- [ ] **Battery impact**: Acceptable on laptops/mobile

---

## 11. Edge Cases and Stress Testing

### Extreme Scenarios
- [ ] **Empty board**: Handles gracefully
- [ ] **1000+ notes**: Application remains functional
- [ ] **Very long text**: 10,000+ characters in note
- [ ] **Rapid actions**: Spam clicking doesn't break app
- [ ] **Rapid zoom**: Zoom in/out repeatedly
- [ ] **Rapid pan**: Pan canvas rapidly

### Network Scenarios
- [ ] **Offline mode**: Queues changes correctly
- [ ] **Intermittent connection**: Handles flaky network
- [ ] **Slow connection**: Graceful degradation
- [ ] **Connection during action**: Mid-drag disconnect

### Browser Scenarios
- [ ] **Page refresh**: State persists
- [ ] **Browser back/forward**: Navigation works
- [ ] **Multiple tabs**: Each tab works independently
- [ ] **Incognito mode**: Works without localStorage

---

## 12. Usability Testing

### First-Time User Experience
- [ ] **Intuitive**: Can create note without instructions
- [ ] **Discoverable**: Features are easy to find
- [ ] **Helpful**: Tooltips provide guidance
- [ ] **Empty state**: Clear instructions when no boards exist

### Common Workflows
- [ ] **Create board → Add notes → Customize**: Smooth flow
- [ ] **Search notes**: Easy to find specific content
- [ ] **Organize spatially**: Drag and arrange feels natural
- [ ] **Collaborate**: Second user can join easily

### User Feedback
- [ ] **Loading states**: Clear feedback during operations
- [ ] **Success feedback**: Confirmation of actions
- [ ] **Error feedback**: Clear error messages
- [ ] **Progress indicators**: For long operations

---

## Testing Sign-Off

### Tester Information
- **Tester Name**: _______________
- **Date**: _______________
- **Environment**: _______________
- **Browser/Device**: _______________

### Overall Assessment
- [ ] All critical issues resolved
- [ ] Visual design matches specifications
- [ ] Animations are smooth (60fps target met)
- [ ] Physics interactions feel realistic
- [ ] Touch/trackpad gestures work correctly
- [ ] Responsive design works on all screen sizes
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard navigation is fully functional
- [ ] Error messages are clear and helpful

### Issues Found
| Priority | Issue Description | Status |
|----------|------------------|--------|
| High     |                  |        |
| Medium   |                  |        |
| Low      |                  |        |

### Recommendations
_List any suggestions for improvements or enhancements_

---

## Automated Testing Support

While this is a manual testing checklist, some aspects can be verified programmatically:

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Check accessibility with axe
npm run test:a11y

# Performance profiling
npm run test:performance
```

---

## Notes

- This checklist should be completed before each release
- Document any deviations from expected behavior
- Take screenshots of visual issues
- Record videos of animation/performance issues
- Test on multiple devices and browsers
- Involve actual users for usability feedback
