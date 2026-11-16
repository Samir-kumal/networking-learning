import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuizRunner } from "./QuizRunner";

describe("QuizRunner accessibility", () => {
  it("groups multiple-choice options under a legend carrying the question prompt", () => {
    const html = renderToStaticMarkup(
      <QuizRunner
        quiz={{
          id: "q1",
          questions: [
            {
              id: "question-a",
              kind: "mcq",
              prompt: "Which layer does TCP live on?",
              options: ["Transport", "Network"],
            },
          ],
        }}
        onPassed={() => undefined}
      />,
    );

    expect(html).toMatch(/<fieldset[^>]*>\s*<legend[^>]*>Which layer does TCP live on\?<\/legend>/);
    expect(html.match(/type="radio"/g)).toHaveLength(2);
  });
});
