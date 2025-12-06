import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Settings as SettingsIcon, LayoutDashboard, List, BarChart2, LayoutGrid, Table as TableIcon, CheckCircle, Edit2, Trash2, Power, AlertCircle } from 'lucide-react';
import { Subscription, AppSettings, SubWithDerivedStats, ExportData } from './types';
import { enrichSubscription, formatDate, formatCurrency, getLocalDateFromString, formatLocalDateToString } from './utils';
import SubscriptionModal from './components/SubscriptionModal';
import SubscriptionCard from './components/SubscriptionCard';
import StatsView from './components/StatsView';
import AIChat from './components/AIChat';
import SettingsModal from './components/SettingsModal';

function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ exchangeRate: 90 });
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // --- Persistence ---
  useEffect(() => {
    const storedSubs = localStorage.getItem('subs_data');
    const storedSettings = localStorage.getItem('subs_settings');
    const storedViewMode = localStorage.getItem('subs_view_mode');
    
    if (storedSubs) {
      try {
        const parsed = JSON.parse(storedSubs);
        // Migration: Ensure active field exists
        const migrated = parsed.map((s: any) => ({ ...s, active: s.active ?? true }));
        setSubscriptions(migrated);
      } catch (e) { console.error("Failed to parse subs", e); }
    }
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) { console.error("Failed to parse settings", e); }
    }
    if (storedViewMode && (storedViewMode === 'grid' || storedViewMode === 'table')) {
      setViewMode(storedViewMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('subs_data', JSON.stringify(subscriptions));
  }, [subscriptions]);

  useEffect(() => {
    localStorage.setItem('subs_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('subs_view_mode', viewMode);
  }, [viewMode]);

  // --- Derived Data ---
  const enrichedSubs: SubWithDerivedStats[] = useMemo(() => {
    return subscriptions
      .map(sub => enrichSubscription(sub, settings.exchangeRate))
      .sort((a, b) => {
        // Sort active first, then by days left
        if (a.active === b.active) {
            return a.daysLeft - b.daysLeft;
        }
        return a.active ? -1 : 1;
      });
  }, [subscriptions, settings.exchangeRate]);

  // Filtered for Stats (only active)
  const activeEnrichedSubs = useMemo(() => {
    return enrichedSubs.filter(sub => sub.active);
  }, [enrichedSubs]);

  // --- Handlers ---
  const handleSaveSubscription = (sub: Subscription) => {
    if (editingSub) {
      setSubscriptions(prev => prev.map(s => s.id === sub.id ? sub : s));
    } else {
      // Check if sub with this ID already exists (from AI adding existing id? unlikely with generateId, but logic safety)
      const exists = subscriptions.some(s => s.id === sub.id);
      if (exists) {
         setSubscriptions(prev => prev.map(s => s.id === sub.id ? sub : s));
      } else {
         setSubscriptions(prev => [...prev, sub]);
      }
    }
    setEditingSub(null);
  };

  const handleAiAdd = (sub: Subscription) => {
    setSubscriptions(prev => [...prev, sub]);
  };

  const handleAiUpdate = (sub: Subscription) => {
    setSubscriptions(prev => prev.map(s => s.id === sub.id ? sub : s));
  };

  const handleDelete = (id: string) => {
    setSubscriptions(prev => prev.filter(s => s.id !== id));
  };
  
  const handleUiDelete = (id: string) => {
     if (confirm('Вы уверены, что хотите удалить эту подписку?')) {
        handleDelete(id);
     }
  }

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setIsModalOpen(true);
  };

  const handleToggleActive = (id: string) => {
    setSubscriptions(prev => prev.map(s => 
        s.id === id ? { ...s, active: !s.active } : s
    ));
  };

  const handlePay = (sub: Subscription) => {
    // 1. Parse using local date helper to avoid Timezone offsets
    const currentDate = getLocalDateFromString(sub.paidUntil);

    // 2. Add duration
    if (sub.periodUnit === 'month') {
      currentDate.setMonth(currentDate.getMonth() + sub.periodValue);
    } else if (sub.periodUnit === 'year') {
      currentDate.setFullYear(currentDate.getFullYear() + sub.periodValue);
    } else if (sub.periodUnit === 'day') {
      currentDate.setDate(currentDate.getDate() + sub.periodValue);
    }

    // 3. Format back to YYYY-MM-DD
    const nextPaymentDate = formatLocalDateToString(currentDate);

    // 4. Create clean object (removing derived stats if present)
    const updated: Subscription = {
      id: sub.id,
      name: sub.name,
      price: sub.price,
      currency: sub.currency,
      periodUnit: sub.periodUnit,
      periodValue: sub.periodValue,
      paidUntil: nextPaymentDate,
      url: sub.url,
      description: sub.description,
      color: sub.color,
      active: sub.active
    };

    if (confirm(`Подтвердить оплату?\nСледующее списание: ${formatDate(updated.paidUntil)}`)) {
        setSubscriptions(prev => prev.map(s => s.id === sub.id ? updated : s));
    }
  };

  const handleImportData = (data: ExportData) => {
    // Ensure all subs have active field
    const cleanSubs = data.subscriptions.map(s => ({...s, active: s.active ?? true}));
    setSubscriptions(cleanSubs);
    setSettings(data.settings);
  };

  const totalMonthlyRub = activeEnrichedSubs.reduce((acc, s) => acc + s.monthlyCostRub, 0);

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64">
      {/* --- Sidebar (Desktop) --- */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 hidden md:flex flex-col z-20">
        <div className="p-6">
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-2xl">
            <LayoutDashboard />
            <span>SubManager</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('list')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'list' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <List size={20} />
            <span>Мои подписки</span>
          </button>
          <button 
             onClick={() => setActiveTab('stats')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'stats' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <BarChart2 size={20} />
            <span>Статистика</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
           <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition"
           >
              <SettingsIcon size={20} />
              <span>Настройки</span>
           </button>
        </div>
      </aside>

      {/* --- Mobile Header --- */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
         <div className="flex items-center space-x-2 text-blue-600 font-bold text-xl">
            <LayoutDashboard size={24}/>
            <span>SubManager</span>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-600 active:bg-gray-100 rounded-full transition">
            <SettingsIcon size={24} />
          </button>
      </header>
      
      {/* --- Main Content --- */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{activeTab === 'list' ? 'Мои подписки' : 'Аналитика'}</h1>
            <p className="text-gray-500 mt-1">Активных подписок: {activeEnrichedSubs.length} • ~{Math.round(totalMonthlyRub).toLocaleString()} ₽ / мес.</p>
          </div>
          
          {activeTab === 'list' && (
            <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-md transition ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <TableIcon size={20} />
                    </button>
                </div>

                <button 
                onClick={() => { setEditingSub(null); setIsModalOpen(true); }}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition transform active:scale-95"
                >
                <Plus size={20} />
                <span className="hidden md:inline">Добавить</span>
                </button>
            </div>
          )}
        </div>

        {/* Content Render */}
        {activeTab === 'list' ? (
          <>
            {enrichedSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <List size={40} className="text-gray-400" />
                 </div>
                 <h3 className="text-xl font-semibold text-gray-700">Список пуст</h3>
                 <p className="text-gray-500 max-w-sm mt-2">Добавьте свою первую подписку вручную или попросите AI помощника.</p>
                 <button 
                    onClick={() => { setEditingSub(null); setIsModalOpen(true); }}
                    className="mt-6 text-blue-600 font-medium hover:underline"
                 >
                    Добавить подписку
                 </button>
              </div>
            ) : (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {enrichedSubs.map(sub => (
                      <SubscriptionCard 
                        key={sub.id} 
                        sub={sub} 
                        onDelete={handleUiDelete} 
                        onEdit={handleEdit}
                        onPay={handlePay}
                        onToggleActive={handleToggleActive}
                      />
                    ))}
                  </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <th className="px-6 py-4">Сервис</th>
                                    <th className="px-6 py-4">Стоимость</th>
                                    <th className="px-6 py-4">Цикл</th>
                                    <th className="px-6 py-4">След. списание</th>
                                    <th className="px-6 py-4">Статус</th>
                                    <th className="px-6 py-4 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {enrichedSubs.map(sub => (
                                    <tr key={sub.id} className={`hover:bg-gray-50 transition ${!sub.active ? 'opacity-60 bg-gray-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${!sub.active ? 'grayscale' : ''}`} style={{ backgroundColor: sub.color }}>
                                                    {sub.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className={`font-medium text-gray-900 ${!sub.active ? 'line-through text-gray-500' : ''}`}>{sub.name}</div>
                                                    {sub.url && <a href={sub.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Перейти</a>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {formatCurrency(sub.price, sub.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {sub.periodValue} {sub.periodUnit === 'month' ? 'мес.' : sub.periodUnit === 'year' ? 'г.' : 'дн.'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                            {formatDate(sub.paidUntil)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {sub.active ? (
                                                 sub.status === 'overdue' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <AlertCircle size={12} className="mr-1"/> Просрочено
                                                    </span>
                                                 ) : sub.status === 'soon' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        Через {sub.daysLeft} дн.
                                                    </span>
                                                 ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Активно
                                                    </span>
                                                 )
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                                                    Отключено
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                 <button 
                                                    onClick={() => handleToggleActive(sub.id)}
                                                    className={`p-1.5 rounded-md transition ${sub.active ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' : 'text-green-600 hover:bg-green-50'}`}
                                                    title={sub.active ? "Выключить" : "Включить"}
                                                >
                                                    <Power size={18} />
                                                </button>
                                                {sub.active && (
                                                    <button onClick={() => handlePay(sub)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition" title="Оплатить">
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleEdit(sub)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition" title="Изменить">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleUiDelete(sub.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition" title="Удалить">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
          </>
        ) : (
          <StatsView subscriptions={activeEnrichedSubs} />
        )}

      </main>

      {/* --- Mobile Tab Bar --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex md:hidden justify-around py-3 z-30 pb-safe">
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'list' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <List size={24} />
          <span className="text-[10px] font-medium">Подписки</span>
        </button>
        <button 
           onClick={() => { setEditingSub(null); setIsModalOpen(true); }}
           className="bg-blue-600 text-white p-3 rounded-full -mt-6 shadow-lg shadow-blue-500/40 border-4 border-gray-50"
        >
           <Plus size={24} />
        </button>
        <button 
           onClick={() => setActiveTab('stats')}
           className={`flex flex-col items-center space-y-1 ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <BarChart2 size={24} />
          <span className="text-[10px] font-medium">Отчеты</span>
        </button>
      </div>

      <SubscriptionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSubscription}
        initialData={editingSub}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        subscriptions={subscriptions}
        onImport={handleImportData}
      />

      <AIChat
        subscriptions={subscriptions}
        onAdd={handleAiAdd}
        onUpdate={handleAiUpdate}
        onDelete={handleDelete}
        isOpen={isChatOpen}
        onOpen={() => setIsChatOpen(true)}
        onClose={() => setIsChatOpen(false)}
        settings={settings}
      />
    </div>
  );
}

export default App;