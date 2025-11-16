# Manual Testing Quick Start Guide

This guide helps you quickly conduct manual testing for the Collaborative Note Board application.

## Quick Setup (5 minutes)

### 1. Start the Application

```bash
# Terminal 1: Start both client and server
npm run dev
```

Wait for:
- ✓ Server running on http://localhost:3001
- ✓ Client running on http://localhost:3000

### 2. Open in Browser

- Primary device: http://localhost:3000
- Secondary device (same network): http://[YOUR_IP]:3000

To find your IP:
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

---

## Priority Testing Checklist (30 minutes)

### ✅ Critical Path Testing (10 min)

1. **Board Management**
   - [ ] Create a new board
   - [ ] Rename the board
   - [ ] Switch between boards
   - [ ] Delete a board

2. **Note Creation & Editing**
   - [ ] Double-click canvas to create note
   - [ ] Click "New Note" button
   - [ ] Edit note text
   - [ ] Expand/collapse note
   - [ ] Delete note

3. **Note Customization**
   - [ ] Change note color (try 3 colors)
   - [ ] Apply gradient
   - [ ] Change font size
   - [ ] Upload an image
   - [ ] Add a sticker

4. **Canvas Navigation**
   - [ ] Pan the canvas (drag)
   - [ ] Zoom in/out (Ctrl+scroll)
   - [ ] Use zoom buttons
   - [ ] Fit to screen

5. **Real-Time Collaboration**
   - [ ] Open on second device
   - [ ] Create note on Device A → appears on Device B
   - [ ] Edit note on Device B → updates on Device A
   - [ ] Move note on Device A → moves on Device B

### ✅ Visual Design Check (10 min)

Open DevTools (F12) and check:

1. **Colors** (compare with design spec)
   - [ ] Background: #F5F5F7
   - [ ] Sidebar: translucent with blur
   - [ ] Notes: proper colors (yellow #FFD60A, blue #0A84FF, etc.)
   - [ ] Accent: #007AFF (buttons, links)

2. **Typography**
   - [ ] Font: -apple-system (system font)
   - [ ] Note sizes: Small (13px), Medium (15px), Large (17px)
   - [ ] Line height: 1.47

3. **Spacing**
   - [ ] Note padding: 16px
   - [ ] Border radius: 14px (notes), 8px (buttons)
   - [ ] Sidebar width: 280px

4. **Shadows & Effects**
   - [ ] Notes have subtle shadow
   - [ ] Shadow increases on hover
   - [ ] Shadow prominent when dragging
   - [ ] Backdrop blur on sidebar

### ✅ Animation & Physics (5 min)

1. **Animation Smoothness**
   - [ ] Open DevTools → Performance tab
   - [ ] Record while creating/deleting notes
   - [ ] Check FPS stays above 30 (target 60)
   - [ ] Note creation: smooth scale-up
   - [ ] Note deletion: smooth fade-out
   - [ ] Sidebar toggle: smooth slide

2. **Physics Interactions**
   - [ ] Drag note and release with velocity
   - [ ] Note continues moving (momentum)
   - [ ] Note gradually slows down (friction)
   - [ ] Create multiple notes close together
   - [ ] Drag one into others (collision)
   - [ ] Notes bounce realistically

### ✅ Accessibility (5 min)

1. **Keyboard Navigation**
   - [ ] Disconnect mouse
   - [ ] Tab through interface
   - [ ] Focus indicators visible (blue ring)
   - [ ] Ctrl+N creates note
   - [ ] Delete key deletes selected note
   - [ ] Escape closes dialogs

2. **Color Contrast**
   - [ ] Install axe DevTools extension
   - [ ] Run accessibility scan
   - [ ] Check for contrast issues
   - [ ] Text readable on all note colors

3. **Screen Reader** (if available)
   - [ ] Enable screen reader (NVDA/JAWS/VoiceOver)
   - [ ] Navigate interface
   - [ ] All buttons have labels
   - [ ] Notes are announced correctly

---

## Device-Specific Testing (15 minutes)

### Desktop (1920x1080)
- [ ] All features visible
- [ ] Sidebar expanded by default
- [ ] Notes render at full size
- [ ] Smooth animations

### Laptop (1366x768)
- [ ] Layout adjusts appropriately
- [ ] Sidebar can collapse
- [ ] All controls accessible

### Tablet (iPad)
- [ ] Touch gestures work
- [ ] Pinch to zoom
- [ ] Drag notes with finger
- [ ] Sidebar collapsed by default
- [ ] Touch targets large enough (44x44px)

### Mobile (iPhone)
- [ ] Sidebar hidden by default
- [ ] Can create and edit notes
- [ ] Touch gestures responsive
- [ ] Text readable
- [ ] No horizontal scrolling

---

## Browser Compatibility (10 minutes)

Test in each browser:

### Chrome
- [ ] All features work
- [ ] Animations smooth
- [ ] Physics realistic

### Firefox
- [ ] All features work
- [ ] Backdrop blur works
- [ ] WebSocket connection stable

### Safari
- [ ] All features work
- [ ] Touch gestures work
- [ ] System font renders correctly

### Edge
- [ ] All features work
- [ ] Performance acceptable

---

## Error Handling (5 minutes)

### Connection Errors
1. **Test Disconnect**
   - [ ] Stop server (Ctrl+C)
   - [ ] Check connection indicator shows "Disconnected"
   - [ ] Create note (should queue)
   - [ ] Restart server
   - [ ] Check note appears (sync)

2. **Test Reconnection**
   - [ ] Disconnect WiFi
   - [ ] Check "Reconnecting..." message
   - [ ] Reconnect WiFi
   - [ ] Check "Connected" message

### Image Upload Errors
1. **Test File Size**
   - [ ] Try uploading 15MB image
   - [ ] Check error: "Image size exceeds 10MB limit"

2. **Test File Type**
   - [ ] Try uploading .txt file
   - [ ] Check error: "Only JPEG, PNG, and GIF formats are supported"

### User Errors
- [ ] Try deleting board → confirmation dialog appears
- [ ] Try deleting note → confirmation dialog appears
- [ ] All error messages are clear and helpful

---

## Performance Testing (10 minutes)

### Load Testing
1. **Create 10 notes**
   - [ ] Performance remains smooth
   - [ ] Physics works correctly

2. **Create 50 notes**
   - [ ] Check for slowdown
   - [ ] Measure FPS (DevTools Performance)
   - [ ] Memory usage acceptable

3. **Create 100+ notes**
   - [ ] Application still functional
   - [ ] Identify performance limits

### Memory Testing
1. **Open DevTools → Memory**
2. **Take heap snapshot**
3. **Create/delete 20 notes**
4. **Take another snapshot**
5. **Check for memory leaks**

---

## Common Issues & Solutions

### Issue: Server won't start
**Solution:** Check if port 3001 is in use
```bash
# Windows
netstat -ano | findstr :3001

# macOS/Linux
lsof -i :3001
```

### Issue: Client can't connect to server
**Solution:** 
1. Check server is running
2. Check firewall settings
3. Verify correct IP address

### Issue: Animations are choppy
**Solution:**
1. Check CPU usage (Task Manager)
2. Close other applications
3. Try different browser
4. Check GPU acceleration enabled

### Issue: Physics feels wrong
**Solution:**
1. Check frame rate (should be 60fps)
2. Verify friction settings
3. Test with fewer notes

---

## Reporting Issues

When you find an issue, document:

1. **Description**: What happened?
2. **Expected**: What should happen?
3. **Steps to reproduce**: How to recreate?
4. **Environment**: Browser, OS, device
5. **Screenshot/Video**: Visual proof
6. **Severity**: Critical, High, Medium, Low

### Issue Template

```markdown
**Issue:** [Brief description]

**Expected Behavior:** [What should happen]

**Actual Behavior:** [What actually happens]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- Device: Desktop
- Screen: 1920x1080

**Screenshot:** [Attach image]

**Severity:** High
```

---

## Testing Tools

### Browser DevTools
- **Elements**: Inspect CSS and DOM
- **Console**: Check for errors
- **Network**: Monitor WebSocket messages
- **Performance**: Measure FPS and CPU
- **Memory**: Check for leaks
- **Lighthouse**: Accessibility audit

### Browser Extensions
- **axe DevTools**: Accessibility testing
- **WAVE**: Web accessibility evaluation
- **ColorZilla**: Color picker and contrast checker
- **React DevTools**: Component inspection

### External Tools
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Color Oracle**: Color blindness simulator
- **Responsively**: Multi-device testing
- **BrowserStack**: Cross-browser testing

---

## Sign-Off Checklist

Before marking task as complete:

- [ ] All critical path tests passed
- [ ] Visual design matches specification
- [ ] Animations are smooth (60fps)
- [ ] Physics feel realistic
- [ ] Touch/trackpad gestures work
- [ ] Responsive on all screen sizes
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works
- [ ] Error messages are clear
- [ ] Real-time collaboration works
- [ ] Performance acceptable with 50+ notes
- [ ] No console errors
- [ ] No memory leaks
- [ ] Tested on 3+ browsers
- [ ] Tested on 3+ devices
- [ ] All issues documented

---

## Next Steps

After completing manual testing:

1. **Document findings** in MANUAL_TESTING_CHECKLIST.md
2. **Create issues** for any bugs found
3. **Update design** if needed
4. **Retest** after fixes
5. **Get user feedback** from actual users
6. **Mark task complete** when all critical issues resolved

---

## Quick Reference

### Keyboard Shortcuts
- `Ctrl+N` - New note
- `Delete` - Delete selected note
- `Ctrl+=` - Zoom in
- `Ctrl+-` - Zoom out
- `Ctrl+0` - Reset zoom
- `Ctrl+F` - Fit to screen
- `Escape` - Close dialogs
- `Tab` - Navigate elements

### URLs
- Client: http://localhost:3000
- Server: http://localhost:3001
- API: http://localhost:3001/api/boards

### Design Spec Colors
- Background: #F5F5F7
- Accent: #007AFF
- Yellow: #FFD60A
- Orange: #FF9F0A
- Red: #FF453A
- Pink: #FF375F
- Purple: #BF5AF2
- Blue: #0A84FF
- Teal: #5AC8FA
- Green: #32D74B

---

**Happy Testing! 🧪**
