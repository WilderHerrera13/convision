import React from 'react';
import { Glasses, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({
  message = 'Cerrando sesión...',
  className,
  fullScreen = true
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-white',
        fullScreen && 'fixed inset-0 z-50',
        className
      )}
    >
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-16 w-16 text-convision-primary animate-spin opacity-25" />
          </div>
          <div className="relative flex items-center justify-center p-4">
            <Glasses className="h-12 w-12 text-convision-primary animate-pulse" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-convision-primary mb-2">Convision</h2>
        <p className="text-lg text-slate-600 mb-6">{message}</p>
        <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-convision-primary animate-progress"></div>
        </div>
      </div>
    </div>
  );
} 