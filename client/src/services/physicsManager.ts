import Matter from 'matter-js';
import { Note } from '../../../shared/src/types';

interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class PhysicsManager {
  private engine: Matter.Engine;
  private world: Matter.World;
  private bodies: Map<string, Matter.Body>;
  private animationFrameId: number | null;
  private onPositionUpdate: (noteId: string, x: number, y: number) => void;
  private lastUpdateTime: number;
  private readonly frameTime: number = 1000 / 60; // 60fps
  private viewportBounds: ViewportBounds | null = null;
  private disabledBodies: Set<string> = new Set();
  private lastPositionUpdateTime: Map<string, number> = new Map();
  private readonly positionUpdateThrottle: number = 100; // Max 10 updates per second per note
  private readonly velocityThreshold: number = 1; // Only send updates if moving faster than this

  constructor(onPositionUpdate: (noteId: string, x: number, y: number) => void) {
    // Initialize Matter.js engine with optimizations
    this.engine = Matter.Engine.create({
      enableSleeping: true, // Enable sleeping for inactive bodies
    });
    
    this.world = this.engine.world;
    this.bodies = new Map();
    this.animationFrameId = null;
    this.onPositionUpdate = onPositionUpdate;
    this.lastUpdateTime = performance.now();

    // Configure gravity using current API
    this.engine.gravity.y = 0;
    this.engine.gravity.x = 0;
    this.engine.gravity.scale = 0;
    
    // Note: Grid-based broadphase is deprecated and removed
    // Matter.js now uses a more efficient broadphase by default
    
    // Enable collision detection
    this.setupCollisionHandling();
  }
  
  /**
   * Set up collision event handlers
   */
  private setupCollisionHandling(): void {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        // Collision detected between two bodies
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        
        // Apply bounce behavior
        this.handleCollision(bodyA, bodyB);
      });
    });
  }
  
  /**
   * Handle collision between two bodies
   */
  private handleCollision(bodyA: Matter.Body, bodyB: Matter.Body): void {
    try {
      // Get velocities
      const velA = Matter.Body.getVelocity(bodyA);
      const velB = Matter.Body.getVelocity(bodyB);
      
      // Calculate collision normal
      const dx = bodyB.position.x - bodyA.position.x;
      const dy = bodyB.position.y - bodyA.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Handle zero distance case - separate bodies slightly
      if (distance < 0.01) {
        // Separate bodies by a small amount in a random direction
        const angle = Math.random() * Math.PI * 2;
        const separationDistance = 1;
        Matter.Body.setPosition(bodyA, {
          x: bodyA.position.x + Math.cos(angle) * separationDistance,
          y: bodyA.position.y + Math.sin(angle) * separationDistance,
        });
        Matter.Body.setPosition(bodyB, {
          x: bodyB.position.x - Math.cos(angle) * separationDistance,
          y: bodyB.position.y - Math.sin(angle) * separationDistance,
        });
        return;
      }
      
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Apply bounce with restitution
      const restitution = 0.6;
      const relativeVelX = velA.x - velB.x;
      const relativeVelY = velA.y - velB.y;
      const relativeVelNormal = relativeVelX * nx + relativeVelY * ny;
      
      if (relativeVelNormal > 0) return; // Bodies moving apart
      
      // Calculate impulse
      const impulse = -(1 + restitution) * relativeVelNormal;
      const impulseX = impulse * nx;
      const impulseY = impulse * ny;
      
      // Apply impulse to both bodies
      Matter.Body.setVelocity(bodyA, {
        x: velA.x - impulseX * 0.5,
        y: velA.y - impulseY * 0.5,
      });
      
      Matter.Body.setVelocity(bodyB, {
        x: velB.x + impulseX * 0.5,
        y: velB.y + impulseY * 0.5,
      });
    } catch (error) {
      console.error('Error in collision handling:', error);
      // Log error details for debugging
      console.error('Body A:', bodyA.position, 'Body B:', bodyB.position);
    }
  }

  /**
   * Start the physics simulation loop
   */
  start(): void {
    if (this.animationFrameId !== null) {
      return; // Already running
    }

    this.lastUpdateTime = performance.now();
    this.update();
  }

  /**
   * Stop the physics simulation loop
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main update loop synchronized with React
   */
  private update = (): void => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;

    // Limit to 60fps
    if (deltaTime >= this.frameTime) {
      try {
        // Check if any bodies are awake (moving)
        const hasAwakeBodies = Array.from(this.bodies.values()).some(
          body => !body.isSleeping && !this.disabledBodies.has(body.label)
        );
        
        // Only update physics if there are awake bodies
        if (hasAwakeBodies) {
          // Update viewport-based optimizations
          this.updateVisibility();
          
          // Update physics engine
          Matter.Engine.update(this.engine, this.frameTime);

          // Sync physics positions back to React state
          this.syncPositions();
        }

        this.lastUpdateTime = currentTime - (deltaTime % this.frameTime);
      } catch (error) {
        console.error('Physics engine error:', error);
        // Continue running despite errors
        // Attempt to recover by clearing and rebuilding world
        this.handlePhysicsError(error);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.update);
  };
  
  /**
   * Handle physics engine errors
   */
  private handlePhysicsError(error: any): void {
    console.error('Attempting to recover from physics error:', error);
    
    try {
      // Store current note states before clearing
      const noteStates = new Map<string, { x: number; y: number }>();
      this.bodies.forEach((body, noteId) => {
        noteStates.set(noteId, { x: body.position.x, y: body.position.y });
      });
      
      // Clear all bodies
      const bodyIds = Array.from(this.bodies.keys());
      bodyIds.forEach(id => {
        const body = this.bodies.get(id);
        if (body) {
          Matter.World.remove(this.world, body, true);
        }
      });
      
      this.bodies.clear();
      this.disabledBodies.clear();
      
      // Note: Bodies will be rebuilt from React state on next render
      // The physics context will call addOrUpdateNote for each note
      console.log('Physics engine cleared, waiting for state re-sync');
    } catch (recoveryError) {
      console.error('Failed to recover from physics error:', recoveryError);
      // Stop physics simulation
      this.stop();
    }
  }

  /**
   * Sync physics body positions back to React state
   */
  private syncPositions(): void {
    try {
      const now = performance.now();
      
      this.bodies.forEach((body, noteId) => {
        try {
          // Skip disabled bodies
          if (this.disabledBodies.has(noteId)) {
            return;
          }
          
          // Only update if body is moving
          const velocity = Matter.Body.getVelocity(body);
          const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

          // Throttle position updates to max 10 per second per note
          const lastUpdate = this.lastPositionUpdateTime.get(noteId) || 0;
          const timeSinceLastUpdate = now - lastUpdate;
          
          // Send update if:
          // 1. Moving faster than threshold AND
          // 2. Enough time has passed since last update OR velocity is very high (final position)
          if (speed > this.velocityThreshold) {
            if (timeSinceLastUpdate >= this.positionUpdateThrottle) {
              this.onPositionUpdate(noteId, body.position.x, body.position.y);
              this.lastPositionUpdateTime.set(noteId, now);
            }
          } else if (speed > 0.1 && speed <= this.velocityThreshold) {
            // Send final position when note stops moving
            if (timeSinceLastUpdate >= this.positionUpdateThrottle) {
              this.onPositionUpdate(noteId, body.position.x, body.position.y);
              this.lastPositionUpdateTime.set(noteId, now);
            }
          }
        } catch (error) {
          console.error(`Error syncing position for note ${noteId}:`, error);
          // Continue with other notes
        }
      });
    } catch (error) {
      console.error('Error in syncPositions:', error);
    }
  }
  
  /**
   * Update viewport bounds for optimization
   */
  setViewportBounds(bounds: ViewportBounds): void {
    this.viewportBounds = bounds;
  }
  
  /**
   * Update visibility and disable off-screen physics
   */
  private updateVisibility(): void {
    if (!this.viewportBounds) return;
    
    const buffer = 500; // Buffer zone around viewport
    
    this.bodies.forEach((body, noteId) => {
      const isVisible = this.isBodyVisible(body, buffer);
      const isDisabled = this.disabledBodies.has(noteId);
      
      if (!isVisible && !isDisabled) {
        // Disable physics for off-screen body
        Matter.Body.setStatic(body, true);
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        this.disabledBodies.add(noteId);
      } else if (isVisible && isDisabled) {
        // Re-enable physics for on-screen body
        Matter.Body.setStatic(body, false);
        this.disabledBodies.delete(noteId);
      }
    });
  }
  
  /**
   * Check if a body is visible in the viewport
   */
  private isBodyVisible(body: Matter.Body, buffer: number): boolean {
    if (!this.viewportBounds) return true;
    
    const bounds = body.bounds;
    
    return !(
      bounds.max.x < this.viewportBounds.minX - buffer ||
      bounds.min.x > this.viewportBounds.maxX + buffer ||
      bounds.max.y < this.viewportBounds.minY - buffer ||
      bounds.min.y > this.viewportBounds.maxY + buffer
    );
  }

  /**
   * Create or update a physics body for a note
   */
  addOrUpdateNote(note: Note): void {
    try {
      const existingBody = this.bodies.get(note.id);

      if (existingBody) {
        // Update existing body position
        Matter.Body.setPosition(existingBody, { x: note.x, y: note.y });
      } else {
        // Create new physics body
        const body = Matter.Bodies.rectangle(
          note.x,
          note.y,
          note.width,
          note.height,
          {
            friction: 0.1,
            frictionAir: 0.05,
            restitution: 0.6, // Bounciness
            density: 0.001,
            label: note.id,
            // Enable collision detection
            collisionFilter: {
              category: 0x0001,
              mask: 0x0001,
            },
            // Enable sleeping for performance
            sleepThreshold: 60,
          }
        );

        Matter.World.add(this.world, body);
        this.bodies.set(note.id, body);
      }
    } catch (error) {
      console.error(`Error adding/updating physics body for note ${note.id}:`, error);
    }
  }

  /**
   * Remove a physics body for a deleted note
   */
  removeNote(noteId: string): void {
    const body = this.bodies.get(noteId);
    if (body) {
      Matter.World.remove(this.world, body);
      this.bodies.delete(noteId);
    }
  }

  /**
   * Apply velocity to a note when released after drag
   */
  applyMomentum(noteId: string, velocityX: number, velocityY: number): void {
    try {
      const body = this.bodies.get(noteId);
      if (body) {
        Matter.Body.setVelocity(body, { x: velocityX, y: velocityY });
      }
    } catch (error) {
      console.error(`Error applying momentum to note ${noteId}:`, error);
    }
  }

  /**
   * Set a note's position (used during dragging)
   */
  setNotePosition(noteId: string, x: number, y: number): void {
    try {
      const body = this.bodies.get(noteId);
      if (body) {
        Matter.Body.setPosition(body, { x, y });
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
      }
    } catch (error) {
      console.error(`Error setting position for note ${noteId}:`, error);
    }
  }

  /**
   * Make a note static (disable physics) during dragging
   */
  setNoteStatic(noteId: string, isStatic: boolean): void {
    try {
      const body = this.bodies.get(noteId);
      if (body) {
        Matter.Body.setStatic(body, isStatic);
      }
    } catch (error) {
      console.error(`Error setting static state for note ${noteId}:`, error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
    this.bodies.clear();
  }
}
