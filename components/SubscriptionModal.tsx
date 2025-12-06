import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { Subscription, PeriodUnit, Currency } from '../types';
import { generateId, getRandomColor, getTodayString } from '../utils';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sub: Subscription) => void;
  initialData?: Subscription | null;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Partial<Subscription>>({
    currency: 'RUB',
    periodUnit: 'month',
    periodValue: 1,
    price: 0,
    name: '',
    paidUntil: getTodayString(),
    url: '',
    description: '',
    active: true
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
            id: generateId(),
            name: '',
            price: 0,
            currency: 'RUB',
            periodUnit: 'month',
            periodValue: 1,
            paidUntil: getTodayString(),
            url: '',
            description: '',
            color: getRandomColor(),
            active: true
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Subscription);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">
            {initialData ? 'Редактировать сервис' : 'Новая подписка'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          <form id="subForm" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Active Toggle */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
               <span className="text-sm font-medium text-gray-700">Активная подписка</span>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.active} 
                    onChange={e => setFormData({...formData, active: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название сервиса</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                placeholder="Netflix, Spotify..."
              />
            </div>

            {/* Price & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Стоимость</label>
                <input 
                  required
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Валюта</label>
                <select 
                  value={formData.currency}
                  onChange={e => setFormData({...formData, currency: e.target.value as Currency})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition bg-white"
                >
                  <option value="RUB">RUB (₽)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Periodicity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Периодичность оплаты</label>
              <div className="flex space-x-2">
                 <input 
                  type="number"
                  min="1"
                  value={formData.periodValue}
                  onChange={e => setFormData({...formData, periodValue: parseInt(e.target.value) || 1})}
                  className="w-20 px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                 />
                 <select 
                  value={formData.periodUnit}
                  onChange={e => setFormData({...formData, periodUnit: e.target.value as PeriodUnit})}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition bg-white"
                >
                  <option value="month">Месяц(ев)</option>
                  <option value="year">Год(лет)</option>
                  <option value="day">Дней</option>
                </select>
              </div>
            </div>

            {/* Paid Until */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Дата следующего списания</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                  required
                  type="date"
                  value={formData.paidUntil}
                  onChange={e => setFormData({...formData, paidUntil: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition font-medium"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">День, когда нужно произвести следующую оплату</p>
            </div>

            {/* Extra Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сайт (опционально)</label>
              <input 
                type="url"
                value={formData.url || ''}
                onChange={e => setFormData({...formData, url: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание / Заметки</label>
              <textarea 
                rows={3}
                value={formData.description || ''}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition resize-none"
              />
            </div>

          </form>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition font-medium"
          >
            Отмена
          </button>
          <button 
            type="submit"
            form="subForm"
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 font-medium"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;