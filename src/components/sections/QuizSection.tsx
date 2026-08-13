"use client";

import { useState } from "react";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "How many usable hosts does a /26 subnet have?",
    options: ["64", "62 (2⁶ − 2)", "126"],
    correctIndex: 1,
    explanation:
      "A /26 prefix leaves 6 host bits (32 - 26 = 6). Total IP addresses = 2⁶ = 64. Subtracting 2 for Network ID and Broadcast ID leaves 62 usable host IPs.",
  },
  {
    id: 2,
    question: "What is the broadcast address of 192.168.1.64/26?",
    options: ["192.168.1.64", "192.168.1.255", "192.168.1.127"],
    correctIndex: 2,
    explanation:
      "With a block size of 64 (256 - 192 = 64), the /26 subnet starting at 192.168.1.64 spans up to 192.168.1.127. The highest address in the block (.127) is the broadcast address.",
  },
  {
    id: 3,
    question: "Which subnet mask matches /27?",
    options: ["255.255.255.224", "255.255.255.240", "255.255.255.192"],
    correctIndex: 0,
    explanation:
      "/27 means 27 network bits are set to 1. In the 4th octet, 3 network bits are 1 (11100000 = 128 + 64 + 32 = 224), giving 255.255.255.224.",
  },
  {
    id: 4,
    question: "In VLSM, why should you allocate subnets from largest to smallest?",
    options: [
      "It's faster to configure",
      "To avoid address overlap",
      "Smaller subnets have lower latency",
    ],
    correctIndex: 1,
    explanation:
      "Allocating larger subnets first ensures naturally aligned boundary offsets, preventing overlapping subnets and fragmentation of available IP space in VLSM.",
  },
  {
    id: 5,
    question: "What does NAT stand for?",
    options: [
      "Network Address Transfer",
      "Network Access Translation",
      "Network Address Translation",
    ],
    correctIndex: 2,
    explanation:
      "NAT stands for Network Address Translation. It re-maps private local IP addresses to public global IP addresses at the router or firewall edge.",
  },
  {
    id: 6,
    question: "How many subnets do you get by borrowing 3 bits from a /24?",
    options: ["3", "8 (2³)", "6"],
    correctIndex: 1,
    explanation:
      "Borrowing 3 bits creates 2³ = 8 subnets (moving from a /24 to a /27 network prefix).",
  },
  {
    id: 7,
    question: "Which address is outside the conventional host range of 192.168.1.0/30?",
    options: ["192.168.1.1", "192.168.1.4", "192.168.1.2"],
    correctIndex: 1,
    explanation:
      "The /30 block 192.168.1.0–.3 has .0 as the network address, .1 and .2 as conventional host addresses, and .3 as the directed-broadcast address. .4 starts the next /30 block.",
  },
  {
    id: 8,
    question: "What is the primary purpose of a VLAN?",
    options: [
      "Increase internet speed",
      "Assign IP addresses automatically",
      "Segment traffic at Layer 2",
    ],
    correctIndex: 2,
    explanation:
      "A VLAN (Virtual Local Area Network) partitions network traffic at Layer 2 (Data Link layer), dividing physical switch ports into isolated logical broadcast domains.",
  },
];

export default function QuizSection() {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: optIdx,
    }));
  };

  const handleReset = () => {
    setSelectedAnswers({});
  };

  const score = QUESTIONS.reduce((acc, q, idx) => {
    return selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc;
  }, 0);

  return (
    <section
      id="quiz"
      className="scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 text-[11px] font-semibold">
          #quiz
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">◉</span>
          23. Test Your Knowledge
        </h2>
      </div>

      <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-8 max-w-4xl">
        Click an answer to check it. Your score is tracked at the bottom.
      </p>

      {/* Quiz Questions List */}
      <div className="space-y-6 mb-10">
        {QUESTIONS.map((q, qIdx) => {
          const isAnswered = selectedAnswers[qIdx] !== undefined;
          const selectedOpt = selectedAnswers[qIdx];
          const isCorrectChoice = selectedOpt === q.correctIndex;

          return (
            <div
              key={q.id}
              className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5 sm:p-6 transition-all space-y-4"
            >
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                Q{q.id} — {q.question}
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {q.options.map((opt, optIdx) => {
                  let buttonStyle =
                    "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-800";
                  let icon = null;

                  if (isAnswered) {
                    if (optIdx === q.correctIndex) {
                      buttonStyle =
                        "bg-emerald-500/15 border-emerald-400 text-emerald-600 dark:text-emerald-400 font-semibold";
                      icon = <span className="ml-auto text-emerald-600 dark:text-emerald-400 font-bold">✓</span>;
                    } else if (optIdx === selectedOpt) {
                      buttonStyle =
                        "bg-[#ff7b72]/15 border-rose-400 text-rose-600 dark:text-rose-400 font-semibold";
                      icon = <span className="ml-auto text-rose-600 dark:text-rose-400 font-bold">✕</span>;
                    } else {
                      buttonStyle =
                        "bg-slate-50/50 dark:bg-slate-700/50 border-slate-200/50 text-slate-500 dark:text-slate-400 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(qIdx, optIdx)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between text-sm sm:text-base cursor-pointer ${buttonStyle}`}
                    >
                      <span>{opt}</span>
                      {icon}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Block */}
              {isAnswered && (
                <div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow text-sm space-y-1.5 animate-fadeIn">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {isCorrectChoice ? (
                      <span className="text-emerald-600 dark:text-emerald-400">✓ Correct!</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">
                        ✕ Incorrect.{" "}
                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                          Correct answer:{" "}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {q.options[q.correctIndex]}
                          </strong>
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Score Counter Card */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 text-center max-w-md mx-auto space-y-4 shadow-lg">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your Score</h3>
        <div id="quizScore" className="text-4xl sm:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
          {score} / {QUESTIONS.length}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {score === QUESTIONS.length
            ? "🎉 Outstanding! You answered all questions correctly!"
            : score >= 5
            ? "Great job! Keep practicing to master all networking concepts."
            : "Keep practicing! Review the sections above and try again."}
        </p>
        <button
          onClick={handleReset}
          className="px-6 py-2.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-sm transition-colors cursor-pointer shadow-md"
        >
          Reset Quiz
        </button>
      </div>
    </section>
  );
}
