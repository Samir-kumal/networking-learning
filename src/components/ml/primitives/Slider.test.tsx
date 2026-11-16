import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Slider } from "./Slider";

describe("ML Slider accessibility", () => {
  it("gives the slider thumb the control label as its accessible name and shows the readout", () => {
    const html = renderToStaticMarkup(
      <Slider label="Learning rate" value={0.5} min={0} max={1} step={0.1} onChange={() => undefined} />,
    );

    expect(html).toMatch(/role="slider"[^>]*aria-label="Learning rate"|aria-label="Learning rate"[^>]*role="slider"/);
    expect(html).toContain("0.5");
  });
});
