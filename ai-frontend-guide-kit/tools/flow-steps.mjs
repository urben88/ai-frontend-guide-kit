/**
 * flow-steps — the whole instruction of every micro-step that `flow.mjs next` prints.
 *
 * Not a command: `flow.mjs` imports it. A step has one or more parts; each part is one instruction
 * of about 40 lines: goal, numbered actions with the exact commands, a template to fill and the
 * done criteria. `env` carries the facts the tool already resolved for this project (which skills
 * and MCP servers are installed, what the context scan found), so no branch is left to the reader:
 *   env.run(tool, args)  the command line of a kit tool, in the one path form of this project
 *   env.kit(rel)         the path of a kit file
 *   env.skill(name)      is that skill installed?      env.mcp(name)  is that MCP server configured?
 *   env.dep(name)        is that package a dependency? env.laya       did the user grant Laya?
 *   env.uxPresent        true | false | null (no context scan yet)
 *   env.framework        the spec framework the scan detected ('' when none)
 *   env.techniques(areas) the style direction(s) the project recorded and the few technique cards of those areas that fit them ({ directions, ids })
 *   env.wants3d         true when the brief, UX spec or inventory name 3D, or a SCENE-SPEC.md exists
 *   env.dark            true when the brief's navigation_model is console (a dashboard or tool: dark tokens from day one)
 *   env.storybook        board.mjs detect of the project: { present, install (the exact command, null when present), framework }
 *   env.hasProduct       does PRODUCT.md exist?   env.hasBrief  does EXPERIENCE-BRIEF.md exist?   env.hasMap  does ux-map.excalidraw exist?
 *
 * A part may carry `decision`: what the user decides in it (a string, or a function of env that returns the string or a falsy
 * value when there is nothing to ask). `flow next` ends such a part with a STOP block and `flow done` closes it only with
 * `--answer "<the user's words>"`, which the state keeps.
 *
 * A part may also carry `report`: the fixed checklist of a step that closes with free evidence
 * (polish, iterate, redesign, visual-feedback). `flow report <step>` writes it, one line per check,
 * and `done` asks that every line is closed. The content checks of the other parts live in
 * flow-gates.mjs, next to the templates they read.
 */

import { INVENTORY_COLUMNS } from './flow-gates.mjs';

const OUT = 'ai-frontend-output';
const BRIEF = `${OUT}/ux/EXPERIENCE-BRIEF.md`;
const CONTEXT = `${OUT}/ux/REPO-CONTEXT.md`;
const SPEC = `${OUT}/ux/UX-SPEC.md`;
const MAP = `${OUT}/ux/ux-map.excalidraw`;
const REPORT_ROW = 'Every line of the report is [x] with its result, or [n/a] with its reason.';
const INVENTORY = `${OUT}/INVENTORY.md`;

/** The rules of guides/08-PHILOSOPHY.md that a build must keep, short enough to print. */
const CRAFT_RULES = 'one primary action per screen; spacing only from the scale (4, 8, 12, 16, 24, 32, 48, 64); at most 3 text sizes visible at once; colors, fonts and radius only from the tokens; animate only transform and opacity; at most 2 high-impact effects per view; respect prefers-reduced-motion';

/** The report line the design audit fills (flow report pre-fills it from design-audit.json). */
export const DESIGN_AUDIT_CHECK = 'Design audit (audit-design --report)';

/** The command that runs the design audit and writes its report; the rendered layer only when Playwright is a dependency here. */
export const designAuditCommand = (env) => env.run('audit-design.mjs', `--report${env.dep('playwright') || env.dep('@playwright/test') ? ' --url <url>' : ''}`);

/**
 * The yes/no questions of the per-screen psychology checklist that no tool can measure. Each becomes a line of the polish
 * report: [x] with "yes" or "no" and where it was seen, or [n/a] with the reason. What a tool can measure (one primary action,
 * choices side by side, target size, menu length, fields per form, contrast, text size) is in audit-design.mjs, not here.
 */
export const PSYCHOLOGY_CHECKS = [
  'Psychology: is it clear in 3 seconds what this is and who it is for?',
  'Psychology: does one element dominate each viewport (one focal point)?',
  'Psychology: does the main button say what happens when pressed?',
  'Psychology: is related information grouped, with room between blocks?',
  'Psychology: does every action give immediate feedback?',
  'Psychology: is the social proof specific and credible?',
  'Psychology: can the user go back, cancel or undo?',
  'Psychology: is every reward real and proportional to the effort?',
  'Psychology: does the page end with one clear action?',
];

/**
 * The line that proposes technique cards. With a direction recorded in the project the tool picks the few cards that fit it
 * (the model does not browse); with none it prints the find command instead.
 */
