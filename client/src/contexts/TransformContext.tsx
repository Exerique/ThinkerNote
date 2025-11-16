import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TransformState {
  scale: number;
  positionX: number;
  positionY: number;
}

interface TransformContextType {
  transformState: TransformState;
  setTransformState: (state: TransformState) => void;
  screenToBoard: (screenX: number, screenY: number) => { x: number; y: number };
  boardToScreen: (boardX: number, boardY: number) => { x: number; y: number };
}

const TransformContext = createContext<TransformContextType | null>(null);

export const useTransform = () => {
  const context = useContext(TransformContext);
  if (!context) {
    // Return identity transform if not in context
    return {
      transformState: { scale: 1, positionX: 0, positionY: 0 },
      setTransformState: () => {},
      screenToBoard: (x: number, y: number) => ({ x, y }),
      boardToScreen: (x: number, y: number) => ({ x, y }),
    };
  }
  return context;
};

interface TransformProviderProps {
  children: ReactNode;
}

export const TransformProvider: React.FC<TransformProviderProps> = ({ children }) => {
  const [transformState, setTransformState] = useState<TransformState>({
    scale: 1,
    positionX: 0,
    positionY: 0,
  });

  const screenToBoard = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - transformState.positionX) / transformState.scale,
      y: (screenY - transformState.positionY) / transformState.scale,
    };
  }, [transformState]);

  const boardToScreen = useCallback((boardX: number, boardY: number) => {
    return {
      x: boardX * transformState.scale + transformState.positionX,
      y: boardY * transformState.scale + transformState.positionY,
    };
  }, [transformState]);

  const value: TransformContextType = {
    transformState,
    setTransformState,
    screenToBoard,
    boardToScreen,
  };

  return (
    <TransformContext.Provider value={value}>
      {children}
    </TransformContext.Provider>
  );
};
