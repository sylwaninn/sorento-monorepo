import { applicableQuestions, DIAGNOSTIC_QUESTIONS } from "@sorento/core";
import type { DiagnosticAnswers } from "@sorento/domain";

// Going back and changing a branching answer must remove answers to questions
// that are no longer visible. Keeping them would let hidden data influence
// eligibility, exports and a later visit to the form.
export const pruneInapplicableAnswers = (answers: DiagnosticAnswers): DiagnosticAnswers => {
  const next = { ...answers };

  for (;;) {
    const applicableIds = new Set(applicableQuestions(next).map((question) => question.id));
    const staleIds = DIAGNOSTIC_QUESTIONS.map((question) => question.id).filter(
      (id) => id in next && !applicableIds.has(id),
    );
    if (staleIds.length === 0) return next;

    for (const id of staleIds) delete next[id];
  }
};
