import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import NetworkingExample from "./NetworkingExample";
import NetworkingMetric from "./NetworkingMetric";
import NetworkingModuleHeader from "./NetworkingModuleHeader";
import NetworkingPanel from "./NetworkingPanel";
import NetworkingTable from "./NetworkingTable";

describe("networking presentational primitives", () => {
  it("renders each panel variant as a semantic networking surface", () => {
    expect(renderToStaticMarkup(<NetworkingPanel>Default</NetworkingPanel>)).toContain(
      'data-networking-panel="default"',
    );
    expect(renderToStaticMarkup(<NetworkingPanel variant="console">Console</NetworkingPanel>)).toContain(
      'data-networking-panel="console"',
    );
    expect(renderToStaticMarkup(<NetworkingPanel variant="muted">Muted</NetworkingPanel>)).toContain(
      'data-networking-panel="muted"',
    );
  });

  it("renders worked-example content and preserves its footer", () => {
    const html = renderToStaticMarkup(
      <NetworkingExample title="Worked Example" footer={<span>Check the result</span>}>
        Example body
      </NetworkingExample>,
    );

    expect(html).toContain('data-networking-example="true"');
    expect(html).toContain("SIGNAL / WORKED EXAMPLE");
    expect(html).toContain("Worked Example");
    expect(html).toContain("Example body");
    expect(html).toContain("Check the result");
  });

  it("renders metric labels, values, and interpretation", () => {
    const html = renderToStaticMarkup(
      <NetworkingMetric label="Usable hosts" value="254" detail="/24" />,
    );

    expect(html).toContain('data-networking-metric="true"');
    expect(html).toContain("Usable hosts");
    expect(html).toContain("254");
    expect(html).toContain("/24");
  });

  it("renders a header without inventing module identity or state", () => {
    const html = renderToStaticMarkup(
      <NetworkingModuleHeader
        anchor="01 / ADDRESSING"
        icon={<span aria-hidden="true">⌁</span>}
        title="Addressing"
        description="Understand the address space."
        meta={<span>4 labs</span>}
      />,
    );

    expect(html).toContain('data-networking-header="true"');
    expect(html).toContain("01 / ADDRESSING");
    expect(html).toContain("Addressing");
    expect(html).toContain("Understand the address space.");
    expect(html).toContain("4 labs");
    expect(html).not.toContain("module-id");
  });

  it("keeps table markup supplied by callers inside an overflow-safe wrapper", () => {
    const html = renderToStaticMarkup(
      <NetworkingTable>
        <table>
          <tbody>
            <tr>
              <td>10.0.0.0/24</td>
            </tr>
          </tbody>
        </table>
      </NetworkingTable>,
    );

    expect(html).toContain('class="networking-table"');
    expect(html).toContain("<table>");
    expect(html).toContain("10.0.0.0/24");
  });
});
