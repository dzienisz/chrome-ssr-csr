'use client';

import { useState, useEffect } from 'react';

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function LastUpdated() {
  const [loadTime] = useState(() => new Date());
  const [timeAgo, setTimeAgo] = useState('just now');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(getTimeAgo(loadTime));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [loadTime]);

  return (
    <div className="text-right">
      <div className="text-sm text-gray-500">Last updated</div>
      <div className="text-sm font-medium text-gray-700">{timeAgo}</div>
    </div>
  );
}
