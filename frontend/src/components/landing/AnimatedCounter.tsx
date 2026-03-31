"use client";

import { useEffect, useRef } from "react";
import {
  useInView,
  useMotionValue,
  useTransform,
  animate,
  motion,
} from "framer-motion";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  label: string;
}

export default function AnimatedCounter({
  target,
  suffix = "",
  label,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) =>
    Math.round(v).toLocaleString()
  );

  useEffect(() => {
    if (isInView) {
      animate(motionValue, target, {
        type: "spring",
        stiffness: 100,
        damping: 20,
      });
    }
  }, [isInView, motionValue, target]);

  return (
    <div ref={ref}>
      <div className="flex items-baseline gap-1">
        <motion.span className="text-4xl md:text-5xl font-bold font-mono text-[#C5A55A]">
          {rounded}
        </motion.span>
        {suffix && (
          <span className="text-3xl md:text-4xl font-bold font-mono text-[#C5A55A]">
            {suffix}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-300 mt-2">{label}</p>
    </div>
  );
}
