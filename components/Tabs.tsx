import React from 'react';
import type { Tab } from '../types';

interface TabOption {
  id: Tab;
  label: string;
  icon: React.ElementType;
}

interface TabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  // FIX: Changed `tabs` prop to accept a readonly array to match the type of `tabOptions` in `App.tsx` which uses `as const`.
  tabs: readonly TabOption[];
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab, tabs }) => {
  return (
    <nav className="flex space-x-2 sm:space-x-4 border-b border-gray-200 dark:border-gray-700">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-brand-500 ${
            activeTab === id
              ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Icon className="h-5 w-5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Tabs;