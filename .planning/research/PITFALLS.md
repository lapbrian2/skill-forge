# Domain Pitfalls

**Domain:** AI-powered engineering specification generator
**Researched:** 2026-02-20
**Overall Confidence:** HIGH (grounded in analysis of the actual failed codebase + deep LLM application domain knowledge)

---

## Critical Pitfalls

Mistakes that cause rewrites, user abandonment, or outputs nobody trusts.

---

### Pitfall 1: The Generic Output Trap — LLM Outputs That Could Be About Anything

**What goes wrong:** The AI generates specifications that read like textbook templates rather than blueprints for the user's specific app. Outputs contain real-sounding but interchangeable prose: "The system will handle authentication using industry best practices" instead of "Users authenticate via magic link email (no passwords). The `auth/magic-link` endpoint generates a 6-character alphanumeric code, valid for 10 minutes, stored in `magic_link_tokens` table with columns: id (uuid), user_id (uuid FK), code (varchar(6)), expires_at (timestamptz), used_at (timestamptz nullable)."

**Why it happens:** This is the single most important pitfall for Skill Forge. Root causes:

1. **Insufficient context density in the prompt.** The current `promptGenerateSpec()` passes `project` as a serialized string blob. The LLM sees a wall of text with no hierarchy of what matters most. It generates safe, generic prose to cover its uncertainty.

2. **Discovery questions gather opinions, not facts.** Current prompts ask "what do you want?" instead of gathering the concrete nouns the spec needs: entity names, field names, user roles, screen names, third-party services. The user says "I want a task manager" and the AI writes generic task manager prose because it was never told the tasks are called "missions," they have deadlines and point values, and they're assigned to "squads."

3. **No grounding examples in the system prompt.** The `SYSTEM_GENERATOR` prompt says "be specific" but never shows what specific looks like. Without few-shot examples of the exact specificity level expected, the LLM defaults to its training distribution — which is mediocre documentation, not elite engineering specs.

4. **Single-pass generation.** One LLM call produces the entire spec. This is like asking an architect to design a building in one breath. Complex sections (data models, API contracts) need dedicated generation with section-specific prompts that can focus entirely on getting the details right.

**Consequences:** Users say "the outputs are bad." They paste the spec into Claude Code and immediately start a back-and-forth clarification session — which is exactly what the spec was supposed to prevent. The tool provides no value over just talking to Claude directly.

**Prevention:**

1. **Structured context injection:** Don't pass a blob. Build the prompt with clearly labeled sections: `## ENTITIES THE USER NAMED: [list]`, `## USER FLOWS DESCRIBED: [list]`, `## DECISIONS MADE: [list]`. Give the LLM organized facts, not a conversation transcript.

2. **Mine concrete nouns during discovery.** Every discovery question should extract at least one proper noun, data type, or constraint. "What do users create in your app?" -> captures entity names. "What happens when X fails?" -> captures error flows. The discovery phase succeeds when you have a glossary of 20+ specific terms the user actually used.

3. **Few-shot the system prompt.** Include 2-3 examples of a BAD generic spec section vs a GOOD specific one. The contrast is more powerful than any instruction.

4. **Section-by-section generation.** Generate data models separately from API specs separately from user flows. Each section gets a focused prompt with only the context relevant to that section. Then stitch them together with a consistency pass.

5. **Echo back the user's own words.** The spec should use terminology the user introduced during discovery. If they said "recipes" not "items," the spec says "recipes." This alone makes outputs feel 10x more specific.

**Detection (warning signs):**
- You could swap the app name in the spec and it would still make sense for a different app
- The spec uses generic entity names like "Item," "User," "Record" instead of domain-specific names
- Error handling sections say "display appropriate error message" instead of naming the exact message
- Data models have fewer than 4 fields per entity

**Which phase should address it:** Phase 1 (Foundation) for few-shot prompt engineering. Phase 2 (Discovery Flow) for concrete noun extraction. Phase 3 (Spec Generation) for section-by-section generation.

