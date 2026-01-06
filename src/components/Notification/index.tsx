import { useState, useEffect } from 'react';
import './notification.css';

interface NotificationProps {
  message?: string;
  visible?: boolean;
  duration?: number;
  onClose?: () => void;
}

export default function Notification({ 
  message = "done!", 
  visible = true,
  duration = 3000,
  onClose 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
    
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) {
          setTimeout(onClose, 300); // Wait for animation to complete
        }
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!isVisible && !visible) {
    return null;
  }

  return (
    <div className={`notification ${isVisible ? 'notification-visible' : 'notification-hidden'}`}>
      <div className="notification-content">
        <span className="notification-message">{message}</span>
      </div>
    </div>
  );
}
