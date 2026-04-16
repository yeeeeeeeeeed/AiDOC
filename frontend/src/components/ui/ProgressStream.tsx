"use client";

import type { StepStatus } from "@/types";

interface Props {
  progress: number;
  steps: StepStatus[];
  statusText?: string;
}

export default function ProgressStream({ progress, steps, statusText }: Props) {
  return (
    <div>
      {/* Progress bar */}
      <div className="flex-between mb-2">
        <span className="text-sm font-bold">{statusText || "처리 중..."}</span>
        <span className="text-sm text-muted">{progress}%</span>
      </div>
      <div className="progress-bar mb-3">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <ul className="step-list">
          {steps.map((step, i) => (
            <li key={i} className="step-item">
              <span className={`step-dot ${step.status}`} />
              <span>페이지 {step.page}</span>
              {step.detail && (
                <span className="text-muted text-sm">— {step.detail}</span>
              )}
              {step.status === "running" && (
                <span className="badge badge-warning">처리중</span>
              )}
              {step.status === "done" && (
                <span className="badge badge-success">완료</span>
              )}
              {step.status === "error" && (
                <span className="badge badge-danger">오류</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
