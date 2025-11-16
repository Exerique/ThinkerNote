// Validation schemas and functions for data models

import {
  Board,
  Note,
  Image,
  Sticker,
  WSMessage,
  CreateNotePayload,
  UpdateNotePayload,
  DeleteNotePayload,
  MoveNotePayload,
  CreateBoardPayload,
  DeleteBoardPayload,
  RenameBoardPayload,
  SyncRequestPayload,
  SyncResponsePayload,
} from './types';

// Validation error class
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Helper validation functions
function isString(value: any): value is string {
  return typeof value === 'string';
}

function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

function isObject(value: any): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidFontSize(value: any): value is 'small' | 'medium' | 'large' {
  return value === 'small' || value === 'medium' || value === 'large';
}

// Sticker validation
export function validateSticker(data: any): data is Sticker {
  if (!isObject(data)) {
    throw new ValidationError('Sticker must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.id) || obj.id.length === 0) {
    throw new ValidationError('Sticker id must be a non-empty string');
  }

  if (!isString(obj.type) || obj.type.length === 0) {
    throw new ValidationError('Sticker type must be a non-empty string');
  }

  if (!isNumber(obj.x)) {
    throw new ValidationError('Sticker x must be a number');
  }

  if (!isNumber(obj.y)) {
    throw new ValidationError('Sticker y must be a number');
  }

  if (!isNumber(obj.scale) || obj.scale < 0.5 || obj.scale > 2.0) {
    throw new ValidationError('Sticker scale must be a number between 0.5 and 2.0');
  }

  return true;
}

// Image validation
export function validateImage(data: any): data is Image {
  if (!isObject(data)) {
    throw new ValidationError('Image must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.id) || obj.id.length === 0) {
    throw new ValidationError('Image id must be a non-empty string');
  }

  if (!isString(obj.url) || obj.url.length === 0) {
    throw new ValidationError('Image url must be a non-empty string');
  }

  if (!isNumber(obj.width) || obj.width <= 0) {
    throw new ValidationError('Image width must be a positive number');
  }

  if (!isNumber(obj.height) || obj.height <= 0) {
    throw new ValidationError('Image height must be a positive number');
  }

  if (!isNumber(obj.x)) {
    throw new ValidationError('Image x must be a number');
  }

  if (!isNumber(obj.y)) {
    throw new ValidationError('Image y must be a number');
  }

  return true;
}

// Note validation
export function validateNote(data: any): data is Note {
  if (!isObject(data)) {
    throw new ValidationError('Note must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.id) || obj.id.length === 0) {
    throw new ValidationError('Note id must be a non-empty string');
  }

  if (!isString(obj.boardId) || obj.boardId.length === 0) {
    throw new ValidationError('Note boardId must be a non-empty string');
  }

  if (!isNumber(obj.x)) {
    throw new ValidationError('Note x must be a number');
  }

  if (!isNumber(obj.y)) {
    throw new ValidationError('Note y must be a number');
  }

  if (!isNumber(obj.width) || obj.width <= 0) {
    throw new ValidationError('Note width must be a positive number');
  }

  if (!isNumber(obj.height) || obj.height <= 0) {
    throw new ValidationError('Note height must be a positive number');
  }

  if (!isString(obj.content)) {
    throw new ValidationError('Note content must be a string');
  }

  if (obj.content.length > 10000) {
    throw new ValidationError('Note content must not exceed 10,000 characters');
  }

  if (!isString(obj.backgroundColor) || obj.backgroundColor.length === 0) {
    throw new ValidationError('Note backgroundColor must be a non-empty string');
  }

  if (!isValidFontSize(obj.fontSize)) {
    throw new ValidationError('Note fontSize must be "small", "medium", or "large"');
  }

  if (!isBoolean(obj.isExpanded)) {
    throw new ValidationError('Note isExpanded must be a boolean');
  }

  if (!isArray(obj.images)) {
    throw new ValidationError('Note images must be an array');
  }

  for (const image of obj.images) {
    validateImage(image);
  }

  if (!isArray(obj.stickers)) {
    throw new ValidationError('Note stickers must be an array');
  }

  for (const sticker of obj.stickers) {
    validateSticker(sticker);
  }

  if (!isNumber(obj.createdAt) || obj.createdAt <= 0) {
    throw new ValidationError('Note createdAt must be a positive number');
  }

  if (!isNumber(obj.updatedAt) || obj.updatedAt <= 0) {
    throw new ValidationError('Note updatedAt must be a positive number');
  }

  if (obj.editingBy !== undefined && !isString(obj.editingBy)) {
    throw new ValidationError('Note editingBy must be a string or undefined');
  }

  return true;
}

// Board validation
export function validateBoard(data: any): data is Board {
  if (!isObject(data)) {
    throw new ValidationError('Board must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.id) || obj.id.length === 0) {
    throw new ValidationError('Board id must be a non-empty string');
  }

  if (!isString(obj.name) || obj.name.length === 0) {
    throw new ValidationError('Board name must be a non-empty string');
  }

  if (!isNumber(obj.createdAt) || obj.createdAt <= 0) {
    throw new ValidationError('Board createdAt must be a positive number');
  }

  if (!isNumber(obj.updatedAt) || obj.updatedAt <= 0) {
    throw new ValidationError('Board updatedAt must be a positive number');
  }

  if (!isArray(obj.notes)) {
    throw new ValidationError('Board notes must be an array');
  }

  for (const note of obj.notes) {
    validateNote(note);
  }

  return true;
}

// WebSocket message payload validations
export function validateCreateNotePayload(data: any): data is CreateNotePayload {
  if (!isObject(data)) {
    throw new ValidationError('CreateNotePayload must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.boardId) || obj.boardId.length === 0) {
    throw new ValidationError('CreateNotePayload boardId must be a non-empty string');
  }

  if (!isNumber(obj.x)) {
    throw new ValidationError('CreateNotePayload x must be a number');
  }

  if (!isNumber(obj.y)) {
    throw new ValidationError('CreateNotePayload y must be a number');
  }

  return true;
}

export function validateUpdateNotePayload(data: any): data is UpdateNotePayload {
  if (!isObject(data)) {
    throw new ValidationError('UpdateNotePayload must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.noteId) || obj.noteId.length === 0) {
    throw new ValidationError('UpdateNotePayload noteId must be a non-empty string');
  }

  if (!isObject(obj.updates)) {
    throw new ValidationError('UpdateNotePayload updates must be an object');
  }

  // Validate partial note updates
  const updates = obj.updates as Record<string, any>;
  
  if (updates.x !== undefined && !isNumber(updates.x)) {
    throw new ValidationError('UpdateNotePayload updates.x must be a number');
  }

  if (updates.y !== undefined && !isNumber(updates.y)) {
    throw new ValidationError('UpdateNotePayload updates.y must be a number');
  }

  if (updates.width !== undefined && (!isNumber(updates.width) || updates.width <= 0)) {
    throw new ValidationError('UpdateNotePayload updates.width must be a positive number');
  }

  if (updates.height !== undefined && (!isNumber(updates.height) || updates.height <= 0)) {
    throw new ValidationError('UpdateNotePayload updates.height must be a positive number');
  }

  if (updates.content !== undefined) {
    if (!isString(updates.content)) {
      throw new ValidationError('UpdateNotePayload updates.content must be a string');
    }
    if (updates.content.length > 10000) {
      throw new ValidationError('UpdateNotePayload updates.content must not exceed 10,000 characters');
    }
  }

  if (updates.backgroundColor !== undefined && !isString(updates.backgroundColor)) {
    throw new ValidationError('UpdateNotePayload updates.backgroundColor must be a string');
  }

  if (updates.fontSize !== undefined && !isValidFontSize(updates.fontSize)) {
    throw new ValidationError('UpdateNotePayload updates.fontSize must be "small", "medium", or "large"');
  }

  if (updates.isExpanded !== undefined && !isBoolean(updates.isExpanded)) {
    throw new ValidationError('UpdateNotePayload updates.isExpanded must be a boolean');
  }

  if (updates.images !== undefined) {
    if (!isArray(updates.images)) {
      throw new ValidationError('UpdateNotePayload updates.images must be an array');
    }
    for (const image of updates.images) {
      validateImage(image);
    }
  }

  if (updates.stickers !== undefined) {
    if (!isArray(updates.stickers)) {
      throw new ValidationError('UpdateNotePayload updates.stickers must be an array');
    }
    for (const sticker of updates.stickers) {
      validateSticker(sticker);
    }
  }

  return true;
}

export function validateDeleteNotePayload(data: any): data is DeleteNotePayload {
  if (!isObject(data)) {
    throw new ValidationError('DeleteNotePayload must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.noteId) || obj.noteId.length === 0) {
    throw new ValidationError('DeleteNotePayload noteId must be a non-empty string');
  }

  return true;
}

export function validateMoveNotePayload(data: any): data is MoveNotePayload {
  if (!isObject(data)) {
    throw new ValidationError('MoveNotePayload must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.noteId) || obj.noteId.length === 0) {
    throw new ValidationError('MoveNotePayload noteId must be a non-empty string');
  }

  if (!isNumber(obj.x)) {
    throw new ValidationError('MoveNotePayload x must be a number');
  }

  if (!isNumber(obj.y)) {
    throw new ValidationError('MoveNotePayload y must be a number');
  }

  return true;
}

export function validateCreateBoardPayload(data: any): data is CreateBoardPayload {
  if (!isObject(data)) {
    throw new ValidationError('CreateBoardPayload must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.boardId) || obj.boardId.length === 0) {
    throw new ValidationError('CreateBoardPayload boardId must be a non-empty string');
  }

  if (!isString(obj.name) || obj.name.length === 0) {
    throw new ValidationError('CreateBoardPayload name must be a non-empty string');
  }

  return true;
}

export function validateDeleteBoardPayload(data: any): data is DeleteBoardPayload {
  if (!isObject(data)) {
    throw new ValidationError('DeleteBoardPayload must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.boardId) || obj.boardId.length === 0) {
    throw new ValidationError('DeleteBoardPayload boardId must be a non-empty string');
  }

  return true;
}

export function validateRenameBoardPayload(data: any): data is RenameBoardPayload {
  if (!isObject(data)) {
    throw new ValidationError('RenameBoardPayload must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.boardId) || obj.boardId.length === 0) {
    throw new ValidationError('RenameBoardPayload boardId must be a non-empty string');
  }

  if (!isString(obj.name) || obj.name.length === 0) {
    throw new ValidationError('RenameBoardPayload name must be a non-empty string');
  }

  return true;
}

export function validateSyncRequestPayload(data: any): data is SyncRequestPayload {
  if (!isObject(data)) {
    throw new ValidationError('SyncRequestPayload must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isString(obj.boardId) || obj.boardId.length === 0) {
    throw new ValidationError('SyncRequestPayload boardId must be a non-empty string');
  }

  return true;
}

export function validateSyncResponsePayload(data: any): data is SyncResponsePayload {
  if (!isObject(data)) {
    throw new ValidationError('SyncResponsePayload must be an object');
  }

  const obj = data as Record<string, any>;

  if (!isObject(obj.board)) {
    throw new ValidationError('SyncResponsePayload board must be an object');
  }

  validateBoard(obj.board);

  return true;
}

// WebSocket message validation
export function validateWSMessage(data: any): data is WSMessage {
  if (!isObject(data)) {
    throw new ValidationError('WSMessage must be an object');
  }

  const obj = data as Record<string, any>;

  const validTypes = [
    'note:create',
    'note:update',
    'note:delete',
    'note:move',
    'board:create',
    'board:delete',
    'board:rename',
    'sync:request',
    'sync:response',
  ];

  if (!isString(obj.type) || !validTypes.includes(obj.type)) {
    throw new ValidationError(`WSMessage type must be one of: ${validTypes.join(', ')}`);
  }

  if (obj.payload === undefined || obj.payload === null) {
    throw new ValidationError('WSMessage payload is required');
  }

  if (!isNumber(obj.timestamp) || obj.timestamp <= 0) {
    throw new ValidationError('WSMessage timestamp must be a positive number');
  }

  if (!isString(obj.userId) || obj.userId.length === 0) {
    throw new ValidationError('WSMessage userId must be a non-empty string');
  }

  // Validate payload based on message type
  switch (obj.type) {
    case 'note:create':
      validateCreateNotePayload(obj.payload);
      break;
    case 'note:update':
      validateUpdateNotePayload(obj.payload);
      break;
    case 'note:delete':
      validateDeleteNotePayload(obj.payload);
      break;
    case 'note:move':
      validateMoveNotePayload(obj.payload);
      break;
    case 'board:create':
      validateCreateBoardPayload(obj.payload);
      break;
    case 'board:delete':
      validateDeleteBoardPayload(obj.payload);
      break;
    case 'board:rename':
      validateRenameBoardPayload(obj.payload);
      break;
    case 'sync:request':
      validateSyncRequestPayload(obj.payload);
      break;
    case 'sync:response':
      validateSyncResponsePayload(obj.payload);
      break;
  }

  return true;
}
