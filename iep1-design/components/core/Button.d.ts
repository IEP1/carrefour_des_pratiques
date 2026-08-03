import React from 'react';
export interface ButtonProps {
  children: React.ReactNode;
  /** Visual style. Default 'primary'. */
  variant?: 'primary' | 'navy' | 'outline' | 'ghost';
  /** Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}
