import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6 w-full">
      {children}
    </div>
  );
}
