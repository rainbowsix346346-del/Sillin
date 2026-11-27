import { motion } from 'motion/react';
import {
  Sparkles,
  Compass,
  Library,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { TabId } from '../types/music';
import { BOUNCY_SPRING } from '../data/catalog';
import { Translations } from '../utils/i18n';

interface BottomNavProps {
  activeTab: TabId;
  t: Translations;
  onSelectTab: (tab: TabId) => void;
}

/**
 * Floating iOS Dynamic Island Capsule Navigation Dock:
 * Modern music icons (no vintage vinyl icons) + elastic spring-bounce sliding pill indicator.
 */
export function BottomNav({ activeTab, t, onSelectTab }: BottomNavProps) {
  const navItems: { id: TabId; label: string; icon: typeof Sparkles }[] = [
    { id: 'home', label: t.navHome, icon: Sparkles },
    { id: 'explore', label: t.navBrowse, icon: Compass },
    { id: 'library', label: t.navLibrary, icon: Library },
    { id: 'search', label: t.navSearch, icon: Search },
    { id: 'settings', label: t.navSettings, icon: SlidersHorizontal },
  ];

  return (
    <nav
      aria-label="Primary navigation"
      data-testid="floating-capsule-nav"
      className="frosted-dock rounded-full p-1.5 flex items-center justify-between gap-0.5 ring-1 ring-white/80"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;

        return (
          <motion.button
            key={item.id}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelectTab(item.id)}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
            className={`relative min-h-[44px] rounded-full flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              active
                ? 'flex-[1.35] px-3 text-white'
                : 'flex-1 px-2 text-[#545C7A] hover:text-[#1D2238]'
            }`}
          >
            {active && (
              <motion.span
                layoutId="capsule-nav-pill"
                transition={BOUNCY_SPRING}
                className="absolute inset-0 rounded-full accent-transition"
                style={{
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 8px 20px -5px rgba(var(--accent-rgb), 0.5)',
                }}
              />
            )}
            <motion.span
              animate={{ scale: active ? 1.08 : 1 }}
              transition={BOUNCY_SPRING}
              className="relative z-10 flex items-center justify-center shrink-0"
            >
              <Icon
                className="w-[18px] h-[18px]"
                strokeWidth={active ? 2.3 : 1.95}
              />
            </motion.span>
            <span
              className={`relative z-10 text-xs font-semibold tracking-tight ${
                active ? 'inline' : 'hidden sm:inline'
              }`}
            >
              {item.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
