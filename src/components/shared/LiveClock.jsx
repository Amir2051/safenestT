import React, { useState, useEffect } from 'react';
import { getCurrentTimestamp } from '@/components/shared/timeUtils';

const LiveClock = ({ label = "", className = "" }) => {
  const [time, setTime] = useState(getCurrentTimestamp());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getCurrentTimestamp());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className={className}>
      {label}{time}
    </span>
  );
};

export default LiveClock;