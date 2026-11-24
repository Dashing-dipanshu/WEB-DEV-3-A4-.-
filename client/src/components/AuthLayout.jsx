import { Logo } from './icons.jsx';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-shell">
      <aside className="auth-art">
        <div className="auth-art-inner">
          <Logo size={56} />
          <h1>ChatBuddy</h1>
          <p>Private chats and group conversations with your classmates, in real time.</p>
          <ul>
            <li>See who is online</li>
            <li>Know when your message is read</li>
            <li>Star messages and search any chat</li>
          </ul>
          <div className="art-bubbles" aria-hidden="true">
            <span className="in">Did you finish the assignment?</span>
            <span className="out">Just submitted it ✓✓</span>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-logo"><Logo size={44} /></div>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          {children}
          <p className="auth-switch">{footer}</p>
        </div>
      </main>
    </div>
  );
}
