import React from 'react';
import { useApp } from '../../contexts/AppContext';
import styles from './ConnectionStatus.module.css';

const ConnectionStatus: React.FC = () => {
  const { connectionStatus } = useApp();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return styles.connected;
      case 'reconnecting':
        return styles.reconnecting;
      case 'disconnected':
        return styles.disconnected;
      default:
        return styles.disconnected;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`${styles.connectionStatus} ${getStatusColor()}`}>
      <div className={styles.indicator}></div>
      <span className={styles.text}>{getStatusText()}</span>
    </div>
  );
};

export default ConnectionStatus;
