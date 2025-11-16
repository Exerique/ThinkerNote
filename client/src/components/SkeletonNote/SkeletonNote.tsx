import React from 'react';
import styles from './SkeletonNote.module.css';

const SkeletonNote: React.FC = () => {
  return (
    <div className={styles.skeletonNote}>
      <div className={styles.header}>
        <div className={styles.headerButtons}>
          <div className={styles.skeletonButton}></div>
          <div className={styles.skeletonButton}></div>
          <div className={styles.skeletonButton}></div>
          <div className={styles.skeletonButton}></div>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.skeletonLine} style={{ width: '90%' }}></div>
        <div className={styles.skeletonLine} style={{ width: '75%' }}></div>
        <div className={styles.skeletonLine} style={{ width: '85%' }}></div>
      </div>
    </div>
  );
};

export default SkeletonNote;
