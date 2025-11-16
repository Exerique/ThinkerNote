import { useEffect, useRef, useCallback } from 'react';
import { PhysicsManager } from '../services/physicsManager';
import { Note } from '../../../shared/src/types';

interface UsePhysicsOptions {
  enabled: boolean;
  onPositionUpdate: (noteId: string, x: number, y: number) => void;
}

export const usePhysics = ({ enabled, onPositionUpdate }: UsePhysicsOptions) => {
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

  // Add or update note in physics world
  const addOrUpdateNote = useCallback((note: Note) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.addOrUpdateNote(note);
    }
  }, []);

  // Remove note from physics world
  const removeNote = useCallback((noteId: string) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.removeNote(noteId);
    }
  }, []);

  // Apply momentum to a note
  const applyMomentum = useCallback((noteId: string, vx: number, vy: number) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.applyMomentum(noteId, vx, vy);
    }
  }, []);

  // Set note position (during drag)
  const setNotePosition = useCallback((noteId: string, x: number, y: number) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.setNotePosition(noteId, x, y);
    }
  }, []);

  // Set note static state (disable physics during drag)
  const setNoteStatic = useCallback((noteId: string, isStatic: boolean) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.setNoteStatic(noteId, isStatic);
    }
  }, []);

  // Update viewport bounds for optimization
  const setViewportBounds = useCallback((bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }) => {
    if (physicsManagerRef.current) {
      physicsManagerRef.current.setViewportBounds(bounds);
    }
  }, []);

  return {
    addOrUpdateNote,
    removeNote,
    applyMomentum,
    setNotePosition,
    setNoteStatic,
    setViewportBounds,
  };
};