---

### Pitfall 2: The Form Interrogation Anti-Pattern — UX That Feels Like Work

**What goes wrong:** The app presents the user with a series of mandatory questions they must answer one by one, creating the sensation of filling out a bureaucratic form rather than having a productive conversation. The user came to get help thinking through their idea, but instead they're doing the hard thinking themselves while the AI asks questions.

**Why it happens:**

1. **The AI asks but doesn't contribute.** In the current design, the AI generates a question, the user answers it, and the AI generates the next question. The AI is an interviewer, not a collaborator. It never says "Based on what you've told me, I think your data model should look like this — does that match your thinking?" It just asks and records.

2. **Linear question flow with no escape velocity.** The user must answer N questions before anything useful happens. There's no progressive output — no partial spec forming as they answer. They're depositing answers into a black box with a promise of output later.

3. **Questions don't feel earned.** The user doesn't understand why question 7 matters. Even though the current prompts include a "why" field, the questions themselves feel like a checklist rather than a natural deepening of understanding.

4. **No suggest-then-confirm pattern.** The hardest UX anti-pattern: making the user generate answers from scratch. "What authentication method do you want?" forces the user to research auth methods. "I'd recommend magic link authentication for your use case because [reason]. Want to go with that, or do you have a preference?" does the hard work for them.

**Consequences:** User abandonment. The user came for magic and got a survey. They quit after 3-4 questions and go back to just describing their app to Claude directly, because at least Claude talks back.

**Prevention:**

1. **AI proposes, user disposes.** For every question, the AI should include a suggested answer based on best practices and what it already knows. The user's job is to confirm, tweak, or override — not to generate from scratch. This cuts cognitive load by 80%.

2. **Progressive spec preview.** After every 2-3 answers, show the user what the spec looks like so far. "Here's your data model based on what you've told me." Seeing output form in real-time makes the questions feel purposeful and the experience feel collaborative.

3. **Conversation, not interrogation.** The AI should acknowledge answers, connect them to previous answers, and explain what it's concluding. "Got it — since you want role-based access and you mentioned three user types, I'm going to design the permissions system around Admin, Editor, and Viewer roles with a role_permissions junction table. Sound right?"

4. **Smart defaults with opt-out.** For common patterns (auth, error handling, pagination, caching), don't ask — propose. "I'll include standard pagination (cursor-based, 20 items default) for all list endpoints unless you tell me otherwise." The user only engages when they disagree.

5. **Batch related questions.** Instead of 15 sequential questions, group them: "I need to understand your users. Here are 3 things I'm thinking about..." This feels like a conversation topic, not a form field.

**Detection (warning signs):**
- Average questions-to-completion ratio exceeds 12 for simple apps
- Users abandon during discovery phase (never reach spec generation)
- Users give one-word answers (sign of disengagement)
- Time between question display and answer submission increases with each question (fatigue)

**Which phase should address it:** Phase 2 (Discovery Flow) is entirely about solving this. The suggest-then-confirm pattern must be designed into the discovery architecture from day one.

---

### Pitfall 3: The Stateless Conversation — LLM Calls That Don't Build On Each Other

**What goes wrong:** Each LLM call is independent. The discovery question generator gets the full Q&A transcript, but it has no structured understanding of what's been decided. It might re-ask about authentication in a different form, or fail to connect the user's entity names from Q3 to the architecture questions in Q10.

**Why it happens:**

1. **Passing raw Q&A transcripts instead of structured state.** The current `promptDiscoveryQuestion()` passes `answers` as a flat list of Q&A strings. The LLM must re-parse and re-understand the entire conversation every time. It loses nuance, forgets specifics, and sometimes contradicts earlier conclusions.

2. **No intermediate synthesis.** There's no step where the AI says "Based on questions 1-5, here's what I understand so far: [structured summary]." Without explicit synthesis, context degrades with each additional question.

3. **Token window pressure.** As the Q&A transcript grows, it competes for context window space with the system prompt and the new question generation instructions. By question 15, the early answers may be compressed or lost in the LLM's attention.

