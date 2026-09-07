import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { services } from "@/lib/schedule";
import { track, events } from "@/lib/analytics";

/**
 * Three taps, one recommendation. Its real job is to move an undecided
 * visitor into the booking form with the right session already chosen.
 */
const questions = [
  {
    id: "where",
    prompt: "Where does it show up most?",
    options: [
      { label: "Lower back or hips", weight: { osteo: 2, physio: 1, breath: 0 } },
      { label: "Neck, shoulders, jaw", weight: { osteo: 1, physio: 1, breath: 1 } },
      { label: "A specific joint or old injury", weight: { osteo: 1, physio: 2, breath: 0 } },
      {
        label: "Nowhere exactly — I'm just wound tight",
        weight: { osteo: 0, physio: 0, breath: 3 },
      },
    ],
  },
  {
    id: "how-long",
    prompt: "How long has it been going on?",
    options: [
      { label: "Days or a couple of weeks", weight: { osteo: 2, physio: 1, breath: 0 } },
      { label: "Months", weight: { osteo: 1, physio: 2, breath: 1 } },
      { label: "Years, on and off", weight: { osteo: 2, physio: 1, breath: 1 } },
    ],
  },
  {
    id: "goal",
    prompt: "What would a good outcome look like?",
    options: [
      { label: "Understanding what's actually wrong", weight: { osteo: 3, physio: 0, breath: 0 } },
      { label: "Getting my movement back", weight: { osteo: 0, physio: 3, breath: 0 } },
      { label: "Sleeping and settling better", weight: { osteo: 0, physio: 0, breath: 3 } },
    ],
  },
] as const;

type Scores = { osteo: number; physio: number; breath: number };

const serviceFor = (scores: Scores) => {
  const top = (Object.keys(scores) as (keyof Scores)[]).reduce((best, key) =>
    scores[key] > scores[best] ? key : best,
  );
  const map: Record<keyof Scores, string> = {
    osteo: services[0]!.name,
    physio: services[1]!.name,
    breath: services[2]!.name,
  };
  return map[top];
};

export function Quiz({ onPick }: { onPick: (service: string) => void }) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Scores>({ osteo: 0, physio: 0, breath: 0 });

  const answer = (weight: { osteo: number; physio: number; breath: number }) => {
    const next: Scores = {
      osteo: scores.osteo + weight.osteo,
      physio: scores.physio + weight.physio,
      breath: scores.breath + weight.breath,
    };
    setScores(next);
    setStep((value) => value + 1);
    if (step === questions.length - 1) {
      track(events.quizCompleted, { suggested: serviceFor(next) });
    }
  };

  const reset = () => {
    setStep(0);
    setScores({ osteo: 0, physio: 0, breath: 0 });
  };

  const done = step >= questions.length;
  const suggested = serviceFor(scores);
  const detail = services.find((service) => service.name === suggested);

  return (
    <section id="quiz" className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-3xl bg-sand/40 p-8 shadow-lift md:p-12">
        <div className="text-center">
          <span className="font-hand text-2xl text-clay">start here</span>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Not sure which session?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/60">
            Three questions. No email required.
          </p>
        </div>

        {!done ? (
          <div className="mt-9">
            <div className="mb-6 flex items-center gap-2" aria-hidden="true">
              {questions.map((question, index) => (
                <span
                  key={question.id}
                  className={`h-1 flex-1 rounded-full ${index <= step ? "bg-clay" : "bg-ink/10"}`}
                />
              ))}
            </div>
            <h3 className="font-display text-xl font-bold">{questions[step]!.prompt}</h3>
            <div className="mt-5 grid gap-3">
              {questions[step]!.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => answer(option.weight)}
                  className="rounded-xl border border-ink/12 bg-cream px-5 py-4 text-left text-sm transition-colors hover:border-clay hover:text-clay"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-9 rounded-2xl bg-cream p-7 text-center shadow-lift">
            <span className="eyebrow">Most likely a fit</span>
            <h3 className="mt-2 font-display text-2xl font-bold text-clay">{suggested}</h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink/65">
              {detail?.detail}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-xs text-ink/45">
              This is a starting point, not a diagnosis. We confirm properly in the room.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="clay"
                onClick={() => {
                  onPick(suggested);
                  document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Book this session <ArrowRight />
              </Button>
              <Button variant="ghost" onClick={reset}>
                <RotateCcw /> Start again
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
