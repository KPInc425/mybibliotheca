import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/auth';

const Layout: React.FC = () => {
  const { setUser } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await api.user.getProfile();
        if (res.success && res.data && isMounted) {
          setUser(res.data);
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => { isMounted = false; };
  }, [setUser]);

  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
      
      {/* Main Content */}
      <div className="drawer-content flex flex-col">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 bg-base-100 min-h-screen">
          <Outlet />
        </main>
      </div>
      
      {/* Sidebar */}
      <Sidebar />
    </div>
  );
};

export default Layout; 