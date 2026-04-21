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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{statusText || "처리 중..."}</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>{progress}%</span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 14 }}>
        <div
          className="progress-fill"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--primary), #7B8EFF)",
          }}
        />
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
