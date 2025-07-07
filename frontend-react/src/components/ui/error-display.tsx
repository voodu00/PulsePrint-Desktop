import React from 'react';
import { XCircle, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export type ErrorSeverity = 'error' | 'warning' | 'info';

interface ErrorDisplayProps {
  error: string | null;
  severity?: ErrorSeverity;
  title?: string;
  className?: string;
}

const severityConfig = {
  error: {
    icon: XCircle,
    cardClass:
      'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20',
    textClass: 'text-red-800 dark:text-red-200',
    titleClass: 'text-red-800 dark:text-red-200',
  },
  warning: {
    icon: AlertTriangle,
    cardClass:
      'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20',
    textClass: 'text-yellow-800 dark:text-yellow-200',
    titleClass: 'text-yellow-800 dark:text-yellow-200',
  },
  info: {
    icon: Info,
    cardClass:
      'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20',
    textClass: 'text-blue-800 dark:text-blue-200',
    titleClass: 'text-blue-800 dark:text-blue-200',
  },
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  severity = 'error',
  title,
  className = '',
}) => {
  if (!error) return null;

  const config = severityConfig[severity];
  const Icon = config.icon;
  const displayTitle =
    title ||
    (severity === 'error'
      ? 'Error'
      : severity === 'warning'
        ? 'Warning'
        : 'Information');

  return (
    <Card className={`${config.cardClass} ${className}`}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle
            className={`${config.titleClass} flex items-center gap-2 text-sm`}
          >
            <Icon className="w-4 h-4" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? 'pt-0' : 'p-4'}>
        <div className={`flex items-start gap-2 ${config.textClass}`}>
          {!title && <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <div className="flex-1">
            {!title && <span className="font-medium">{displayTitle}:</span>}{' '}
            <span>{error}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