**Consequences:** Repetitive questions, contradictory conclusions, specs that don't reflect early answers. The user feels like they're talking to someone with amnesia.

**Prevention:**

1. **Maintain a structured "understanding" object.** After each answer, update a JSON object representing what the AI has decided/learned: `{ entities: ["Recipe", "Ingredient", "MealPlan"], auth: "magic-link", roles: ["home_cook", "nutritionist"], decided: [...], open_questions: [...] }`. Pass this object — not the raw transcript — to subsequent calls.

2. **Periodic synthesis checkpoints.** Every 3-5 questions, run a synthesis call: "Given these Q&As, update the structured understanding. What's decided? What's still ambiguous?" This compressed, structured context is far more useful than raw transcript.

3. **Entity tracking from question 1.** Every time the user names a thing (entity, role, screen, action), add it to a running glossary. This glossary gets passed to every subsequent call and the spec generator.

**Detection (warning signs):**
- AI asks about something the user already answered
- Spec uses different terminology than the user used during discovery
- Later questions don't reference earlier answers
- Users complain "I already told you that"

**Which phase should address it:** Phase 2 (Discovery Flow) for the structured understanding object. Phase 3 (Spec Generation) for passing structured state rather than raw transcripts.

---

### Pitfall 4: The Demo-to-Production Cliff — Impressive First Try, Useless in Practice

**What goes wrong:** The tool works amazingly for a simple "build me a todo app" demo but falls apart for real projects. Simple apps get great specs because the LLM can fill in most details from training data. Complex or novel apps get generic specs because the LLM doesn't know enough to be specific.

**Why it happens:**

1. **LLM training bias toward common apps.** Claude has seen millions of todo apps, blog platforms, and e-commerce sites. It can generate specific specs for these because it's essentially remembering. For novel apps — "a tool that generates knitting patterns from photos of fabric" — it falls back to generic templates.

2. **No complexity-adapted questioning depth.** Simple apps need 5 questions. Complex apps need 25+ targeted questions about specific subsystems. The current system uses the same discovery flow regardless, resulting in either too many questions for simple apps or too few for complex ones.

3. **No domain knowledge injection.** When the user describes a domain-specific app (medical, legal, financial), the AI has no specialized knowledge to draw from. It generates "industry standard" language instead of domain-specific requirements (HIPAA, SOC2, FINRA).

**Consequences:** Users try it with their real project idea (which is never a todo app), get a mediocre spec, and conclude the tool doesn't work. They tell others "it's just a fancy ChatGPT wrapper."

**Prevention:**

1. **Complexity-adaptive discovery.** Simple apps: 3-5 high-level questions, heavy AI inference. Complex apps: dedicated question sequences per subsystem (auth subsystem, data subsystem, integration subsystem), with the AI flagging areas where it needs more input because the domain is unfamiliar.

2. **Honest uncertainty signals.** When the AI doesn't know enough to be specific, it should say so: "I'm not familiar enough with knitting pattern standards to propose a data model. Can you describe what a pattern looks like?" This is better than generating confident garbage.

3. **Depth-over-breadth for novel apps.** For unfamiliar domains, ask more questions about fewer topics rather than trying to cover everything. A spec with deeply detailed data models but a placeholder security section is more useful than a spec where everything is equally shallow.

4. **Test with complex apps, not demos.** Every prompt change must be tested against at least 3 complex, non-standard app ideas — not just "build me a blog."

**Detection (warning signs):**
- All demo specs look great, but first real user spec is disappointing
- Spec quality drops visibly for apps with domain-specific terminology
- The same boilerplate paragraphs appear across different projects' specs
- Users of complex apps rate specs lower than users of simple apps

**Which phase should address it:** Phase 2 (Discovery Flow) for adaptive questioning. Phase 3 (Spec Generation) for handling uncertainty. Phase 4 (Quality/Validation) for testing against complex apps.

---

