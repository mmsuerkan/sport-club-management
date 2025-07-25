'use client';

import { useState } from 'react';
import {
  DollarSign,
  Users,
  BarChart3,
  Calendar
} from 'lucide-react';
import TransactionList from '@/components/finance/TransactionList';
import TuitionList from '@/components/finance/TuitionList';
import RecurringExpenseList from '@/components/finance/RecurringExpenseList';
import FinancialSummary from '@/components/finance/FinancialSummary';
import PageTitle from '@/components/page-title';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('summary');

  const tabs = [
    { id: 'summary', name: 'Finansal Özet', icon: BarChart3 },
    { id: 'transactions', name: 'İşlemler', icon: DollarSign },
    { id: 'tuitions', name: 'Aidatlar', icon: Users },
    { id: 'recurring', name: 'Sabit Giderler', icon: Calendar },
  ];

  return (
    <div>
      {/* Header */}
      <PageTitle
        setEditingUser={undefined}
        pageTitle="Finansal Yönetim"
        pageDescription="Gelir, gider ve bütçe yönetimi ile kapsamlı mali raporlama hazırlayabilirsiniz."
        pageIcon={<DollarSign />}
      />
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id
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
        {activeTab === 'summary' ? (
          <FinancialSummary />
        ) : activeTab === 'transactions' ? (
          <TransactionList />
        ) : activeTab === 'tuitions' ? (
          <TuitionList />
        ) : activeTab === 'recurring' ? (
          <RecurringExpenseList />
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