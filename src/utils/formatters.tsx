import React from 'react';

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatDateDivider = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Hier";
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }
};

export const formatDuration = (seconds: number = 0): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// WhatsApp text markup formatting: *bold*, _italic_, ~strike~, `code`
export const renderFormattedText = (text: string): React.ReactNode => {
  if (!text) return null;

  // Split by URLs first
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, partIdx) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={partIdx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#53bdeb] underline hover:text-[#7fd4f8] break-all inline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }

    // Process WhatsApp Markdown on non-url segments
    // Tokens: *bold*, _italic_, ~strike~, ```code```, `code`
    const regex = /(\*([^*]+)\*|_([^_]+)_|~([^~]+)~|`([^`]+)`)/g;
    const subParts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(part)) !== null) {
      if (match.index > lastIndex) {
        subParts.push(part.substring(lastIndex, match.index));
      }

      const fullMatch = match[0];
      if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
        subParts.push(<strong key={`${partIdx}-${match.index}`} className="font-semibold text-[#f0f2f5]">{match[2]}</strong>);
      } else if (fullMatch.startsWith('_') && fullMatch.endsWith('_')) {
        subParts.push(<em key={`${partIdx}-${match.index}`} className="italic">{match[3]}</em>);
      } else if (fullMatch.startsWith('~') && fullMatch.endsWith('~')) {
        subParts.push(<s key={`${partIdx}-${match.index}`} className="line-through opacity-80">{match[4]}</s>);
      } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
        subParts.push(
          <code key={`${partIdx}-${match.index}`} className="bg-[#111b21]/70 px-1.5 py-0.5 rounded font-mono text-[13px] text-[#25d366]">
            {match[5]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < part.length) {
      subParts.push(part.substring(lastIndex));
    }

    return <React.Fragment key={partIdx}>{subParts}</React.Fragment>;
  });
};
