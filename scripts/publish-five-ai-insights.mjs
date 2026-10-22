import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_URL = "https://www.linkedin.com/in/madhav-mistry-999349164/recent-activity/all/";

function loadEnvFile(file) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) return;
  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rest] = trimmed.split("=");
    const key = rawKey.trim();
    if (!process.env[key]) process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase URL or service-role key in .env.local.");
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const insights = [
  {
    title: "The Creative Brief Is the Missing Layer in Most AI Content Workflows",
    slug: "creative-brief-ai-content-workflow",
    category: "Marketing Systems",
    image: "ai-creative-brief-system-editorial.png",
    excerpt: "AI generation becomes repeatable when the prompt is treated as one execution detail inside a shared creative brief—not as the strategy itself.",
    metaTitle: "The Creative Brief for Repeatable AI Content",
    metaDescription: "A practical operating model for turning one strategic brief into controlled, repeatable AI creative production across formats.",
    tags: ["DS Insight", "AI & Automation", "Creative Operations", "Marketing Systems"],
    heroAlt: "A modular AI creative pipeline turning one brief into controlled visual outputs",
    sourceSummary: "A Madhav Mistry LinkedIn post argued that AI creative work becomes less random when teams define audience, message, references, format and output controls before generation.",
    faqs: [
      { question: "What belongs in an AI creative brief?", answer: "At minimum: the audience, intended response, core message, evidence, visual direction, format, constraints, approval owner and success criteria." },
      { question: "Why is a prompt not enough?", answer: "A prompt can describe an output, but it rarely captures the strategic context, reusable decisions and review standards needed for consistent production." },
      { question: "How should teams evaluate AI creative?", answer: "Evaluate against the brief: message accuracy, audience fit, brand consistency, factual integrity, format compliance and performance in the intended channel." },
    ],
    content: `AI creative tools are often blamed for inconsistent output, but inconsistency usually begins before generation. A team opens a model, writes a fresh prompt, tweaks it until something looks acceptable, and repeats the entire process for the next asset. The model changes, the prompt changes, the reviewer changes, and the creative direction quietly changes with them.

The missing layer is not a longer prompt. It is a durable creative brief that separates strategic decisions from execution choices.

## A prompt is an instruction, not a production system

A prompt can specify a scene, tone, camera angle, or format. It cannot automatically resolve who the work is for, what the audience should understand, which claims are defensible, how the asset fits a campaign, or what makes the result recognizably yours.

When those decisions remain implicit, every operator reconstructs them from memory. The workflow becomes fragile: good results depend on the person at the keyboard, and a successful experiment is difficult to reproduce.

A brief turns those hidden decisions into shared inputs. The prompt then becomes one replaceable component inside a larger system.

## Build the brief in five layers

The most useful AI briefs are compact enough to reuse and specific enough to constrain the work.

1. **Audience context.** Define the situation, level of awareness, objections, and language the audience already uses. “Marketing leaders” is too broad; “a small ecommerce team trying to produce weekly paid-social variants without an agency” is actionable.
2. **Communication goal.** State the single idea the asset must make clear and the response it should produce. This prevents visual novelty from replacing the message.
3. **Evidence and boundaries.** Include approved facts, product details, source material, prohibited claims, and areas that require verification.
4. **Creative direction.** Provide references for mood, composition, pacing, materials, and brand behavior. References should communicate principles, not invite imitation.
5. **Output contract.** Specify channel, aspect ratio, duration, resolution, accessibility needs, required variants, and review criteria.

Only after those layers are stable should the team choose a generation model and write the execution prompt.

## Treat context as a reusable asset

The largest efficiency gain does not come from generating faster. It comes from avoiding repeated decisions.

Store the audience definition, approved positioning, evidence, visual principles, and channel requirements as a reusable context package. A campaign-specific brief can inherit that package and add only what changed. This creates consistency without forcing every asset into the same template.

Versioning matters. If the positioning changes, the context package should show what changed and when. Otherwise teams may continue generating assets from stale assumptions while believing they are following the latest strategy.

## Design a production loop, not a one-shot prompt

A reliable creative workflow has distinct stages:

- Brief approval before generation begins.
- Exploration that produces meaningfully different directions, not cosmetic variations.
- Selection against the communication goal.
- Refinement for accuracy, composition, brand fit, and channel constraints.
- Human review before publication.
- Performance feedback that updates the next brief.

The feedback stage is easy to miss. Click-through rate, watch time, qualified responses, and sales conversations can reveal whether the brief was correct—not merely whether the rendering was attractive.

## Scale variation without producing sameness

Automation can multiply a weak idea just as efficiently as a strong one. The system should lock the strategic core while allowing controlled variation in hooks, scenes, formats, and pacing.

Define which fields are fixed and which are variable. The core claim and evidence may be fixed. The opening visual, product angle, audience example, or duration may vary. This gives the model room to explore while keeping the campaign coherent.

It also makes testing interpretable. When every element changes at once, performance data cannot explain what worked.

## Governance is part of creative quality

AI production needs named owners. Someone approves facts. Someone owns brand consistency. Someone decides whether an asset is ready to publish. High-risk claims require a different review path from decorative background imagery.

The goal is not to slow the workflow. It is to put attention where failure would matter. A lightweight risk tier can keep low-risk variants moving while requiring deeper review for regulated, comparative, or reputation-sensitive work.

## What to do next

Take one recurring campaign and document the decisions your team currently recreates each time. Turn them into a one-page brief with the five layers above. Generate three distinct directions from the same approved context, review them against explicit criteria, and record what you learned.

If the second campaign is easier to produce—and easier for another person to operate—the brief is becoming infrastructure rather than paperwork.`,
  },
  {
    title: "AI Slop Is Usually a Review-System Failure",
    slug: "ai-slop-human-review-system",
    category: "AI & Automation",
    image: "human-judgment-ai-content-editorial.png",
    excerpt: "Generic AI content is rarely fixed by changing models. It improves when teams add better inputs, evidence, editing, ownership, and a real publication gate.",
    metaTitle: "AI Slop Is a Review-System Failure",
    metaDescription: "Why generic AI content comes from weak editorial systems—and the review gates that make AI-assisted work worth publishing.",
    tags: ["DS Insight", "AI & Automation", "Content Quality", "Editorial Systems"],
    heroAlt: "Two AI content production lines separating unchecked output from reviewed work",
    sourceSummary: "A Madhav Mistry LinkedIn post argued that low-quality AI content reflects generic input, weak verification and insufficient human judgment more than the technology alone.",
    faqs: [
      { question: "What is AI slop?", answer: "It is low-value, repetitive or unreliable content produced and published with too little context, verification, editing or accountability." },
      { question: "Can a better AI model solve generic content?", answer: "A stronger model can improve fluency, but it cannot supply missing experience, evidence, editorial judgment or a distinctive point of view." },
      { question: "What is the most important review gate?", answer: "The final accountable editor must be able to defend every important claim and explain why the piece deserves to exist." },
    ],
    content: `The phrase “AI slop” describes a real problem: a flood of polished-looking material that says little, repeats familiar patterns, and creates more work for the reader than value. But treating the model as the sole cause hides the operational choices that allow weak material to reach publication.

AI can produce text quickly. It cannot decide whether the text deserves an audience. That remains an editorial responsibility.

## The visible symptoms begin upstream

Low-quality AI-assisted content tends to share a few symptoms: interchangeable openings, vague claims, unsupported certainty, repetitive structure, predictable lists, and examples that could apply to any company. Those problems often appear in the draft, but they begin in the request.

If the model receives no real audience context, no evidence, no original experience, and no clear editorial position, the safest response is a generic average of familiar material. Changing the model may make that average more fluent. It does not make it more useful.

The production system has to supply what the model cannot infer.

## Gate one: prove the piece has a reason to exist

Before drafting, write one sentence that explains the information advantage. What can this piece contribute that a competent reader cannot get from the first page of search results?

The advantage might be original data, direct experience, a tested workflow, access to a practitioner, a comparison across sources, or a clear synthesis of a confusing topic. If the team cannot name the advantage, generation should pause.

This gate prevents speed from becoming the only justification for publication.

## Gate two: give the model real context

Useful context is not a paragraph asking for an expert tone. It includes the reader’s situation, the decision they face, what they already know, the evidence available, the claims that remain uncertain, and the organization’s actual point of view.

Context should also contain negative constraints. Identify common clichés, claims that must not be made, and conclusions the evidence does not support. These boundaries are often more valuable than another page of style instructions.

## Gate three: separate claims from prose

Fluent prose can make an unsupported statement feel authoritative. For any consequential article, maintain a claim ledger: the material assertions, the source for each, and whether the source directly supports the wording.

The ledger does not need to be visible to readers. It gives the editor a way to audit the draft without relying on how confident it sounds. Claims without support should be removed, narrowed, or labeled as analysis.

This is especially important for product comparisons, health or financial topics, benchmarks, and statements about what “most companies” do.

## Gate four: edit for specificity and consequence

A strong edit asks more than whether the grammar is correct.

- Does the opening identify a real tension or decision?
- Does every section advance the argument?
- Are abstract recommendations translated into observable actions?
- Could the examples belong only to this piece?
- Is uncertainty represented honestly?
- What should the reader do differently after reading?

Delete paragraphs that merely restate the heading. Replace broad adjectives with evidence or remove them. Vary the structure when the familiar “problem, five tips, conclusion” format adds no value.

## Gate five: restore a human point of view

Point of view does not mean forced controversy. It means making judgments: what matters most, which tradeoff is acceptable, where a popular approach breaks, and what the evidence cannot yet tell us.

The editor should add experience and interpretation that were not available to the model. That may include a failed attempt, a counterexample, a decision rule, or a limitation discovered in practice.

If nobody on the team is willing to own the conclusion, the piece is not ready.

## Use a publication rubric

A simple rubric makes quality less dependent on mood. Score each draft on five dimensions: originality of contribution, evidence quality, reader relevance, specificity, and editorial voice. Require a minimum score and make one person accountable for the final decision.

The rubric should be strict enough to reject material. If every draft passes, it is a checklist rather than a gate.

Track corrections, reader complaints, engagement from the intended audience, and whether the content produces the decision or action it was designed to support. Volume alone is not an editorial metric.

## Efficiency comes from fewer weak drafts

Human review is sometimes framed as the expensive part of AI content. In practice, the expensive part is producing large amounts of low-value material, sending it through multiple reviewers, and eventually damaging trust.

Better briefs and earlier gates reduce downstream editing. AI can still accelerate research organization, outline exploration, transformation between formats, and first-pass drafting. The benefit appears when the team uses the saved time for judgment—not when it removes judgment from the process.

## What to do next

Choose one recently published AI-assisted piece and audit it with the five gates. Identify where generic material entered the workflow and which gate would have caught it earliest. Then add that gate to the next brief before anyone generates a draft.

The objective is not to prove that AI content can be good. It is to build a system in which low-value work has fewer opportunities to escape.`,
  },
  {
    title: "Search Visibility Is Becoming a Multi-Surface Discovery System",
    slug: "search-ai-discovery-system",
    category: "SEO & Discovery",
    image: "multi-surface-ai-discovery-editorial.png",
    excerpt: "Ranking remains important, but discovery now also happens through AI answers, citations, comparisons, communities, and the sources models trust.",
    metaTitle: "Search Is Now a Multi-Surface Discovery System",
    metaDescription: "A framework for connecting SEO, AI citations, comparison visibility, external authority and measurement into one discovery strategy.",
    tags: ["DS Insight", "SEO & Discovery", "AI Search", "Content Strategy"],
    heroAlt: "A brand knowledge hub connected to search, AI answers, citations and analytics",
    sourceSummary: "A Madhav Mistry LinkedIn post described SEO as a broader discovery discipline spanning Google, AI answers, comparisons, citations and authority beyond the website.",
    faqs: [
      { question: "Is traditional SEO becoming less important?", answer: "No. Technical access, useful pages and search demand remain foundational, but they now support a wider set of discovery surfaces." },
      { question: "What makes content citation-ready for AI answers?", answer: "Clear claims, visible evidence, unambiguous entities, useful comparisons, accessible page structure and corroboration from trusted external sources." },
      { question: "How should AI visibility be measured?", answer: "Track representative buyer questions, cited pages, source patterns, referral quality, branded demand and assisted conversions alongside conventional search metrics." },
    ],
    content: `For years, search strategy could be summarized with a familiar objective: create a useful page, earn authority, and rank for the query. That model still matters, but it no longer describes the full path from question to decision.

A buyer may begin with a search engine, read an AI-generated summary, ask a follow-up in a chatbot, open a comparison page, scan a community discussion, and return later through a branded query. Discovery is becoming a system of surfaces rather than a single results page.

## Ranking is one outcome inside a larger system

Traditional rankings remain valuable because they create direct traffic and often supply the pages that other systems retrieve. The mistake is assuming that a high position automatically produces visibility everywhere else.

AI answers may cite a different source than the top organic result. Comparison queries may be dominated by publishers or marketplaces. Community discussions may shape the language buyers use before they ever reach a website. Each surface has distinct evidence and trust patterns.

The strategy therefore has to connect owned content with the wider information environment.

## Map the surfaces around a buying decision

Start with decisions, not keywords. For one product category, document the questions a buyer asks while moving from awareness to evaluation and selection.

Then map where each question is likely to be answered:

- Search results for explicit demand and known problems.
- AI answers for synthesis and follow-up questions.
- Review and comparison pages for tradeoffs.
- Forums, communities, and social platforms for experience signals.
- Product documentation for precise capability and policy questions.
- Analyst, partner, and media sources for external validation.

This map exposes gaps that a conventional content calendar may miss. A brand can have many articles and still be absent from the sources that shape evaluation.

## Build a technical foundation that machines can use

Discovery systems cannot reliably retrieve what they cannot access or interpret. Crawlability, stable URLs, canonical signals, fast rendering, descriptive titles, internal linking, and structured data are still basic infrastructure.

But machine readability is more than schema. Pages should identify the subject clearly, state claims close to supporting evidence, use consistent names for products and entities, and separate current facts from opinion.

Important information hidden in images, scripts, or vague marketing language is harder for both readers and retrieval systems to use.

## Make evidence easy to extract and verify

Citation-ready content is specific. It answers a narrow question, shows where the answer came from, and acknowledges limits.

Useful page elements include concise definitions, comparison criteria, methodology, publication and update dates, author or reviewer information, primary-source links, and tables that use consistent dimensions. These elements help a reader evaluate the page and make individual passages easier to retrieve without losing context.

Avoid creating isolated “AI bait” facts. The surrounding page still needs depth, coherence, and a reason for the claim to exist.

## Own the comparison layer

Many high-intent journeys are comparative: product A versus product B, alternatives to a familiar tool, the best option for a particular constraint, or whether a category is worth the cost.

Brands often avoid this layer because comparison requires admitting tradeoffs. That creates an information vacuum filled by affiliates, aggregators, and user discussions.

A credible comparison does not need to declare the brand the winner. It should define criteria, state who each option suits, explain where evidence is incomplete, and update as products change. Honest boundaries can be a stronger trust signal than universal superiority.

## Authority is distributed beyond the domain

Search and AI systems learn about a brand from more than its own pages. Consistent descriptions across reputable profiles, expert contributions, customer documentation, partner pages, independent reviews, public research, and community discussions all influence the information graph around the entity.

This is not a reason to manufacture mentions. It is a reason to create work that other sources can reference: original research, transparent methodologies, useful datasets, strong documentation, and expert explanations.

Earned authority is difficult to automate because it depends on contribution and trust.

## Measure discovery as a portfolio

Rank tracking cannot show the entire system. Build a representative set of buyer questions and review them across search, AI answers, comparison pages, and community sources.

Track whether the brand appears, how it is described, which pages are cited, which competing sources recur, and whether visibility reaches the correct audience. Combine those observations with branded search growth, referral quality, assisted conversions, demo or sales-call language, and conventional organic performance.

Do not reduce AI visibility to a single percentage. The sample of prompts, location, account context, and model can all change the result. Directional patterns are more useful than false precision.

## What to do next

Choose one valuable customer decision and build its discovery map. Audit the technical foundation, the best owned answer, the comparison layer, and the external sources that currently shape the topic. Then select one gap in each layer for the next 90 days.

The goal is not to rename SEO. It is to make the brand discoverable wherever buyers assemble an answer.`,
  },
  {
    title: "Build an AI Stack Around Workflow Fit, Not Tool Hype",
    slug: "build-ai-stack-workflow-fit",
    category: "AI & Automation",
    image: "workflow-fit-ai-stack-editorial.png",
    excerpt: "The best AI stack is not the one with the most impressive tools. It is the smallest system that removes friction from work your team actually repeats.",
    metaTitle: "Build an AI Stack Around Workflow Fit",
    metaDescription: "A practical framework for choosing, integrating and pruning AI tools based on real jobs, adoption, governance and measurable value.",
    tags: ["DS Insight", "AI & Automation", "AI Tools", "Productivity"],
    heroAlt: "Six interoperable AI workflow modules connected on a dark digital workbench",
    sourceSummary: "A Madhav Mistry LinkedIn post grouped AI tools by real marketing use cases and observed that tools endure when they fit existing work instead of creating extra work.",
    faqs: [
      { question: "How many AI tools should a team adopt?", answer: "Only enough to cover distinct, valuable jobs without creating unnecessary overlap, context switching, governance risk or integration work." },
      { question: "What should an AI tool pilot measure?", answer: "Measure output quality, time to an accepted result, adoption, error and rework rates, integration effort, data risk and total operating cost." },
      { question: "When should an AI tool be removed?", answer: "Remove or consolidate tools that duplicate a stronger capability, fail adoption, require persistent workarounds, create unmanaged risk or cannot demonstrate value." },
    ],
    content: `AI tool lists are easy to collect and hard to operate. A team signs up for an assistant, a research product, an image model, an automation platform, a meeting tool, and a no-code builder. Each looks useful in isolation. Together they create overlapping subscriptions, scattered context, unclear ownership, and another set of interfaces employees must remember.

A stack should be designed as a system of work, not a shelf of products.

## Begin with repeated jobs

Map the work the team performs every week. Describe each job with a trigger, an input, a decision, an output, and a recipient.

“Create content” is too broad. “Turn a verified product update into a help-center note, customer email, and sales enablement summary” is specific enough to evaluate. The job reveals which context is required, where approval belongs, and what an accepted result looks like.

Prioritize jobs that are frequent, slow, structured enough to improve, and valuable enough to justify change. A rare task with dramatic demo potential may deliver less value than a routine process that quietly consumes ten hours every week.

## Separate capabilities from products

Teams often buy several products that contain the same underlying capabilities. Build a capability map before selecting vendors.

Common layers include research and retrieval, reasoning and drafting, media generation, coding and building, workflow orchestration, knowledge storage, evaluation, and governance. One product may cover several layers; one layer may require specialist depth.

The map makes duplication visible. It also reduces dependency on brand-specific terminology that can change faster than the underlying job.

## Evaluate the path to an accepted result

Raw generation speed is a weak metric. Measure the full path from request to accepted output.

An effective pilot should test:

- Quality against a pre-defined rubric.
- Time saved after review and correction.
- Error, hallucination, and rework rates.
- Ability to use the team’s real context.
- Integration with existing systems.
- Adoption by the people who perform the job.
- Data handling, access controls, and auditability.
- Total cost, including implementation and supervision.

A tool that produces an answer in seconds but requires twenty minutes of repair may be slower than the current process.

## Make context portable

The most important asset in an AI stack is often not the model. It is the organization’s context: terminology, policies, product facts, customer research, examples, and decisions.

Avoid trapping that context inside personal chats or one vendor’s workspace. Establish approved sources, clear ownership, update rules, and export paths. Where possible, let multiple tools retrieve from the same maintained knowledge layer rather than creating separate copies.

Portable context makes it easier to change models and prevents conflicting versions of the truth.

## Design handoffs before automation

Most useful workflows cross tools and people. Research becomes a brief; the brief becomes a draft; the draft becomes an asset; the asset moves through approval and distribution.

Document the handoffs before automating them. Define the data structure, validation, failure behavior, and person responsible at each transition. Otherwise the stack can move flawed work faster while making the source of the flaw harder to see.

Automation should expose status and exceptions. A silent chain of black boxes is difficult to trust.

## Keep humans at consequential decisions

Not every step deserves the same level of oversight. Low-risk transformations—formatting, classification, summarization of approved material—can often run with light review. Public claims, financial decisions, customer commitments, access changes, and reputation-sensitive content require stronger controls.

Create risk tiers and connect them to permissions. The tool should not gain broader access merely because it can technically complete a task.

## Budget for adoption, not just licenses

The true cost of a tool includes training, process redesign, prompt or workflow maintenance, integrations, security review, and the attention required to keep outputs reliable.

Assign an owner to every production tool. The owner tracks use, quality, incidents, cost, and changes in vendor behavior. A tool without an owner tends to become either shelfware or shadow infrastructure.

Adoption should be visible in completed jobs, not login counts.

## Prune the stack on a schedule

AI products evolve quickly, and capability overlap grows. Review the stack quarterly.

For each tool, ask whether it still serves a distinct job, whether another tool now covers the capability, whether users have created workarounds, and whether the value exceeds the full operating cost. Consolidate when the loss in specialist quality is smaller than the gain in simplicity.

Keep an exit plan for important workflows: export formats, replacement options, and the minimum data needed to move.

## What to do next

List the ten AI tools your team uses or is considering. Replace the product names with the recurring jobs they are meant to improve. Remove duplicates, select one measurable pilot, and define an accepted result before the trial begins.

The strongest stack is rarely the largest. It is the one the team can understand, govern, and use without rebuilding its work around the tools.`,
  },
  {
    title: "Useful AI Agents Learn Exceptions, Not Just Happy Paths",
    slug: "ai-agents-context-exception-workflows",
    category: "AI & Automation",
    image: "context-aware-ai-agents-editorial.png",
    excerpt: "Enterprise agents become useful when they can work within real operational context, recognize exceptions, preserve audit trails, and escalate responsibly.",
    metaTitle: "AI Agents Must Learn Exceptions and Context",
    metaDescription: "How to design enterprise AI agents around context, exception handling, permissions, auditability and human escalation—not demos.",
    tags: ["DS Insight", "AI & Automation", "AI Agents", "Enterprise Operations"],
    heroAlt: "An accounts-payable workflow with AI context, exception branches and human checkpoints",
    sourceSummary: "A Madhav Mistry LinkedIn post used accounts payable to show why useful AI agents must capture operational context and learn how teams handle edge cases, not only automate the happy path.",
    faqs: [
      { question: "Why do AI agent pilots fail in real operations?", answer: "Many pilots optimize the happy path while underestimating exceptions, permissions, incomplete data, policy interpretation and accountability." },
      { question: "Should an AI agent learn automatically from every exception?", answer: "No. New patterns should be reviewed, versioned and approved before they become reusable policy or automated behavior." },
      { question: "What should always be logged?", answer: "Inputs, retrieved context, decisions, tool actions, confidence or uncertainty, approvals, exceptions, final outcomes and the version of policy used." },
    ],
    content: `Enterprise automation demos usually show the happy path: a clean input arrives, the system recognizes it, applies a rule, and completes the task. Real operations are defined by everything that does not fit the demo.

An invoice arrives from a new address. The purchase order covers only part of the delivery. The amount crosses an approval threshold. Tax treatment changes by entity. A familiar supplier uses an unexpected currency. The process is still recognizable, but the correct action depends on context.

Useful agents must be designed for that exception load.

## A workflow is more than a sequence of steps

A process diagram may show intake, matching, coding, checks, approval, and system entry. Each box hides decisions learned through policy and experience.

Operators know which discrepancy is harmless, which approver understands a specific category, when to pause for evidence, and how to document an unusual case. That knowledge often lives in messages, personal notes, and memory rather than the formal procedure.

Automating the visible steps without capturing those decision conditions creates a brittle system. It moves quickly until reality deviates from the template.

## Model the decision context

For every step, document four elements:

1. **Required evidence:** the fields, documents, and source systems needed to act.
2. **Policy:** the explicit rule or threshold that governs the decision.
3. **Known exceptions:** recurring situations that change the path.
4. **Escalation:** the person or role that owns ambiguity.

This model creates a boundary between what the agent can execute and what still requires judgment. It also reveals missing policies that automation would otherwise disguise.

## Separate memory from authority

An agent may remember how a previous exception was resolved. That does not mean it should automatically turn the resolution into permanent policy.

Operational memory should preserve the case, context, decision, approver, and outcome. Policy authority should remain versioned and explicitly approved. New exception patterns can be proposed for review, then promoted into reusable rules after an accountable owner accepts them.

This distinction prevents one unusual decision from silently changing future behavior.

## Build bounded permissions

Agents that take action need narrower permissions than the people they assist. Use least-privilege access, task-specific credentials, value thresholds, and explicit limits on which systems or records may be changed.

Separate read, recommend, prepare, and execute modes. An early pilot may retrieve documents and prepare a recommendation without posting it. A mature workflow may execute low-risk matches while routing unusual or high-value cases for approval.

Permission should expand only after observed reliability, not because a demo succeeded.

## Make uncertainty operational

A confidence score is not useful unless it changes behavior. Define what happens when evidence is missing, sources conflict, or the situation falls outside known policy.

The agent should be able to stop, explain what is uncertain, show the evidence it used, and ask a focused question. “Unable to complete” is less useful than “the purchase order quantity does not match the delivered quantity; confirm whether partial delivery is expected.”

Good escalation reduces the cognitive load on the human instead of transferring the entire task back.

## Preserve an audit trail

Every consequential run should record the inputs, retrieved context, policy version, decisions, tool calls, approvals, exceptions, and final result. Logs should be understandable by an operator or auditor without reconstructing an opaque chain of prompts.

Auditability serves more than compliance. It helps the team diagnose whether a failure came from missing data, an incorrect rule, a retrieval problem, model reasoning, or an unauthorized action.

Without that visibility, improvement becomes guesswork.

## Evaluate exception performance

Happy-path completion rate can look impressive while hiding the work pushed onto humans. Measure exception detection, false approvals, unnecessary escalations, time to resolution, correction cost, and whether the agent provides enough context for a reviewer to decide.

Also track policy drift. If operators repeatedly override the same rule, the process may need redesign rather than another prompt adjustment.

The objective is not zero human involvement. It is to use human attention where it produces the most value.

## Start with observation

Before granting execution access, run the agent in shadow mode. Let it observe inputs, propose decisions, and compare its path with the real operator’s work. Review disagreements and classify them: missing context, unclear policy, novel exception, or agent error.

Shadow mode produces an exception inventory and tests whether the process is documented well enough to automate. It also helps employees see the system as a visible collaborator rather than an unexplained replacement.

## What to do next

Choose one bounded operational workflow with a clear owner. Map its evidence, policies, known exceptions, and escalation paths. Run an agent in recommendation-only mode, log every disagreement, and review the results weekly.

Do not ask first whether the agent can perform the happy path. Ask whether the organization can explain—and responsibly govern—what happens when the path breaks.`,
  },
];

