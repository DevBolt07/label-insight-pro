import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

interface Alert {
  level: 'low' | 'medium' | 'high';
  message: string;
  alert_type: string;
}

interface AlertCardProps {
  alerts: Alert[];
}

export const AlertCard: React.FC<AlertCardProps> = ({ alerts }) => {
  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertStyle = (level: string) => {
    switch (level) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-4">
        <div className="flex items-center">
          <Info className="h-5 w-5 text-green-500 mr-2" />
          <span className="text-green-800">✅ This product looks safe based on your health profile</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Health Alerts</h3>
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`border rounded-lg p-4 ${getAlertStyle(alert.level)}`}
        >
          <div className="flex items-start">
            {getAlertIcon(alert.level)}
            <span className="ml-2 text-sm font-medium">{alert.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
};