### Pitfall 5: The JSON Fragility Bomb — Structured Output Parsing That Breaks Silently

**What goes wrong:** The app depends on the LLM returning perfectly structured JSON, but LLMs are probabilistic text generators, not JSON APIs. The current `llmCallJSON` does minimal cleanup (strip markdown fences) and then `JSON.parse()` — if the LLM returns malformed JSON, adds a trailing comma, includes a comment, or wraps the JSON in explanation text, the entire call fails with an opaque error.

**Why it happens:**

1. **No schema validation.** The code casts the parsed JSON to a TypeScript type (`as T`) but never validates the shape. Missing fields, wrong types, extra fields — all silently accepted and cause downstream crashes.

2. **No retry on parse failure.** One bad JSON response = one failed request = user sees "Something went wrong." No attempt to re-request or repair.

3. **Prompt instruction conflation.** The system prompt appends "Respond ONLY with valid JSON" but this competes with the actual system prompt instructions. The LLM sometimes prioritizes being helpful (adding explanations) over following the JSON-only instruction.

4. **Complex nested JSON schemas.** The feature generation prompt expects deeply nested JSON (features with arrays of objects with sub-objects). The deeper the nesting, the more likely the LLM will make structural errors.

**Consequences:** Intermittent, unpredictable failures. Works 9 out of 10 times, then breaks on the 10th with no clear reason. Users lose trust. Debugging is painful because the error is "JSON parse error" with no context about what the LLM actually returned.

**Prevention:**

1. **Use Zod for response validation.** Define Zod schemas for every expected response shape. Parse with `schema.safeParse()` and get clear error messages about what's missing or wrong.

2. **Implement retry with repair.** On JSON parse failure: (a) try to repair common issues (trailing commas, markdown fences, truncated responses), (b) if repair fails, retry the LLM call with the error message: "Your previous response had invalid JSON. Here's the error: [error]. Please try again."

3. **Simplify JSON schemas.** Flatten deeply nested structures. Instead of asking for features with nested error_handling objects, ask for features first, then ask for error handling per feature in a separate call.

4. **Log raw LLM responses.** When JSON parsing fails, log the actual LLM output so you can debug prompt issues. The current code throws the parse error and loses the original response.

5. **Consider using Anthropic's structured output features.** Check if the current SDK version supports JSON mode or tool-use for structured outputs, which are more reliable than prompt instructions.

**Detection (warning signs):**
- Intermittent 500 errors on API routes
- "Something went wrong" toasts with no actionable information
- Works in development but fails in production (different model behavior at different temperatures)
- Tests pass with mocked responses but fail with real LLM calls

**Which phase should address it:** Phase 1 (Foundation) for Zod schemas, retry logic, and response logging. This is infrastructure that every subsequent phase depends on.

---

## Moderate Pitfalls

---

### Pitfall 6: The Black Box Generation Problem — User Can't Fix What They Can't See

**What goes wrong:** The user waits 15-30 seconds for spec generation, gets a 10-page document, and finds problems — but has no way to fix individual sections without regenerating the entire spec. Editing the markdown directly breaks the structure, and regenerating loses all their customizations.

**Prevention:**

1. **Section-level regeneration.** Let the user regenerate individual sections ("Regenerate just the data model") while keeping the rest of the spec intact. This requires section-by-section generation architecture.

2. **Edit-and-validate loop.** Let the user edit the markdown, then re-run validation on just the changed sections. Show inline quality indicators per section.

3. **Provenance tracking.** Show which parts came from user answers vs AI inference. Users can trust their own parts and focus review on AI-generated sections.

**Detection:** Users export the spec, manually edit it in an external editor, then never return to the tool for that project. They're working around the tool's limitations.

**Which phase should address it:** Phase 3 (Spec Generation) for section-level architecture. Phase 4 (Quality) for inline validation.

---

### Pitfall 7: The Premature Architecture Problem — Asking Tech Questions Before Understanding the Product

