import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  LayoutDashboard,
  Video,
  Dumbbell,
  User,
  ChevronDown,
  Menu,
  X,
  Stethoscope,
  Sparkles,
  Home,
  Smartphone,
  Download,
  Monitor,
  ExternalLink,
  CheckCircle2,
  LogOut
} from 'lucide-react';
import { Patient } from '../types/telemetry';

export type ScreenId = 'login' | 'home-hub' | 'dashboard' | 'live-studio' | 'exercises' | 'profile' | 'doctor-portal';

interface Props {
  patients: Patient[];
  activePatient: Patient;
  onSelectPatient: (patient: Patient) => void;
  activeScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  isSessionActive: boolean;
  isDoctorMode?: boolean;
  onReturnToDoctorPortal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<Props> = ({
  patients,
  activePatient,
  onSelectPatient,
  activeScreen,
  onSelectScreen,
  isSessionActive,
  isDoctorMode,
  onReturnToDoctorPortal,
  onLogout
}) => {
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAppModal, setShowAppModal] = useState<boolean>(false);

  // Listen for PWA install event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleOpenAppClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        return;
      }
    }
    // If not prompted yet or already installed, open guidance modal
    setShowAppModal(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand: Clicking returns to Screen 2 (Home Hub) */}
            <div
              onClick={() => onSelectScreen('home-hub')}
              className="flex items-center gap-3 cursor-pointer select-none"
              title="Go to Screen 2 (Home Hub)"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#006194] to-[#0284C7] flex items-center justify-center text-white shadow-md shadow-[#006194]/20 hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                    FlexRehab <span className="text-[#006194]">AI</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    APP & WEB
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Kinetic Shoulder Telemetry & Recovery
                </p>
              </div>
            </div>

            {/* Desktop Navigation Across Screens */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
              <button
                onClick={() => onSelectScreen('home-hub')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeScreen === 'home-hub'
                    ? 'bg-white text-[#006194] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home Hub</span>
              </button>

              <button
                onClick={() => onSelectScreen('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeScreen === 'dashboard'
                    ? 'bg-white text-[#006194] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => onSelectScreen('live-studio')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                  activeScreen === 'live-studio'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Live Studio (Webcam)</span>
                {isSessionActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => onSelectScreen('exercises')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeScreen === 'exercises'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>4 Exercises</span>
              </button>
            </nav>

            {/* Right Header Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Doctor Portal Shortcut if in Doctor Mode */}
              {isDoctorMode && (
                <button
                  onClick={onReturnToDoctorPortal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all cursor-pointer animate-pulse"
                  title="Return to Doctor Portal / Manage Users"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-purple-200" />
                  <span>Doctor Portal</span>
                </button>
              )}

              {/* PERMANENT "OPEN / INSTALL APP" BUTTON (Always Visible) */}
              <button
                onClick={handleOpenAppClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-xs font-bold shadow-md shadow-sky-900/25 transition-all active:scale-95 cursor-pointer border border-cyan-400/30"
                title="Open or Install as Mobile/Desktop App"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Open App</span>
              </button>

              {/* Patient Profile Card (Clicking opens Screen 6: User Account Profile) */}
              <button
                onClick={() => onSelectScreen('profile')}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-left"
                title="Open Screen 6: Patient Profile"
              >
                {activePatient.photoUrl && !activePatient.photoUrl.includes('unsplash') ? (
                  <img
                    src={activePatient.photoUrl}
                    alt={activePatient.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-300 shadow-xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#006194] to-[#0284C7] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white">
                    {activePatient.name ? activePatient.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {activePatient.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {activePatient.mrn}
                  </div>
                </div>
              </button>

              {/* Logout / Switch Role button */}
              <button
                onClick={onLogout || (() => onSelectScreen('login'))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 hover:text-rose-800 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                title="Logout / Switch Account (Doctor / User)"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden md:inline">Logout</span>
              </button>

              {/* Mobile Hamburger Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 lg:hidden hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 animate-fade-in shadow-xl">
            <button
              onClick={() => {
                handleOpenAppClick();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-cyan-50 text-cyan-800 text-xs font-bold border border-cyan-200 mb-2"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-600" />
                <span>Open as Native Mobile / Desktop App</span>
              </div>
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                onSelectScreen('home-hub');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold ${
                activeScreen === 'home-hub' ? 'bg-[#006194] text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Screen 2: Home Hub</span>
            </button>

            <button
              onClick={() => {
                onSelectScreen('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold ${
                activeScreen === 'dashboard' ? 'bg-[#006194] text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Screen 3: Patient Recovery Dashboard</span>
            </button>

            <button
              onClick={() => {
                onSelectScreen('live-studio');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${
                activeScreen === 'live-studio' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4" />
                <span>Screen 4: Live Studio (Webcam)</span>
              </div>
              {isSessionActive && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
            </button>

            <button
              onClick={() => {
                onSelectScreen('exercises');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold ${
                activeScreen === 'exercises' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>Screen 5: Prescribed Exercises</span>
            </button>

            <button
              onClick={() => {
                onSelectScreen('profile');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold ${
                activeScreen === 'profile' ? 'bg-purple-600 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Screen 6: User Account Profile</span>
            </button>

            {/* Mobile Logout */}
            <button
              onClick={() => {
                if (onLogout) onLogout();
                else onSelectScreen('login');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 mt-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Logout (Switch Patient or Doctor)</span>
            </button>
          </div>
        )}
      </header>

      {/* "Open / Install App" Modal */}
      {showAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Open as Standalone App
                  </h3>
                  <p className="text-xs text-slate-500">Run FlexRehab AI as a real desktop or mobile app</p>
                </div>
              </div>
              <button
                onClick={() => setShowAppModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              {/* Option 1: Desktop Browser App */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Monitor className="w-5 h-5 text-[#006194] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">On Laptop / PC (Edge & Chrome)</h4>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Look at your browser's address bar (URL bar at the top right) and click the <strong>Install / App icon (⊞)</strong>, or click menu ➔ <em>Apps ➔ Install this site as an app</em>.
                  </p>
                </div>
              </div>

              {/* Option 2: Mobile Phone */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">On Android Phone or iPhone</h4>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Open the site on mobile Chrome or Safari, tap menu (⋮ or Share) ➔ <strong>&quot;Add to Home screen&quot; / &quot;Install app&quot;</strong>. It creates a native fullscreen app icon on your phone!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                  }
                  setShowAppModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold transition shadow-md shadow-sky-900/20"
              >
                Done / Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Native-Like Mobile App Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => onSelectScreen('home-hub')}
          className={`flex flex-col items-center gap-1 ${
            activeScreen === 'home-hub' ? 'text-[#006194]' : 'text-slate-400'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button
          onClick={() => onSelectScreen('dashboard')}
          className={`flex flex-col items-center gap-1 ${
            activeScreen === 'dashboard' ? 'text-[#006194]' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>

        {/* Center Floating Action for Live Camera */}
        <button
          onClick={() => onSelectScreen('live-studio')}
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 border-2 border-white">
            <Video className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-emerald-700 mt-0.5">Live</span>
        </button>

        <button
          onClick={() => onSelectScreen('exercises')}
          className={`flex flex-col items-center gap-1 ${
            activeScreen === 'exercises' ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span className="text-[10px] font-bold">Exercises</span>
        </button>

        <button
          onClick={() => onSelectScreen('profile')}
          className={`flex flex-col items-center gap-1 ${
            activeScreen === 'profile' ? 'text-purple-600' : 'text-slate-400'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>
    </>
  );
};
