# Collaborative Note Board

A real-time collaborative note-sharing application inspired by Apple Freeform.

## Project Structure

```
collaborative-note-board/
├── client/          # React TypeScript frontend
├── server/          # Node.js TypeScript backend
├── shared/          # Shared type definitions
└── package.json     # Root workspace configuration
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development servers:
```bash
npm run dev
```

This will start:
- Client on http://localhost:3000
- Server on http://localhost:3001

## Development

- `npm run dev` - Start both client and server in development mode
- `npm run dev:client` - Start only the client
- `npm run dev:server` - Start only the server
- `npm run build` - Build all packages for production

## Technology Stack

### Frontend
- React 18 with TypeScript
- Matter.js for physics simulation
- Socket.io-client for WebSocket communication
- Framer Motion for animations
- React-Zoom-Pan-Pinch for canvas navigation
- Vite for build tooling

### Backend
- Node.js with Express
- Socket.io for WebSocket server
- TypeScript for type safety
- File system for data persistence

## Requirements

- Node.js 18+ 
- npm 9+