**What goes wrong:** The discovery flow asks about database choices, hosting preferences, and API design patterns before fully understanding what the user is building. This leads to technology decisions that don't fit the requirements, and wastes questions on infrastructure when the product vision is still unclear.

**Prevention:**

1. **Strict phase discipline.** Phase 1 (Discover) is ONLY about what and who. Phase 2 (Define) is about specific features. Phase 3 (Architect) is about how to build it. Never leak architecture questions into earlier phases.

2. **AI-driven technology recommendations.** Don't ask the user what database they want. Based on the features discovered, recommend one: "Your app has relational data with complex queries, so I recommend PostgreSQL. If you prefer something else, let me know."

3. **Tech-agnostic features first.** Write feature specs that don't mention technology. The data model should describe entities and relationships, not table schemas. Technology gets applied in the architecture phase.

**Detection:** Users express frustration at being asked about "tech stack" when they haven't finished describing their product. Questions about databases appearing before questions about user flows.

**Which phase should address it:** Phase 2 (Discovery Flow) — enforce phase boundaries in the question generation prompts.

---

### Pitfall 8: The Weasel Word Epidemic — Specs That Sound Good But Say Nothing

**What goes wrong:** The generated spec passes a quick read test — it sounds professional and thorough — but when a developer tries to implement it, every section needs interpretation. "The system handles errors gracefully" passes human review but tells a developer nothing. "The system manages user permissions appropriately" sounds right but specifies nothing.

**Prevention:**

1. **Weasel word detection in the generation prompt, not just validation.** The current system detects weasel words post-hoc in validation. Instead, the generation prompt itself should include a "banned words" list and demonstrate what to write instead. The LLM should never produce them in the first place.

2. **Specificity forcing functions.** For every feature, require: exact field names, exact error messages (strings, not descriptions), exact HTTP status codes, exact state transitions. If the LLM can't be specific, it should mark the section `[NEEDS USER INPUT]` instead of filling it with vague prose.

3. **Quantified requirements.** "Fast" becomes "< 200ms p95." "Scalable" becomes "supports 10,000 concurrent users." "Secure" becomes "AES-256 encryption at rest, TLS 1.3 in transit."

**Detection:** Run the existing weasel word detector on generated specs. If > 5 weasel words per section, the generation prompt needs work. Also detect patterns like "appropriate," "properly," "handle," "manage" without specific details following.

**Which phase should address it:** Phase 3 (Spec Generation) for banning weasel words in generation. The existing validation-phase detection is good but insufficient — prevention is better than detection.

---

### Pitfall 9: The Token Budget Blindness — Running Up Costs Without Awareness

**What goes wrong:** Each spec generation call uses up to 16,384 output tokens at Claude Sonnet pricing. A user iterating on their spec (regenerating 3-4 times) can easily cost $1-2 per project. At scale, this makes the tool economically unviable unless monetized.

**Prevention:**

1. **Token tracking and display.** Show the user (and the developer) how many tokens each call consumed and approximate cost. Not to charge them, but to inform architecture decisions.

2. **Incremental generation over full regeneration.** Section-by-section generation means re-generating a data model section costs 1/10th of regenerating the full spec.

3. **Caching completed sections.** If the user hasn't changed their discovery answers for the "Users & Personas" section, don't regenerate it. Cache and reuse.

4. **Model tiering.** Use a faster/cheaper model (Haiku) for discovery questions and classification. Use Sonnet for spec generation where quality matters. Use Opus only for final validation if quality gates fail.

**Detection:** Monitor total tokens per project. If average project exceeds 100K tokens total, the architecture is too expensive. Track cost per spec page generated.

**Which phase should address it:** Phase 1 (Foundation) for token tracking. Phase 3 (Spec Generation) for caching and incremental regeneration.

---

### Pitfall 10: The Streaming Absence Problem — Long Waits With No Feedback

**What goes wrong:** Spec generation takes 15-30 seconds with no output visible. The user stares at a spinner, doesn't know if it's working, and may reload the page (losing the in-flight request). When the spec finally appears all at once, there's no sense of progression or engagement.

