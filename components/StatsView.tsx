import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SubWithDerivedStats } from '../types';
import { formatCurrency } from '../utils';

interface StatsViewProps {
  subscriptions: SubWithDerivedStats[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const StatsView: React.FC<StatsViewProps> = ({ subscriptions }) => {
  const totalMonthly = subscriptions.reduce((acc, sub) => acc + sub.monthlyCostRub, 0);
  const totalYearly = totalMonthly * 12;

  const dataByService = subscriptions
    .map(sub => ({
      name: sub.name,
      value: sub.monthlyCostRub
    }))
    .sort((a, b) => b.value - a.value);

  // Prepare chart data (Top 5 + Others)
  const chartData = dataByService.slice(0, 5);
  if (dataByService.length > 5) {
    const othersValue = dataByService.slice(5).reduce((acc, item) => acc + item.value, 0);
    chartData.push({ name: 'Others', value: othersValue });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Расходы в месяц (приблиз.)</h3>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalMonthly, 'RUB')}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Расходы в год (прогноз)</h3>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalYearly, 'RUB')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Доли расходов (Месяц)</h3>
          <div className="flex-1 w-full min-h-0">
             {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, 'RUB')}
                />
              </PieChart>
            </ResponsiveContainer>
             ) : (
                 <div className="flex items-center justify-center h-full text-gray-400">Нет данных</div>
             )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Топ расходов</h3>
           <div className="flex-1 w-full min-h-0">
            {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip formatter={(value: number) => formatCurrency(value, 'RUB')} cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                   {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-400">Нет данных</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsView;