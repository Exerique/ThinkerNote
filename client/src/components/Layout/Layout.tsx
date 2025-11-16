import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import { ToastContainer } from '../Toast/Toast';
import { useApp } from '../../contexts/AppContext';
import styles from './Layout.module.css';

const Layout: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <ToastContainer messages={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default Layout;
