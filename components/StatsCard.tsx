import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  colorClass: string;
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, colorClass, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-cyber-800 border border-cyber-700 rounded-xl p-5 shadow-lg relative overflow-hidden group transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-blue-500/10' : ''}`}
    >
      <div className={`absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
        {trend && (
          <p className="text-xs mt-2 text-slate-500 flex items-center">
            {trend}
          </p>
        )}
      </div>
      <div className={`h-1 w-full absolute bottom-0 left-0 bg-gradient-to-r from-transparent via-${colorClass.replace('text-', 'bg-')} to-transparent opacity-50`} />
    </div>
  );
};

export default StatsCard;