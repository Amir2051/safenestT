import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AdminKeyEntry from './AdminKeyEntry';

const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes

export default function AdminGate({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();
  const timeoutRef = useRef(null);

  useEffect(() => {
    const checkAuth = () => {
      const authTime = sessionStorage.getItem('admin_auth_time');
      if (authTime) {
        const timeElapsed = Date.now() - parseInt(authTime, 10);
        if (timeElapsed < INACTIVITY_LIMIT) {
          setIsAuthorized(true);
          resetInactivityTimer(); // Refresh timer on page load if still valid
        } else {
          sessionStorage.removeItem('admin_auth_time');
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
      setIsChecking(false);
    };

    checkAuth();

    // Setup activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const resetTimer = () => resetInactivityTimer();
    
    events.forEach(event => document.addEventListener(event, resetTimer));

    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [location.pathname]);

  const resetInactivityTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Only update storage if currently authorized
    if (sessionStorage.getItem('admin_auth_time')) {
        sessionStorage.setItem('admin_auth_time', Date.now().toString());
        
        timeoutRef.current = setTimeout(() => {
            sessionStorage.removeItem('admin_auth_time');
            setIsAuthorized(false);
        }, INACTIVITY_LIMIT);
    }
  };

  const handleAuthorized = () => {
    sessionStorage.setItem('admin_auth_time', Date.now().toString());
    setIsAuthorized(true);
    resetInactivityTimer();
  };

  if (isChecking) return null; // Or a loading spinner

  if (!isAuthorized) {
    return <AdminKeyEntry onAuthorized={handleAuthorized} />;
  }

  return <>{children}</>;
}