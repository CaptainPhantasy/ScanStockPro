'use client';

import { useState, useEffect } from 'react';
import { MobileLayout } from '../../src/agent2-interface/layouts/MobileLayout';
import { BottomNav } from '../../src/agent2-interface/components/mobile/BottomNav';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  businessName: string;
  businessType: string;
}

interface Settings {
  notifications: {
    lowStock: boolean;
    dailyReport: boolean;
    newProducts: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
    showPrices: boolean;
  };
  inventory: {
    lowStockThreshold: number;
    defaultLocation: string;
    autoSyncEnabled: boolean;
  };
  ai: {
    autoRecognition: boolean;
    confidenceThreshold: number;
    preferredModel: string;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'inventory' | 'ai' | 'account'>('general');
  const [profile, setProfile] = useState<UserProfile>({
    id: 'user-1',
    email: 'demo@scanstockpro.com',
    name: 'Demo User',
    role: 'admin',
    businessName: 'Demo Business',
    businessType: 'Retail Store',
  });
  
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      lowStock: true,
      dailyReport: false,
      newProducts: true,
    },
    display: {
      theme: 'auto',
      compactMode: false,
      showPrices: true,
    },
    inventory: {
      lowStockThreshold: 10,
      defaultLocation: 'main-warehouse',
      autoSyncEnabled: true,
    },
    ai: {
      autoRecognition: true,
      confidenceThreshold: 0.7,
      preferredModel: 'gpt-4o-mini',
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Save settings to API
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        const response = await fetch('/api/auth/signout', { method: 'POST' });
        if (response.ok) {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Failed to sign out:', error);
      }
    }
  };

  const TABS = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'ai', label: 'AI Settings', icon: '🤖' },
    { id: 'account', label: 'Account', icon: '👤' },
  ];

  return (
    <MobileLayout>
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3">
        <h1 className="text-xl font-bold text-neutral-900">Settings</h1>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-neutral-200">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex-1 px-4 py-3 flex items-center justify-center gap-2 
                whitespace-nowrap text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-600'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Success Message */}
        {showSavedMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 m-4">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span className="text-sm font-medium text-green-800">Settings saved successfully</span>
            </div>
          </div>
        )}

        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="p-4 space-y-6">
            {/* Notifications */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Notifications</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                  <div>
                    <div className="font-medium text-neutral-900">Low Stock Alerts</div>
                    <div className="text-sm text-neutral-600">Get notified when items are running low</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.lowStock}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, lowStock: e.target.checked }
                    })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                  <div>
                    <div className="font-medium text-neutral-900">Daily Reports</div>
                    <div className="text-sm text-neutral-600">Receive daily inventory summaries</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.dailyReport}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, dailyReport: e.target.checked }
                    })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                  <div>
                    <div className="font-medium text-neutral-900">New Product Alerts</div>
                    <div className="text-sm text-neutral-600">Notify when new products are added</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.newProducts}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, newProducts: e.target.checked }
                    })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Display Settings */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Display</h2>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-neutral-200">
                  <label className="block mb-2">
                    <div className="font-medium text-neutral-900 mb-1">Theme</div>
                    <div className="text-sm text-neutral-600 mb-2">Choose your preferred color scheme</div>
                  </label>
                  <select
                    value={settings.display.theme}
                    onChange={(e) => setSettings({
                      ...settings,
                      display: { ...settings.display, theme: e.target.value as any }
                    })}
                    className="w-full p-2 border border-neutral-200 rounded-lg"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                  <div>
                    <div className="font-medium text-neutral-900">Compact Mode</div>
                    <div className="text-sm text-neutral-600">Show more items on screen</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.display.compactMode}
                    onChange={(e) => setSettings({
                      ...settings,
                      display: { ...settings.display, compactMode: e.target.checked }
                    })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                  <div>
                    <div className="font-medium text-neutral-900">Show Prices</div>
                    <div className="text-sm text-neutral-600">Display product prices in lists</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.display.showPrices}
                    onChange={(e) => setSettings({
                      ...settings,
                      display: { ...settings.display, showPrices: e.target.checked }
                    })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Settings Tab */}
        {activeTab === 'inventory' && (
          <div className="p-4 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Inventory Management</h2>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-neutral-200">
                  <label className="block mb-2">
                    <div className="font-medium text-neutral-900 mb-1">Low Stock Threshold</div>
                    <div className="text-sm text-neutral-600 mb-2">Alert when quantity falls below this number</div>
                  </label>
                  <input
                    type="number"
                    value={settings.inventory.lowStockThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      inventory: { ...settings.inventory, lowStockThreshold: parseInt(e.target.value) }
                    })}
                    className="w-full p-2 border border-neutral-200 rounded-lg"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-neutral-200">
                  <label className="block mb-2">
                    <div className="font-medium text-neutral-900 mb-1">Default Location</div>
                    <div className="text-sm text-neutral-600 mb-2">Primary warehouse or store location</div>
                  </label>
                  <select
                    value={settings.inventory.defaultLocation}
                    onChange={(e) => setSettings({
                      ...settings,
                      inventory: { ...settings.inventory, defaultLocation: e.target.value }
                    })}
                    className="w-full p-2 border border-neutral-200 rounded-lg"
                  >
                    <option value="main-warehouse">Main Warehouse</option>
                    <option value="store-front">Store Front</option>
                    <option value="back-room">Back Room</option>
                    <option value="receiving">Receiving Area</option>
                  </select>
                </div>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                  <div>
                    <div className="font-medium text-neutral-900">Auto-Sync</div>
                    <div className="text-sm text-neutral-600">Automatically sync inventory changes</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.inventory.autoSyncEnabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      inventory: { ...settings.inventory, autoSyncEnabled: e.target.checked }
                    })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full p-3 bg-white rounded-xl border border-neutral-200 text-left flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">Export Inventory</div>
                    <div className="text-sm text-neutral-600">Download CSV of all products</div>
                  </div>
                  <span>📥</span>
                </button>

                <button className="w-full p-3 bg-white rounded-xl border border-neutral-200 text-left flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">Import Products</div>
                    <div className="text-sm text-neutral-600">Bulk upload from CSV file</div>
                  </div>
                  <span>📤</span>
                </button>

                <button className="w-full p-3 bg-white rounded-xl border border-neutral-200 text-left flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">Reset Demo Data</div>
                    <div className="text-sm text-neutral-600">Restore original demo products</div>
                  </div>
                  <span>🔄</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Settings Tab */}
        {activeTab === 'ai' && (
          <div className="p-4 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">AI Configuration</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                  <div>
                    <div className="font-medium text-neutral-900">Auto Recognition</div>
                    <div className="text-sm text-neutral-600">Automatically process captured images</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.ai.autoRecognition}
                    onChange={(e) => setSettings({
                      ...settings,
                      ai: { ...settings.ai, autoRecognition: e.target.checked }
                    })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>

                <div className="p-3 bg-white rounded-xl border border-neutral-200">
                  <label className="block mb-2">
                    <div className="font-medium text-neutral-900 mb-1">Confidence Threshold</div>
                    <div className="text-sm text-neutral-600 mb-2">Minimum confidence for auto-adding products</div>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.1"
                      value={settings.ai.confidenceThreshold}
                      onChange={(e) => setSettings({
                        ...settings,
                        ai: { ...settings.ai, confidenceThreshold: parseFloat(e.target.value) }
                      })}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-neutral-700 min-w-[3rem] text-right">
                      {Math.round(settings.ai.confidenceThreshold * 100)}%
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-neutral-200">
                  <label className="block mb-2">
                    <div className="font-medium text-neutral-900 mb-1">AI Model</div>
                    <div className="text-sm text-neutral-600 mb-2">Choose AI model for recognition</div>
                  </label>
                  <select
                    value={settings.ai.preferredModel}
                    onChange={(e) => setSettings({
                      ...settings,
                      ai: { ...settings.ai, preferredModel: e.target.value }
                    })}
                    className="w-full p-2 border border-neutral-200 rounded-lg"
                  >
                    <option value="gpt-4o-mini">GPT-4 Vision Mini (Fast & Affordable)</option>
                    <option value="gpt-4-vision">GPT-4 Vision (Most Accurate)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Text Only)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">AI Usage Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-600 mb-1">This Month</div>
                  <div className="text-2xl font-bold text-neutral-900">247</div>
                  <div className="text-xs text-neutral-500">recognitions</div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-600 mb-1">Tokens Used</div>
                  <div className="text-2xl font-bold text-neutral-900">45.2k</div>
                  <div className="text-xs text-neutral-500">~$0.68 cost</div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-600 mb-1">Accuracy</div>
                  <div className="text-2xl font-bold text-green-600">94%</div>
                  <div className="text-xs text-neutral-500">success rate</div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-600 mb-1">Avg Speed</div>
                  <div className="text-2xl font-bold text-neutral-900">1.2s</div>
                  <div className="text-xs text-neutral-500">per recognition</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="p-4 space-y-6">
            {/* Profile */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Profile</h2>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-neutral-200">
                  <label className="block mb-2">
                    <div className="text-sm text-neutral-600 mb-1">Name</div>
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded-lg"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-neutral-200">
                  <label className="block mb-2">
                    <div className="text-sm text-neutral-600 mb-1">Email</div>
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded-lg"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-neutral-200">
                  <label className="block mb-2">
                    <div className="text-sm text-neutral-600 mb-1">Business Name</div>
                  </label>
                  <input
                    type="text"
                    value={profile.businessName}
                    onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded-lg"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-neutral-200">
                  <label className="block mb-2">
                    <div className="text-sm text-neutral-600 mb-1">Business Type</div>
                  </label>
                  <select
                    value={profile.businessType}
                    onChange={(e) => setProfile({ ...profile, businessType: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded-lg"
                  >
                    <option value="Retail Store">Retail Store</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="E-commerce">E-commerce</option>
                  </select>
                </div>

                <div className="p-3 bg-white rounded-xl border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-neutral-900">Role</div>
                      <div className="text-sm text-neutral-600">Account permissions level</div>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {profile.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Security</h2>
              <div className="space-y-3">
                <button className="w-full p-3 bg-white rounded-xl border border-neutral-200 text-left flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">Change Password</div>
                    <div className="text-sm text-neutral-600">Update your account password</div>
                  </div>
                  <span>🔐</span>
                </button>

                <button className="w-full p-3 bg-white rounded-xl border border-neutral-200 text-left flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">Two-Factor Authentication</div>
                    <div className="text-sm text-green-600">Enabled</div>
                  </div>
                  <span>✅</span>
                </button>

                <button className="w-full p-3 bg-white rounded-xl border border-neutral-200 text-left flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">Active Sessions</div>
                    <div className="text-sm text-neutral-600">Manage your login sessions</div>
                  </div>
                  <span>💻</span>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div>
              <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
              <div className="space-y-3">
                <button 
                  onClick={handleSignOut}
                  className="w-full p-3 bg-white rounded-xl border border-red-200 text-left flex items-center justify-between hover:bg-red-50"
                >
                  <div>
                    <div className="font-medium text-red-600">Sign Out</div>
                    <div className="text-sm text-neutral-600">Sign out of your account</div>
                  </div>
                  <span>🚪</span>
                </button>

                <button className="w-full p-3 bg-white rounded-xl border border-red-200 text-left flex items-center justify-between hover:bg-red-50">
                  <div>
                    <div className="font-medium text-red-600">Delete Account</div>
                    <div className="text-sm text-neutral-600">Permanently delete your account</div>
                  </div>
                  <span>⚠️</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button (floating) */}
      {(activeTab !== 'account') && (
        <div className="fixed bottom-24 left-0 right-0 p-4 bg-gradient-to-t from-white to-transparent">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`
              w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2
              ${isSaving
                ? 'bg-neutral-100 text-neutral-400'
                : 'bg-blue-500 text-white active:scale-95'
              }
              transition-transform shadow-lg
            `}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </MobileLayout>
  );
}