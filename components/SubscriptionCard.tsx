import React from 'react';
import { ExternalLink, Edit2, Trash2, AlertCircle, CheckCircle, Clock, Power } from 'lucide-react';
import { SubWithDerivedStats } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface SubscriptionCardProps {
  sub: SubWithDerivedStats;
  onEdit: (sub: SubWithDerivedStats) => void;
  onDelete: (id: string) => void;
  onPay: (sub: SubWithDerivedStats) => void;
  onToggleActive: (id: string) => void;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ sub, onEdit, onDelete, onPay, onToggleActive }) => {
  const getStatusColor = (status: string) => {
    if (status === 'disabled') return 'border-gray-200 bg-gray-50 opacity-75';
    switch(status) {
      case 'overdue': return 'border-red-500 bg-red-50';
      case 'soon': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-transparent bg-white hover:border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'disabled') return <Power className="text-gray-400" size={18} />;
    switch(status) {
      case 'overdue': return <AlertCircle className="text-red-500" size={18} />;
      case 'soon': return <Clock className="text-yellow-600" size={18} />;
      default: return <CheckCircle className="text-green-500" size={18} />;
    }
  };

  const getStatusText = (status: string, days: number) => {
     if (status === 'disabled') return 'Отключено';
     if (status === 'overdue') return `Просрочено на ${Math.abs(days)} дн.`;
     if (status === 'soon') return `Оплата через ${days} дн.`;
     return `Активно (${days} дн.)`;
  };

  return (
    <div className={`relative rounded-xl p-5 border-l-4 shadow-sm transition-all duration-200 hover:shadow-md ${getStatusColor(sub.status)} group ${sub.active ? 'bg-white' : 'bg-gray-50'}`}>
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-3">
          <div 
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm ${!sub.active ? 'grayscale opacity-50' : ''}`}
            style={{ backgroundColor: sub.color }}
          >
            {sub.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className={`font-bold leading-tight ${!sub.active ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
              {sub.name}
            </h3>
            {sub.url && sub.active && (
              <a href={sub.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center mt-0.5">
                Перейти <ExternalLink size={10} className="ml-1" />
              </a>
            )}
          </div>
        </div>
        <div className="text-right">
           <p className={`font-bold ${!sub.active ? 'text-gray-400' : 'text-gray-900'}`}>{formatCurrency(sub.price, sub.currency)}</p>
           <p className="text-xs text-gray-500">
             {sub.periodValue === 1 && sub.periodUnit === 'month' ? 'ежемесячно' : 
              sub.periodValue === 1 && sub.periodUnit === 'year' ? 'ежегодно' :
              `каждые ${sub.periodValue} ${sub.periodUnit === 'day' ? 'дн.' : sub.periodUnit === 'month' ? 'мес.' : 'лет'}`}
           </p>
        </div>
      </div>

      {sub.description && (
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{sub.description}</p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100/50">
        <div className="flex items-center space-x-2 text-sm font-medium">
          {getStatusIcon(sub.status)}
          <span className={`${
            sub.status === 'disabled' ? 'text-gray-400' : 
            sub.status === 'overdue' ? 'text-red-600' : 
            sub.status === 'soon' ? 'text-yellow-700' : 
            'text-gray-600'
          }`}>
            {getStatusText(sub.status, sub.daysLeft)}
          </span>
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Списание: <span className="text-gray-700">{formatDate(sub.paidUntil)}</span>
        </div>
      </div>

      {/* Action Overlay: Visible by default on mobile (opacity-100), Hidden on desktop until hover (md:opacity-0 md:group-hover:opacity-100) */}
      <div className="absolute top-2 right-2 flex space-x-1 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleActive(sub.id); }}
          title={sub.active ? "Отключить" : "Включить"}
          className={`p-2 rounded-lg transition ${sub.active ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
        >
          <Power size={16} />
        </button>
        {sub.active && (
          <button 
            onClick={(e) => { e.stopPropagation(); onPay(sub); }}
            title="Продлить (оплачено)"
            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
          >
            <CheckCircle size={16} />
          </button>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(sub); }} 
          className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          <Edit2 size={16} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(sub.id); }} 
          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default SubscriptionCard;