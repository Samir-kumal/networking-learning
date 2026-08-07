import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DkObservabilitySection from "./DkObservabilitySection";

describe("DkObservabilitySection", () => {
  it("renders all observability modules with sky theme", () => {
    const html = renderToStaticMarkup(<DkObservabilitySection />);
    // Title banner
    expect(html).toContain("Observability Stack Lab");
    expect(html).toContain("Container Observability");
    // Module 1: Prometheus simulator
    expect(html).toContain("Live Metric Simulator");
    expect(html).toContain("container_cpu_usage_seconds_total");
    expect(html).toContain("Scrape targets");
    expect(html).toContain("PROMETHEUS:");
    // Module 2: Grafana builder with widget palette
    expect(html).toContain("Dashboard Builder");
    expect(html).toContain("Widget palette");
    expect(html).toContain("Cluster Overview");
    expect(html).toContain("Time Series");
    expect(html).toContain("Bar Gauge");
    expect(html).toContain("Export JSON");
    // Module 3: distributed tracing waterfall
    expect(html).toContain("Trace Waterfall — Jaeger / Tempo");
    expect(html).toContain("POST /api/v1/orders");
    expect(html).toContain("stripe.charges.create");
    expect(html).toContain("traceparent");
    expect(html).toContain("critical path");
    // Module 4: structured logging
    expect(html).toContain("Log Stream Explorer");
    expect(html).toContain("LIVE TAIL ON");
    expect(html).toContain("loki / cluster-aggregate");
    // Module 5: alert rule configurator generates real YAML
    expect(html).toContain("Prometheus Alert Configurator");
    expect(html).toContain("STATE: INACTIVE");
    expect(html).toContain("prometheus-alerts.yml");
    expect(html).toContain("groups:");
    expect(html).toContain("for:");
    expect(html).toContain("eval 1");
    // Module 6: SLI/SLO calculator
    expect(html).toContain("Error Budget Calculator");
    expect(html).toContain("99.9%");
    expect(html).toContain("Availability");
    expect(html).toContain("Error budget");
    // Cheat sheet strip
    expect(html).toContain("Observability Loop Cheat Sheet");
  });
});