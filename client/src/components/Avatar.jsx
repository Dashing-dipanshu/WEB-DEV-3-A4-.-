import { initials } from '../utils.js';

export default function Avatar({ name, color, size = 44, online, group }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: color || 'var(--brand)', fontSize: size * 0.38 }}>
      {group ? '#' : initials(name)}
      {online !== undefined && <i className={`dot ${online ? 'on' : ''}`} />}
    </span>
  );
}
