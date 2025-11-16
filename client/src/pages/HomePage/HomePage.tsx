import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import styles from './HomePage.module.css';

const HomePage: React.FC = () => {
  const { boards } = useApp();
  const navigate = useNavigate();

  // Auto-navigate to first board if available
  React.useEffect(() => {
    if (boards.length > 0) {
      navigate(`/board/${boards[0].id}`);
    }
  }, [boards, navigate]);

  return (
    <div className={styles.homePage}>
      <div className={styles.content}>
        <h1>Collaborative Note Board</h1>
        <p>Create a board to get started</p>
      </div>
    </div>
  );
};

export default HomePage;
