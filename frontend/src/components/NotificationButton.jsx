import { useEffect, useRef, useState } from 'react';

const notifications = [
  { title: 'Onboarding completed', detail: 'David Ross is ready for workspace access.', time: '5 min ago', unread: true },
  { title: 'Provisioning needs attention', detail: 'GitHub access failed for one employee.', time: '24 min ago', unread: true },
  { title: 'Directory synchronized', detail: 'Employee records were updated successfully.', time: '1 hr ago', unread: false },
];

function NotificationButton() {
  const [open, setOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div className="notification-control" ref={containerRef}>
      <button className="notification-button" type="button" aria-label="Notifications" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {!allRead && <span className="notification-dot" aria-hidden="true" />}
      </button>

      {open && <section className="notification-dialog" role="dialog" aria-label="Recent notifications">
        <header><div><h2>Notifications</h2><span>{allRead ? 'All caught up' : '2 unread'}</span></div><button type="button" onClick={() => setAllRead(true)}>Mark all read</button></header>
        <div className="notification-list">
          {notifications.map((item) => <article className={!allRead && item.unread ? 'unread' : ''} key={item.title}>
            <i aria-hidden="true" />
            <div><strong>{item.title}</strong><p>{item.detail}</p><time>{item.time}</time></div>
          </article>)}
        </div>
        <footer><button type="button" onClick={() => setOpen(false)}>Close</button></footer>
      </section>}
    </div>
  );
}

export default NotificationButton;
