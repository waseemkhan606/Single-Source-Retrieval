/**
 * Tests for parseQuizMCQ — the most fragile piece of frontend logic.
 * Covers the various formats Gemini actually outputs.
 */

// Copy of the parser (kept in sync with ChatInterface.tsx)
function parseQuizMCQ(text: string) {
  type Q = { question: string; options: string[]; correctIndex: number };
  const questions: Q[] = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  let cur: Q | null = null;

  const push = () => {
    if (cur && cur.options.length >= 2 && cur.correctIndex >= 0) questions.push(cur);
  };

  for (const line of lines) {
    const qMatch = line.match(/^\*{0,2}(\d+)[.)]\*{0,2}\s+\*{0,2}(.+?)\*{0,2}\s*\??$/);
    if (qMatch) { push(); cur = { question: qMatch[2].trim(), options: [], correctIndex: -1 }; continue; }

    if (!cur) continue;

    const optMatch = line.match(/^\*{0,2}([A-D])[.)]\*{0,2}\s+\*{0,2}(.+?)\*{0,2}\s*$/i);
    if (optMatch) { cur.options.push(optMatch[2].trim()); continue; }

    const correctMatch = line.match(/(?:correct(?:\s+answer)?|answer)[:\s]+\*{0,2}([A-D])\b/i);
    if (correctMatch) cur.correctIndex = ["A","B","C","D"].indexOf(correctMatch[1].toUpperCase());
  }
  push();

  return questions.length >= 2 ? questions : null;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PLAIN_FORMAT = `
1. What is supervised learning?
A) Learning without labels
B) Learning with labelled data
C) Unsupervised clustering
D) Reinforcement signals
Correct: B

2. What does overfitting mean?
A) Model too simple
B) Model memorises training data
C) Low training error
D) High bias problem
Correct: B

3. What is a neural network?
A) A type of database
B) A sorting algorithm
C) A model inspired by the brain
D) A clustering technique
Correct: C
`;

const BOLD_FORMAT = `
**1.** What is machine learning?
**A)** A programming language
**B)** A type of AI that learns from data
**C)** A database system
**D)** An operating system
**Correct Answer: B**

**2.** What is a decision tree?
**A)** A graph traversal algorithm
**B)** A file system structure
**C)** A flowchart-like model
**D)** A neural architecture
**Correct Answer: C**

**3.** What does gradient descent do?
**A)** Increases the loss
**B)** Minimises the loss function
**C)** Selects features
**D)** Normalises data
**Correct Answer: B**
`;

const BLANK_LINES_FORMAT = `
1. What is precision?

A) True positives / all positives predicted

B) True positives / all actual positives

C) False positives / all negatives

D) Accuracy on test set

Correct: A

2. What is recall?

A) True positives / all positives predicted

B) True positives / all actual positives

C) Specificity

D) F1 Score

Correct: B

3. What is the F1 score?

A) Sum of precision and recall

B) Product of precision and recall

C) Harmonic mean of precision and recall

D) Geometric mean of accuracy and loss

Correct: C
`;

const ANSWER_FORMAT = `
1. What is cross-validation?
A) A method of data augmentation
B) A technique to estimate model performance
C) A regularisation method
D) A feature selection approach
Answer: B

2. What is regularisation?
A) Data normalisation
B) A technique to reduce overfitting
C) A loss function
D) A training optimizer
Answer: B

3. What is a hyperparameter?
A) A parameter learned from data
B) A configuration set before training
C) An output of the model
D) A gradient value
Answer: B
`;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("parseQuizMCQ", () => {
  test("parses plain numbered format", () => {
    const result = parseQuizMCQ(PLAIN_FORMAT);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
    expect(result![0].question).toBe("What is supervised learning");
    expect(result![0].options).toHaveLength(4);
    expect(result![0].correctIndex).toBe(1); // B = index 1
  });

  test("parses bold **1.** format", () => {
    const result = parseQuizMCQ(BOLD_FORMAT);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
    expect(result![1].correctIndex).toBe(2); // C = index 2
  });

  test("parses format with blank lines between options", () => {
    const result = parseQuizMCQ(BLANK_LINES_FORMAT);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
    expect(result![0].correctIndex).toBe(0); // A = index 0
  });

  test("parses 'Answer: B' variant", () => {
    const result = parseQuizMCQ(ANSWER_FORMAT);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
  });

  test("returns null for plain summary text", () => {
    const summary = `
The document covers three main topics:
1. Introduction to machine learning
2. Key algorithms and approaches
3. Evaluation and deployment

Machine learning is a subfield of artificial intelligence.
    `;
    expect(parseQuizMCQ(summary)).toBeNull();
  });

  test("returns null for fewer than 2 valid questions", () => {
    const oneQ = `
1. What is AI?
A) Option A
B) Option B
C) Option C
D) Option D
Correct: A
    `;
    expect(parseQuizMCQ(oneQ)).toBeNull();
  });

  test("skips questions missing correct answer", () => {
    const mixed = `
1. Question with no answer?
A) One
B) Two
C) Three
D) Four

2. Valid question?
A) Alpha
B) Beta
C) Gamma
D) Delta
Correct: C

3. Another valid question?
A) Yes
B) No
C) Maybe
D) Never
Correct: A
    `;
    const result = parseQuizMCQ(mixed);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2); // Q1 skipped (no Correct:)
  });

  test("options are correctly stripped of bold markers", () => {
    const result = parseQuizMCQ(BOLD_FORMAT);
    expect(result![0].options[0]).toBe("A programming language");
    expect(result![0].options[1]).toBe("A type of AI that learns from data");
  });
});