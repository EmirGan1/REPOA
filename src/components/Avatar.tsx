import React from 'react';

interface AvatarProps {
  url?: string | null;
  name?: string;
  color?: string;
  size?: number; // Tailwind class equivalent size mapped (e.g. 10 -> w-10 h-10)
  className?: string;
}

export default function Avatar({ url, name, color, size = 10, className = "" }: AvatarProps) {
  if (url && url !== "null") {
    return (
      <img 
        src={url} 
        alt="avatar" 
        className={`w-${size} h-${size} rounded-full object-cover ${className}`} 
        style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}
      />
    );
  }

  const initials = (name || "?").substring(0, 2).toUpperCase();
  const bgColor = color || 'bg-slate-300';
  
  return (
    <div 
      className={`${bgColor} text-white rounded-full flex items-center justify-center font-bold ${className}`}
      style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem`, fontSize: `${size * 0.1}rem` }}
    >
      {initials}
    </div>
  );
}
