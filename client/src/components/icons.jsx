const make = (children) =>
  function Icon({ size = 20, ...rest }) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    );
  };

export const SearchIcon = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const StarIcon = make(<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />);
export const LogoutIcon = make(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>);
export const MoonIcon = make(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />);
export const SunIcon = make(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const SendIcon = make(<><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>);
export const BackIcon = make(<path d="m15 18-6-6 6-6" />);
export const ShieldIcon = make(<><path d="M12 3 4 6v6c0 5 3.4 8.5 8 9 4.6-.5 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>);
export const CloseIcon = make(<path d="M18 6 6 18M6 6l12 12" />);
export const UsersIcon = make(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6" /></>);
export const TrashIcon = make(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);

// Message ticks: one tick = sent, two ticks = seen
export const SingleTick = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Sent">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const DoubleTick = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Seen">
    <path d="m1.5 12.5 4.5 4.5L15.5 7.5" />
    <path d="m11 15.5 1.5 1.5L22 7.5" />
  </svg>
);

export const Logo = ({ size = 40 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-label="ChatBuddy">
    <rect width="64" height="64" rx="16" fill="var(--brand)" />
    <path d="M47 31.5a15 15 0 0 1-21.8 13.4L15.5 47.5l2-8.3A15 15 0 1 1 47 31.5z" fill="#fff" />
    <circle cx="25" cy="31.5" r="2.4" fill="var(--brand)" />
    <circle cx="32" cy="31.5" r="2.4" fill="var(--brand)" />
    <circle cx="39" cy="31.5" r="2.4" fill="var(--brand)" />
  </svg>
);
