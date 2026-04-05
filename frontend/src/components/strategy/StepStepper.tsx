"use client";

const STEPS = ["案件情報", "争点分析", "戦略立案", "書面生成", "自己検証"];

export default function StepStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 py-4 border-b border-stone-200 bg-white">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={step} className="flex items-center">
            {i > 0 && <div className="w-8 h-px bg-stone-300 mx-1" />}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isCompleted
                    ? "bg-emerald-600 text-white"
                    : isActive
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-200"
                    : "bg-stone-200 text-stone-500"
                }`}
              >
                {isCompleted ? "\u2713" : step}
              </div>
              <span
                className={`text-sm ${
                  isActive ? "text-stone-900 font-semibold" : "text-stone-400"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
