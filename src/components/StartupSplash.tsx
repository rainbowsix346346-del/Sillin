import { motion, AnimatePresence } from 'motion/react';
import { BOUNCY_SPRING } from '../data/catalog';
import { Translations } from '../utils/i18n';

interface StartupSplashProps {
  visible: boolean;
  t: Translations;
}

/**
 * Lightweight 1.5–2s startup splash screen displaying the Sillon brand emblem
 * with GPU-only fade-out while localScanner runs in the background.
 */
export function StartupSplash({ visible, t }: StartupSplashProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sillon-startup-splash"
          data-testid="startup-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 select-none will-change-transform"
          style={{
            background:
              'radial-gradient(ellipse 80% 65% at 50% 30%, #EEF0F8 0%, #F8F9FC 72%)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.86, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={BOUNCY_SPRING}
            className="flex flex-col items-center text-center will-change-transform"
          >
            <motion.div
              animate={{ scale: [1, 1.035, 1] }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: 'easeInOut',
              }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] p-1.5 bg-white/85 ring-1 ring-white shadow-[0_22px_46px_-14px_rgba(74,85,143,0.28)] mb-5 will-change-transform"
            >
              <img
                src="/app-icon.svg"
                alt={t.brandName}
                className="w-full h-full rounded-[22px]"
              />
            </motion.div>

            <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#1D2238]">
              {t.brandName}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#545C7A] mt-2">
              {t.splashSubtitle}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
