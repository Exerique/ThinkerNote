# Note editor typing issues

The backwards spelling/"cursor jumps to the front" bug is still happening because the note keeps rewriting the `contentEditable` DOM node mid-typing. The browser loses the caret each time React re-renders, so your next key gets inserted at the start of the string and the word builds up in reverse order. Capturing/restoring the selection helps, but there is a simpler architectural fix: stop driving the typing surface with `contentEditable` altogether.

## Proposed alternative fix: switch to a textarea overlay while editing

1. **Render an auto-sizing `<textarea>` whenever the note is expanded _and_ `isEditing` is true.**
   * Keep the textarea absolutely positioned over the note content with the same padding/line-height so switching between display/edit modes feels seamless.
   * Bind its `value` to the local `content` buffer (the same state we already keep), and update that buffer in the `onChange` handler. Because the textarea is a fully controlled element, React never rewrites the DOM out from under the browser while you type, so the caret never jumps to the start or reverses characters.

2. **Only render the passive `<div className={styles.editableContent} contentEditable={false}>` preview when the user is not editing.**
   * Keep the existing layout effect that syncs the preview with the canonical note content (`note.content`) after websocket updates or when another user edits the note.
   * This ensures the DOM only updates in bulk when the user is _not_ actively typing, eliminating the race that produces backwards strings.

3. **Persist changes on blur just like today.**
   * When the textarea loses focus, send the debounced `sendUpdateNote` payload using the buffered text.
   * Replace the textarea with the passive preview again so collaborators see the latest text.

4. **Styling considerations.**
   * Reuse the `.editableContent` class for the textarea so the font, placeholder, and spacing stay consistent.
   * Apply `resize: none; border: 0; background: transparent; outline: none;` so it visually matches the current editable surface.
   * Because the textarea is a real input control, arrow keys, delete/backspace, selection, and IME composition all work without custom caret bookkeeping.

## Bonus: safeguard against accidental double updates

Even after the textarea swap, keep the debounce timer around `sendUpdateNote` so we do not flood the websocket with every keystroke. The buffer → textarea → debounce pipeline keeps the UI snappy and still cooperates with collaboration.

Implementing this overlay pattern removes the need for manual selection math _and_ eliminates the word-reversal bug, since browsers handle caret management inside native inputs correctly.
