"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownTimerProps {
  onComplete: () => void;
  isActive: boolean;
}

export default function CountdownTimer({
  onComplete,
  isActive,
}: CountdownTimerProps) {
  const [count, setCount] = useState(3);
  const [showGo, setShowGo] = useState(false);

  const reset = useCallback(() => {
    setCount(3);
    setShowGo(false);
  }, []);

  useEffect(() => {
    if (!isActive) {
      reset();
      return;
    }

    if (count > 0) {
      const timer = setTimeout(() => {
        setCount((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (count === 0 && !showGo) {
      setShowGo(true);
      const timer = setTimeout(() => {
        onComplete();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isActive, count, showGo, onComplete, reset]);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 rounded-xl"
    >
      <AnimatePresence mode="wait">
        {count > 0 && (
          <motion.div
            key={count}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-[120px] font-bold text-white tabular-nums select-none"
          >
            {count}
          </motion.div>
        )}
        {showGo && (
          <motion.div
            key="go"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-[80px] font-bold text-indigo-400 select-none"
          >
            GO!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
