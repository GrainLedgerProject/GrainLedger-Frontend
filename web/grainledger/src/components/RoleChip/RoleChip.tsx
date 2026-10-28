import { useUiStore } from '@/app/store/uiStore';
import type { UserRole } from '@/shared/types/roles';
import { ROLE_DEFINITIONS } from '@/shared/types/roles';
import React from 'react';

export interface RoleChipProps {
  role: UserRole;
  showCode?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const RoleChip: React.FC<RoleChipProps> = ({
  role,
  showCode = false,
  size = 'md',
  className = '',
}) => {
  const language = useUiStore((state) => state.language);
  const def = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.MILL_OPERATOR;
  const label = language === 'vi' ? def.labelVi : def.labelEn;

  // Side-based color themes
  const sideStyles = {
    MILL: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30',
    CUSTOMER: 'bg-accent-info/10 text-accent-info border-accent-info/30',
    QUALIFIED_ACCESS: 'bg-accent-warning/10 text-accent-warning border-accent-warning/30',
  };

  const currentSideStyle = sideStyles[def.side];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${currentSideStyle} ${sizeClasses} select-none ${className}`}
      title={`${def.side}: ${label}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          def.side === 'MILL'
            ? 'bg-accent-primary'
            : def.side === 'CUSTOMER'
            ? 'bg-accent-info'
            : 'bg-functional-stale-bg0'
        }`}
      />
      {showCode && <span className="font-mono font-bold">[{def.code}]</span>}
      <span>{label}</span>
    </span>
  );
};
