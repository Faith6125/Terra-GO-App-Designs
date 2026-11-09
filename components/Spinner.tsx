import React from 'react';

export const Spinner: React.FC<{ size?: number; className?: string; }> = ({ size = 20, className = '' }) => (
  <>
    <div
      className={`solid-spinner ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderWidth: `${Math.max(2, size / 8)}px`,
      }}
    />
    <style>{`
      .solid-spinner {
        border-color: transparent;
        border-top-color: currentColor;
        border-style: solid;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </>
);