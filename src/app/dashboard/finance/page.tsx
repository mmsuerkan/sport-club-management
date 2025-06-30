'use client';

import { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users,
  PieChart
} from 'lucide-react';
import TransactionList from '@/components/finance/TransactionList';
import BudgetList from '@/components/finance/BudgetList';
import FinanceOverview from '@/components/finance/FinanceOverview';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', name: 'Genel Bakış', icon: TrendingUp },
    { id: 'transactions', name: 'İşlemler', icon: DollarSign },
    { id: 'budgets', name: 'Bütçe', icon: PieChart },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finansal Yönetim</h1>
            <p className="text-gray-600">Gelir, gider ve bütçe yönetimi ile kapsamlı mali raporlama</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        {activeTab === 'overview' ? (
          <FinanceOverview />
        ) : activeTab === 'transactions' ? (
          <TransactionList />
        ) : activeTab === 'budgets' ? (
          <BudgetList />
        ) : (
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {tabs.find(tab => tab.id === activeTab)?.name} Modülü
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Bu modül şu anda geliştirme aşamasında. Modüler yaklaşımla step-by-step implement edilecek.
            </p>
            <div className="mt-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                🚧 Geliştirme Aşamasında
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}