**Prevention:**

1. **Stream spec generation.** Use Anthropic's streaming API to show the spec forming in real-time. This transforms a 30-second wait into a 30-second show. Users read as it generates and feel engaged instead of anxious.

2. **Progressive section loading.** With section-by-section generation, show each section as it completes. The user can start reviewing section 1 while section 5 is still generating.

3. **Activity indicators with context.** Instead of a generic spinner, show "Generating data model..." then "Designing API endpoints..." then "Writing user flows..." This gives the user confidence the system is working and roughly where it is.

**Detection:** User session data shows page reloads during generation. Or average time-on-page during generation is lower than generation time (user left and came back).

**Which phase should address it:** Phase 3 (Spec Generation) for streaming implementation. Phase 2 (Discovery) could also benefit — stream the AI's "thinking" as it formulates questions.

---

## Minor Pitfalls

---

### Pitfall 11: The Copy-Paste Gap — Specs That Aren't Actually Paste-Ready

**What goes wrong:** The product promise is "paste into Claude Code and build." But the generated spec may have internal inconsistencies (entity named "Recipe" in data model but "recipe_item" in API), missing context (assumes knowledge not in the spec), or formatting that Claude Code doesn't parse well.

**Prevention:**

1. **Consistency pass.** After generating all sections, run a dedicated LLM call to check for naming inconsistencies across sections. Every entity, field, and endpoint name should be used identically everywhere.

2. **Self-contained spec test.** The spec should be understandable by someone (or an AI) who has ZERO context beyond the document itself. No "as discussed" or "per the requirements." Everything must be in the spec.

3. **Claude Code compatibility testing.** Actually test generated specs by pasting them into Claude Code. Does Claude Code ask clarifying questions? Every clarifying question reveals a spec gap.

**Detection:** After generating a spec, ask Claude (in a separate call with no context) "What questions would you need answered before implementing this?" If it has questions, the spec has gaps.

**Which phase should address it:** Phase 4 (Quality/Validation) for consistency checking and self-containment testing.

---

### Pitfall 12: The Phase Gate Theater — Validation That Doesn't Actually Gate

**What goes wrong:** The current tollgate system checks for the presence of sections and counts weasel words, but doesn't validate whether the content is actually specific enough to build from. A section can say "The user authentication system manages access control" — it has the section, no weasel words flagged, but says nothing useful. The validation passes, the spec is bad.

**Prevention:**

1. **Content-level validation, not just structure-level.** Check that data model sections contain field definitions (detect patterns like `field_name: type`). Check that API sections contain endpoint definitions (detect `GET/POST/PUT/DELETE /path`). Check that user flows contain numbered steps.

2. **LLM-powered deep validation.** Use a separate LLM call with a harsh validator prompt: "Can you implement this section right now? What's missing?" This catches semantic vagueness that pattern matching misses.

3. **Validation before generation completes.** Validate sections as they're generated, not after the whole spec is done. If the data model section fails validation, regenerate it immediately instead of letting a bad section propagate into dependent sections.

**Detection:** Specs with high validation scores that still need significant clarification when actually used for implementation. Track "validation score vs implementation success" if possible.

**Which phase should address it:** Phase 4 (Quality/Validation) for deep validation. Phase 3 (Spec Generation) for inline validation during generation.

---

### Pitfall 13: The Conversation Memory Ceiling — Q&A Context Exceeding Token Limits

**What goes wrong:** For complex projects, the discovery phase may involve 20+ questions. The full Q&A transcript plus system prompt plus the new question request may exceed comfortable context window sizes, leading to degraded question quality or truncated context.

**Prevention:**

1. **Structured summaries over raw transcripts.** As described in Pitfall 3, maintain a structured understanding object rather than passing raw Q&A. A 50-token JSON summary carries more information than a 500-token Q&A exchange.

2. **Rolling context window.** Always include the structured summary + only the last 5 Q&A exchanges verbatim. Older exchanges are only represented in the summary.