export const techniqueLine = (env, areas) => {
  const { directions, ids } = env.techniques(areas);
  const get = env.run('technique.mjs', 'get <id>');
  if (directions.length && ids.length) {
    const more = env.run('technique.mjs', `find "<need>" --direction ${directions[0]}`);
    return `Techniques that fit the direction "${directions.join(' + ')}": ${ids.map((id) => `\`${id}\``).join(', ')}. Read one: ${get}. Apply at most 2 per screen; more: ${more}`;
  }
  if (directions.length) return `No technique card of this step names the direction "${directions.join(' + ')}". Find: ${env.run('technique.mjs', `find "<need>" --direction ${directions[0]}`)} Read one: ${get}`;
  return `No direction is recorded yet. Find techniques: ${env.run('technique.mjs', 'find "<need>"')} (add --area layout|type|color|motion|imagery|3d|psychology). Read one: ${get}`;
};

/** A line that names the area skills that are installed here (none installed: no line); each carries the rules of its area. */
export const areaSkills = (env, names, use) => {
  const have = names.filter((name) => env.skill(name));
  if (!have.length) return false;
  const list = have.length > 1 ? `${have.slice(0, -1).join(', ')} and ${have.at(-1)}` : have[0];
  return `Load the skill${have.length > 1 ? 's' : ''} ${list} for ${use}: each lists when to use a technique, how to check it and which cards matter.`;
};

/** A repository with its own product document (BMAD PRD, specs) keeps it as the anchor: no PRODUCT.md. */
export const hasOwnProductDoc = (env) => /bmad|spec/i.test(env.framework);
const BUILDER_USE = { hallmark: 'new page or section', 'design-taste-frontend': 'app screen' };
const builderSkill = (env) => ['hallmark', 'design-taste-frontend'].filter((name) => env.skill(name));

export const PARTS = {
  intake: [{
    id: null,
    title: 'read the project context',
    build: (env) => ({
      goal: 'Know what this project already has, before reading or editing any of its files.',
      steps: [
        `Run: ${env.run('context.mjs')}`,
        `Run: ${env.run('ui-map.mjs', 'build')}`,
        `Run: ${env.run('memory.mjs', 'lib sync')}`,
        `Read ${CONTEXT} (stack, screens, ux_present, UI libraries) and ${OUT}/UI-MAP.md (components, roles, routes). Do not explore the repository by hand.`,
        'Tell the user in one line: the route, the stack and what already exists.',
      ],
      done: [`${CONTEXT} and ${OUT}/UI-MAP.md exist.`],
      reference: env.kit('guides/00-START-HERE.md'),
    }),
  }],

  direction: [
    {
      id: 'questions',
      title: 'ask the user about the product, the audience and the goal',
      decision: 'the answers about the product, the audience and what counts as success',
      artifacts: [['out:ux/EXPERIENCE-BRIEF.md']],
      build: (env) => ({
        goal: 'Learn from the user what is being built, for whom and what counts as success.',
        steps: [
          `Read ${CONTEXT}${env.hasProduct ? ' and PRODUCT.md' : ''}. Never ask the user what is already answered there.`,
          `Open ${env.kit('experience/QUESTION-BANK.md')}. Ask the user the questions you cannot answer yourself, in rounds of 3 to 5, each with 2 to 4 options plus free text.`,
          env.skill('landing-page-design') && 'For a landing or marketing page, load the skill landing-page-design and add its intake topics to the rounds: offer, primary action, audience, objections, traffic source, proof.',
          env.laya && `With more than 3 questions left, rank the next one: ${env.python('laya_select.py', `--dataset experience --kind question --task next-question --context-file ${BRIEF} --confirmed`)}`,
          'Stop when 10 to 18 questions are answered, or when the user says it is enough.',
          `Write ${BRIEF} from the template below and put every answer under Context or Goal.`,
        ],
        template: {
          file: BRIEF,
          lines: [
            '# Experience brief',
            '## Context',
            '<product · audience · where and when they use it · each answer the user gave>',
            '## Goal',
            '<the one action that counts as success>',
            '## Laya consent',
            env.laya ? 'granted' : 'not asked',
          ],
        },
        done: [`${BRIEF} exists with Context and Goal filled from the user's answers, not from guesses.`],
        reference: env.kit('guides/01-EXPERIENCE-DIRECTION.md'),
      }),
    },
    {
      id: 'classify',
      title: 'choose the archetype, the philosophy and the navigation model',
      build: (env) => ({
        goal: 'Name what kind of site this is, so every later choice follows one idea.',
        steps: [
          `Read ${env.kit('experience/SITE-ARCHETYPES.md')}. Choose one site archetype and one experience archetype (two at most). List the pages, one line each with the job of the page.`,
          `Read ${env.kit('experience/UX-PHILOSOPHIES.md')}. Choose one philosophy. Name the alternative you discarded and why.`,
          'Choose one navigation_model: single-page-anchors, linear-wizard, hub, catalog, console or tree.',
          env.laya && `Rank the candidates first: ${env.python('laya_select.py', `--dataset experience --kind archetype --task direction --context-file ${BRIEF} --confirmed`)} (scores only compare candidates; explain your pick).`,
          `Add the two sections below to ${BRIEF}.`,
        ],
        template: {
          file: BRIEF,
          lines: [
            '## Archetype',
            'site archetype: <id> · experience archetype: <id>',
            'navigation_model: <one of the six>',
            'pages: <page — its job> (one line per page)',
            'why: <one sentence tied to Context and Goal>',
            '## Philosophy',
            'chosen: <id> · why: <one sentence>',
            'discarded: <id> · why: <one sentence>',
          ],
        },
        done: ['The brief has Archetype (with navigation_model and the page list) and Philosophy (with the discarded alternative).'],
        reference: env.kit('guides/01-EXPERIENCE-DIRECTION.md'),
      }),
    },
    {
      id: 'journey',
      title: 'write the journey and the information architecture',
      build: (env) => ({
        goal: 'Decide what the visitor does, in what order, and what content each moment needs.',
        steps: [
          'Write the journey of the main visitor: phases in order, and for each phase what they do, think and feel, what blocks them and what would help.',
          'Write the information architecture: content by priority, navigation, section order of each page, where visitors arrive and leave, what needs search or filters.',
          `Start the section order of each page from its recipe: ${env.run('recipe.mjs', 'list')} finds it, ${env.run('recipe.mjs', 'show <id>')} prints its sections in order. Keep them in order, drop the ones this journey does not need, and add none that has no job.`,
          'Organize everything by the tasks of the visitor, never by how the company is organized.',
          `Take proven patterns from ${env.kit('experience/references/INDEX.md')} and cite each as [ref: <slug>].`,
          `Add the two sections below to ${BRIEF}.`,
        ],
        template: {
          file: BRIEF,
          lines: [
            '## Journey',
            'actor: <who> · scenario: <what brings them>',
            '| Phase | Does | Thinks | Feels | Friction | Opportunity |',
            '|---|---|---|---|---|---|',
            '## Information architecture',
            'priority content: <ordered list>',
            'navigation: <items, in order>',
            'section order: <page — section 1, section 2, …> (one line per page)',
            'entry and exit points: <…> · search or filters: <…>',
          ],
        },
        done: ['The brief has Journey (at least 3 phases) and Information architecture (a section order for every page of Archetype).'],
        reference: env.kit('guides/01-EXPERIENCE-DIRECTION.md'),
      }),
    },
    {
      id: 'references',
      title: 'look at real examples with the user',
      decision: 'which of the example sites they prefer and what they highlight in them (or that they have none)',
      build: (env) => ({
        goal: 'Find out which real sites the user likes and what exactly they like in them.',
        steps: [
          `Collect 3 to 5 example sites that share this archetype: from a web search, from ${env.kit('experience/references/INDEX.md')} and from URLs the user gives.`,
          'For each one tell the user: its navigation model, its section order and one moment worth looking at.',
          'Ask the user which they prefer and what they highlight. One more round of 2 or 3 candidates at most.',
          env.mcp('playwright')
            ? `Open the chosen ones with the Playwright MCP and save a screenshot of each in ${OUT}/ux/references/.`
            : `The Playwright MCP is not configured in this project: take no screenshots, and write "no browser available" in the section.`,
          `Record each pick: ${env.run('memory.mjs', 'add --screen experience --block reference --need "<what the user liked>" --decision adapt --ref "reference:<slug>"')}`,
          `Add the section below to ${BRIEF}.`,
        ],
        template: {
          file: BRIEF,
          lines: [
            '## Reference discoveries',
            '- [ref: <slug>] <url> — liked: <…> · disliked: <…>',
          ],
        },
        done: ['The brief has Reference discoveries with at least one reference the user chose, or the sentence "the user gave no reference".'],
        reference: env.kit('experience/DISCOVERY-LOOP.md'),
      }),
    },
    {
      id: 'directions',
      title: 'propose three directions that differ in structure',
      build: (env) => ({
        goal: 'Give the user three real alternatives, not three recolors of one idea.',
        steps: [
          'Write three directions: safe (familiar patterns), differentiated (a recognizable structure with one distinctive composition, narration or navigation) and experimental (unusual, still clear and accessible).',
          'They must differ in archetype, navigation, journey, composition or narrative. A change of color or font alone is not a direction.',
          `Read the anti-generic list of ${env.kit('experience/STYLE-DIRECTIONS.md')} and remove from each direction anything it names.`,
          ...builderSkill(env).map((name) => `Load the skill ${name} only to collect themes as raw material. Build nothing with it here.`),
          `Add the section below to ${BRIEF}, filled three times.`,
        ],
        template: {
          file: BRIEF,
          lines: [
            '## Three directions',
            '### <safe | differentiated | experimental>: <name>',
            'changes: <what is structurally different>',
            'key patterns: <…>',
            'sacrifices: <…> · main risk: <…> · do not use when: <…>',
          ],
        },
        done: ['The brief has Three directions with the three blocks, and each differs from the others in structure.'],
        reference: env.kit('guides/01-EXPERIENCE-DIRECTION.md'),
      }),
    },
    {
      id: 'choose',
      title: 'the user chooses; write the visual brief',
      decision: 'which of the three directions to build, or how to combine them',
      build: (env) => ({
        goal: 'Close the direction with the user and leave the visual brief the tokens step reads.',
        steps: [
          'Show the three directions to the user. The user chooses one or combines them. Do not choose for them.',
          `Record it: ${env.run('memory.mjs', 'add --screen experience --block direction --need "<one line>" --decision adapt --notes "direction:<id>; risk:<…>" --ref "direction:<id>"')}`,
          `Add the five sections below to ${BRIEF}.`,
        ],
        template: {
          file: BRIEF,
          lines: [
            '## Recommended direction',
            'id: <id> · rationale: <…> · risks: <…>',
            '## Interaction patterns',
            '- <screen type>: <pattern> — solves <problem>',
            '## Visual brief',
            'style: <…> · palette intent: <…> · typography personality: <…>',
            'composition: <…> · motion: <calm | snappy | playful>',
            'anti-generic list: <what this design must never look like>',
            '## Accessibility',
            'keyboard: <…> · contrast: <…> · motion: <…> · language: <…>',
            '## Open questions',
            '- <pending decision, or "none">',
          ],
        },
        done: ['The brief has Recommended direction with the id the user chose, and a complete Visual brief.'],
        reference: env.kit('guides/01-EXPERIENCE-DIRECTION.md'),
      }),
    },
  ],

  ux: [
    {
      id: 'product',
      title: 'anchor the product',
      decision: (env) => !hasOwnProductDoc(env) && !env.hasProduct && 'the audience, the primary action, the objections, the proof and the tone of the product (what you cannot answer from the brief)',
      artifacts: (env) => (hasOwnProductDoc(env) ? [] : [['root:PRODUCT.md']]),
      build: (env) => {
        const adapter = hasOwnProductDoc(env);
        return {
          goal: 'Fix what the product is for, so every screen can be traced to a business reason.',
          steps: [
            env.uxPresent === null && `${CONTEXT} is missing or does not say whether UX exists. Run: ${env.run('context.mjs')} and then ask for this instruction again.`,
            adapter && `This repository uses ${env.framework}. Read ${env.kit('guides/ADAPTERS.md')}: its product document is the anchor. Do not create PRODUCT.md.`,
            !adapter && env.hasProduct && 'PRODUCT.md exists. Read it. Do not rewrite it; add only the sections of the template below that it lacks.',
            !adapter && !env.hasProduct && 'Write PRODUCT.md in the project root from the template below. Ask the user what you cannot answer from the brief.',
            !adapter && 'Give every item an id, so a screen can cite it later: G1 the primary action, O1, O2… the objections, P1, P2… the proof.',
            env.hasBrief && `Read ${BRIEF}: the screens must respect its direction.`,
          ],
          template: adapter ? null : {
            file: 'PRODUCT.md',
            lines: [
              '# Product',
              '## Audience',
              '<who uses this, in what context>',
              '## Primary action',
              'G1: <the one measurable action the visitor takes>',
              '## Objections',
              'O1: <what stops them from taking it>',
              '## Proof',
              'P1: <what makes the claim believable: a number, a name, a guarantee>',
              '## Tone',
              '<three adjectives, and one thing the copy never does>',
              '## User flows',
              '<arrival → … → the primary action → what comes after>',
              '## Screen list',
              '- <screen> — <its purpose in one line>',
              '## Constraints',
              '<brand, legal, accessibility, scope limits>',
            ],
          },
          done: [adapter ? 'You read the product document of the repository and can name audience and primary action.' : 'PRODUCT.md has Audience, Primary action (G1), Objections (O1…), Proof (P1…) and Tone filled.'],
          reference: env.kit('guides/02-UX-FLOWS.md'),
        };
      },
    },
    {
      id: 'spec',
      title: 'write the screens, flows and states',
      decision: (env) => env.uxPresent === true && 'whether to summarize the UX that exists (as-is) or to redesign it radically',
      artifacts: [['out:ux/UX-SPEC.md']],
      build: (env) => ({
        goal: 'Define how the product works, screen by screen, before any component is chosen.',
        steps: [
          env.uxPresent === true && 'This project already has UX. Ask the user once: "There is existing UX. Do you want a summary of what exists (as-is) or a radical redesign?" Summary: document and audit, propose nothing. Redesign: first write the current state in ai-frontend-output/ux/UX-BASELINE.md, and at the end the differences in UX-DIFF.md; PRODUCT.md stays as it is.',
          env.uxPresent !== true && 'This project has no UX yet: design it from scratch.',
          env.skill('userflow')
            ? 'Load the skill userflow. It selects 1 to 4 flow-* skills: load those, say which in one line, and apply their rules. Never write a flow from memory.'
            : 'The userflow skill is not installed here: write the flows by hand and tell the user that the proven flow patterns were not available.',
          `Write ${SPEC} from the template below. Every screen needs its empty, loading and error state.`,
          env.hasProduct
            ? 'End every screen row with the ids of PRODUCT.md it serves (G1, O2, P1), separated by commas. A screen that serves none has no reason to exist: remove it.'
            : 'End every screen row with the id of the requirement or story of the product document of this repository that it serves.',
          env.skill('userflow') && `Generate flow-report.html from the template of userflow and save it in ${OUT}/ux/.`,
          env.skill('userflow') && 'Check the result against the Anti-Patterns section of each loaded skill and fill the Audit table.',
        ],
        template: {
          file: SPEC,
          lines: [
            '# UX spec',
            '## Screens',
            '| Screen | Purpose | Primary action | Empty state | Loading state | Error state | Serves |',
            '|---|---|---|---|---|---|---|',
            '## Flows',
            '### <flow name>',
            '1. <screen> → shows <…> → primary action <…> → goes to <screen> (branch: <condition>)',
            '## Navigation',
            '<structure · order in which it collapses on small screens>',
            '## Audit',
            '| Anti-pattern | Result (PASS, WARN or FAIL) | Where |',
            '|---|---|---|',
          ],
        },
        done: [`${SPEC} lists every screen of the product with its three states and the ids it serves, and every flow as numbered steps.`],
        reference: env.kit('guides/02-UX-FLOWS.md'),
      }),
    },
    {
      id: 'map',
      title: 'draw the screen map',
      build: (env) => ({
        goal: 'Leave a visual map of screens and navigation that matches the spec exactly.',
        steps: [
          env.skill('ux-map') ? 'Load the skill ux-map: it carries the recipe.' : `The ux-map skill is not installed here: follow "Step 5" of ${env.kit('guides/02-UX-FLOWS.md')}.`,
          env.mcp('excalidraw')
            ? 'Draw with the Excalidraw MCP server (it is configured in this project).'
            : 'The Excalidraw MCP server is not configured in this project: use the manual fallback of the skill and tell the user.',
          `One node per screen (name, primary action, key blocks), one labeled arrow per button or action that navigates, and a start node. Node names are exactly the screen names of ${SPEC}.`,
          env.hasBrief
            ? `Choose the template from navigation_model in ${BRIEF}; take areas and colors from its Information architecture.`
            : `There is no ${BRIEF}: choose the template from the shape of the screens (single-page-anchors, linear-wizard, hub, catalog, console or tree).`,
          env.hasMap && `${MAP} already exists: copy it first to ${OUT}/ux/ux-map-baseline.excalidraw, then update it.`,
          `Save the map as ${MAP}.`,
        ],
        done: [`${MAP} exists and every screen of ${SPEC} is a node in it.`],
        reference: env.kit('guides/02-UX-FLOWS.md'),
      }),
    },
  ],

  tokens: [{
    id: null,
    title: 'fix the visual system',
    build: (env) => ({
      goal: 'Fix color, type, spacing, radius and motion before choosing components, so every piece inherits this identity. You choose a few values; the tool computes the rest.',
      steps: [
        env.mcp('figma')
          ? 'The Figma MCP is configured: ask the user for the Figma file URL, inspect it and extract the colors, fonts, radius and spacing. They go into the flags of the init command below; for extra tokens edit design-tokens.json by hand. Never write them straight into CSS.'
          : `No Figma here: choose the values from the Visual brief section of ${BRIEF} and from PRODUCT.md.`,
        `For a system-level reference: ${env.run('find.mjs', '--type design-system')} and then ${env.run('get.mjs', '<id>')}`,
        'Choose: primary, accent and neutral color (hex); display and body font; radius (none, small, medium, large); density (compact, regular, spacious); type ratio (1.2, 1.25, 1.333); motion (calm, snappy, playful).',
        `Run: ${env.run('tokens.mjs', `init --primary <hex> --accent <hex> --neutral <hex> --font-display <name> --font-body <name> --radius <…> --density <…> --type-ratio <…> --motion <…>${env.dark ? ' --dark' : ''}`)}`,
        `Check the tokens. Every line it prints is a contrast failure or a wrong value: change the flag and run init again with --force, or edit that value in design-tokens.json, until it prints none. Run: ${env.run('tokens.mjs', 'check')}`,
        `Write the Tailwind v4 theme, then import that file from the global CSS, after the tailwindcss import. Names are semantic (--color-primary, --color-surface). Run: ${env.run('tokens.mjs', 'css --out ai-frontend-output/theme.css')}`,
        `Write the token tables of DESIGN.md. Run: ${env.run('tokens.mjs', 'doc')}`,
        'Replace the <…> line under Visual intent in DESIGN.md with one paragraph you can quote when choosing components.',
        `The layout numbers that sit on these tokens (container, grid, section padding, type step per heading) are in ${env.kit('experience/LAYOUT-RULES.md')}. Follow them; do not choose them by eye.`,
        areaSkills(env, ['technique-type', 'technique-color'], 'the type and color choices'),
        techniqueLine(env, ['type', 'color', 'layout']),
        env.skill('impeccable') && 'Load the skill impeccable and follow its guidelines for the token choices.',
      ],
      done: ['design-tokens.json exists and the check command prints no failure (body text is 4.5:1 or more on its surface).', 'DESIGN.md has every section filled, with the token tables and a Visual intent paragraph.', 'The global CSS gets the @theme block from the css command.'],
      reference: env.kit('guides/03-TOKENS.md'),
    }),
  }],

  compose: [
    {
      id: 'inventory',
      title: 'list what each screen needs',
      artifacts: [['out:INVENTORY.md', 'root:INVENTORY.md']],
      build: (env) => ({
        goal: 'Turn each screen into a list of needed blocks by category, before looking at any library.',
        steps: [
          `Read ${SPEC}. Take only its screens; do not invent others.`,
          `Run: ${env.run('recipe.mjs', 'suggest')} — it names the page recipe of each screen. A screen with no recipe you describe by hand.`,
          `Run: ${env.run('recipe.mjs', 'inventory --write')} — it writes ${INVENTORY} with one row per section of each recipe: category, priority, layout and search words filled (add --force only to replace a file that is yours to replace).`,
          `Review the rows. Remove the blocks this product does not need; add the ones it lacks (with a category of ${env.kit('catalog/taxonomy.md')}), and the rows of screens without a recipe, including empty, loading and error states.`,
          'Fill every empty Serves cell with the ids of PRODUCT.md the block answers (G1, O1, P1). A block that serves none has no reason to exist: remove it.',
          'Priority is must, should or nice. A block that repeats across screens is one row, marked "shared". Do not name libraries or components yet; about 30 rows.',
        ],
        template: {
          file: INVENTORY,
          lines: [
            '# Inventory',
            `| ${INVENTORY_COLUMNS.join(' | ')} |`,
            `|${INVENTORY_COLUMNS.map(() => '---').join('|')}|`,
            '| <screen of the spec> | <block> | <category> | must | <…> | | | <G1, O1, P1> | <layout> | <search words> |',
          ],
        },
        done: [`${INVENTORY} has one row per block of every screen, with Serves and Query filled; Candidates and Decision are still empty.`],
        reference: env.kit('guides/04-INVENTORY.md'),
      }),
    },
    {
      id: 'find',
      title: 'search before creating anything',
      build: (env) => ({
        goal: 'Fill the Candidates column: what already exists for each must and should row.',
        steps: [
          `Once: ${env.run('memory.mjs', 'combo list')} — reuse a saved combination when it fits.`,
          'Then, for each must and should row, in this order:',
          `  a. ${env.run('ui-map.mjs', 'have "<need>"')} — a component of this project wins.`,
          `  b. ${env.run('pieces.mjs', 'find "<need>"')} — own piece, then a variant, then a piece of another project.`,
          `  c. ${env.run('find.mjs', '"<the Query of the row>"')} — the catalog; the Query column holds the first search words, and --category <Category> narrows them. Read the results from the top: ReUI, then shadcn/ui, then Shadcn Space.`,
          `  d. ${env.run('get.mjs', '<id>')} — license, dependencies and install command of each candidate you keep.`,
          'With no result that fits, search again with other words or with --category <category>. Two searches at least before giving up.',
          env.laya && `Order each shortlist: ${env.python('laya_select.py', `--need "<need>" --category <category> --direction <direction id> --context-file ${BRIEF} --confirmed`)}`,
          `Write up to 3 candidates per row in ${INVENTORY}: id, license, and one reason.`,
          'Never use an entry with license_type non-commercial in commercial work. Verify an unknown license on its page first.',
        ],
        done: ['Every must and should row has candidates, or the words of the two searches that found nothing.'],
        reference: env.kit('guides/05-FIND.md'),
      }),
    },
    {
      id: 'decide',
      title: 'decide reuse, adapt or build, install and record',
      decision: 'which components to reuse, adapt or build for each row (they choose among the 2 or 3 combinations you show)',
      build: (env) => {
        const skills = builderSkill(env);
        return {
          goal: 'Take one decision per row, install it and record it with its reason.',
          steps: [
            'Per row: reuse when a candidate fits with a compatible license and stack; adapt when it fits but needs porting to this stack; build only when the searches found nothing or the license blocks it.',
            'Show the user 2 or 3 combinations with their reasons before installing.',
            `Install with the install_command that ${env.run('get.mjs', '<id>')} prints. Never type an install command from memory.`,
            'After each install, render the component alone once and confirm the project builds.',
            skills.length
              ? `For a build, load the skill ${skills.map((name) => `${name} (${BUILDER_USE[name]})`).join(' or ')} and build only that row, inside the tokens of DESIGN.md.`
              : `For a build, keep these rules: ${CRAFT_RULES}.`,
            `Record every row right after deciding it: ${env.run('memory.mjs', 'add --screen <screen> --block <block> --need "<need>" --decision reuse|adapt|build --id <entry id>')} (a build has no id: use --name "<name>" and --notes "<what you searched and why it did not fit>").`,
            `Screen and block names are the ones of ${SPEC}. Write the decision in ${INVENTORY} too.`,
          ],
          done: [`Every must and should row of ${INVENTORY} has a decision, and ${env.run('memory.mjs', 'list')} shows one record per row.`],
          reference: env.kit('guides/06-REUSE.md'),
        };
      },
    },
    {
      id: 'adapt',
      title: 'make every piece look like this product, and register it',
      build: (env) => ({
        goal: 'Make reused components carry this identity without rewriting them, and register what the project now owns.',
        steps: [
          'Adapt in this order and stop at the first that is enough: tokens of the theme; the props and variants of the component; a wrapper around it; a patch inside it, with a comment that says what changed, why and the catalog id.',
          'Never write a color, size or radius by hand in a component: use the tokens.',
          `Container, grid, section padding and type steps follow ${env.kit('experience/LAYOUT-RULES.md')}, using the Layout column of ${INVENTORY}.`,
          'Replace linear transitions with springs; keep at most 2 high-impact animated blocks per view; give a static fallback under prefers-reduced-motion.',
          'The same component on three screens is one shared component, not three copies.',
          `Decorative shapes, dividers, patterns and icons come from ${env.run('svg.mjs', 'gen <kind> --out <file>')} (kinds: ${env.run('svg.mjs', 'gen --list')}); every drawn or imported SVG passes ${env.run('svg.mjs', 'check <file> --strict')}.${env.skill('svg-craft') ? ' Load the skill svg-craft for the drawing method.' : ''}`,
          env.wants3d && `3D was chosen: write the scene spec first with ${env.run('scene.mjs', 'init')}, fill it, run ${env.run('scene.mjs', 'check')}, then build from it with ${env.run('scene.mjs', 'code')} or ${env.run('scene.mjs', 'prompt')}.${env.skill('scene-3d') ? ' Load the skill scene-3d for the method.' : ''}`,
          areaSkills(env, ['technique-layout', 'technique-motion', 'technique-imagery', 'technique-3d'], 'layout, motion, images and 3D'),
          techniqueLine(env, ['layout', 'motion', 'imagery', 'svg', '3d']),
          `Register each catalog component that landed: ${env.run('get.mjs', '<id> --landed <path of the file>')}`,
          `Register each build: ${env.run('pieces.mjs', 'add <name> --level micro|small|medium|large --file <path of the file>')}`,
          `After editing a registered piece: ${env.run('pieces.mjs', 'version <name> --note "<what changed>"')}`,
          `When a screen is complete, save it for reuse: ${env.run('memory.mjs', 'combo save <name> --note "<what it is for>"')}`,
        ],
        done: ['Every component renders with the tokens of DESIGN.md.', 'Every build is a registered piece and no registered piece changed after its last version.'],
        reference: env.kit('guides/07-ADAPT.md'),
      }),
    },
  ],

  board: [{
    id: null,
    title: 'ask about Storybook, then compose the real components into a design board',
    decision: (env) => !env.storybook.present && 'whether to install Storybook as the design board of this project (yes or no)',
    build: (env) => {
      const { present, install, framework } = env.storybook;
      const detect = env.run('board.mjs', 'detect');
      const declined = env.run('flow.mjs', 'done board --declined --reason "<the answer of the user, in their words>"');
      return {
        goal: 'Give the project a design board: Storybook stories that compose its own components with mock data, one story per layout version, without touching its logic, routes, stores or API calls. Storybook is installed only when the user says yes.',
        steps: present
          ? [
            `Run: ${detect}`,
            `Storybook is installed here (framework: ${framework}). Build the map and read the plan: ${env.run('ui-map.mjs', 'build')} then ${env.run('board.mjs', 'plan')}`,
            'Ask the user which pages go on the board first (3 at most, from the plan). Do not choose for them.',
            `For each page: ${env.run('board.mjs', 'scaffold <page> --version v1-<name>')}. Another layout of the same page is another version: ${env.run('board.mjs', 'scaffold <page> --version v2-<name>')} (kebab-case, for example v1-sidebar, v2-topbar, v3-compact).`,
            'Fill each story with the real presentational components of that page (the plan lists them) and made-up mock data. Change only layout and style: never the logic, routes, stores or API calls.',
            `Run: ${env.run('board.mjs', 'check')} — fix every finding it lists (pass mock props instead) and run it again until it prints 0 findings.`,
            `Run: ${env.run('board.mjs', 'list')} and tell the user the stories are under Board/Pages in Storybook (the project's storybook script opens it).`,
            'Do not apply a version to the real page: that is a separate step, only when the user asks for it.',
          ]
          : [
            `Run: ${detect}`,
            `Storybook is not installed in this project. Ask the user, in one message: "Install Storybook as the design board of this project? It runs ${install}." Then STOP and wait for the answer. Never install it on your own.`,
            `The user says yes: run ${install} in the project root, run ${detect} again, then ask for this instruction again with: ${env.run('flow.mjs', 'next')}`,
            `The user says no: run ${declined} and go on to the next step. Do not ask again unless the user brings it up.`,
          ],
        done: present
          ? [`${env.run('board.mjs', 'check')} prints 0 findings.`, `${env.run('board.mjs', 'list')} shows at least one page with a version.`]
          : ['The user answered: Storybook is installed and detect says present, or the declined command ran with the reason of the user.'],
        reference: env.kit('guides/14-DESIGN-BOARD.md'),
      };
    },
  }],

  iterate: [{
    id: null,
    title: 'make one small change',
    report: [
      'Located with ui-map impact: every owner, user and stray changed',
      'Reuse searched first: pieces find and ui-map have',
      'The change is the smallest that satisfies the request',
      'Tokens of DESIGN.md kept',
      DESIGN_AUDIT_CHECK,
      'Registered pieces versioned, new builds added as pieces',
      'Decision recorded with memory add',
      'ui-map impact run again: no stray left',
      'The change touches fewer than 3 screens and adds no flow',
    ],
    build: (env) => {
      const skills = builderSkill(env);
      return {
        goal: 'Make the smallest change that satisfies the request, reusing what exists, and record it.',
        steps: [
          `Locate: ${env.run('ui-map.mjs', 'impact <role or component>')} — change every owner, user and stray it lists.`,
          `Reuse first: ${env.run('pieces.mjs', 'find "<need>"')} and ${env.run('ui-map.mjs', 'have "<name>"')}. A request to adjust a piece ("more spacing") means editing its file, never a new piece.`,
          `Only for something new: ${env.run('memory.mjs', 'combo list')}, then ${env.run('find.mjs', '"<need>"')} and ${env.run('get.mjs', '<id>')}. Build only when two searches found nothing that fits.`,
          skills.length ? `For a build, load the skill ${skills.join(' or ')} and build only that block.` : `For a build, keep these rules: ${CRAFT_RULES}.`,
          'Apply the change. Keep the tokens of DESIGN.md. Do not redesign what was not asked.',
          `After editing a registered piece: ${env.run('pieces.mjs', 'version <name> --note "<what changed>"')}. After a build: ${env.run('pieces.mjs', 'add <name> --level micro|small|medium|large --file <path>')}`,
          `Record: ${env.run('memory.mjs', 'add --screen <screen> --block <block> --need "<need>" --decision reuse|adapt|build [--id <entry id>]')}`,
          `Run ${env.run('ui-map.mjs', 'impact <role or component>')} again: no stray may remain.`,
          `Run: ${designAuditCommand(env)} — fix its list from the top.`,
          'If the change touches 3 or more screens or adds a flow, stop and tell the user: that is the route ux, not a small change.',
          `Write the report: ${env.run('flow.mjs', 'report iterate')} creates ${OUT}/reports/iterate-report.md. Mark each check [x] with its result, or [n/a] with its reason.`,
        ],
        done: ['The change is applied, recorded with memory add, and impact lists no stray in scope.', REPORT_ROW],
        reference: env.kit('guides/10-ITERATE.md'),
      };
    },
  }],

  redesign: [{
    id: null,
    title: 'redesign the look of one screen',
    report: [
      'Screen and what must not change agreed with the user',
      'Everything the screen touches located with ui-map impact',
      'New look uses only the tokens of DESIGN.md',
      DESIGN_AUDIT_CHECK,
      'Flows, steps and meaningful copy unchanged',
      'Registered pieces versioned',
      'Decision recorded with memory add',
      'The project builds',
    ],
    build: (env) => ({
      goal: 'Change how one existing screen looks, keeping its flows, its content and its wiring.',
      steps: [
        'Agree with the user which screen, and what must not change.',
        `Locate everything it touches: ${env.run('ui-map.mjs', 'impact <screen or component>')}`,
        env.skill('design-taste-frontend')
          ? 'Load the skill design-taste-frontend in redesign mode. Keep the brand values and the tokens of DESIGN.md.'
          : `Redesign by hand with these rules: ${CRAFT_RULES}.`,
        'Do not add, remove or reorder steps of a flow, and do not change copy that carries meaning: that is a UX change and needs the route ux.',
        `Run: ${designAuditCommand(env)} — fix its list from the top.`,
        `After editing a registered piece: ${env.run('pieces.mjs', 'version <name> --note "<what changed>"')}`,
        `Record: ${env.run('memory.mjs', 'add --screen <screen> --block <block> --need "visual redesign" --decision adapt --notes "<what changed>"')}`,
        `Write the report: ${env.run('flow.mjs', 'report redesign')} creates ${OUT}/reports/redesign-report.md. Mark each check [x] with its result, or [n/a] with its reason.`,
      ],
      done: ['The screen has the new look, the same flows and content, and the project builds.', REPORT_ROW],
      reference: env.kit('guides/08-PHILOSOPHY.md'),
    }),
  }],

  polish: [{
    id: null,
    title: 'audit and fix until every check is green',
    report: [
      'Honesty audit (audit-honesty --strict)',
      DESIGN_AUDIT_CHECK,
      'Accessibility audit (axe)',
      'Performance audit (LCP, CLS, TBT)',
      'Frontend map check (ui-map check)',
      'Regression suite (@playwright/test)',
      'Console without errors',
      'States: empty, loading and error',
      'Widths 360, 768 and 1280',
      'Keyboard only',
      'Reduced motion',
      'Craft by hand (one focal point, copy that says what the page does, nothing default-looking)',
      'Every finding was fixed and its check run again',
      ...PSYCHOLOGY_CHECKS,
    ],
    build: (env) => ({
      goal: 'Prove that the screen works and that the craft holds. Fix what each check reports, then run it again.',
      steps: [
        'Start the app and note its URL.',
        env.skill('frontend-polish') && 'Load the skill frontend-polish and follow its loop on every touched screen.',
        env.mcp('playwright')
          ? 'With the Playwright MCP, on every touched screen: accessibility snapshot, empty, loading and error states, console without errors, keyboard only, reduced motion, widths 360, 768 and 1280.'
          : 'The Playwright MCP is not configured in this project: check each screen by hand at widths 360, 768 and 1280, with the keyboard only and with reduced motion, and say so in the report.',
        `Run: ${env.run('audit-honesty.mjs', 'src --strict')}`,
        `Run: ${designAuditCommand(env)} — it measures spacing, sizes, colors, motion, focus, contrast and layout. Fix its list from the top, most severe first, and run it again until no high finding is left.`,
        env.dep('@axe-core/playwright') ? `Run: ${env.run('audit-a11y.mjs', '<url>')}` : 'Accessibility audit: @axe-core/playwright is not a dependency here. Tell the user it can be added with: npm i -D @axe-core/playwright',
        `Run: ${env.run('audit-perf.mjs', '<url>')} (fails above LCP 2.5 s, CLS 0.1, TBT 200 ms).`,
        `Run: ${env.run('ui-map.mjs', 'check')}`,
        env.dep('@playwright/test') ? 'Run: npx playwright test' : 'There is no @playwright/test in this project: no regression suite runs. Mark that check [n/a] in the report.',
        env.skill('impeccable') && 'Load the skill impeccable: /impeccable audit <screen>, then /impeccable polish <screen>.',
        env.skill('hallmark') && 'Name the skill hallmark for a second-opinion audit. Report only: it must not rebuild the screen.',
        'Check by hand only what no tool measures: answer every "Psychology:" line of the report with yes or no and where you saw it (focal point, what the button promises, proof, the way back, the closing action), and that nothing looks like a default.',
        areaSkills(env, ['technique-psychology'], 'the Psychology lines of the report'),
        'Fix exactly what each check reported and run that check again. A screen is not done with a red check or a console error.',
        `Write the report: ${env.run('flow.mjs', 'report polish')} creates ${OUT}/reports/polish-report.md. Mark each check [x] with its result, or [n/a] with the reason it could not run.`,
      ],
      done: ['Every command above ran, and its last run reported no blocking finding.', REPORT_ROW],
      reference: env.kit('guides/09-VERIFY.md'),
    }),
  }],

  'visual-feedback': [{
    id: null,
    title: 'the user points, you change exactly that',
    report: [
      'Annotations read, or the elements named by the user one by one',
      'Each element the user named was changed, and nothing else',
      'Each annotation was resolved with one line of what changed',
      'Registered pieces versioned',
      'No annotation is pending',
    ],
    build: (env) => {
      const ready = env.dep('react') && env.mcp('agentation');
      return {
        goal: 'Change exactly the elements the user points at in the browser, and nothing else.',
        steps: !env.dep('react')
          ? [
            'This project is not React: the Agentation toolbar cannot run here.',
            'Ask the user to name each element and what to change, one at a time.',
            `Locate each one: ${env.run('ui-map.mjs', 'impact <component>')}, change it, and show the result.`,
            `Write the report: ${env.run('flow.mjs', 'report visual-feedback')} creates ${OUT}/reports/visual-feedback-report.md. Mark each check [x] with its result, or [n/a] with its reason.`,
          ]
          : [
            !ready && 'Agentation is not configured here. Give the user these commands and wait: npm install agentation -D ; claude mcp add agentation -- npx -y agentation-mcp server ; npx agentation-mcp doctor',
            !ready && 'Mount it once in the app root, development only: {process.env.NODE_ENV === \'development\' && <Agentation endpoint="http://localhost:4747" />} — then the user restarts the agent session.',
            'The user runs the app, clicks each element and writes a note.',
            'Read the pending annotations with the agentation tools. For each: acknowledge it, change exactly that element, resolve it with one line of what changed.',
            'Do not touch elements without an annotation. A note that asks for a new flow or screen is not for this route: tell the user.',
            `After editing a registered piece: ${env.run('pieces.mjs', 'version <name> --note "<what changed>"')}`,
            `Write the report: ${env.run('flow.mjs', 'report visual-feedback')} creates ${OUT}/reports/visual-feedback-report.md. Mark each check [x] with its result, or [n/a] with its reason.`,
          ],
        done: ['No annotation is pending, or every element the user named was changed and shown.', REPORT_ROW],
        reference: env.kit('guides/11-VISUAL-FEEDBACK.md'),
      };
    },
  }],

  architecture: [{
    id: null,
    title: 'record which folder holds what',
    build: (env) => ({
      goal: 'Record the role of each folder so the next change knows where a file goes. Nothing is moved.',
      steps: [
        `Run: ${env.run('ui-map.mjs', 'build')}`,
        `Read ${OUT}/UI-MAP.md.`,
        `Write ${OUT}/architecture.json with the template below, mode "map". List only folders that exist; put what fits no layer under unmapped.`,
        'Do not move, rename or create any folder. FSD (modes fsd-new and fsd-refactor) runs only when the user asked for it in this conversation; then load the skill frontend-refactor and move one slice at a time.',
        `Run: ${env.run('ui-map.mjs', 'check')}`,
      ],
      template: {
        file: `${OUT}/architecture.json`,
        lines: [
          '{',
          '  "version": 1,',
          '  "mode": "map",',
          '  "framework": "<from REPO-CONTEXT.md>",',
          '  "layers": { "app": [], "pages": [], "widgets": [], "features": [], "entities": [], "shared": [] },',
          '  "unmapped": [],',
          '  "notes": "Mapping only. Nothing was moved."',
          '}',
        ],
      },
      done: [`${OUT}/architecture.json exists, is valid JSON and its mode is the one the user agreed to.`],
      reference: env.kit('guides/12-ARCHITECTURE.md'),
    }),
  }],
};
