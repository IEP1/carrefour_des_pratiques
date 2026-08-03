import React from 'react';
export interface TagProps {
  children: React.ReactNode;
  /** Default 'neutral'. */
  tone?: 'navy' | 'blue' | 'orange' | 'green' | 'neutral';
}