3. **Token budget monitoring.** Track input token counts per call. If approaching limits, compress context automatically.

**Detection:** Discovery question quality drops noticeably after question 12-15. Later questions become more generic or repeat earlier topics.

**Which phase should address it:** Phase 2 (Discovery Flow) for structured summaries and rolling context.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Foundation / Infrastructure | JSON parsing failures (#5) crash the app silently | Implement Zod validation, retry logic, and response logging before building any features |
| Foundation / Infrastructure | No streaming (#10) makes the tool feel broken | Wire up streaming from the start — retrofitting streaming into a batch architecture is painful |
| Discovery Flow | Forms that feel like work (#2) cause user abandonment | Suggest-then-confirm pattern must be the default interaction model, not an afterthought |
| Discovery Flow | Stateless conversations (#3) produce repetitive questions | Build the structured understanding object into the discovery architecture from day one |
| Discovery Flow | Premature architecture questions (#7) frustrate users | Enforce strict phase boundaries in question generation prompts |
| Spec Generation | Generic outputs (#1) are the #1 product-killing pitfall | Few-shot examples, concrete noun injection, section-by-section generation |
| Spec Generation | Weasel words (#8) make specs sound good but build bad | Ban weasel words in the generation prompt, not just in post-hoc validation |
| Spec Generation | Black box generation (#6) prevents user correction | Section-level regeneration architecture required |
| Quality / Validation | Theater validation (#12) gives false confidence | LLM-powered deep validation that asks "can I build from this?" |
| Quality / Validation | Copy-paste gap (#11) breaks the core product promise | Consistency pass + self-containment test as final quality gate |
| All phases | Token budget blindness (#9) makes the tool economically unviable | Track tokens from day one; use model tiering (Haiku for questions, Sonnet for specs) |
| All phases | Demo-to-production cliff (#4) hides problems until real users arrive | Test every prompt change against 3+ complex, non-standard app ideas |

---

## The Meta-Pitfall: Why Previous Versions Failed

The previous two versions of Skill Forge fell into a pattern that is extremely common in AI-powered tools:

**Version 1 (Wrong Product):** Built the tool the developer wanted (skill config generator) instead of the tool the user needed (spec generator). This is not an AI pitfall — it's a product pitfall. But it's exacerbated by AI because the developer can use AI to build the wrong thing very quickly.

**Version 2 (Bad UX + Bad Output):** This is the classic AI app trap. The developer built a wrapper around an LLM that:
- Made the user do the hard work (answering questions) while the AI did the easy work (asking them)
- Expected a single LLM call to produce expert-quality output from insufficient context
- Tested with simple demo apps and assumed complex apps would work equally well

The fix is not "better prompts." The fix is **inverted effort**: the AI should do 80% of the thinking (proposing, inferring, synthesizing) and the user should do 20% (confirming, correcting, providing domain-specific details the AI can't know).

**The difference between a demo that impresses and a tool people actually use:**
- Demo: "Look, it generated a whole spec from one sentence!" (Impressive but generic)
- Tool: "It asked me 5 smart questions, proposed answers for 3 of them, and the spec had my exact entity names with field types I would have chosen myself." (Less flashy but actually useful)

The tool people use earns trust through specificity, not through volume. A 3-page spec where every line is buildable beats a 15-page spec full of professional-sounding filler.

---

## Sources

- Direct analysis of `src/lib/llm/prompts.ts` — the actual prompts producing "bad" outputs
- Direct analysis of `src/lib/llm/client.ts` — the JSON parsing fragility
- `.planning/codebase/CONCERNS.md` — documented issues from the current build
- `.planning/PROJECT.md` — user feedback and product history
- `.planning/codebase/ARCHITECTURE.md` — system design that produced the form-like UX
- Domain expertise in LLM application architecture, prompt engineering patterns, and AI UX design (MEDIUM confidence — training data, not current web sources; but conclusions are strongly grounded in the specific codebase analysis above)

---

*Researched: 2026-02-20*
