import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * PageTransition — wraps page content with slide-in/slide-out animations.
 * Uses AnimatePresence with location.pathname as key so route changes
 * trigger exit (slide left) then enter (slide from right) transitions.
 */
export default function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="overflow-hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}