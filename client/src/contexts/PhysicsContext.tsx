import React, { createContext, useContext, useRef, useEffect, useCallback } from 'react';
import { PhysicsManager } from '../services/physicsManager';
import { Note } from '../../../shared/src/types';

interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface PhysicsContextType {
  applyMomentum: (noteId: string, vx: number, vy: number) => void;
  setNoteStatic: (noteId: string, isStatic: boolean) => void;
  setNotePosition: (noteId: string, x: number, y: number) => void;
  addOrUpdateNote: (note: Note) => void;
  removeNote: (noteId: string) => void;
  setViewportBounds: (bounds: ViewportBounds) => void;
}

const PhysicsContext = createContext<PhysicsContextType | null>(null);

export const usePhysicsContext = () => {
  const context = useContext(PhysicsContext);
  if (!context) {
    // Return no-op functions if physics is not enabled
    return {
      applyMomentum: () => {},
      setNoteStatic: () => {},
      setNotePosition: () => {},
      addOrUpdateNote: () => {},
      removeNote: () => {},
      setViewportBounds: () => {},
    };
  }
  return context;
};

interface PhysicsProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  onPositionUpdate?: (noteId: string, x: number, y: number) => void;
}

export const PhysicsProvider: React.FC<PhysicsProviderProps> = ({
  children,
  enabled = true,
  onPositionUpdate = () => {},
}) => {
  const physicsManagerRef = useRef<PhysicsManager | null>(null);

  // Initialize physics manager
  useEffect(() => {
    if (!enabled) return;

    physicsManagerRef.current = new PhysicsManager(onPositionUpdate);
    physicsManagerRef.current.start();

    return () => {
      if (physicsManagerRef.current) {
        physicsManagerRef.current.destroy();
        physicsManagerRef.current = null;
      }
    };
  }, [enabled, onPositionUpdate]);

  const applyMomentum = useCallback((noteId: string, vx: number, vy: number) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.applyMomentum(noteId, vx, vy);
    }
  }, []);

  const setNoteStatic = useCallback((noteId: string, isStatic: boolean) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.setNoteStatic(noteId, isStatic);
    }
  }, []);

  const setNotePosition = useCallback((noteId: string, x: number, y: number) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.setNotePosition(noteId, x, y);
    }
  }, []);

  const addOrUpdateNote = useCallback((note: Note) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.addOrUpdateNote(note);
    }
  }, []);

  const removeNote = useCallback((noteId: string) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.removeNote(noteId);
    }
  }, []);

  const setViewportBounds = useCallback((bounds: ViewportBounds) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.setViewportBounds(bounds);
    }
  }, []);

  const value: PhysicsContextType = {
    applyMomentum,
    setNoteStatic,
    setNotePosition,
    addOrUpdateNote,
    removeNote,
    setViewportBounds,
  };

  return (
    <PhysicsContext.Provider value={value}>
      {children}
    </PhysicsContext.Provider>
  );
};
