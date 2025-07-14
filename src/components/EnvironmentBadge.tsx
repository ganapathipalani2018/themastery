'use client';

import { uiConfig, config } from '@/lib/config/environment';

export default function EnvironmentBadge() {
  // Don't show badge in production
  if (!uiConfig.showEnvironmentBadge) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-50 m-2">
      <div className={`
        px-2 py-1 text-xs font-bold text-white rounded shadow-lg
        ${uiConfig.environmentBadgeColor}
      `}>
        {uiConfig.environmentBadgeText}
      </div>
    </div>
  );
} 