async function uploadImage(filename) {
  const localPath = path.join(ROOT, "src", "assets", "insights", filename);
  const storagePath = `insights/ai-systems/${filename}`;
  const { error } = await supabase.storage.from("blog-images").upload(storagePath, fs.readFileSync(localPath), {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`Could not upload ${filename}: ${error.message}`);
  return supabase.storage.from("blog-images").getPublicUrl(storagePath).data.publicUrl;
}

const extendedOnlyFields = [
  "content_type", "source_url", "source_author", "source_platform", "source_excerpt",
  "rights_status", "source_image_url", "image_rights_status", "originality_notes",
];

const published = [];
for (const [index, insight] of insights.entries()) {
  console.log(`[${index + 1}/${insights.length}] Publishing ${insight.title}...`);
  const heroImageUrl = await uploadImage(insight.image);
  const now = new Date(Date.now() + index * 1000).toISOString();
  const payload = {
    title: insight.title,
    slug: insight.slug,
    excerpt: insight.excerpt,
    content: insight.content,
    image_url: heroImageUrl,
    category: insight.category,
    tags: insight.tags,
    is_published: true,
    published_at: now,
    meta_title: insight.metaTitle,
    meta_description: insight.metaDescription,
    hero_image_alt: insight.heroAlt,
    faqs: insight.faqs,
    sources: [{ label: "Madhav Mistry on LinkedIn", url: SOURCE_URL, note: "Source idea that informed this independently written DS Review Hub analysis. Rights mode: inspiration only." }],
    author_name: "DS Review Hub Editorial Team",
    reviewed_at: now,
    updated_at: now,
    content_type: "insight",
    source_url: SOURCE_URL,
    source_author: "Madhav Mistry",
    source_platform: "LinkedIn",
    source_excerpt: insight.sourceSummary,
    rights_status: "inspiration",
    source_image_url: null,
    image_rights_status: "generated",
    originality_notes: "Original DS Review Hub article and original 16:9 editorial artwork generated for this topic; no source image reused.",
  };

  let { data: post, error } = await supabase.from("blog_posts").upsert(payload, { onConflict: "slug" }).select("slug,title").single();
  if (error && /schema cache|Could not find|column/i.test(error.message || "")) {
    const basePayload = Object.fromEntries(Object.entries(payload).filter(([key]) => !extendedOnlyFields.includes(key)));
    const retry = await supabase.from("blog_posts").upsert(basePayload, { onConflict: "slug" }).select("slug,title").single();
    post = retry.data;
    error = retry.error;
  }
  if (error) throw error;
  const url = `https://www.dsreviewhub.com/insights/${post.slug}`;
  published.push(url);
  console.log(`Published: ${url}`);
}

try {
  const { error } = await supabase.functions.invoke("trigger-deploy", { body: { source: "publish-five-ai-insights" } });
  if (error) throw error;
  console.log("Triggered production rebuild.");
} catch (error) {
  console.warn(`Posts are live in Supabase, but production rebuild was not triggered: ${error.message || error}`);
}

console.log("\nPublished Insight URLs:");
for (const url of published) console.log(url);
