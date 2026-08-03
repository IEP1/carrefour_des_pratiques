import React from 'react';
export interface StatBlockProps {
  value: string;
  label: string;
  /** Default 'blue'. */
  color?: 'blue' | 'orange' | 'green' | 'navy';
}
