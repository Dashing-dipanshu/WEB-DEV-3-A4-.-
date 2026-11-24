import { formatTime } from '../utils.js';
import { DoubleTick, SingleTick, StarIcon } from './icons.jsx';

export default function MessageBubble({ msg, mine, chat, meId, showSender, onStar }) {
  const others = chat.members.length - 1;
  // "Seen" = every other member of the chat has opened it after this message was sent
  const seenCount = (msg.seenBy || []).filter((id) => id !== msg.sender._id).length;
  const seen = others > 0 && seenCount >= others;
  const starred = (msg.starredBy || []).includes(meId);

  return (
    <div className={`row ${mine ? 'mine' : ''}`}>
      <div className="bubble">
        {showSender && <span className="b-sender" style={{ color: msg.sender.avatarColor }}>{msg.sender.name}</span>}
        <span className="b-text">{msg.text}</span>
        <span className="b-meta">
          {starred && <StarIcon size={12} className="b-star-mark" fill="currentColor" />}
          <time>{formatTime(msg.createdAt)}</time>
          {mine && (
            <span
              className={`ticks ${seen ? 'seen' : ''}`}
              title={seen ? 'Seen' : chat.isGroup && seenCount ? `Seen by ${seenCount} of ${others}` : 'Sent'}
            >
              {seen ? <DoubleTick /> : <SingleTick />}
            </span>
          )}
        </span>
        <button className={`star-btn ${starred ? 'on' : ''}`} onClick={onStar} title={starred ? 'Unstar message' : 'Star message'} aria-label="Toggle star">
          <StarIcon size={15} fill={starred ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}
