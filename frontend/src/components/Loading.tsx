import React from 'react';
import './Loading.css';

interface LoadingProps {
  text?: string;
}

const Loading: React.FC<LoadingProps> = ({ text = 'Loading...' }) => {
  return (
    <div className="loading">
      <div className="loading-spinner"></div>
      <div className="loading-text">{text}</div>
    </div>
  );
};

export default Loading;