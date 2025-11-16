import React from 'react';
import { motion } from 'framer-motion';
import styles from './ProgressIndicator.module.css';

interface ProgressIndicatorProps {
  progress?: number; // 0-100, undefined for indeterminate
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  message,
  size = 'medium',
}) => {
  const isIndeterminate = progress === undefined;

  return (
    <div className={`${styles.progressIndicator} ${styles[size]}`}>
      <div className={styles.progressContainer}>
        {isIndeterminate ? (
          <div className={styles.spinner}></div>
        ) : (
          <svg className={styles.progressCircle} viewBox="0 0 36 36">
            <path
              className={styles.progressBackground}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <motion.path
              className={styles.progressBar}
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              initial={{ strokeDasharray: '0, 100' }}
              animate={{ strokeDasharray: `${progress}, 100` }}
              transition={{ duration: 0.3 }}
            />
            <text x="18" y="20.5" className={styles.progressText}>
              {Math.round(progress)}%
            </text>
          </svg>
        )}
      </div>
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};

export default ProgressIndicator;
