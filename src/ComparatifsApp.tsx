import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Sparkles,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";

// =====================================================
// Comparatifs Quest — version simplifiée (Home → Quiz)
// Objectifs:
// - Page 1: règles + bouton S’entraîner
// - Quiz: 20 questions, options mélangées, type affiché
// - Rappel: bouton dépliable (sans supprimer le bouton Retour)
// - Feedback: didactique (distracteur → fonction du distracteur → bonne forme + fonction)
// - Exceptions en rouge
// - Écran final: Revoir les réponses = affiche les réponses choisies + bouton Fermer
// - Layout: centré (évite espace noir/décalage à droite)
// =====================================================

type Option = { id: string; text: string };

type Question = {
  id: string;
  type: string;
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  acceptAlso?: string[];
};

type BuiltQuestion = Question & {
  options: Option[];
  correctId: string;
};

type Attempt = {
  id: string;
  type: string;
  prompt: string;
  chosen: string;
  correct: string;
  isCorrect: boolean;
  acceptAlso?: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// -------------------- QUESTIONS (20) --------------------
const RAW_QUESTIONS: Question[] = [
  {
    id: "q1",
    type: "infériorité (adverbe)",
    prompt: "Complète : Nous habitons ___ loin que vous.",
    correct: "moins",
    distractors: ["plus", "aussi", "autant"],
    explanation:
      "Avec un adverbe, on forme le comparatif avec moins / aussi / plus + adverbe + que.",
  },
  {
    id: "q2",
    type: "égalité (adverbe)",
    prompt: "Complète : Nous habitons ___ loin que vous.",
    correct: "aussi",
    distractors: ["moins", "plus", "autant"],
    explanation: "Avec un adverbe, l’égalité se forme avec aussi + adverbe + que.",
  },
  {
    id: "q3",
    type: "supériorité (adverbe)",
    prompt: "Complète : Nous habitons ___ loin que vous.",
    correct: "plus",
    distractors: ["moins", "aussi", "autant"],
    explanation: "Avec un adverbe, la supériorité se forme avec plus + adverbe + que.",
  },
  {
    id: "q4",
    type: "infériorité (adjectif)",
    prompt: "Complète : La chambre est ___ grande que l’autre.",
    correct: "moins",
    distractors: ["plus", "aussi", "autant"],
    explanation:
      "Avec un adjectif, on forme le comparatif avec moins / aussi / plus + adjectif + que.",
  },
  {
    id: "q5",
    type: "égalité (adjectif)",
    prompt: "Complète : La chambre est ___ grande que l’autre.",
    correct: "aussi",
    distractors: ["moins", "plus", "autant"],
    explanation: "Avec un adjectif, l’égalité se forme avec aussi + adjectif + que.",
  },
  {
    id: "q6",
    type: "supériorité (adjectif)",
    prompt: "Complète : La chambre est ___ grande que l’autre.",
    correct: "plus",
    distractors: ["moins", "aussi", "autant"],
    explanation: "Avec un adjectif, la supériorité se forme avec plus + adjectif + que.",
  },
  {
    id: "q7",
    type: "infériorité (verbe)",
    prompt: "Complète : Ils travaillent ___ que nous.",
    correct: "moins",
    distractors: ["plus", "autant", "aussi"],
    explanation: "Avec un verbe, le comparatif se forme avec moins / autant / plus + que.",
  },
  {
    id: "q8",
    type: "égalité (verbe)",
    prompt: "Complète : Ils travaillent ___ que nous.",
    correct: "autant",
    distractors: ["moins", "plus", "aussi"],
    explanation: "Avec un verbe, l’égalité se forme avec autant + que.",
  },
  {
    id: "q9",
    type: "supériorité (verbe)",
    prompt: "Complète : Ils travaillent ___ que nous.",
    correct: "plus",
    distractors: ["moins", "autant", "aussi"],
    explanation: "Avec un verbe, la supériorité se forme avec plus + que.",
  },
  {
    id: "q10",
    type: "infériorité (nom)",
    prompt: "Complète : Il y a ___ chambres que chez nous.",
    correct: "moins de",
    distractors: ["plus de", "autant de", "moins"],
    explanation: "Avec un nom, on utilise moins de / autant de / plus de + nom + que.",
  },
  {
    id: "q11",
    type: "égalité (nom)",
    prompt: "Complète : Il y a ___ chambres que chez nous.",
    correct: "autant de",
    distractors: ["moins de", "plus de", "aussi"],
    explanation: "Avec un nom, l’égalité se forme avec autant de + nom + que.",
  },
  {
    id: "q12",
    type: "supériorité (nom)",
    prompt: "Complète : Il y a ___ chambres que chez nous.",
    correct: "plus de",
    distractors: ["moins de", "autant de", "plus"],
    explanation: "Avec un nom, la supériorité se forme avec plus de + nom + que.",
  },
  {
    id: "q13",
    type: "superlatif de bon",
    prompt: "Complète : Ce four est ___ que l’ancien.",
    correct: "meilleur",
    distractors: ["plus bon", "mieux", "pire"],
    explanation: "bon → meilleur (forme irrégulière).",
  },
  {
    id: "q14",
    type: "superlatif de bien",
    prompt: "Complète : On vit ___ à la campagne.",
    correct: "mieux",
    distractors: ["meilleur", "plus bien", "pire"],
    explanation: "bien → mieux (forme irrégulière).",
  },
  {
    id: "q15",
    type: "superlatif de mal",
    prompt: "Complète : C’est ___ qu’avant.",
    correct: "pire",
    distractors: ["plus mal", "moins bien", "meilleur"],
    explanation: "mal → pire (souvent) / plus mal (possible selon le contexte).",
    acceptAlso: ["plus mal"],
  },
  {
    id: "q16",
    type: "infériorité (nom)",
    prompt: "Complète : Il y a ___ personnes que d’habitude.",
    correct: "moins de",
    distractors: ["moins", "autant de", "plus de"],
    explanation: "Avec un nom, on utilise moins de / autant de / plus de.",
  },
  {
    id: "q17",
    type: "égalité (verbe)",
    prompt: "Complète : Elle sort ___ que moi.",
    correct: "autant",
    distractors: ["aussi", "autant de", "plus"],
    explanation: "Avec un verbe, on dit autant (sans « de »).",
  },
  {
    id: "q18",
    type: "supériorité (adverbe)",
    prompt: "Complète : Il parle ___ vite que moi.",
    correct: "plus",
    distractors: ["moins", "aussi", "autant"],
    explanation: "Avec un adverbe, la supériorité se forme avec plus + adverbe + que.",
  },
  {
    id: "q19",
    type: "égalité (adjectif)",
    prompt: "Complète : Elles sont ___ motivées que vous.",
    correct: "aussi",
    distractors: ["autant", "plus", "moins"],
    explanation: "Avec un adjectif, l’égalité se forme avec aussi + adjectif + que.",
  },
  {
    id: "q20",
    type: "supériorité (nom)",
    prompt: "Complète : Il a ___ temps que moi.",
    correct: "plus de",
    distractors: ["plus", "autant de", "aussi"],
    explanation: "Avec un nom, la supériorité se forme avec plus de + nom.",
  },
];

function buildQuestions(): BuiltQuestion[] {
  return shuffle(
    RAW_QUESTIONS.map((q) => {
      const optionTexts = shuffle([q.correct, ...q.distractors]);
      const options: Option[] = optionTexts.map((t, i) => ({ id: `${q.id}_${i}`, text: t }));
      const correctId = options.find((o) => o.text === q.correct)?.id ?? options[0].id;
      return { ...q, options, correctId };
    })
  );
}

// -------------------- "Tests" sans framework --------------------
function runSelfTests() {
  console.assert(RAW_QUESTIONS.length === 20, "Il faut 20 questions");
  console.assert(
    RAW_QUESTIONS.every((q) => q.explanation.trim().length > 0),
    "Chaque question doit avoir une explanation"
  );

  const built = buildQuestions();
  console.assert(built.length === 20, "buildQuestions doit produire 20 questions");

  const ids = new Set(built.map((q) => q.id));
  console.assert(ids.size === 20, "Les IDs des questions doivent être uniques");

  for (const q of built) {
    console.assert(q.options.length >= 3, `Question ${q.id}: options insuffisantes`);
    console.assert(
      q.options.some((o) => o.text === q.correct),
      `Question ${q.id}: la bonne réponse doit être dans les options`
    );
    console.assert(!!q.correctId, `Question ${q.id}: correctId manquant`);

    const optIds = new Set(q.options.map((o) => o.id));
    console.assert(optIds.size === q.options.length, `Question ${q.id}: IDs d'options dupliqués`);
  }

  console.assert(/^q\d+$/.test(RAW_QUESTIONS[0].id), "IDs should look like q1, q2, ...");

  const q15 = RAW_QUESTIONS.find((q) => q.id === "q15");
  console.assert(!!q15?.acceptAlso?.length, "q15 doit accepter une alternative");
  console.assert(q15?.acceptAlso?.includes("plus mal"), "q15 doit accepter 'plus mal'");

  // mini-tests de logique feedback
  console.assert(getCategoryFromType("infériorité (nom)") === "nom", "Catégorie (nom) KO");
  console.assert(getRelationFromType("égalité (adverbe)") === "égalité", "Relation égalité KO");
  console.assert(getRelationFromChoice("moins") === "infériorité", "Relation choix moins KO");
  console.assert(getRelationFromChoice("autant de") === "égalité", "Relation choix autant de KO");
  console.assert(getRelationFromChoice("plus") === "supériorité", "Relation choix plus KO");
}

// -------------------- UI --------------------
const KEYWORDS = ["moins de", "autant de", "plus de", "moins", "autant", "aussi", "plus"];
const escapeRe = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
const splitRe = new RegExp(`(${KEYWORDS.map(escapeRe).join("|")})`, "gi");
const isKeywordRe = new RegExp(`^(${KEYWORDS.map(escapeRe).join("|")})$`, "i");

// -------------------- FEEDBACK LOGIC (didactique) --------------------
type Relation = "infériorité" | "égalité" | "supériorité" | "superlatif" | "autre";
type Category = "nom" | "verbe" | "adjectif" | "adverbe" | "autre";

function getRelationFromType(type: string): Relation {
  const t = type.toLowerCase();
  if (t.includes("superlatif")) return "superlatif";
  if (t.includes("infériorité")) return "infériorité";
  if (t.includes("égalité")) return "égalité";
  if (t.includes("supériorité")) return "supériorité";
  return "autre";
}

function getCategoryFromType(type: string): Category {
  const t = type.toLowerCase();
  if (t.includes("(nom)")) return "nom";
  if (t.includes("(verbe)")) return "verbe";
  if (t.includes("(adjectif)")) return "adjectif";
  if (t.includes("(adverbe)")) return "adverbe";
  if (t.includes("superlatif")) return "autre";
  return "autre";
}

function getRelationFromChoice(choice: string): Relation {
  const c = choice.toLowerCase().trim();
  if (["meilleur", "meilleure", "meilleurs", "meilleures", "mieux", "pire"].includes(c)) return "superlatif";
  if (c.startsWith("moins")) return "infériorité";
  if (c.startsWith("plus")) return "supériorité";
  if (c === "aussi" || c.startsWith("autant")) return "égalité";
  return "autre";
}

function categoryLabel(cat: Category) {
  if (cat === "nom") return "avec un nom";
  if (cat === "verbe") return "avec un verbe";
  if (cat === "adjectif") return "avec un adjectif";
  if (cat === "adverbe") return "avec un adverbe";
  return "";
}

function relationLabel(rel: Relation) {
  if (rel === "infériorité") return "l’infériorité";
  if (rel === "égalité") return "l’égalité";
  if (rel === "supériorité") return "la supériorité";
  if (rel === "superlatif") return "le superlatif";
  return "la comparaison";
}

function explainWrongChoice(type: string, chosen: string, correct: string): string {
  const targetRel = getRelationFromType(type);
  const targetCat = getCategoryFromType(type);
  const chosenRel = getRelationFromChoice(chosen);

  // Cas “forme” (de / pas de, aussi/autant) très fréquents
  const chosenL = chosen.toLowerCase();
  const correctL = correct.toLowerCase();

  // NOM: besoin de "de"
  if (targetCat === "nom") {
    if (!chosenL.includes(" de") && correctL.includes(" de")) {
      return `Tu as choisi « ${chosen} ». Avec un nom, on utilise une forme avec « de » : on dit « ${correct} » + nom (pour exprimer ${relationLabel(targetRel)}).`;
    }
    if (chosenL.includes(" de") && !correctL.includes(" de")) {
      return `Tu as choisi « ${chosen} ». Ici, on n’utilise pas « de » : on choisit « ${correct} » (pour exprimer ${relationLabel(targetRel)}).`;
    }
  }

  // VERBE: pas de "de"
  if (targetCat === "verbe" && chosenL.includes(" de")) {
    return `Tu as choisi « ${chosen} ». Avec un verbe, on ne met pas « de » : on dit « ${correct} » + que.`;
  }

  // ADJ/ADV: égalité = aussi (pas autant)
  if ((targetCat === "adjectif" || targetCat === "adverbe") && targetRel === "égalité" && chosenL === "autant") {
    return `Tu as choisi « ${chosen} ». Pour exprimer l’égalité ${categoryLabel(targetCat)}, on utilise « aussi » (pas « autant »).`;
  }

  // VERBE: égalité = autant (pas aussi)
  if (targetCat === "verbe" && targetRel === "égalité" && chosenL === "aussi") {
    return `Tu as choisi « ${chosen} ». Pour exprimer l’égalité avec un verbe, on utilise « autant » (pas « aussi »).`;
  }

  // Superlatifs irréguliers
  if (targetRel === "superlatif") {
    return `Tu as choisi « ${chosen} ». Ici, on utilise une forme irrégulière (superlatif/comparatif irrégulier) : la bonne forme est « ${correct} ».`;
  }

  // Générique: fonction du distracteur
  const catTxt = categoryLabel(targetCat);
  return `Tu as choisi « ${chosen} ». « ${chosen} » sert plutôt à exprimer ${relationLabel(chosenRel)} ${catTxt}.`;
}

function explainCorrectChoice(type: string, correct: string): string {
  const targetRel = getRelationFromType(type);
  const targetCat = getCategoryFromType(type);
  const catTxt = categoryLabel(targetCat);

  if (targetRel === "superlatif") {
    return `Pour cette phrase, on utilise la forme irrégulière « ${correct} » (superlatif/comparatif irrégulier).`;
  }

  return `Pour exprimer ${relationLabel(targetRel)} ${catTxt}, on utilise « ${correct} ».`;
}

// -------------------- RULE CARD --------------------
function RuleCard({ title, subtitle, lines }: { title: string; subtitle: string; lines: string[] }) {
  const isException = title.toLowerCase().includes("exception");

  const colorByLine = (line: string) => {
    if (isException) return "text-red-600";
    if (line.startsWith("Infériorité")) return "text-slate-900";
    if (line.startsWith("Égalité")) return "text-blue-800";
    if (line.startsWith("Supériorité")) return "text-orange-600";
    return "text-slate-800";
  };

  const keywordClass = (token: string) => {
    if (isException) return "font-bold text-red-600";
    const t = token.toLowerCase();
    if (t === "moins" || t === "moins de") return "font-bold text-slate-900";
    if (t === "aussi" || t === "autant" || t === "autant de") return "font-bold text-blue-800";
    if (t === "plus" || t === "plus de") return "font-bold text-orange-600";
    return "font-bold";
  };

  const highlightKeywords = (text: string): ReactNode[] => {
    const parts = text.split(splitRe).filter((p) => p !== "");
    return parts.map((part, idx) => {
      if (isKeywordRe.test(part)) {
        return (
          <span key={`${title}_${idx}`} className={keywordClass(part)}>
            {part}
          </span>
        );
      }
      return <span key={`${title}_${idx}`}>{part}</span>;
    });
  };

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4">
      <div className={`font-bold ${isException ? "text-red-600" : "text-slate-900"}`}>{title}</div>
      <div className={`text-sm ${isException ? "text-red-500" : "text-slate-600"}`}>{subtitle}</div>
      <ul className="mt-3 list-disc pl-5 text-sm space-y-1">
        {lines.map((l, i) => (
          <li key={i} className={colorByLine(l)}>
            {isException ? <span className="font-bold">{l}</span> : highlightKeywords(l)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ComparatifsApp() {
  const [showRappel, setShowRappel] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [view, setView] = useState<"home" | "quiz" | "end">("home");
  const [seed, setSeed] = useState(0);

  const questions = useMemo(() => buildQuestions(), [seed]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);

  const q = questions[index];
  const total = questions.length;

  const focusRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    runSelfTests();
  }, []);

  useEffect(() => {
    focusRef.current?.focus();
  }, [view]);

  useEffect(() => {
    setShowRappel(false);
  }, [index, view, seed]);

  useEffect(() => {
    if (view !== "end") setShowReview(false);
  }, [view]);

  function start() {
    setView("quiz");
  }

  function resetSession() {
    setSeed((s) => s + 1);
    setView("home");
    setIndex(0);
    setSelected(null);
    setSubmitted(false);
    setScore(0);
    setXp(0);
    setShowRappel(false);
    setShowReview(false);
    setAttempts([]);
  }

  const selectedTextNow = (() => {
    if (!q || !selected) return "";
    return q.options.find((o) => o.id === selected)?.text ?? "";
  })();

  const isCorrectNow = (() => {
    if (!submitted || !q || !selected) return null;
    return selected === q.correctId || (q.acceptAlso ?? []).includes(selectedTextNow);
  })();

  function verify() {
    if (!q || !selected || submitted) return;
    setSubmitted(true);

    const ok = selected === q.correctId || (q.acceptAlso ?? []).includes(selectedTextNow);

    setAttempts((prev) => {
      if (prev.some((a) => a.id === q.id)) return prev;
      return [
        ...prev,
        {
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          chosen: selectedTextNow,
          correct: q.correct,
          isCorrect: ok,
          acceptAlso: q.acceptAlso,
        },
      ];
    });

    if (ok) {
      setScore((s) => s + 1);
      setXp((x) => x + 25);
    } else {
      setXp((x) => x + 5);
    }
  }

  function next() {
    setSubmitted(false);
    setSelected(null);
    setIndex((i) => {
      const nextIndex = i + 1;
      if (nextIndex >= total) {
        setView("end");
        return i;
      }
      return nextIndex;
    });
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-2 ring-1 ring-slate-200">
              <Zap className="h-6 w-6 text-slate-900 shrink-0" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Comparatifs Quest</h1>
          </div>

          <div className="flex gap-3 text-sm">
            <span className="flex items-center gap-1 rounded-full bg-white px-3 py-2 ring-1 ring-slate-200 text-slate-900 font-semibold">
              <Sparkles className="h-4 w-4 text-slate-700 shrink-0" /> XP {xp}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white px-3 py-2 ring-1 ring-slate-200 text-slate-900 font-semibold">
              <Trophy className="h-4 w-4 text-slate-700 shrink-0" /> Score {score}/{total}
            </span>
          </div>
        </div>

        {/* HOME */}
        {view === "home" ? (
          <div className="grid gap-6">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-slate-900 shrink-0" />
                <div className="text-xl font-semibold text-slate-900">Tableau express des comparatifs</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">Lis ce résumé, puis clique sur S’entraîner.</div>

              <div className="mt-5 grid md:grid-cols-2 gap-4">
                <RuleCard
                  title="Adverbe / Adjectif"
                  subtitle="moins / aussi / plus … que"
                  lines={["Infériorité → moins … que", "Égalité → aussi … que", "Supériorité → plus … que"]}
                />
                <RuleCard
                  title="Verbe"
                  subtitle="moins / autant / plus que"
                  lines={["Infériorité → moins que", "Égalité → autant que", "Supériorité → plus que"]}
                />
                <RuleCard
                  title="Nom"
                  subtitle="moins / autant / plus de … que"
                  lines={[
                    "Infériorité → moins de … que",
                    "Égalité → autant de … que",
                    "Supériorité → plus de … que",
                  ]}
                />
                <RuleCard
                  title="Exceptions"
                  subtitle="formes irrégulières"
                  lines={[
                    "bon(ne) → meilleur(e)",
                    "mauvais(e) → pire / plus mauvais(e)",
                    "bien → mieux",
                    "mal → pire / plus mal",
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
              <button
                ref={focusRef}
                onClick={start}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-sky-500 py-3 text-white font-semibold shadow-sm hover:opacity-95"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <ArrowRight className="h-4 w-4 text-white shrink-0" /> S’entraîner
                </span>
              </button>

              <button
                onClick={resetSession}
                className="w-full rounded-2xl bg-white py-3 text-slate-700 font-semibold ring-1 ring-slate-200 hover:bg-slate-100"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-slate-700 shrink-0" /> Reset session
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {/* QUIZ */}
        {view === "quiz" && q ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
              <div className="text-sm text-slate-500">
                Question {index + 1} / {total}
              </div>

              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-base font-semibold text-slate-900">{q.type}</div>
                <div className="mt-2 text-lg font-bold text-slate-900">{q.prompt}</div>
              </div>

              <div className="grid gap-2">
                {q.options.map((o) => {
                  const checked = selected === o.id;
                  return (
                    <button
                      key={o.id}
                      disabled={submitted}
                      onClick={() => setSelected(o.id)}
                      className={`rounded-xl p-4 text-left text-lg font-bold transition ring-1 ${
                        checked
                          ? "bg-slate-900 text-white ring-slate-900"
                          : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50"
                      } ${submitted ? "opacity-95" : ""}`}
                    >
                      {o.text}
                    </button>
                  );
                })}
              </div>

              {!submitted ? (
                <button
                  onClick={verify}
                  disabled={!selected}
                  className={`rounded-xl px-4 py-2 font-semibold ring-1 ${
                    selected
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-slate-100 text-slate-400 ring-slate-200"
                  }`}
                >
                  Vérifier
                </button>
              ) : null}

              {submitted ? (
                <div
                  className={`rounded-xl p-4 ring-1 ${
                    isCorrectNow ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{isCorrectNow ? "Bravo !" : "Attention !"}</div>
                    {isCorrectNow ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  </div>

                  {/* ✅ Feedback didactique : distracteur → fonction → bonne forme */}
                  <div className="mt-2 text-base font-bold text-slate-900">
                    {isCorrectNow ? (
                      <>
                        Bravo ! Tu as choisi <span className="underline">{selectedTextNow}</span>.
                      </>
                    ) : (
                      <>
                        Attention ! Tu as choisi <span className="underline">{selectedTextNow}</span>.
                      </>
                    )}
                  </div>

                  <div className="mt-2 text-sm text-slate-700">
                    {isCorrectNow ? (
                      <>
                        <div>{explainCorrectChoice(q.type, q.correct)}</div>
                        <div className="mt-1">{q.explanation}</div>
                      </>
                    ) : (
                      <>
                        <div>{explainWrongChoice(q.type, selectedTextNow, q.correct)}</div>
                        <div className="mt-2 font-semibold">{explainCorrectChoice(q.type, q.correct)}</div>
                        <div className="mt-1">{q.explanation}</div>
                      </>
                    )}
                  </div>

                  {q.acceptAlso?.length ? (
                    <div className="mt-2 text-xs text-slate-600">On accepte aussi : {q.acceptAlso.join(" / ")}</div>
                  ) : null}

                  <button
                    onClick={next}
                    className={`mt-4 w-full rounded-xl px-4 py-2 font-semibold ring-1 text-white ${
                      isCorrectNow ? "bg-emerald-600 ring-emerald-600" : "bg-rose-600 ring-rose-600"
                    }`}
                  >
                    Suivant
                  </button>
                </div>
              ) : null}
            </div>

            {/* Side panel */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
              <button
                onClick={() => setShowRappel((v) => !v)}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 flex items-center justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-700 shrink-0" /> Rappel
                </span>
                {showRappel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showRappel ? (
                <div className="mt-4 text-sm text-slate-700 space-y-2">
                  <div>
                    Adj/Adv : <span className="font-semibold">moins / aussi / plus</span> …{" "}
                    <span className="font-semibold">que</span>
                  </div>
                  <div>
                    Verbe : verbe + <span className="font-semibold">moins / autant / plus</span>{" "}
                    <span className="font-semibold">que</span>
                  </div>
                  <div>
                    Nom : <span className="font-semibold">moins de / autant de / plus de</span> …{" "}
                    <span className="font-semibold">que</span>
                  </div>
                  <div>
                    Exceptions : <span className="font-semibold">meilleur / pire / mieux</span>
                  </div>
                </div>
              ) : null}

              <button
                onClick={() => setView("home")}
                className="mt-5 w-full rounded-xl bg-white px-4 py-2 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                Retour aux règles
              </button>
            </div>
          </div>
        ) : null}

        {/* END SCREEN */}
        {view === "end" ? (
          <div className="max-w-3xl mx-auto rounded-2xl bg-white ring-1 ring-slate-200 p-8 text-center space-y-6">
            <h2 className="text-2xl font-black text-slate-900">🎉 Bravo, exercice terminé !</h2>

            <div className="flex justify-center gap-6 text-lg flex-wrap">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <Trophy className="h-5 w-5" /> Score : <span className="font-bold">{score} / {total}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <Sparkles className="h-5 w-5" /> XP : <span className="font-bold">{xp}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowReview((v) => !v)}
                className={`w-full rounded-xl px-4 py-3 font-semibold ring-1 ${
                  showReview
                    ? "bg-white text-slate-700 ring-slate-200 hover:bg-slate-100"
                    : "bg-slate-900 text-white ring-slate-900 hover:opacity-95"
                }`}
              >
                {showReview ? "Fermer la révision" : "Revoir les réponses"}
              </button>

              <button
                onClick={resetSession}
                className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                Retour au tableau des règles
              </button>
            </div>

            {showReview ? (
              <div className="mt-4 text-left">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-bold text-slate-900">Révision — réponses de l’étudiant</div>
                  <button
                    onClick={() => setShowReview(false)}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
                  >
                    Fermer
                  </button>
                </div>

                <div className="grid gap-3">
                  {attempts.length ? (
                    attempts.map((a, i) => (
                      <div
                        key={`${a.id}_${i}`}
                        className={`rounded-xl p-4 ring-1 ${
                          a.isCorrect ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm text-slate-600">
                              {i + 1}. {a.type}
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">{a.prompt}</div>
                          </div>
                          {a.isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        </div>

                        <div className="mt-3 text-sm">
                          <div>
                            Réponse choisie : <span className="font-bold">{a.chosen || "(aucune)"}</span>
                          </div>
                          <div>
                            Bonne réponse : <span className="font-bold">{a.correct}</span>
                            {a.acceptAlso?.length ? (
                              <span className="text-slate-600"> — accepté aussi : {a.acceptAlso.join(" / ")}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 text-slate-700">
                      Aucune réponse enregistrée pour cette session.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 pb-10 text-center text-xs text-slate-500">© Comparatifs Quest</div>
      </div>
    </div>
  );
}
