# Requirements Document

## Introduction

This document specifies the requirements for a collaborative note-sharing board application inspired by Apple Freeform. The application enables real-time collaboration between users on a local network, allowing them to create, edit, and organize notes on an infinite canvas with physics-based interactions and visual customization options.

## Glossary

- **Board**: The infinite canvas workspace where users can place and organize notes
- **Note**: A draggable content container that can hold text, images, or other media
- **Client Application**: The web-based user interface running in a browser
- **Server Application**: The backend service that manages real-time synchronization
- **WebSocket Connection**: The bidirectional communication channel between Client and Server
- **Physics Engine**: The system that simulates realistic movement and collision behavior for notes
- **Sidebar**: The retractable navigation panel for accessing boards and settings

## Requirements

### Requirement 1

**User Story:** As a user, I want to create and manage multiple boards, so that I can organize different projects or topics separately

#### Acceptance Criteria

1. THE Client Application SHALL provide a user interface element to create a new board
2. THE Client Application SHALL display a list of all available boards in the Sidebar
3. WHEN a user selects a board from the list, THE Client Application SHALL load and display that board's contents
4. THE Client Application SHALL allow users to delete existing boards
5. THE Client Application SHALL allow users to rename existing boards

### Requirement 2

**User Story:** As a user, I want to create notes on the board, so that I can capture and organize information

#### Acceptance Criteria

1. WHEN a user double-clicks on an empty area of the Board, THE Client Application SHALL create a new Note at that position
2. THE Client Application SHALL provide a button or menu option to create a new Note
3. THE Note SHALL support text input with a minimum capacity of 10,000 characters
4. THE Note SHALL display in a collapsed state by default showing a preview of the content
5. WHEN a user clicks on a collapsed Note, THE Client Application SHALL expand the Note to show full content

### Requirement 3

**User Story:** As a user, I want to customize the appearance of notes, so that I can visually organize and categorize information

#### Acceptance Criteria

1. THE Client Application SHALL provide at least 8 solid color options for Note backgrounds
2. THE Client Application SHALL provide at least 4 gradient color options for Note backgrounds
3. THE Client Application SHALL allow users to change the background color of any Note
4. THE Client Application SHALL provide at least 3 font size options for Note text
5. THE Client Application SHALL persist all visual customizations when the Note is saved

### Requirement 4

**User Story:** As a user, I want to add images to notes, so that I can include visual information alongside text

#### Acceptance Criteria

1. THE Client Application SHALL allow users to upload image files to a Note
2. THE Client Application SHALL support JPEG, PNG, and GIF image formats
3. THE Client Application SHALL display uploaded images within the Note container
4. THE Client Application SHALL limit individual image file sizes to 10 megabytes
5. WHEN an image exceeds the size limit, THE Client Application SHALL display an error message to the user

### Requirement 5

**User Story:** As a user, I want to drag and position notes freely on the board, so that I can arrange information spatially

#### Acceptance Criteria

1. WHEN a user clicks and holds on a Note, THE Client Application SHALL enable drag mode for that Note
2. WHILE in drag mode, THE Client Application SHALL move the Note to follow the cursor position
3. WHEN the user releases the mouse button, THE Client Application SHALL place the Note at the current cursor position
4. THE Board SHALL support an infinite canvas with no boundary restrictions
5. THE Client Application SHALL automatically pan the viewport when dragging a Note near the edge

### Requirement 6

**User Story:** As a user, I want notes to have physics-based movement, so that the interface feels natural and engaging

#### Acceptance Criteria

1. WHEN a user releases a Note after dragging with velocity, THE Physics Engine SHALL apply momentum to continue the Note's movement
2. THE Physics Engine SHALL apply friction to gradually slow down moving Notes
3. WHEN two Notes collide, THE Physics Engine SHALL calculate and apply realistic bounce behavior
4. THE Physics Engine SHALL prevent Notes from overlapping by applying collision response forces
5. THE Physics Engine SHALL complete all movement animations within 2 seconds of the initial interaction

### Requirement 7

**User Story:** As a user, I want smooth animations when interacting with notes, so that the interface feels polished and responsive

#### Acceptance Criteria

1. WHEN a Note changes state, THE Client Application SHALL animate the transition over 300 milliseconds
2. THE Client Application SHALL use easing functions for all animations to create natural motion
3. WHEN a Note is created, THE Client Application SHALL animate the Note scaling from zero to full size
4. WHEN a Note is deleted, THE Client Application SHALL animate the Note fading out and scaling down
5. THE Client Application SHALL maintain animation frame rates above 30 frames per second during all interactions

