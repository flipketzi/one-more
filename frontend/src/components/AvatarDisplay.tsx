import React from 'react';
import { AVATARS } from '../types';

interface Props {
  avatarId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRing?: boolean;
}

const SIZE_MAP = {
  sm:  'w-9 h-9 text-lg',
  md:  'w-12 h-12 text-2xl',
  lg:  'w-16 h-16 text-3xl',
  xl:  'w-20 h-20 text-4xl',
};

export const AvatarDisplay: React.FC<Props> = ({ avatarId, size = 'md', showRing = false }) => {
  const avatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0];
  const sizeClass = SIZE_MAP[size];

  return (
    <div
      className={`
        ${sizeClass} rounded-full flex items-center justify-center
        bg-gradient-to-br ${avatar.bg} flex-shrink-0
        ${showRing ? `ring-2 ${avatar.ring} ring-offset-2 ring-offset-transparent` : ''}
      `}
    >
      <span role="img" aria-label={avatar.label} className="select-none leading-none">
        {avatar.emoji}
      </span>
    </div>
  );
};
