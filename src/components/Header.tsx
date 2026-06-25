import React, { useState, useEffect } from "react";
import { ClipboardList, UserCheck, Settings as SettingsIcon, ShieldCheck, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const [time, setTime] = useState<string>("");
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Prevent background body scroll when sidebar drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm shrink-0" id="lalbaba-app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left branding - Responsive Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0 shadow-sm" id="company-logo-badge">
            LE
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-bold leading-none tracking-tight text-slate-900 font-display flex flex-wrap items-center gap-1.5">
              <span>Lalbaba Engineering</span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8.5px] sm:text-[9.5px] font-bold tracking-wider rounded border border-blue-100 uppercase shrink-0">
                Maintenance
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">Smart Report & Handover System</p>
          </div>
        </div>

        {/* Central Navigation Pills - Hidden on Mobile */}
        <nav className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-xl" aria-label="Tabs">
          <button
            id="nav-btn-plan-work"
            onClick={() => setActiveTab("plan-work")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "plan-work"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            All Plan Work
          </button>

          <button
            id="nav-btn-shift-handle"
            onClick={() => setActiveTab("shift-handle")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "shift-handle"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Shift Handover
          </button>

          <button
            id="nav-btn-settings"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "settings"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            Settings & BOM
          </button>
        </nav>

        {/* Real-time Clock Right Widget & Mobile Menu Button */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden lg:block">
            <p className="text-xs font-semibold text-slate-700">Database Engine</p>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              Connected
            </p>
          </div>
          
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner hidden sm:flex items-center gap-1.5">
            <span className="font-mono text-xs text-slate-600 tracking-wide font-medium">{time || "Loading time..."}</span>
          </div>

          {/* Hamburger button - Mobile Only */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none transition-colors border border-slate-200/60 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? <X className="w-5 h-5 text-blue-600" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Animated Slide-Out Sidebar Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex justify-end overflow-hidden" id="mobile-sidebar-drawer">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/60"
            />

            {/* Sidebar panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200"
            >
              {/* Sidebar Header */}
              <div className="p-5 border-b border-slate-150 flex justify-between items-center bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    LE
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Navigation Menu</h3>
                    <p className="text-xs font-bold font-display text-white mt-1">Lalbaba Maintenance</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sidebar Content Links */}
              <nav className="flex-1 p-5 space-y-2.5 overflow-y-auto" aria-label="Mobile Navigation Drawer">
                <button
                  onClick={() => {
                    setActiveTab("plan-work");
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === "plan-work"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <ClipboardList className="w-5 h-5" />
                  All Plan Work
                </button>

                <button
                  onClick={() => {
                    setActiveTab("shift-handle");
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === "shift-handle"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  Shift Handover
                </button>

                <button
                  onClick={() => {
                    setActiveTab("settings");
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <SettingsIcon className="w-5 h-5" />
                  Settings & BOM
                </button>
              </nav>

              {/* Sidebar Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Time:</span>
                  <span className="font-mono font-bold text-slate-700">{time || "Loading..."}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Sync status:</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                </div>
                <div className="pt-2 text-[10px] text-slate-400 text-center font-sans border-t border-slate-200/50">
                  © 2026 Lalbaba Engineering Ltd.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
