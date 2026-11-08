"use client";

import { useId, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useControl } from "./control-context";
import { DemoBadge, Panel, PanelHeading } from "./ui";

export function ActivityChart() {
  const { snapshot } = useControl();
  const [metric, setMetric] = useState<"requests" | "latency">("requests");
  const [selected, setSelected] = useState<number | null>(null);
  const gradientId = useId();
  const max = metric === "requests" ? 500 : 40;
  const points = snapshot.activity.map((point, index) => [
    index * 50,
    150 - (point[metric] / max) * 135,
  ]);
  const line = points
    .map(([x, y], index) => `${index ? "L" : "M"}${x},${y.toFixed(1)}`)
    .join(" ");
  const total = snapshot.activity.reduce(
    (sum, point) => sum + point.requests,
    0,
  );
  const chosen = selected === null ? null : snapshot.activity[selected];
  return (
    <Panel className="activity-panel">
      <PanelHeading
        title="Puls tvého systému"
        subtitle="Simulovaná aktivita za 24 hodin"
        action={<DemoBadge />}
      />
      <div className="chart-toolbar">
        <div>
          <span className="chart-value">
            {metric === "requests" ? total.toLocaleString("cs-CZ") : "27"}
            <small>{metric === "requests" ? "požadavků" : "ms průměr"}</small>
          </span>
          <span className="chart-caption">
            <TrendingUp size={13} />{" "}
            {metric === "requests" ? "Plynulý provoz" : "Stabilní odezva"}
          </span>
        </div>
        <div className="segmented-control" aria-label="Metrika grafu">
          <button
            aria-pressed={metric === "requests"}
            className={metric === "requests" ? "selected" : ""}
            onClick={() => {
              setMetric("requests");
              setSelected(null);
            }}
          >
            Požadavky
          </button>
          <button
            aria-pressed={metric === "latency"}
            className={metric === "latency" ? "selected" : ""}
            onClick={() => {
              setMetric("latency");
              setSelected(null);
            }}
          >
            Odezva
          </button>
        </div>
      </div>
      <div className="chart-area">
        <div className="chart-axis">
          <span>{max}</span>
          <span>{max / 2}</span>
          <span>0</span>
        </div>
        <div className="chart-plot">
          <svg
            viewBox="0 0 600 165"
            preserveAspectRatio="none"
            role="img"
            aria-label={`DEMO graf: ${metric === "requests" ? "požadavky" : "odezva"} za 24 hodin`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#eb97a8" stopOpacity=".22" />
                <stop offset="100%" stopColor="#eb97a8" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[15, 82, 150].map((y) => (
              <line
                key={y}
                x1="0"
                x2="600"
                y1={y}
                y2={y}
                stroke="#303138"
                strokeDasharray="3 5"
              />
            ))}
            <path
              d={`${line} L600,165 L0,165 Z`}
              fill={`url(#${gradientId})`}
            />
            <path
              d={line}
              fill="none"
              stroke="#eb97a8"
              strokeWidth="2.3"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            {points.map(([x, y], index) => (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={selected === index ? 5 : 0}
                fill="#efb2bf"
              />
            ))}
          </svg>
          <div className="chart-hit-targets">
            {snapshot.activity.map((point, index) => (
              <button
                key={point.label}
                aria-label={`${point.label}: ${point[metric]} ${metric === "requests" ? "požadavků" : "ms"}`}
                onFocus={() => setSelected(index)}
                onMouseEnter={() => setSelected(index)}
                onClick={() => setSelected(index)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="chart-labels">
        {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"].map(
          (label) => (
            <span key={label}>{label}</span>
          ),
        )}
      </div>
      <div className="chart-footnote" aria-live="polite">
        <span className="legend-dot" />
        {chosen
          ? `${chosen.label} · ${chosen[metric]} ${metric === "requests" ? "požadavků" : "ms"}`
          : "Demonstrační provoz · žádná živá měření"}
      </div>
    </Panel>
  );
}
