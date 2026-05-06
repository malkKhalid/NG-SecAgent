import React from 'react';
import { Shield, LayoutDashboard, Settings, Activity, Server } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  osType: string;
  activePage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, osType, activePage, onNavigate }) => {
  return (
    <div className="flex h-screen bg-cyber-900 text-slate-300 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-cyber-800 border-r border-cyber-700 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center space-x-3 border-b border-cyber-700">
          <Shield className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-wider">SENTINEL</h1>
            <p className="text-xs text-cyan-500 font-mono">AI-SIEM SYSTEM</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activePage === 'dashboard'} 
            onClick={() => onNavigate('dashboard')}
          />
          <NavItem 
            icon={<Activity size={20} />} 
            label="Live Stream" 
            active={activePage === 'live'}
            onClick={() => onNavigate('live')}
          />
          <NavItem 
            icon={<Server size={20} />} 
            label="Assets" 
            active={activePage === 'assets'}
            onClick={() => onNavigate('assets')}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Configuration" 
            active={activePage === 'config'}
            onClick={() => onNavigate('config')}
          />
        </nav>

        <div className="p-4 border-t border-cyber-700">
          <div className="bg-cyber-900 rounded-lg p-3 border border-cyber-700">
            <p className="text-xs text-slate-400 mb-1">Host System</p>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${osType ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="font-mono text-sm font-bold text-white">{osType || 'Detecting...'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header (Simplified) */}
        <header className="md:hidden h-16 bg-cyber-800 border-b border-cyber-700 flex items-center px-4 justify-between">
           <div className="flex items-center">
             <Shield className="w-6 h-6 text-cyan-400 mr-2" />
             <span className="font-bold text-white">SENTINEL</span>
           </div>
           <div className="flex space-x-2">
             <button onClick={() => onNavigate('dashboard')} className="p-2 text-slate-400"><LayoutDashboard size={20}/></button>
             <button onClick={() => onNavigate('assets')} className="p-2 text-slate-400"><Server size={20}/></button>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active
        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
        : 'hover:bg-cyber-700 text-slate-400 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

export default Layout;