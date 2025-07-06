import React from 'react';
import { Printer, Activity, AlertCircle } from 'lucide-react';
import { PrinterStatistics } from '../types/printer';

interface StatisticsOverviewProps {
  statistics: PrinterStatistics;
}

interface StatCardProps {
  title: string;
  value: number;
  icon?: React.ReactNode;
  color?: string;
  customIndicator?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = 'text-muted-foreground',
  customIndicator,
}) => {
  return (
    <div className="card">
      <div className="card-content p-4">
        <div className="flex items-center gap-2">
          {customIndicator ||
            (icon && <div className={`w-5 h-5 ${color}`}>{icon}</div>)}
          <div>
            <p
              className={`text-2xl font-bold ${
                color !== 'text-muted-foreground' ? color : ''
              }`}
            >
              {value}
            </p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatisticsOverview: React.FC<StatisticsOverviewProps> = ({
  statistics,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <StatCard
        title="Total Printers"
        value={statistics.total}
        icon={<Printer />}
      />

      <StatCard
        title="Online"
        value={statistics.online}
        icon={<Activity />}
        color="text-green-500"
      />

      <StatCard
        title="Printing"
        value={statistics.printing}
        customIndicator={<div className="w-5 h-5 bg-green-500 rounded-full" />}
        color="text-green-500"
      />

      <StatCard
        title="Idle"
        value={statistics.idle}
        customIndicator={<div className="w-5 h-5 bg-blue-500 rounded-full" />}
        color="text-blue-500"
      />

      <StatCard
        title="Errors"
        value={statistics.error}
        icon={<AlertCircle />}
        color="text-red-500"
      />
    </div>
  );
};

export default StatisticsOverview;
