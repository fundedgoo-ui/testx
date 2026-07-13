import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BarChart3, 
  User, 
  ShieldAlert, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  ShoppingBag,
  Info,
  Trophy,
  Calendar,
  Cpu,
  Target,
  Users,
  GraduationCap
} from 'lucide-react';
import Logo from './Logo';
import { useApp } from '../AppContext';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, activeView, setActiveView, mobileMenuOpen, setMobileMenuOpen, logout, competitions } = useApp();
  const hasActiveCompetition = competitions.some(c => c.isActive);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
    { icon: ShoppingBag, label: 'Shop Challenges', id: 'shop' },
    { icon: Target, label: 'My Challenges', id: 'challenges' },
    ...(hasActiveCompetition ? [{ icon: Trophy, label: 'Competitions', id: 'competition' }] : []),
    { icon: Cpu, label: 'Trading Terminals', id: 'terminals' },
    { icon: Users, label: 'Node Referral', id: 'referral' },
    { icon: Trophy, label: 'Leaderboard', id: 'leaderboard' },
    { icon: Calendar, label: 'Eco Calendar', id: 'calendar' },
    { icon: BarChart3, label: 'Market Analysis', id: 'market' },
    { icon: GraduationCap, label: 'Mentors & Courses', id: 'educators' },
    { icon: Info, label: 'Rules & FAQ', id: 'rules' },
  ];

  const adminItems = [
    { icon: ShieldAlert, label: 'Admin Terminal', id: 'admin' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[190] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: isCollapsed ? 0 : 260,
          x: mobileMenuOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -260 : 0)
        }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className={`h-screen bg-slate-950/90 lg:bg-slate-950/50 backdrop-blur-md flex flex-col z-[200] overflow-hidden fixed lg:sticky top-0 left-0 transition-colors duration-300 ${isCollapsed ? 'border-r-0' : 'border-r border-slate-800'}`}
      >
        <div className="w-[260px] flex flex-col h-full shrink-0">
          <div className="p-6 flex items-center justify-between">
              {(!isCollapsed || mobileMenuOpen) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Logo />
                </motion.div>
              )}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors hidden lg:block"
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors lg:hidden"
            >
              <ChevronLeft size={24} />
            </button>
          </div>

          <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-4">
              {(!isCollapsed || mobileMenuOpen) ? 'General' : ''}
            </div>
            {menuItems.flatMap((item, index) => {
              const elements = [
                <SidebarItem 
                  key={item.id} 
                  icon={item.icon} 
                  label={item.label} 
                  isCollapsed={isCollapsed && !mobileMenuOpen} 
                  className={
                    item.id === 'terminals' ? '!text-azure font-bold' : 
                    item.id === 'shop' ? '!text-orange-500 font-bold border border-orange-500/20 bg-orange-500/[0.05] hover:bg-orange-500/10' : 
                    ''
                  }
                  iconClassName={
                    item.id === 'terminals' ? '!text-azure' : 
                    item.id === 'shop' ? '!text-orange-500' : 
                    ''
                  }
                  onClick={() => {
                    setActiveView(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  isActive={activeView === item.id}
                />
              ];

              // Add colored separator after every 3 items, but not at the end
              if ((index + 1) % 3 === 0 && index < menuItems.length - 1) {
                 elements.push(
                  <div key={`sep-${index}`} className="my-2 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mx-4" />
                 );
              }
              return elements;
            })}

            {user?.role === 'admin' && (
              <div className="pt-8">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-4">
                  {(!isCollapsed || mobileMenuOpen) ? 'System' : ''}
                </div>
                {adminItems.map((item) => (
                  <SidebarItem 
                    key={item.id} 
                    icon={item.icon} 
                    label={item.label} 
                    isCollapsed={isCollapsed && !mobileMenuOpen}
                    onClick={() => {
                      setActiveView(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    isActive={activeView === item.id}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-800">
            <SidebarItem 
              icon={Settings} 
              label="Settings" 
              isCollapsed={isCollapsed && !mobileMenuOpen} 
              onClick={() => setMobileMenuOpen(false)}
            />
            <SidebarItem 
              icon={LogOut} 
              label="Logout" 
              isCollapsed={isCollapsed && !mobileMenuOpen} 
              className="text-red-400 hover:bg-red-400/10"
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
            />
          </div>
        </div>
      </motion.aside>

      {/* Floating Toggle Trigger for Collapsed Sidebar (Desktop Only) */}
      <AnimatePresence>
        {isCollapsed && (
          <motion.button
            key="sidebar-trigger"
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            transition={{ type: "spring", damping: 15 }}
            onClick={() => setIsCollapsed(false)}
            className="fixed top-5 left-5 z-[250] hidden lg:flex items-center justify-center p-3 bg-slate-950/80 hover:bg-slate-900 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-white/20 transition-all shadow-xl hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
            title="Open Menu"
          >
            <ChevronRight size={18} className="text-azure" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}


function SidebarItem({ 
  icon: Icon, 
  label, 
  isCollapsed, 
  onClick,
  isActive,
  className = "",
  iconClassName = ""
}: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative
        ${isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
        ${className}
      `}
    >
      <Icon size={20} className={`${isActive ? (iconClassName || 'text-cyan-400') : (iconClassName || 'group-hover:scale-110')} transition-transform`} />
      {!isCollapsed && (
        <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      )}
      {isActive && !isCollapsed && (
        <motion.div 
          layoutId="active-indicator"
          className={`absolute left-0 w-1 h-6 rounded-r-full ${className.includes('azure') ? 'bg-azure' : 'bg-cyan-500'}`} 
        />
      )}
    </button>
  );
}
