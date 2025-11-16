import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage/HomePage';
import BoardPage from './pages/BoardPage/BoardPage';

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const { setBoards } = useApp();

  useEffect(() => {
    // Fetch initial boards from API
    const fetchBoards = async () => {
      try {
        const response = await fetch('/api/boards');
        if (response.ok) {
          const data = await response.json();
          setBoards(data);
        }
      } catch (error) {
        console.error('Failed to fetch boards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoards();
  }, [setBoards]);

  if (isLoading) {
    return <LoadingSpinner message="Loading boards..." />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="board/:boardId" element={<BoardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <WebSocketProvider>
          <AppContent />
        </WebSocketProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
