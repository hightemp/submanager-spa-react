import React, { useRef } from 'react';
import { X, Download, Upload, DollarSign, Save } from 'lucide-react';
import { AppSettings, Subscription, ExportData } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  subscriptions: Subscription[];
  onImport: (data: ExportData) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdateSettings, 
  subscriptions, 
  onImport 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const data: ExportData = {
      version: 1,
      timestamp: new Date().toISOString(),
      settings,
      subscriptions
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submanager-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Basic validation
        if (json.subscriptions && Array.isArray(json.subscriptions) && json.settings) {
          if (confirm(`Найдено ${json.subscriptions.length} подписок от ${new Date(json.timestamp).toLocaleDateString()}. Заменить текущие данные?`)) {
            onImport(json as ExportData);
            onClose();
          }
        } else {
          alert('Ошибка: Неверный формат файла');
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка при чтении файла');
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Настройки</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Section: Currency */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Валюта</h3>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Курс Доллара (USD → RUB)</label>
              <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-400 transition">
                <DollarSign size={18} className="text-gray-400" />
                <input 
                  type="number" 
                  value={settings.exchangeRate}
                  onChange={(e) => onUpdateSettings({...settings, exchangeRate: parseFloat(e.target.value) || 0})}
                  className="w-full py-2 px-2 outline-none text-gray-800 font-medium"
                  placeholder="90"
                />
                <span className="text-sm text-gray-400 font-medium">RUB</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Используется для конвертации стоимости иностранных сервисов.</p>
            </div>
          </div>

          {/* Section: Data */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Управление данными</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleExport}
                className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition group"
              >
                <Download size={24} className="mb-2 text-gray-500 group-hover:text-blue-600" />
                <span className="font-medium text-sm">Экспорт</span>
                <span className="text-[10px] text-gray-400 mt-1">Скачать JSON</span>
              </button>

              <button 
                onClick={handleImportClick}
                className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition group"
              >
                <Upload size={24} className="mb-2 text-gray-500 group-hover:text-green-600" />
                <span className="font-medium text-sm">Импорт</span>
                <span className="text-[10px] text-gray-400 mt-1">Загрузить JSON</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">Импорт полностью заменит текущие подписки.</p>
          </div>

        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium shadow-lg shadow-blue-500/30"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;