import { useState, useEffect } from 'react';
import { listenToNotifications, markAsRead, clearAllNotifications } from '../services/notificationService';
import './NotificationPanel.css';

const NotificationPanel = ({ userId, showPanel, setShowPanel: setShowPanelProp }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [internalShow, setInternalShow] = useState(false);

  const isControlled = showPanel !== undefined;
  const panelVisible = isControlled ? showPanel : internalShow;
  const setShowPanel = isControlled ? setShowPanelProp : setInternalShow;

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = listenToNotifications(userId, (notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    return () => unsubscribe();
  }, [userId]);

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
  };

  const handleClearAll = async () => {
    if (userId) await clearAllNotifications(userId);
  };

  const getIcon = (type) => {
    const icons = {
      prescription_approved: '✅',
      prescription_rejected: '❌',
      prescription_added: '📝',
      withdrawal_ending: '⏰',
      withdrawal_completed: '✅',
      withdrawal_active: '⚠️',
      medication_reminder: '💊',
      treatment_due: '📅',
      treatment_completed: '✅',
      doctor_responded: '👨‍⚕️',
      consultation_scheduled: '📞',
      consultation_completed: '✅',
      animal_sold: '💰',
      payment_received: '📦',
      consultation_request: '🔔',
      urgent_case: '🚨',
      pending_consultations: '📊',
      prescription_pending: '⏰',
      bulk_prescriptions: '📋',
      followup_due: '🩺',
      treatment_ending: '📅',
      new_animals: '🐔',
      withdrawal_free: '✅',
      certified_animals: '💚',
      purchase_confirmed: '✅',
      order_ready: '📦',
      certificate_generated: '📄',
      verification_complete: '✅',
      certificate_ready: '📄'
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="notification-container">
      <button className="notification-bell" onClick={() => setShowPanel(!panelVisible)}>
        🔔
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {panelVisible && (
        <div className="notification-panel">
          <div className="notification-header">
            <div className="notification-header-left">
              <h3>Notifications</h3>
              {notifications.length > 0 && (
                <span className="notification-count-chip">{notifications.length}</span>
              )}
            </div>
            <div className="notification-header-actions">
              {notifications.length > 0 && (
                <button className="notification-clear-btn" onClick={handleClearAll}>
                  Clear all
                </button>
              )}
              <button className="notification-close-btn" onClick={() => setShowPanel(false)}>
                ✕
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="no-notifications">No notifications yet</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.read ? 'unread' : ''}`}
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  <span className="notification-icon">{getIcon(notif.type)}</span>
                  <div className="notification-content">
                    <h4>{notif.title}</h4>
                    <p>{notif.message}</p>
                    <span className="notification-time">
                      {notif.createdAt?.toDate().toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <span className="notification-footer-text">
                Click a notification to mark as read
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;