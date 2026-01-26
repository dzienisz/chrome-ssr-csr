'use client';

import { useState, useEffect } from 'react';

function getTimeAgo(date: Date): string {
  const now = new Date();
  const totalSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (totalSeconds < 0) return 'just now';

  const days = Math.floor(totalSeconds / 86400);
  if (days >= 1) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return `${parts.join(' ')} ago`;
}

interface LastUpdatedProps {
  timestamp: string | null;
}

export function LastUpdated({ timestamp }: LastUpdatedProps) {
  const [timeAgo, setTimeAgo] = useState('—');

  useEffect(() => {
    if (!timestamp) {
      setTimeAgo('No data yet');
      return;
    }

    const date = new Date(timestamp);
    setTimeAgo(getTimeAgo(date));

    const interval = setInterval(() => {
      setTimeAgo(getTimeAgo(date));
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div className="text-right">
      <div className="text-sm text-gray-500">Last analysis</div>
      <div className="text-sm font-medium text-gray-700">{timeAgo}</div>
    </div>
  );
}
