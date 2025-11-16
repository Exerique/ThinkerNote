// Shared type definitions for collaborative note board

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  notes: Note[];
}

export interface Note {
  id: string;
  boardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  backgroundColor: string;
  fontSize: 'small' | 'medium' | 'large';
  isExpanded: boolean;
  images: Image[];
  stickers: Sticker[];
  createdAt: number;
  updatedAt: number;
  editingBy?: string;
  version: number; // For conflict detection
}

export interface Image {
  id: string;
  url: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface Sticker {
  id: string;
  type: string;
  x: number;
  y: number;
  scale: number;
}

export type WSMessageType =
  | 'note:create'
  | 'note:update'
  | 'note:delete'
  | 'note:move'
  | 'note:editing:start'
  | 'note:editing:end'
  | 'board:create'
  | 'board:delete'
  | 'board:rename'
  | 'sync:request'
  | 'sync:response';

export interface WSMessage {
  type: WSMessageType;
  payload: any;
  timestamp: number;
  userId: string;
}

export interface CreateNotePayload {
  boardId: string;
  x: number;
  y: number;
}

export interface UpdateNotePayload {
  noteId: string;
  updates: Partial<Note>;
}

export interface DeleteNotePayload {
  noteId: string;
}

export interface MoveNotePayload {
  noteId: string;
  x: number;
  y: number;
}

export interface CreateBoardPayload {
  boardId: string;
  name: string;
}

export interface DeleteBoardPayload {
  boardId: string;
}

export interface RenameBoardPayload {
  boardId: string;
  name: string;
}

export interface SyncRequestPayload {
  boardId: string;
}

export interface SyncResponsePayload {
  board: Board;
}

export interface EditingStartPayload {
  noteId: string;
  userId: string;
}

export interface EditingEndPayload {
  noteId: string;
  userId: string;
}
