"use client";
import { useKoletPay } from "@/lib/store";
import { series, Period } from "@/lib/metrics";
import { money } from "@/lib/types";
export function RevenueChart({ period }: { period: Period }) {
  const { data } = useKoletPay();
  const list = series(data, period);
  const max = Math.max(...list.map((x) => x.sum), 1);
  return (
    <div>
      <div className="barchart" aria-label="Revenue chart">
        {list.map((v) => (
          <div
            className="bar-col"
            key={v.key}
            title={`${v.label}: ${money(v.sum)}`}
          >
            <div className="bar-stack">
              <span
                className="bar"
                style={{
                  height: `${Math.max((v.sum / max) * 100, v.sum ? 4 : 0)}%`,
                  opacity: v.sum === 0 ? 0.12 : 1,
                }}
              />
            </div>
            <span>{period === "month" ? v.label.split(" ")[0] : v.label}</span>
          </div>
        ))}
      </div>
      <p className="help">
        Revenue from recorded payments only. Hover over a bar for the amount.
      </p>
    </div>
  );
}