### Requirement 8

**User Story:** As a user, I want to see my collaborator's changes in real-time, so that we can work together seamlessly

#### Acceptance Criteria

1. WHEN a user modifies a Note, THE Server Application SHALL broadcast the change to all connected clients within 100 milliseconds
2. WHEN a remote user creates a Note, THE Client Application SHALL display the new Note on the local Board
3. WHEN a remote user moves a Note, THE Client Application SHALL update the Note position with smooth interpolation
4. WHEN a remote user deletes a Note, THE Client Application SHALL remove the Note from the local Board
5. THE Client Application SHALL display a visual indicator showing which user is currently editing each Note

### Requirement 9

**User Story:** As a user, I want the application to work reliably on my local network, so that my girlfriend and I can collaborate without internet dependency

#### Acceptance Criteria

1. THE Server Application SHALL run on a local network without requiring internet connectivity
2. THE Client Application SHALL connect to the Server Application using the local IP address
3. WHEN the WebSocket Connection is interrupted, THE Client Application SHALL attempt to reconnect every 3 seconds
4. WHEN the WebSocket Connection is restored, THE Client Application SHALL synchronize all changes that occurred during the disconnection
5. THE Server Application SHALL persist all board data to disk every 30 seconds

### Requirement 10

**User Story:** As a user, I want to add stickers to my notes, so that I can express emotions and add visual flair

#### Acceptance Criteria

1. THE Client Application SHALL provide a library of at least 20 sticker options
2. THE Client Application SHALL allow users to add stickers to any Note
3. THE Client Application SHALL allow users to resize stickers within a Note
4. THE Client Application SHALL allow users to position stickers anywhere within a Note
5. THE Client Application SHALL allow users to remove stickers from a Note

### Requirement 11

**User Story:** As a user, I want to delete notes, so that I can remove information that is no longer needed

#### Acceptance Criteria

1. THE Client Application SHALL provide a delete button on each Note
2. WHEN a user clicks the delete button, THE Client Application SHALL remove the Note from the Board
3. WHEN a user deletes a Note, THE Server Application SHALL broadcast the deletion to all connected clients
4. THE Client Application SHALL provide a confirmation dialog before deleting a Note
5. WHEN a Note is deleted, THE Client Application SHALL remove all associated data including text and images

### Requirement 12

**User Story:** As a user, I want the sidebar to be retractable, so that I can maximize my workspace when needed

#### Acceptance Criteria

1. THE Client Application SHALL display a toggle button to show or hide the Sidebar
2. WHEN the user clicks the toggle button, THE Client Application SHALL animate the Sidebar sliding in or out over 300 milliseconds
3. WHILE the Sidebar is hidden, THE Client Application SHALL expand the Board to use the full viewport width
4. THE Client Application SHALL persist the Sidebar state between sessions
5. THE Client Application SHALL display the Sidebar in the collapsed state by default on screens narrower than 768 pixels

### Requirement 13

**User Story:** As a user, I want to zoom and pan the board, so that I can navigate large workspaces efficiently

#### Acceptance Criteria

1. WHEN a user scrolls the mouse wheel, THE Client Application SHALL zoom the Board in or out by 10 percent per scroll increment
2. THE Client Application SHALL support zoom levels between 25 percent and 400 percent
3. WHEN a user middle-clicks and drags, THE Client Application SHALL pan the Board viewport
4. THE Client Application SHALL provide zoom controls in the user interface
5. WHEN zooming, THE Client Application SHALL center the zoom operation on the cursor position

### Requirement 14

**User Story:** As a user, I want to search for notes by content, so that I can quickly find specific information

#### Acceptance Criteria

1. THE Client Application SHALL provide a search input field in the Sidebar
2. WHEN a user types in the search field, THE Client Application SHALL filter and highlight Notes containing the search text
3. THE Client Application SHALL perform case-insensitive text matching
4. THE Client Application SHALL update search results in real-time as the user types
5. WHEN search results are displayed, THE Client Application SHALL provide a button to clear the search and show all Notes

### Requirement 15

**User Story:** As a user, I want the application to be simple and intuitive, so that I can focus on content rather than learning complex features

#### Acceptance Criteria

1. THE Client Application SHALL use a minimalist design with no more than 3 primary colors
2. THE Client Application SHALL provide tooltips for all interactive elements
3. THE Client Application SHALL complete all user-initiated actions within 500 milliseconds
4. THE Client Application SHALL display loading indicators for operations exceeding 200 milliseconds
5. THE Client Application SHALL use consistent iconography and visual language throughout the interface
