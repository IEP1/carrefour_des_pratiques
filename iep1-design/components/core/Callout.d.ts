import React from 'react';
export interface CalloutProps {
  title?: string;
  children: React.ReactNode;
  /** Default 'info'. */
  tone?: 'info' | 'warning' | 'success';
}
