#!/usr/bin/env python3
"""
Page content for mucolabs.com. Run `python3 build.py` to regenerate the site.

Editing rules that keep this site trustworthy:
  * Every number, price, claim and project status here must be verifiable.
  * A project's stage is what it actually is, never what we wish it were.
  * No testimonials, client logos, awards or metrics until they are real.
"""

from build import *  # noqa: F401,F403 — shared shell, tokens and helpers

# ===========================================================================
# Project archive → portfolio
#
# stage:  client  = paid client engagement
#         build   = active build, code exists and is progressing
#         spec    = requirements/specification locked, build not complete
#         concept = idea or pitch stage, deliberately not presented as a product
# ===========================================================================
STAGE_LABEL = {
    "client": ("Client project", "badge-live"),
    "build": ("Active build", "badge-build"),
    "spec": ("Specified", "badge-spec"),
    "concept": ("Concept", "badge-concept"),
}

PROJECTS = [
    {
        "id": "meyra",
        "featured": True,
        "name": "Meyra",
        "kicker": "Personal AI operating system",
        "stage": "build",
        "tags": ["ai", "internal", "desktop"],
        "summary": "A local-first desktop AI system that takes a goal from research and "
                   "requirements through design, code and QA, keeping project memory across "
                   "sessions instead of starting from scratch every time.",
        "problem": "AI work is scattered across chat, files, terminal and browser, and the "
                   "same context has to be re-explained every session.",
        "scope": "Electron desktop shell, mission execution graph, project file operations, "
                 "provider abstraction across cloud and local models, permission-gated machine "
                 "actions, Tamil/English/Tanglish voice architecture.",
        "state": "Core runtime implemented and tested. Persistent desktop presence, live voice "
                 "and several advanced surfaces are still in progress.",
        "chips": ["Electron", "TypeScript", "Local-first", "Multi-provider AI"],
    },
    {
        "id": "ooruva",
        "featured": True,
        "name": "Ooruva",
        "kicker": "Local business discovery ecosystem",
        "stage": "build",
        "tags": ["mobile", "saas", "marketplace"],
        "summary": "A hyperlocal discovery platform for real neighbourhood businesses — a "
                   "customer app, a vendor app and an admin console that share one verified "
                   "business directory.",
        "problem": "Small local businesses are hard to find in any structured, trustworthy way, "
                   "and most have no searchable menu, offers or digital profile.",
        "scope": "Customer discovery with location, category and budget filters; business "
                 "profiles with menus, hours, offers and reviews; vendor onboarding with "
                 "document verification; admin moderation, fees and audit logs.",
        "state": "Substantial implementation exists. Backend consolidation and several V1 "
                 "functions are being finished before public release.",
        "chips": ["Android", "Supabase", "Maps & location", "Tamil + English"],
    },
    {
        "id": "inknexis",
        "featured": True,
        "name": "InkNexis",
        "kicker": "Tattoo studio operating system",
        "stage": "build",
        "tags": ["saas", "web", "ai"],
        "summary": "Multi-tenant SaaS covering the whole tattoo studio lifecycle: customer "
                   "history, design and placement preview, quote, booking, consent, session, "
                   "aftercare, artist commission and analytics.",
        "problem": "Studios run on Pinterest, Photoshop, WhatsApp and paper forms, so customer, "
                   "design, consent and payment records never live in one place — and customers "
                   "cannot see placement or size before the session.",
        "scope": "Tenant isolation and RBAC, customer passport CRM, design library, placement "
                 "and sizing in cm/in, virtual preview, appointments and walk-in queue, "
                 "deposits, digital consent, aftercare schedules, staff attendance and commission.",
        "state": "Two master specifications merged into one product line (formerly InkFlow). "
                 "Production foundation in progress; full module completion not yet verified.",
        "chips": ["Multi-tenant SaaS", "PostgreSQL + RLS", "PWA", "AI concepts"],
    },
    {
        "id": "beauty-brand",
        "featured": True,
        "name": "Natural beauty brand website",
        "kicker": "Client project — retail, named on request",
        "stage": "client",
        "tags": ["web", "client", "retail"],
        "summary": "A mobile-first product storytelling website for a natural and organic beauty "
                   "brand, built to convert search and social visitors into WhatsApp enquiries "
                   "rather than force early e-commerce. Client named on request.",
        "problem": "The brand existed only on social media, and unverified ingredient or benefit "
                   "copy carries real trust and compliance risk.",
        "scope": "Home, products index, product detail pages, about and contact; structured "
                 "product data; per-product WhatsApp CTAs; JSON-LD, sitemap and robots; image "
                 "optimisation; a build check that refuses to publish an incomplete product page.",
        "state": "Implementation complete. Public launch waits on verified product photography, "
                 "approved label facts and DNS.",
        "chips": ["Next.js", "SSG/ISR", "Structured product data", "WhatsApp conversion"],
    },
    {
        "id": "muco-platform",
        "featured": True,
        "name": "MUCO LABS platform",
        "kicker": "This website and the business portal behind it",
        "stage": "build",
        "tags": ["web", "internal", "saas"],
        "summary": "The company's own lead-generation and credibility platform, designed to grow "
                   "into a secure customer, freelancer and admin portal without giving up SEO or "
                   "conversion.",
        "problem": "A studio that builds software for other people has to prove it can build and "
                   "operate its own — publicly, and without exaggerated claims.",
        "scope": "Public marketing site, service and pricing architecture, enquiry capture with "
                 "source attribution, portfolio with honest project stages, and a roadmap to "
                 "authenticated customer and admin areas.",
        "state": "Public site live. Authenticated portal, server-side forms and the internal "
                 "website-audit tool are the next phase.",
        "chips": ["Static-first", "SEO & schema", "Accessibility", "Portal roadmap"],
    },
    {
        "id": "lead-automation",
        "featured": True,
        "name": "Lead generation & outreach automation",
        "kicker": "Internal sales engine",
        "stage": "build",
        "tags": ["automation", "internal", "ai"],
        "summary": "A recurring workflow that finds evidence-backed prospects from public "
                   "sources, de-duplicates and qualifies them, maps each to a service, and "
                   "produces traceable personalised outreach.",
        "problem": "Manual prospecting produces duplicates, unverifiable leads and generic "
                   "messages that get ignored.",
        "scope": "Public-source research, deduplication, need and evidence identification, "
                 "service mapping, personalised outreach drafts, and a delivered report per run.",
        "state": "In operational use inside MUCO LABS. Not sold as a product yet.",
        "chips": ["Research automation", "Deduplication", "Evidence-backed", "Reporting"],
    },
    {
        "id": "sendiee",
        "name": "Sendiee",
        "kicker": "AI customer growth & messaging automation",
        "stage": "spec",
        "tags": ["ai", "saas", "automation"],
        "summary": "One workflow that connects lead discovery, personalised outreach, inbound "
                   "reply handling and follow-up, with the outcome of every conversation tracked "
                   "back to the CRM.",
        "problem": "Outreach, replies and follow-ups usually live in three disconnected tools, so "
                   "nobody can say which message actually produced a customer.",
        "scope": "Lead discovery and qualification, personalised message generation, inbound "
                 "reply handling, follow-up sequencing, and measurable CRM outcomes.",
        "state": "Scope and repository audit complete. Build not started.",
        "chips": ["Messaging automation", "CRM outcomes", "Follow-up sequencing"],
    },
    {
        "id": "nexus-health",
        "name": "Nexus Health",
        "kicker": "Digital health infrastructure platform",
        "stage": "spec",
        "tags": ["saas", "health", "mobile"],
        "summary": "A multi-tenant health platform connecting a patient app and health vault with "
                   "lab, clinic and hospital SaaS on one standardised, permission-bounded core.",
        "problem": "Health reports and records are fragmented across providers, and the booking "
                   "→ test → report → follow-up journey is broken at every handover.",
        "scope": "Patient identity and longitudinal health vault, provider directory and "
                 "bookings, home collection, lab and clinic operations, report delivery, "
                 "notifications, subscriptions and super-admin.",
        "state": "Full A-to-Z master specification written. Staged as a pilot in Erode with a "
                 "small number of labs and clinics before any wider build.",
        "chips": ["Multi-tenant", "API-first", "Health-data isolation", "Tamil + English"],
        "note": "AI in this platform is assistance and record intelligence, never an autonomous "
                "doctor. Any clinical feature requires defined intended use and validation.",
    },
    {
        "id": "security-research",
        "name": "Autonomous security research platform",
        "kicker": "Scope-aware bug bounty research",
        "stage": "spec",
        "tags": ["security", "saas", "automation"],
        "summary": "Given an authorised target and an explicit scope, the platform orchestrates "
                   "reconnaissance tooling, correlates evidence and prepares candidate findings "
                   "for manual validation.",
        "problem": "Security tooling produces enormous unverified output, and scanner signal is "
                   "routinely mistaken for a confirmed vulnerability.",
        "scope": "Authorisation and scope gating, tool orchestration, evidence correlation, "
                 "candidate findings, manual validation step, and report preparation.",
        "state": "Master specification complete. Strictly scope-gated: it never treats scanner "
                 "output as a confirmed finding, and it never runs against unauthorised targets.",
        "chips": ["Scope-gated", "Evidence correlation", "Manual validation"],
    },
    {
        "id": "whatsapp-automation",
        "name": "WhatsApp campaign platform",
        "kicker": "Desktop campaign & credit software",
        "stage": "spec",
        "tags": ["automation", "saas", "desktop"],
        "summary": "Desktop software where a business connects its own WhatsApp by QR, imports "
                   "contacts, runs campaigns, and an admin meters usage through plans and credits.",
        "problem": "Small businesses want structured customer messaging but have no way to manage "
                   "contacts, campaigns and spend in one place.",
        "scope": "QR connection, contact import and segmentation, campaign composition and "
                 "scheduling, plans, credits, top-ups, usage limits and admin control.",
        "state": "Detailed requirements captured. Build not started.",
        "chips": ["Desktop app", "Campaigns", "Credits & plans"],
    },
    {
        "id": "lms",
        "name": "LMS platform",
        "kicker": "School & college learning management",
        "stage": "spec",
        "tags": ["saas", "education", "web"],
        "summary": "A white-label learning platform that puts courses, attendance, assessment, "
                   "fees and certificates under one set of institution-specific roles.",
        "problem": "Institutions run learning, attendance, exams and fees in separate registers "
                   "and spreadsheets that never reconcile.",
        "scope": "Admin, teacher and student roles; courses and materials; attendance; "
                 "assignments and exams; fee tracking; certificates; reporting.",
        "state": "Scope captured in detail. Build not started.",
        "chips": ["White-label", "Role-based", "Fees & certificates"],
    },
    {
        "id": "telecalling",
        "name": "AI telecalling assistant",
        "kicker": "Automated phone agent",
        "stage": "spec",
        "tags": ["ai", "automation", "saas"],
        "summary": "A phone agent that combines telephony, natural speech and constrained "
                   "conversational intelligence to handle real calls and write the outcome back "
                   "to the CRM.",
        "problem": "Repetitive qualification and follow-up calls consume the working day and "
                   "rarely get logged accurately.",
        "scope": "Indian telephony integration, natural speech, intent handling, objection and "
                 "qualification flows, and recorded call outcomes.",
        "state": "Architecture and commercial research complete. Build not started.",
        "chips": ["Telephony", "Speech", "CRM outcomes"],
    },
    {
        "id": "scraping-platform",
        "name": "Web scraping & automation platform",
        "kicker": "Actor-based crawler platform",
        "stage": "spec",
        "tags": ["automation", "saas"],
        "summary": "Turns one-off scrapers into scheduled, monitored, reusable jobs with "
                   "structured dataset storage and an API for whatever consumes the data next.",
        "problem": "Scrapers are written once, run manually, break silently, and their output "
                   "ends up in a folder nobody can query.",
        "scope": "Reusable actors, scheduled runs, run monitoring, dataset storage, API and "
                 "webhook output.",
        "state": "Product exploration and build request captured. Build not started.",
        "chips": ["Scheduled jobs", "Datasets", "API & webhooks"],
    },
    {
        "id": "social-automation",
        "name": "Social media automation engine",
        "kicker": "Content research to publishing loop",
        "stage": "spec",
        "tags": ["automation", "ai"],
        "summary": "Turns verified brand facts into scheduled content, publishes it, then feeds "
                   "performance back into what gets made next.",
        "problem": "Consistent social output needs research, production, scheduling and review — "
                   "four jobs that rarely all get done.",
        "scope": "Topic research, image and video generation, captions and hashtags, scheduled "
                 "publishing to Instagram and YouTube, and an analytics feedback loop.",
        "state": "Detailed requirements captured. Build not started.",
        "chips": ["Content pipeline", "Scheduling", "Analytics loop"],
    },
    {
        "id": "knowledge-os",
        "name": "Knowledge OS",
        "kicker": "Source-grounded research + connected notes",
        "stage": "spec",
        "tags": ["ai", "desktop", "internal"],
        "summary": "NotebookLM-style grounded question answering over your own documents, joined "
                   "to Obsidian-style linked notes so study material and its sources stay together.",
        "problem": "Research answers and personal notes live in different tools, so provenance is "
                   "lost the moment something is written down.",
        "scope": "Document upload and indexing, source-grounded answers with provenance, linked "
                 "notes and backlinks, deep research mode, local and Drive file support.",
        "state": "Specified as a personal tool. Build not started.",
        "chips": ["Grounded answers", "Provenance", "Linked notes"],
    },
    {
        "id": "founder-portfolio",
        "name": "Founder portfolio site",
        "kicker": "Personal brand site for the founder",
        "stage": "spec",
        "tags": ["web", "internal"],
        "summary": "A separate personal site for " + FOUNDER + " covering founder, backend "
                   "engineering and teaching work — kept distinct from the company site.",
        "problem": "Company credibility and personal credibility are different stories and should "
                   "not compete for the same page.",
        "scope": "Skills, real projects, teaching work, achievements, verified guest and judge "
                 "appearances, and contact.",
        "state": "Requirements captured. Build not started.",
        "chips": ["Personal brand", "Proof-led", "Separate from mucolabs.com"],
    },
    {
        "id": "medi-scrap",
        "name": "Medi-Scrap AI",
        "kicker": "Healthcare waste B2B marketplace",
        "stage": "concept",
        "tags": ["marketplace", "health"],
        "summary": "A concept for connecting healthcare waste generators with authorised "
                   "collectors and recyclers, with pickup coordination and material recovery.",
        "problem": "Healthcare waste handling is fragmented and compliance-heavy, and generators "
                   "have no straightforward route to authorised collectors.",
        "scope": "Not locked. The business case is clearer than the software workflow, and the "
                 "regulatory model has to be settled before anything is built.",
        "state": "Concept stage. Presented here as an idea, not a product.",
        "chips": ["B2B marketplace", "Compliance-led", "Not built"],
    },
    {
        "id": "flexpass",
        "name": "FlexPass AI",
        "kicker": "Pay-per-day premium AI access",
        "stage": "concept",
        "tags": ["saas", "ai"],
        "summary": "A pitch-stage concept for short-duration access to premium AI tools for "
                   "students, freelancers and small teams who cannot justify monthly subscriptions.",
        "problem": "Monthly AI subscriptions are the wrong unit for people who need a tool for a "
                   "day or a week.",
        "scope": "Viability depends entirely on provider terms compliance and real-time usage "
                 "economics — both open questions.",
        "state": "Concept and pitch stage. No implementation.",
        "chips": ["Pitch stage", "Usage economics", "Not built"],
    },
    {
        "id": "product-pipeline",
        "name": "Product suite backlog",
        "kicker": "CRM, ERP, HRMS, POS and vertical SaaS ideas",
        "stage": "concept",
        "tags": ["saas", "internal"],
        "summary": "A deliberately separated backlog of business-system ideas — CRM, ERP, HRMS, "
                   "POS, school and hospital ERP, AI receptionist, client portal, business "
                   "dashboard — kept as concepts until a customer justifies a dedicated build.",
        "problem": "Building every plausible SaaS at once is the fastest way to finish none of them.",
        "scope": "Ideas are scoped only when a real customer need appears. Nothing here is "
                 "presented as an available product.",
        "state": "Concept backlog. If one of these is what your business needs, it becomes a "
                 "custom build for you, not a product purchase.",
        "chips": ["Backlog", "Customer-led", "Not products"],
    },
]

FILTERS = [
    ("all", "All work"),
    ("ai", "AI & automation"),
    ("saas", "Platforms & SaaS"),
    ("mobile", "Mobile apps"),
    ("web", "Websites"),
    ("automation", "Automation"),
    ("client", "Client work"),
]

SERVICES = [
    {
        "slug": "websites",
        "icon": "web",
        "title": "Website design & development",
        "outcome": "A fast, findable website that turns visitors into enquiries.",
        "body": "Business websites, landing pages, e-commerce and customer portals — built "
                "responsive from 320px up, with a technical SEO baseline, analytics readiness, "
                "deployment and a maintenance path.",
        "points": ["Custom design, no template resale", "Technical SEO and schema from day one",
                   "Analytics and conversion tracking ready", "Hosting, deployment and handover"],
        "link": ("website-development-erode.html", "Website development in Erode"),
    },
    {
        "slug": "mobile",
        "icon": "mobile",
        "title": "Mobile app development",
        "outcome": "Apps your customers actually keep on their phone.",
        "body": "Android and iOS applications with real backend integration — location, "
                "listings, bookings, accounts and payments — taken through store submission.",
        "points": ["Play Store and App Store submission", "Location, maps and offline handling",
                   "Backend, auth and role separation", "Post-launch update cycle"],
    },
    {
        "slug": "product-design",
        "icon": "design",
        "title": "UI/UX and product design",
        "outcome": "Interfaces people can use without being trained.",
        "body": "Flows, wireframes, interface design and a reusable design system, tested "
                "against real screen sizes and accessibility requirements rather than a "
                "designer's monitor.",
        "points": ["User flows and information architecture", "Design system, not one-off screens",
                   "Accessibility and contrast built in", "Developer-ready handoff"],
    },
    {
        "slug": "software",
        "icon": "saas",
        "title": "Custom software & SaaS",
        "outcome": "Software shaped around how your business actually works.",
        "body": "Discovery through MVP and beyond: multi-tenant systems, role-based access, "
                "customer and admin portals, reporting, payments and integrations on an "
                "architecture that can grow.",
        "points": ["Multi-tenant and role-based from the start", "Customer and admin portals",
                   "Payments and third-party integrations", "Reporting and dashboards"],
    },
    {
        "slug": "business-systems",
        "icon": "systems",
        "title": "CRM, ERP, HRMS, LMS & billing",
        "outcome": "One system instead of six spreadsheets.",
        "body": "Practical business systems for shops and organisations — bookings, inventory, "
                "CRM, ERP, HRMS, LMS, billing and GST workflows, sales, attendance, support and "
                "dashboards.",
        "points": ["Bookings, inventory and billing", "GST-aware invoicing workflows",
                   "Attendance, payroll inputs and HR records", "Dashboards for the people who decide"],
    },
    {
        "slug": "marketing",
        "icon": "seo",
        "title": "Digital marketing & SEO",
        "outcome": "Be found by the people already searching for you.",
        "body": "Organic growth, local SEO, technical SEO, conversion optimisation, content and "
                "analytics — with honest reporting. We do not guarantee rankings or lead counts, "
                "because nobody credible can.",
        "points": ["Local SEO for Tamil Nadu search", "Technical SEO and Core Web Vitals",
                   "Conversion rate optimisation", "Transparent monthly reporting"],
    },
    {
        "slug": "ai-automation",
        "icon": "ai",
        "title": "AI & business automation",
        "outcome": "Give the repetitive half of the working day to software.",
        "body": "Lead routing, CRM updates, form handling, customer communication, dashboards, "
                "research and data operations, internal assistants and business process "
                "automation — with every third-party dependency named up front.",
        "points": ["Lead capture, routing and follow-up", "Internal assistants over your own documents",
                   "Data operations and reporting", "Clear dependency and cost disclosure"],
    },
    {
        "slug": "support",
        "icon": "support",
        "title": "Branding, IT & cloud support",
        "outcome": "Someone who answers when something breaks.",
        "body": "Brand identity and graphic design, plus ongoing IT and cloud management: "
                "uptime monitoring, security updates, backups, small content changes and "
                "performance review.",
        "points": ["Logo, identity and graphic design", "Uptime monitoring and backups",
                   "Security updates and patching", "Cloud and hosting management"],
    },
]


# Per-service page content. Each service gets its own indexable page (spec §6).
SERVICE_DETAIL = {
    "websites": {
        "meta": 'Custom website design and development for businesses in Erode and Tamil Nadu. Responsive, SEO-ready, with the code and accounts in your name.',
        "who": ['A business with no website, or one built years ago that nobody can edit', 'A shop or service that customers look up on Google before calling', 'A brand whose whole presence is currently a social media account'],
        "deliverables": ['Custom design, built for your business rather than a bought template', 'Responsive from a 320px phone up to a wide desktop', 'Enquiry form and a WhatsApp button with context prefilled', 'Technical SEO baseline: titles, metadata, schema, sitemap, robots', 'Analytics and Search Console connected before launch', 'Deployment, a handover document and training on editing it'],
        "faqs": [('How many pages will I need?', '<p>Most business sites need fewer than people expect. A clear home page, a services or products section, an about page and a contact page will out-perform a twenty-page site nobody finishes reading. We recommend a structure in the scope and you decide.</p>'), ('Can I edit the content myself afterwards?', '<p>Yes, and we show you how before handover. If the site needs frequent content changes we build it with that in mind from the start rather than making you come back to us for every word.</p>'), ('What about hosting and the domain?', '<p>We set up hosting and deployment as part of the project. Domain registration and annual renewal are charged separately and stay in your name &mdash; not ours.</p>')],
        "related": ['beauty-brand', 'muco-platform'],
    },
    "mobile": {
        "meta": 'Android and iOS app development for Tamil Nadu businesses: backend, location, bookings and store submission, built for mid-range phones.',
        "who": ['A service that customers would use repeatedly, not once', 'A business needing location, bookings or accounts on a phone', 'A product where a website genuinely is not enough'],
        "deliverables": ['Android and iOS builds from one codebase where that suits the product', 'Backend, authentication and role separation', 'Location, maps and sensible offline behaviour', 'Play Store and App Store submission, including the listing assets', 'Crash reporting and an update cycle after launch'],
        "faqs": [('Do I actually need an app, or would a website do?', '<p>Honestly, most businesses need a good website first. An app earns its place when people come back regularly, or when you need the phone itself &mdash; location, camera, notifications, offline use. We will tell you if a website would serve you better.</p>'), ('How long does store approval take?', "<p>Google Play is usually days; Apple can be longer and can ask for changes. We prepare the listing, privacy declarations and screenshots to reduce the back and forth, but neither store's review timing is under anyone's control.</p>"), ('Will it work on older phones?', '<p>That is what we test on. Most customers in Tamil Nadu are on mid-range Android, not the latest flagship, so that is the baseline we build and test against.</p>')],
        "related": ['ooruva'],
    },
    "product-design": {
        "meta": 'UI/UX and product design from Erode: user flows, wireframes and a reusable design system with accessibility built in rather than added later.',
        "who": ['A product with features people cannot find', 'A team redesigning something already in use by real customers', 'A new build that needs its flows settled before code starts'],
        "deliverables": ['User flows and information architecture', 'Wireframes, then interface design for every state', 'A design system: type scale, spacing, colour, components', 'Accessibility and contrast checked, not assumed', 'Developer-ready handoff with specs and assets'],
        "faqs": [('Can you design without building it?', '<p>Yes. We hand over a specification another team can build from. We would rather do that well than hold a project hostage.</p>'), ('What if we already have a design?', '<p>We review it against how it will actually be built and used, tell you what will not survive contact with real screens, and fix those parts. We do not redesign work that is already good.</p>'), ('Do you test with real users?', '<p>Where the budget allows, yes, and it is worth arguing for. Five real users will find problems an internal review never will.</p>')],
        "related": ['inknexis', 'ooruva'],
    },
    "software": {
        "meta": 'Custom software and SaaS built around how your business actually works. Multi-tenant, role-based, quoted from a written scope. Erode, Tamil Nadu.',
        "who": ['A business running on spreadsheets that no longer reconcile', 'A team whose process does not fit any off-the-shelf product', 'A founder with a product idea that needs a first real version'],
        "deliverables": ['Discovery and written requirements before any code', 'Architecture, data model and role design', 'Multi-tenant and role-based access where the product needs it', 'Customer and admin portals, reporting and dashboards', 'Payments and third-party integrations, each named up front', 'Deployment, documentation and a support arrangement'],
        "faqs": [('Why not just buy existing software?', '<p>Often you should, and we will say so. Custom is worth it when the off-the-shelf option forces you to change how the business works, or when the per-user pricing overtakes the build cost. We work that out with you before quoting.</p>'), ('What happens if we outgrow the first version?', '<p>That is the point of settling the architecture, data model and roles first. A first version built properly grows; one assembled quickly gets rewritten.</p>'), ('Who owns the software?', '<p>You do. Source code, database and accounts transfer to you on final payment, with no licence to keep paying and no lock-in.</p>')],
        "related": ['inknexis', 'meyra'],
    },
    "business-systems": {
        "meta": 'CRM, ERP, HRMS, LMS and billing systems for shops and institutions in Tamil Nadu: bookings, inventory, GST invoicing, attendance and dashboards.',
        "who": ['A shop tracking stock, sales and dues in separate books', 'An institution running admissions, attendance and fees separately', 'A team where the same data is typed in three times'],
        "deliverables": ['Bookings, inventory and order management', 'GST-aware invoicing and billing workflows', 'Customer records, follow-ups and support history', 'Attendance, leave and payroll inputs', 'Role-based dashboards for the people who decide', 'Data import from whatever you use today'],
        "faqs": [('Can you move our existing data across?', '<p>Usually yes, from spreadsheets, Tally exports or an older system. Migration is scoped and priced as its own task because it is real work and it deserves testing.</p>'), ('Does it handle GST properly?', '<p>Invoicing is built to your actual filing requirements, confirmed with whoever handles your accounts. We build to what your accountant needs, not to a generic template.</p>'), ('Can staff use it without training?', '<p>That is a design requirement, not an afterthought. If your team needs a manual to record a sale, the interface is wrong.</p>')],
        "related": ['inknexis'],
    },
    "marketing": {
        "meta": 'Local and technical SEO, conversion optimisation and honest monthly reporting for Tamil Nadu businesses. No guaranteed rankings, because nobody can.',
        "who": ['A business invisible on Google for what it actually sells', 'A site with traffic that produces no enquiries', 'A brand competing locally against bigger advertising budgets'],
        "deliverables": ['Local SEO and Google Business Profile setup', 'Technical SEO: speed, crawlability, structured data, indexation', 'Keyword and intent research grounded in what people actually search', 'On-page content and conversion rate optimisation', 'Analytics, event tracking and monthly reporting you can read'],
        "faqs": [('How long before I see results?', '<p>Local SEO usually shows movement in weeks; competitive terms take months. Anyone promising page one in thirty days is either lucky or lying. We report what actually changed, including when it is nothing.</p>'), ('Do you guarantee rankings?', "<p>No. Rankings depend on competition, domain history and Google's own changes, none of which a supplier controls. What we commit to is the work that makes ranking possible.</p>"), ('Do you run paid ads too?', '<p>Where they make sense for the business, yes. We will tell you honestly when your budget would do more in organic and conversion work than in ad spend.</p>')],
        "related": ['muco-platform', 'beauty-brand'],
    },
    "ai-automation": {
        "meta": 'AI and business automation from Erode: lead routing, CRM updates, internal assistants and reporting, with every dependency and running cost named.',
        "who": ['A team retyping the same information between systems', 'A business losing enquiries because follow-up depends on memory', 'Anyone spending hours a week on work software should do'],
        "deliverables": ['Lead capture, routing and follow-up sequencing', 'CRM and record updates without manual re-entry', 'Internal assistants over your own documents', 'Data operations, research and reporting workflows', 'Every third-party dependency and its cost named before you commit'],
        "faqs": [('Will AI make mistakes on my customer data?', '<p>It can, which is why the design matters more than the model. Anything that touches a customer or money gets a human approval step. Automation that cannot be checked is not automation, it is a liability.</p>'), ('What does it cost to run each month?', '<p>Automation usually depends on third-party services with their own pricing. We estimate the running cost during scoping so you decide with the real number, not just the build price.</p>'), ('Do you use AI to write our software?', '<p>We use AI in our own internal tooling. For your deliverables the architecture, the decisions and the review are done by an engineer who can explain every part of what you were given.</p>')],
        "related": ['meyra', 'lead-automation'],
    },
    "support": {
        "meta": 'Branding, IT and cloud support from Erode: identity design, uptime monitoring, backups, security updates and hosting for Tamil Nadu businesses.',
        "who": ['A business whose website broke and nobody knows who to call', 'A team with no one responsible for updates and backups', 'A brand that needs identity work as well as maintenance'],
        "deliverables": ['Logo, identity and graphic design', 'Uptime monitoring with alerting', 'Security updates and dependency patching', 'Scheduled backups with restore testing', 'Cloud and hosting management', 'A named person to escalate to'],
        "faqs": [('Will you maintain a site someone else built?', '<p>Usually yes. We audit it first and tell you honestly whether it is maintainable or whether you would spend less rebuilding it.</p>'), ('What is your response time?', '<p>Your agreement states the window we have actually committed to for your plan. We do not publish an SLA we cannot honour across every client at once.</p>'), ('Is hosting included?', '<p>Management is; the hosting bill itself is a third-party cost, billed at what it costs with no markup hidden in the plan.</p>')],
        "related": ['muco-platform'],
    },
}

INDUSTRIES = [
    "Retail & e-commerce", "Education & coaching", "Healthcare & clinics", "Manufacturing",
    "Textile & garment", "Hospitality & restaurants", "Professional services",
    "Salons & studios", "Real estate", "Logistics", "Local shops & services",
]

PROCESS = [
    ("Discovery and goals",
     "We start with what the business needs to happen, not with a feature list. "
     "What is the outcome, who is it for, and how will we know it worked?"),
    ("Scope, proposal and milestones",
     "A written scope with what is included, what is not, the milestone plan and the price. "
     "Nothing starts until you have that in hand."),
    ("Design and technical architecture",
     "Interface design and the architecture underneath it — data model, roles, integrations — "
     "reviewed with you before code."),
    ("Development, QA and review",
     "Built in milestones you can see. Every milestone is tested and reviewed with you before "
     "the next one starts."),
    ("Launch, measurement and support",
     "Deployment, analytics, handover documentation and a support arrangement — so the project "
     "does not end the day it goes live."),
]

FAQS = [
    ("What does a website actually cost?",
     "<p>We do not publish a package price, and here is the honest reason: two websites that look "
     "similar from the outside can differ by four times in build time. A number posted on a page "
     "would either be so low it means nothing, or so high it puts off work we would have enjoyed "
     "doing.</p>"
     "<p>What we do instead is quote from a written scope. Tell us what the business needs, we ask "
     "the questions that actually change the number \u2014 page count, functionality, content, "
     "integrations, who maintains it afterwards \u2014 and you get inclusions, exclusions, "
     "milestones and a price in writing before you commit to anything. That costs you nothing.</p>"
     "<p>Domain registration and renewal are charged separately, and third-party subscriptions, "
     "paid plugins, payment gateway charges and ongoing marketing are not included unless the "
     "scope says so. See <a href='pricing.html'>pricing</a> for the full list.</p>"),
    ("How do payments work?",
     "<p>Standard terms are <strong>50% advance and 50% on completion</strong>. Larger projects are "
     "split into milestones instead, each with its own deliverable and payment. Refund and "
     "cancellation terms are on the <a href=\"refund.html\">refund policy</a> page.</p>"),
    ("How long does a project take?",
     "<p>It depends entirely on scope, and we would rather give you a real date than a comfortable "
     "one. A straightforward business website is usually a matter of weeks; a custom platform with "
     "accounts, roles and payments is months. You get a milestone plan with dates in the proposal, "
     "and we tell you as soon as anything threatens one.</p>"),
    ("Do I own the code and the design?",
     "<p>Yes. On final payment you own the deliverables, the source code and the accounts. We do "
     "not lock you into hosting, a proprietary builder or a licence you have to keep paying for.</p>"),
    ("Do you work with businesses outside Erode?",
     "<p>Yes. We are based in Erode and work in person across Erode, Pallipalayam, Namakkal, "
     "Coimbatore, Tiruppur, Karur and the rest of Tamil Nadu, and remotely beyond that. Most "
     "project work happens over calls and shared documents regardless of where you are.</p>"),
    ("Do you guarantee first page on Google?",
     "<p>No, and you should be careful with anyone who does. Rankings depend on competition, "
     "domain history and Google's own changes — none of which any agency controls. What we do "
     "commit to is the technical work that makes ranking possible: site speed, crawlability, "
     "structured data, local search setup, content and honest monthly reporting.</p>"),
    ("What happens after launch?",
     "<p>You can take the project and run it yourself, or take a maintenance arrangement covering "
     "uptime monitoring, security updates, backups, small content changes, bug fixes and "
     "performance review. Major new features are scoped separately. See "
     "<a href=\"maintenance.html\">maintenance</a> for what is and is not included.</p>"),
    ("How quickly will you reply?",
     "<p>We are not going to publish a guaranteed response time, because a promise you break is "
     "worse than one you never made. What we will commit to instead: <strong>every enquiry is read "
     "by the founder</strong>, not by an assistant or an autoresponder, and you get a real reply "
     "rather than a template.</p>"
     "<p>If you need an answer quickly, WhatsApp is the fastest route. Our working hours are in "
     "the footer of every page.</p>"),
    ("Who actually builds my project?",
     "<p>MUCO LABS is founder-led. You talk to the person responsible for the technical work, not "
     "an account manager relaying messages. Where a project needs specialist help we bring in "
     "collaborators and tell you that up front.</p>"),
    ("Do you use AI to write client code?",
     "<p>We use AI in our own internal tooling and research. For client deliverables the "
     "architecture, the decisions and the review are done by a human engineer who can explain "
     "every part of what you were given, and who is accountable for it.</p>"),
    ("Can you fix or improve my existing website?",
     "<p>Often, yes. We start with an audit — speed, mobile behaviour, technical SEO, broken "
     "links, metadata, conversion path — and then tell you honestly whether it is worth improving "
     "or rebuilding. Sometimes the answer is that your current site is fine and the problem is "
     "somewhere else.</p>"),
]


LOCAL_FAQS = [
    ("How much does a website cost in Erode?",
     "<p>There is no single answer, and any agency quoting one before seeing your requirements is "
     "guessing. A brochure site for a local shop and a booking system for a clinic are different "
     "amounts of work. We quote from a written scope after understanding what the business needs, "
     "and that scope costs you nothing. See <a href='pricing.html'>pricing</a> for what moves the "
     "number.</p>"),
    ("Do you meet clients in person in Erode?",
     "<p>Yes. We are based in Erode and meet clients in person here and across Pallipalayam, "
     "Namakkal, Coimbatore, Tiruppur and Karur. Most of the work afterwards happens over calls "
     "and shared documents, but the first conversation is often easier face to face.</p>"),
    ("Can the website be in Tamil?",
     "<p>Yes. We build in English, Tamil, or both, and we do not use machine translation for "
     "customer-facing copy. If your customers read Tamil, the site should be written in Tamil by "
     "someone who speaks it, not run through a translator.</p>"),
    ("My customers only use WhatsApp. Is a website still worth it?",
     "<p>Usually yes, and the two work together rather than competing. The website is how people "
     "find you on Google and decide you are real; WhatsApp is where the conversation happens. We "
     "build sites that put a one-tap WhatsApp button on every page with the product or service "
     "already filled into the message, so the visitor arrives in your chat ready to talk.</p>"),
    ("Will it work on cheap Android phones?",
     "<p>That is the phone most of your customers are using, so it is the one we test on. Pages "
     "are built to load on a mid-range Android over mobile data, not just on a developer's "
     "laptop. Fonts stay legible, tap targets stay large, and the site does not depend on "
     "animations to be usable.</p>"),
]



# ===========================================================================
# Interface previews
#
# These are drawn mockups, not screenshots of running software, and every card
# that carries one says so on the page. What each one shows is taken from that
# project's own requirements document, so it represents real intended
# behaviour. No mockup contains an invented metric, rating or count.
# ===========================================================================
def _win(url, body, phone=False):
    return '''<div class="preview%s" aria-hidden="true">
              <div class="preview-bar">
                <div class="preview-dots"><span></span><span></span><span></span></div>
                <span class="preview-url">%s</span>
              </div>
              <div class="preview-body">%s</div>
            </div>''' % (" preview-phone" if phone else "", url, body)


def _phone(status, body):
    return '''<div class="preview preview-phone" aria-hidden="true">
              <div class="preview-notch"><span>%s</span><span>&#9679;&#9679;&#9679;</span></div>
              <div class="preview-body">%s</div>
            </div>''' % (status, body)


def _row(title, sub, flag, cls=""):
    return ('<div class="preview-row"><div><strong>%s</strong><span class="sub">%s</span></div>'
            '<span class="preview-flag %s">%s</span></div>' % (title, sub, cls, flag))


PREVIEWS = {
    # Mission graph: idea -> requirements -> research -> build -> QA (doc 01)
    "meyra": _win("meyra &mdash; mission graph", '''
                <div class="preview-chat q">Take the billing module from requirements to a tested build.</div>
                <div class="preview-chat a"><b>MEYRA</b>Requirements locked and research saved with sources. Moving to blueprint. Nothing runs on your machine without asking first.</div>
                <div class="preview-pipe">
                  <div class="preview-step">Requirements gate &middot; passed</div>
                  <div class="preview-step">Research &middot; sources kept</div>
                  <div class="preview-step">Blueprint &middot; awaiting approval</div>
                </div>'''),

    # Customer discovery: nearby, open, distance, category (doc 02)
    "ooruva": _phone("Ooruva &middot; nearby", '''
                ''' + _row("Tailoring &amp; alterations", "Open now &middot; Erode", "300 m", "on")
                    + _row("Tiffin centre", "Menu &amp; hours listed", "600 m", "on")
                    + _row("Two-wheeler service", "Verified vendor", "1.2 km", "acc")
                    + _row("Provision store", "Offers this week", "1.8 km") + ''''''),

    # Studio day view: appointments, consent, aftercare (doc 09)
    "inknexis": _win("inknexis &mdash; studio", '''
                ''' + _row("Today&rsquo;s chair", "Placement and size confirmed", "Booked", "acc")
                    + _row("Consent form", "Signed before session starts", "Signed", "on")
                    + _row("Deposit", "Optional &middot; owner verifies", "Recorded")
                    + _row("Aftercare", "Scheduled follow-up messages", "Queued", "acc") + ''''''),

    # Product storytelling site, WhatsApp conversion, client unnamed (doc 17)
    "beauty-brand": _win("client website &mdash; products", '''
                <div class="preview-tiles">
                  <div class="preview-tile"><div class="preview-swatch"></div><span>Product</span></div>
                  <div class="preview-tile"><div class="preview-swatch"></div><span>Product</span></div>
                  <div class="preview-tile"><div class="preview-swatch"></div><span>Product</span></div>
                </div>
                ''' + _row("Ingredients &amp; usage", "Verified copy only &middot; no invented claims", "Published", "on")
                    + _row("Enquire on WhatsApp", "Product name prefilled in the message", "One tap", "acc") + ''''''),

    # This site
    "muco-platform": _win("mucolabs.com", '''
                ''' + _row("Six projects, real stages", "Client, active build, specified, concept", "Live", "on")
                    + _row("Enquiry with attribution", "Source captured with every message", "Live", "on")
                    + _row("Customer &amp; admin portal", "Auth, roles and project status", "Next", "acc") + ''''''),

    # Recurring outreach workflow (doc 05) - stages only, no invented counts
    "lead-automation": _win("outreach run", '''
                <div class="preview-pipe">
                  <div class="preview-step">Research public sources</div>
                  <div class="preview-step">Remove duplicates</div>
                  <div class="preview-step">Qualify against evidence</div>
                  <div class="preview-step">Map to a service</div>
                  <div class="preview-step">Draft personalised outreach</div>
                </div>
                ''' + _row("Every lead traceable", "Kept with the source it came from", "Logged", "acc") + ''''''),
}

PREVIEW_NOTE = '<p class="preview-note">Interface mockup, not a screenshot</p>'


# ===========================================================================
# Fragment helpers
# ===========================================================================
def stage_badge(stage):
    label, cls = STAGE_LABEL[stage]
    return '<span class="badge %s">%s</span>' % (cls, label)


def project_card(p):
    """Compact card: the headline facts are always visible, the detail is one
    click away, so a nineteen-project grid stays scannable."""
    chips = "".join('<span class="tag tag-subtle">%s</span>' % c for c in p["chips"])
    note = ('<p class="work-note">%s</p>' % p["note"]) if p.get("note") else ""
    preview = (PREVIEWS[p["id"]] + "\n            " + PREVIEW_NOTE) if p["id"] in PREVIEWS else ""
    return """          <article class="work-card reveal-on-scroll" id="{id}">
            {preview}
            <div class="work-card-head">
              <div>
                <h3>{name}</h3>
                <span class="work-card-kicker">{kicker}</span>
              </div>
              {badge}
            </div>
            <p>{summary}</p>
            <details class="work-details">
              <summary>Problem, scope and current status</summary>
              <dl class="def-list">
                <div class="def-row"><dt>Problem</dt><dd>{problem}</dd></div>
                <div class="def-row"><dt>Scope</dt><dd>{scope}</dd></div>
                <div class="def-row"><dt>Status</dt><dd>{state}</dd></div>
              </dl>
              {note}
            </details>
            <div class="work-card-meta tag-row">{chips}</div>
          </article>
""".format(
        id=p["id"],
        name=p["name"],
        kicker=p["kicker"],
        badge=stage_badge(p["stage"]),
        summary=p["summary"],
        problem=p["problem"],
        scope=p["scope"],
        state=p["state"],
        note=note,
        chips=chips,
        preview=preview,
    )


def service_card(s, span=""):
    points = "".join("<li>%s</li>" % pt for pt in s["points"])
    links = ['<a href="services-%s.html" style="color:var(--accent);font-weight:600;'
             'font-size:14px;">Read more about %s &rarr;</a>' % (s["slug"], s["title"].lower())]
    if s.get("link"):
        links.append('<a href="%s" style="color:var(--text-muted);font-size:13.5px;">%s &rarr;</a>'
                     % s["link"])
    price = ('<p style="margin-top:14px;display:flex;flex-direction:column;gap:6px;'
             'align-items:flex-start;">%s</p>' % "".join(links))
    return """          <article class="spotlight-card reveal-on-scroll {span}" id="{slug}">
            <div class="icon-tile">{icon}</div>
            <h3>{title}</h3>
            <p style="color:var(--text);font-weight:600;margin-top:6px;">{outcome}</p>
            <p style="margin-top:10px;">{body}</p>
            <ul class="feature-list">{points}</ul>
            {price}
          </article>
""".format(
        span=span,
        slug=s["slug"],
        icon=icon(ICONS[s["icon"]], 20),
        title=s["title"],
        outcome=s["outcome"],
        body=s["body"],
        points=points,
        price=price,
    )


def trust_row():
    items = [
        ("shield", "You own the code and the accounts"),
        ("user", "You talk to the person building it"),
        ("pin", "Erode-based, working across Tamil Nadu"),
        ("clock", "Every enquiry read by the founder"),
    ]
    return '<div class="trust-row">%s</div>' % "".join(
        '<span class="trust-item">%s %s</span>' % (icon(ICONS[k], 15), v) for k, v in items
    )


# ===========================================================================
# Pages
# ===========================================================================
def build_home():
    services_html = "".join(
        service_card(s, "col-span-2" if i == 0 else "") for i, s in enumerate(SERVICES[:6])
    )
    industries = "".join('<span class="chip">%s</span>' % i for i in INDUSTRIES)
    process = "".join(
        '          <div class="process-step reveal-on-scroll"><div><h3>%s</h3><p>%s</p></div></div>\n'
        % (t, d) for t, d in PROCESS
    )
    featured = [p for p in PROJECTS if p.get("featured")][:4]
    featured_html = "".join(project_card(p) for p in featured)

    body = """    <section>
      <div class="container">
        <div class="hero-split">
          <div>
            <div class="status-pill">
              <span class="pulse-dot" aria-hidden="true"></span>
              Founder-led studio &middot; {city}, {region}
            </div>
            <h1>We turn business ideas into software that <span class="accent-serif">actually</span> ships.</h1>
            <p class="lead">
              Websites, mobile apps, custom software and AI automation for businesses in
              {city} and across {region} &mdash; built by the person you talk to, priced
              from a written scope, and handed over with the code in your name.
            </p>

            <div class="btn-group">
              <a href="contact.html" class="btn btn-accent btn-lg">Start your project</a>
              <a href="work.html" class="btn btn-secondary btn-lg">View our work</a>
              <a href="{wa}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-lg">{wa_svg} WhatsApp</a>
            </div>

            {trust}
          </div>

          <div>
            <div class="mockup-window">
              <div class="mockup-topbar">
                <div class="mockup-dots" aria-hidden="true">
                  <span class="mockup-dot red"></span><span class="mockup-dot yellow"></span><span class="mockup-dot green"></span>
                </div>
                <span class="mockup-title">meyra &mdash; internal build</span>
                <span class="clock" aria-hidden="true">--:--</span>
              </div>

              <div class="mockup-body">
                <p class="chat-bubble chat-user" id="mockup-user-text">Meyra, give me my morning briefing.</p>
                <p class="chat-bubble chat-meyra" id="mockup-meyra-text">
                  <strong>Meyra</strong>
                  <span id="mockup-meyra-body">Two priority items today: the InkNexis architecture review at 11:30 and the Ooruva vendor pilot check-in at 15:30. One proposal is waiting on your sign-off.</span>
                </p>

                <div style="margin-top:4px;">
                  <span class="text-mono" style="font-size:11px;color:var(--text-dim);display:block;margin-bottom:8px;">TRY A COMMAND</span>
                  <div class="mockup-badge-row">
                    <button type="button" class="btn btn-primary btn-sm" data-meyra-scenario="briefing" aria-pressed="true">Morning briefing</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-meyra-scenario="followup" aria-pressed="false">Client follow-ups</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-meyra-scenario="operations" aria-pressed="false">Sort enquiries</button>
                  </div>
                </div>

                <p class="mockup-input-bar">
                  <span>Meyra is one of our own builds &mdash; not a product for sale yet.</span>
                  <a href="work.html#meyra" style="color:var(--accent);font-weight:600;">Read more</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="section-head reveal-on-scroll">
          <span class="eyebrow">What we do</span>
          <h2>Eight things we build, and what each one is for</h2>
          <p class="section-sub">Every engagement starts with the business outcome. The technology
            follows from that, not the other way round.</p>
        </div>

        <div class="ecosystem-grid">
{services}        </div>

        <div style="text-align:center;margin-top:32px;">
          <a href="services.html" class="btn btn-secondary">See all services and what is included &rarr;</a>
        </div>
      </div>
    </section>

    <section class="section-divider section-tight">
      <div class="container">
        <div class="section-head reveal-on-scroll">
          <span class="eyebrow">Industries</span>
          <h2>Built for whatever your business actually does</h2>
          <p class="section-sub">The workflow changes; the engineering discipline does not.</p>
        </div>
        <div class="chip-cloud" style="justify-content:center;">{industries}</div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="row-between reveal-on-scroll">
          <div>
            <span class="eyebrow">Selected work</span>
            <h2>What we are building</h2>
          </div>
          <a href="work.html" class="btn btn-secondary">See all our work &rarr;</a>
        </div>

        <div class="callout" style="margin-bottom:24px;">
          <p style="font-size:14.5px;"><strong>How to read this page.</strong> Every project below is
          labelled with its real stage &mdash; client project, active build, specified, or concept.
          We do not present an idea as a shipped product or an internal tool as a client engagement.</p>
        </div>

        <div class="work-grid">
{featured}        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="split">
          <div class="reveal-on-scroll">
            <span class="eyebrow">How we work</span>
            <h2>Five stages, and you see the end of each one</h2>
            <p style="margin-bottom:20px;">No project disappears into a black box for two months.
              Each stage produces something you can look at, and the next one does not start until
              you have signed off on the last.</p>
            <div class="callout">
              <p style="font-size:14.5px;"><strong>Payment terms:</strong> 50% advance and 50% on
              completion, or milestone-by-milestone on larger projects. Domain registration and
              renewal are charged separately.</p>
            </div>
          </div>
          <div class="process-list">
{process}          </div>
        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="card card-lg reveal-on-scroll" style="border-color:var(--border-accent);background:linear-gradient(180deg,#0e1422 0%,#080b12 100%);">
          <div class="split" style="gap:32px;">
            <div>
              <span class="eyebrow">Free website review</span>
              <h2 style="font-size:26px;">Already have a website that is not bringing you anything?</h2>
              <p style="margin-top:10px;">Send us the address and we will go through it properly &mdash;
                loading speed, how it behaves on a phone, technical SEO, broken links, metadata and
                the path a visitor takes to contacting you &mdash; then tell you what is worth fixing
                and what is not. If your site is fine, we will say so.</p>
            </div>
            <div class="stack" style="justify-content:center;">
              <a href="{wa_audit}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-lg btn-block">{wa_svg} Send your website on WhatsApp</a>
              <a href="contact.html?service=Website%20review%20%2F%20audit" class="btn btn-secondary btn-block">Request it by form</a>
              <p style="font-size:13px;color:var(--text-dim);">Reviewed by a person, not an automated
                score generator. We will tell you when we can get to it.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

{cta}""".format(
        city=CITY,
        region=REGION,
        wa=wa("Hi MUCO LABS, I would like to discuss a project."),
        wa_svg=WA_SVG,
        trust=trust_row(),
        services=services_html,
        industries=industries,
        featured=featured_html,
        process=process,
        wa_audit=wa("Hi MUCO LABS, please review my website: "),
        cta=final_cta(
            "Tell us what you want to build",
            "Send a short description and we will come back with questions, an approach and a "
            "written scope. No obligation, and no pressure to decide on the call.",
            "Hi MUCO LABS, I would like to discuss a project.",
        ),
    )

    return render(
        "index.html",
        "%s | Software, AI &amp; Automation in %s, %s" % (BRAND, CITY, REGION),
        "Websites, mobile apps, custom software and AI automation for businesses in %s and across "
        "%s. Founder-led, written scope, code you own." % (CITY, REGION),
        body,
        schema_blocks=[ORG_JSONLD, WEBSITE_JSONLD,
                       speakable_jsonld(DOMAIN + "/", ["h1", ".lead"])],
    )


def build_services():
    cards = "".join(service_card(s) for s in SERVICES)
    industries = "".join('<span class="chip">%s</span>' % i for i in INDUSTRIES)

    body = page_header(
        "Capabilities",
        "What we build, and what you get",
        "Eight service lines, each written in terms of the business outcome rather than the "
        "technology. Everything is scoped in writing before it starts.",
    ) + """    <section style="padding-top:0;">
      <div class="container">
        <h2 class="visually-hidden">Service lines</h2>
        <div class="ecosystem-grid">
{cards}        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Industries</span>
          <h2>Sectors we work with</h2>
          <p class="section-sub">We ask how your business runs before we propose anything. That
            matters more than whether we have built for your industry before.</p>
        </div>
        <div class="chip-cloud" style="justify-content:center;">{industries}</div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container container-narrow">
        <div class="section-head">
          <span class="eyebrow">Straight answers</span>
          <h2>What we will not tell you</h2>
        </div>
        <div class="grid grid-2">
          <div class="card">
            <h3>No guaranteed rankings</h3>
            <p>Nobody controls Google's results. We commit to the technical and content work that
              makes ranking possible, and we report what actually happened.</p>
          </div>
          <div class="card">
            <h3>No invented numbers</h3>
            <p>You will not find fabricated client counts, made-up success percentages or stock
              testimonials anywhere on this site. When we have verified results to publish, we
              will publish them with the client's permission.</p>
          </div>
          <div class="card">
            <h3>No hidden scope</h3>
            <p>Third-party subscriptions, paid plugins, payment gateway charges, domain renewal,
              GST and ongoing marketing are stated separately in every quote.</p>
          </div>
          <div class="card">
            <h3>No lock-in</h3>
            <p>You own the code, the design and the accounts. If you decide to move to another
              team, everything hands over cleanly.</p>
          </div>
        </div>
      </div>
    </section>

{cta}""".format(
        cards=cards,
        industries=industries,
        cta=final_cta(
            "Not sure which of these you need?",
            "Describe the problem rather than the solution. Most of our projects start that way, "
            "and the right service usually becomes obvious in the first conversation.",
            "Hi MUCO LABS, I want to discuss which service fits my business.",
        ),
    )

    return render(
        "services.html",
        "Services | Web, Mobile, Software, AI &amp; Marketing | %s" % BRAND,
        "Websites, mobile apps, custom software and SaaS, CRM/ERP/LMS systems, SEO, AI "
        "automation and IT support for businesses in %s and %s." % (CITY, REGION),
        body,
        schema_blocks=[
            ORG_JSONLD,
            breadcrumbs([("Home", ""), ("Services", "services.html")]),
            speakable_jsonld(DOMAIN + "/services.html", ["h1", ".lead"]),
        ] + [
            service_jsonld(sv["title"], sv["outcome"] + " " + sv["body"], sv["slug"])
            for sv in SERVICES
        ],
    )



def build_service_page(sv):
    """One reusable template, populated per service (spec section 6). Each page
    is indexable on its own and carries the service context into the form."""
    d = SERVICE_DETAIL[sv["slug"]]
    slug_file = "services-%s.html" % sv["slug"]
    q = sv["title"].replace(" ", "%20").replace("&", "%26")

    who = "".join("<li>%s</li>" % w for w in d["who"])
    deliver = "".join("<li>%s</li>" % x for x in d["deliverables"])
    process = "".join(
        '          <div class="process-step"><div><h3>%s</h3><p>%s</p></div></div>\n' % (t, x)
        for t, x in PROCESS
    )
    faqs = "".join(
        '''        <details class="faq-item">
          <summary><h2>%s</h2></summary>
          <div class="faq-body">%s</div>
        </details>
''' % (qq, aa) for qq, aa in d["faqs"]
    )

    related = [p for p in PROJECTS if p["id"] in d["related"]]
    rel_html = ""
    if related:
        cards = "".join(
            '''          <a class="card card-interactive" href="work.html#%s">
            <div class="tag-row">%s</div>
            <h3>%s</h3>
            <p style="font-size:14.3px;">%s</p>
            <span style="margin-top:14px;color:var(--accent);font-weight:600;font-size:14px;">See the project &rarr;</span>
          </a>
''' % (p["id"], stage_badge(p["stage"]), p["name"], p["summary"]) for p in related
        )
        rel_html = """    <section class="section-divider">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Related work</span>
          <h2>Where we have done this</h2>
        </div>
        <div class="grid grid-%d">
%s        </div>
      </div>
    </section>

""" % (min(len(related), 3), cards)

    others = "".join(
        '<a href="services-%s.html" class="chip">%s</a>' % (o["slug"], o["title"])
        for o in SERVICES if o["slug"] != sv["slug"]
    )

    body = """    <section>
      <div class="container">
        {crumbs}
        <div class="split" style="align-items:start;">
          <div>
            <span class="eyebrow">Service</span>
            <h1>{title}</h1>
            <p class="lead">{outcome}</p>
            <p>{bodytext}</p>
            <div class="btn-group" style="margin-top:28px;">
              <a href="contact.html?service={q}" class="btn btn-accent btn-lg">Start a project</a>
              <a href="{wa}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-lg">{wa_svg} Ask a question</a>
            </div>
          </div>
          <div class="card card-lg">
            <div class="icon-tile">{icon}</div>
            <h2 style="font-size:19px;">Who this is for</h2>
            <ul class="feature-list" style="margin-top:14px;">{who}</ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="split" style="align-items:start;">
          <div>
            <h2>What you get</h2>
            <p style="margin-top:12px;">Everything below is stated explicitly in your scope, with
              anything excluded named just as clearly. Nothing here is implied and then invoiced.</p>
            <ul class="feature-list" style="margin-top:18px;">{deliver}</ul>
            <p style="margin-top:18px;font-size:14px;color:var(--text-dim);">
              Quoted per scope. See <a href="pricing.html" style="color:var(--accent);">how we quote</a>.</p>
          </div>
          <div>
            <h2 style="margin-bottom:20px;">How it runs</h2>
            <div class="process-list">
{process}            </div>
          </div>
        </div>
      </div>
    </section>

{related}    <section class="section-divider">
      <div class="container container-narrow">
        <div class="section-head">
          <span class="eyebrow">Questions</span>
          <h2>About {lower}</h2>
        </div>
{faqs}      </div>
    </section>

    <section class="section-divider section-tight">
      <div class="container">
        <div class="section-head" style="margin-bottom:24px;">
          <span class="eyebrow">Other services</span>
          <h2 style="font-size:22px;">We also do</h2>
        </div>
        <div class="chip-cloud" style="justify-content:center;">{others}</div>
      </div>
    </section>

{cta}""".format(
        crumbs=crumb_nav([("Home", "index.html"), ("Services", "services.html"),
                          (sv["title"], None)]),
        title=sv["title"], outcome=sv["outcome"], bodytext=sv["body"], q=q,
        wa=wa("Hi MUCO LABS, I have a question about %s." % sv["title"].lower()),
        wa_svg=WA_SVG, icon=icon(ICONS[sv["icon"]], 20), who=who, deliver=deliver,
        process=process, related=rel_html, faqs=faqs, lower=sv["title"].lower(),
        others=others,
        cta=final_cta(
            "Tell us what you need",
            "Describe the problem and we will come back with questions, an approach and a written "
            "scope. The scope costs you nothing.",
            "Hi MUCO LABS, I would like to discuss %s." % sv["title"].lower(),
            primary="contact.html?service=" + q,
        ),
    )

    return render(
        slug_file,
        "%s | %s" % (sv["title"], BRAND),
        d["meta"],
        body,
        schema_blocks=[
            ORG_JSONLD,
            breadcrumbs([("Home", ""), ("Services", "services.html"),
                         (sv["title"], slug_file)]),
            service_jsonld(sv["title"], sv["outcome"] + " " + sv["body"], sv["slug"]),
            faq_jsonld(d["faqs"]),
        ],
    )


def build_work():
    """Six projects, not nineteen. The rest of the archive stays in PROJECTS
    with featured unset — flip the flag to bring one back."""
    shown = [p for p in PROJECTS if p.get("featured")]
    cards = "".join(project_card(p) for p in shown)

    stages_used = []
    for p in shown:
        if p["stage"] not in stages_used:
            stages_used.append(p["stage"])
    stages_used.sort(key=lambda k: ["client", "build", "spec", "concept"].index(k))

    legend = "".join(
        '            <div class="def-row"><dt>%s</dt><dd>%s</dd></div>\n' % (
            stage_badge(k),
            {
                "client": "Paid client engagement, delivered or in delivery.",
                "build": "Our own product. Code exists and the build is actively progressing.",
                "spec": "Requirements are locked and written. The build has not been completed.",
                "concept": "An idea or a pitch. Deliberately not presented as a product.",
            }[k],
        )
        for k in stages_used
    )

    body = page_header(
        "Work",
        "Six things we are <span class='accent-serif'>actually</span> building",
        "One client project and five of our own products. Each one says plainly what stage it is "
        "at, because a specification is not a shipped product and we are not going to pretend "
        "otherwise.",
        extra="""        <div class="card card-quiet" style="margin-top:28px;">
          <h2 style="font-size:19px;">How to read the labels</h2>
          <dl class="def-list" style="margin-bottom:0;">
{legend}          </dl>
        </div>
""".format(legend=legend),
    ) + """    <section style="padding-top:0;">
      <div class="container">
        <h2 class="visually-hidden">Projects</h2>
        <div class="work-grid">
{cards}        </div>

        <div class="callout" style="margin-top:32px;">
          <p style="font-size:14.5px;"><strong>Why there are no screenshots yet.</strong> These are
          working systems, not finished consumer products, and we would rather show you a real one
          on a call than dress up a mockup here. Ask and we will walk you through whichever is
          closest to what you need.</p>
        </div>
      </div>
    </section>

{cta}""".format(cards=cards, cta=final_cta(
        "Want something like one of these for your business?",
        "The systems above were built to solve specific problems. Tell us yours and we will tell "
        "you honestly how much of it we have solved before.",
        "Hi MUCO LABS, I saw your work page and want to discuss a project.",
    ))

    names = ", ".join(p["name"] for p in shown[:3])
    return render(
        "work.html",
        "Work &amp; Projects | %s" % BRAND,
        "Projects built by %s: %s and more — each labelled as client work or active build, with "
        "the real problem, scope and current status." % (BRAND, names),
        body,
        schema_blocks=[
            ORG_JSONLD,
            breadcrumbs([("Home", ""), ("Work", "work.html")]),
            work_itemlist(shown),
        ],
    )


def build_pricing():
    """No published prices — every quote comes from a written scope. What this
    page publishes instead is exactly how the number is arrived at."""
    tiers = [
        ("Website", "Websites, landing pages, e-commerce and customer portals.",
         ["Custom responsive design", "Enquiry form and WhatsApp CTA",
          "Technical SEO baseline and sitemap", "Analytics and Search Console setup",
          "Deployment, handover and training"],
         "Website%20design%20%26%20development", False),
        ("Software, apps and systems", "Custom software, SaaS, mobile apps, CRM, ERP, LMS and billing.",
         ["Discovery and written requirements", "Architecture, data model and roles",
          "Milestone-based build and QA", "Integrations and payments where needed",
          "Deployment, documentation and support plan"],
         "Custom%20software%20%26%20SaaS", True),
        ("Growth and support", "SEO, digital marketing, maintenance and IT support.",
         ["Local and technical SEO", "Content and conversion optimisation",
          "Uptime monitoring, backups and updates", "Monthly reporting you can actually read",
          "A named person to escalate to"],
         "Digital%20marketing%20%26%20SEO", False),
    ]

    cards = ""
    for name, sub, points, q, featured in tiers:
        cards += """          <article class="price-card {cls}">
            <h3>{name}</h3>
            <p style="font-size:14.5px;margin-top:4px;">{sub}</p>
            <p class="price-tagline">Quoted per scope</p>
            <ul class="feature-list">{points}</ul>
            <a href="contact.html?service={q}" class="btn {btn} btn-block">Request a quote</a>
          </article>
""".format(cls="price-card-featured" if featured else "", name=name, sub=sub,
           points="".join("<li>%s</li>" % p for p in points),
           btn="btn-accent" if featured else "btn-secondary", q=q)

    affects = [
        ("Page and screen count", "Ten pages is not twice the work of five, and a dashboard is not a page."),
        ("Custom functionality", "Bookings, payments, accounts, roles, inventory and reporting each add real build time."),
        ("Content and photography", "If we write copy or arrange images, that is scoped and priced separately."),
        ("Integrations", "Payment gateways, WhatsApp, CRMs, accounting or logistics systems each carry their own work."),
        ("Data migration", "Moving existing customers, products or records from an old system is its own task."),
        ("Ongoing services", "Hosting, maintenance, marketing and third-party subscriptions are recurring, not one-time."),
    ]
    rows = "".join("<tr><td><strong>%s</strong></td><td>%s</td></tr>" % (a, b) for a, b in affects)

    excl = ["Domain registration and annual renewal", "Third-party subscriptions and paid plugins",
            "Payment gateway transaction charges", "Paid advertising budgets",
            "Stock photography and licensed fonts", "GST and applicable taxes",
            "Major new features beyond the agreed scope"]

    steps = [
        ("You describe the problem", "What the business needs to happen — not a feature list."),
        ("We ask the awkward questions", "The ones that change the number: volumes, roles, integrations, who maintains it."),
        ("You get a written scope and a price", "Inclusions, exclusions, milestones and dates, in writing, before you commit to anything."),
        ("You decide", "No pressure on the call, no expiring discount, no follow-up campaign."),
    ]
    steps_html = "".join(
        '          <div class="process-step"><div><h3>%s</h3><p>%s</p></div></div>\n' % st
        for st in steps
    )

    body = page_header(
        "Pricing",
        "We quote from a <span class='accent-serif'>scope</span>, not from a price list",
        "We do not publish package prices, and we would rather tell you why than pretend. Two "
        "websites that look similar can differ by four times in build time. A number posted here "
        "would be either so low it is meaningless or so high it scares off work we would have "
        "enjoyed. So here is exactly how the number gets made instead.",
    ) + """    <section style="padding-top:0;">
      <div class="container">
        <h2 class="visually-hidden">What we quote for</h2>
        <div class="grid grid-3">
{cards}        </div>

        <div class="callout" style="margin-top:28px;">
          <p><strong>Payment terms.</strong> 50% advance and 50% on completion, or milestone
          payments on larger projects. Domain registration and renewal are charged separately.
          Refund and cancellation terms are on the <a href="refund.html" style="color:var(--accent);">refund policy</a> page.</p>
        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container container-narrow">
        <div class="section-head">
          <span class="eyebrow">How you get a number</span>
          <h2>Four steps, and none of them cost you anything</h2>
        </div>
        <div class="process-list">
{steps}        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Be careful of surprises</span>
          <h2>What actually moves the price</h2>
          <p class="section-sub">We tell you which of these apply to your project before you
            commit, not afterwards.</p>
        </div>
        <div class="table-wrap">
          <table>
            <caption class="visually-hidden">Factors that change a project quote</caption>
            <thead><tr><th scope="col">Factor</th><th scope="col">Why it matters</th></tr></thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container container-narrow">
        <div class="card card-lg">
          <h2 style="font-size:24px;">Not included unless the scope says so</h2>
          <ul class="feature-list" style="margin-top:18px;">{excl}</ul>
          <p style="margin-top:16px;font-size:14px;color:var(--text-dim);">
            Every quote lists inclusions and exclusions explicitly, so there is nothing to discover later.</p>
        </div>
      </div>
    </section>

{cta}""".format(cards=cards, steps=steps_html, rows=rows,
                excl="".join("<li>%s</li>" % e for e in excl),
                cta=final_cta(
                    "Get a real number for your project",
                    "Describe what you want to build. You will get questions first, then a written "
                    "scope and a price you can plan around.",
                    "Hi MUCO LABS, I would like a quote for a project.",
                    primary_label="Request a quote",
                ))

    return render(
        "pricing.html",
        "Pricing | How We Quote | %s" % BRAND,
        "Every project quoted from a written scope. 50% advance and 50% on completion, with an "
        "honest list of what changes the number and what is excluded.",
        body,
        schema_blocks=[ORG_JSONLD, breadcrumbs([("Home", ""), ("Pricing", "pricing.html")])],
    )


def build_local_erode():
    """One substantial local page, not six spun city pages. Thin duplicated
    location pages are a penalty risk and read as spam to a human too."""
    sectors = [
        ("Textile, handloom and garment units",
         "Buyers search for suppliers before they call. A site with your product range, "
         "capabilities, minimum order and a working enquiry form does the first filtering for you."),
        ("Turmeric, agri and commodity traders",
         "Grades, packaging, capacity and export readiness on a page that loads on a phone, so "
         "an enquiry from outside the district does not depend on a phone call at the right moment."),
        ("Clinics, labs and healthcare",
         "Appointments, timings, doctor profiles and directions — the four things patients look "
         "up before they visit, in one place instead of scattered across social posts."),
        ("Schools, colleges and coaching centres",
         "Admissions information, course details, faculty and enquiry capture during the season "
         "when parents are comparing options at 10 PM on a phone."),
        ("Retail shops and showrooms",
         "A catalogue people can browse before they come in, with a WhatsApp button on every "
         "product so they can ask about stock without driving over."),
        ("Salons, studios and services",
         "Bookings, price lists and a gallery, with reminders that reduce no-shows more "
         "effectively than a phone call ever did."),
    ]
    sectors_html = "".join(
        '          <article class="card reveal-on-scroll"><h3>%s</h3><p>%s</p></article>\n' % sc
        for sc in sectors
    )

    faqs = "".join(
        '''        <details class="faq-item">
          <summary><h2>%s</h2></summary>
          <div class="faq-body">%s</div>
        </details>
''' % (q, a) for q, a in LOCAL_FAQS
    )

    body = """    <section>
      <div class="container">
        {crumbs}
        <span class="eyebrow">Erode, Tamil Nadu</span>
        <h1>Website development in <span class="accent-serif">Erode</span></h1>
        <p class="lead">{brand} is a software studio based in {city}. We build websites, mobile
          apps and business systems for businesses here and across {region} &mdash; quoted from a
          written scope, built to work on the phones your customers actually own, and handed over
          with the code in your name.</p>

        <div class="btn-group">
          <a href="contact.html" class="btn btn-accent btn-lg">Start your project</a>
          <a href="{wa}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-lg">{wa_svg} WhatsApp {phone}</a>
        </div>

        {trust}
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="split">
          <div>
            <h2>Why a local studio makes a difference</h2>
            <p style="margin-top:14px;">Plenty of businesses in {city} have been sold a website by
              someone three states away, paid for it, and never been able to reach them again to
              change a phone number. Being in the same district is not a marketing line &mdash; it
              is the difference between a supplier you can meet and one who stops replying.</p>
            <p style="margin-top:14px;">It also means we know the conditions your site has to work
              in: customers on mid-range Android phones and mobile data, Tamil and English side by
              side, and WhatsApp as the place where business actually gets done.</p>
          </div>
          <div class="card card-lg">
            <h3>What that looks like in practice</h3>
            <ul class="feature-list" style="margin-top:14px;">
              <li>We meet you in person in {city} and nearby towns</li>
              <li>Tamil, English or both &mdash; written, not machine-translated</li>
              <li>Tested on real mid-range Android phones, not just a laptop</li>
              <li>WhatsApp enquiry built into every page with context prefilled</li>
              <li>Google Business Profile and local search setup included</li>
              <li>You own the code and the accounts on final payment</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Sectors</span>
          <h2>What we build for businesses around {city}</h2>
          <p class="section-sub">{city} runs on textiles, turmeric, trading, healthcare and
            education. Different businesses, same problem: the customer looks you up online before
            they ever call.</p>
        </div>
        <div class="grid grid-3">
{sectors}        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container container-narrow">
        <div class="section-head">
          <span class="eyebrow">Common questions</span>
          <h2>Asked by businesses in {city}</h2>
        </div>
{faqs}
        <p style="margin-top:24px;text-align:center;">
          <a href="faq.html" class="btn btn-secondary">All questions and answers &rarr;</a>
        </p>
      </div>
    </section>

    <section class="section-divider">
      <div class="container container-narrow">
        <div class="card card-lg">
          <h2 style="font-size:22px;">Also serving</h2>
          <p style="margin-top:10px;">We work in person across <strong>{markets}</strong>, and
            remotely anywhere. If you are further away in {region}, the process is the same &mdash;
            calls and shared documents instead of meetings.</p>
          <div class="btn-group" style="margin-top:20px;">
            <a href="services.html" class="btn btn-secondary">All services</a>
            <a href="work.html" class="btn btn-secondary">See our work</a>
            <a href="pricing.html" class="btn btn-secondary">How we quote</a>
          </div>
        </div>
      </div>
    </section>

{cta}""".format(
        crumbs=crumb_nav([("Home", "index.html"), ("Website development in Erode", None)]),
        brand=BRAND, city=CITY, region=REGION, phone=PHONE,
        wa=wa("Hi MUCO LABS, I need a website for my business in Erode."),
        wa_svg=WA_SVG, trust=trust_row(), sectors=sectors_html, faqs=faqs,
        markets=", ".join(MARKETS),
        cta=final_cta(
            "Let us look at what you need",
            "Tell us about the business and we will come back with questions and a written scope. "
            "If a website is not what you actually need, we will say so.",
            "Hi MUCO LABS, I need a website for my business in Erode.",
        ),
    )

    return render(
        "website-development-erode.html",
        "Website Development in Erode | %s" % BRAND,
        "Website development in Erode: custom sites for textile, trading, healthcare, education "
        "and retail businesses. Tamil and English, built for real phones.",
        body,
        schema_blocks=[
            ORG_JSONLD,
            breadcrumbs([("Home", ""), ("Website development in Erode",
                          "website-development-erode.html")]),
            faq_jsonld(LOCAL_FAQS),
            service_jsonld("Website development in Erode",
                           "Custom website design and development for businesses in Erode and "
                           "across Tamil Nadu, quoted from a written scope.", "websites"),
        ],
    )


def build_maintenance():
    incl = ["Uptime monitoring and alerting", "Security updates and dependency patching",
            "Scheduled backups with restore testing", "Small content and image changes",
            "Bug fixes on delivered functionality", "Monthly performance and error review",
            "A named support channel"]
    excl = ["New features and new pages beyond the agreed hours",
            "Third-party subscription and licence fees",
            "Paid plugins, themes or stock assets",
            "Redesigns and rebuilds",
            "Marketing campaigns and ad spend",
            "Recovery from changes made by other parties without notice"]

    body = page_header(
        "Maintenance & support",
        "Someone who answers when something breaks",
        "A website is not finished at launch. Plans are quote-based so you pay for the level of "
        "cover you actually need, and we only commit to response times we can honour.",
    ) + """    <section style="padding-top:0;">
      <div class="container">
        <div class="grid grid-2">
          <div class="card card-lg">
            <div class="icon-tile">{ok}</div>
            <h2 style="font-size:22px;">What a plan includes</h2>
            <ul class="feature-list" style="margin-top:14px;">{incl}</ul>
          </div>
          <div class="card card-lg">
            <div class="icon-tile icon-tile-alt">{code}</div>
            <h2 style="font-size:22px;">What it does not include</h2>
            <ul class="feature-list" style="margin-top:14px;">{excl}</ul>
            <p style="margin-top:14px;font-size:14px;color:var(--text-dim);">Anything on this list can
              still be done &mdash; it is quoted separately rather than absorbed silently.</p>
          </div>
        </div>

        <div class="callout callout-warn" style="margin-top:28px;">
          <p><strong>On response times.</strong> We do not publish an SLA we cannot guarantee.
          Your agreement states the response window we have actually committed to, and how to
          escalate if it is missed.</p>
        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container container-narrow">
        <h2>How support works</h2>
        <div class="process-list" style="margin-top:24px;">
          <div class="process-step"><div><h3>Report</h3><p>You raise an issue on the agreed channel with what happened and when.</p></div></div>
          <div class="process-step"><div><h3>Acknowledge and assess</h3><p>We confirm receipt, reproduce the issue and tell you whether it is covered by your plan.</p></div></div>
          <div class="process-step"><div><h3>Fix and verify</h3><p>The fix is applied and verified, and you get a short note on what changed.</p></div></div>
          <div class="process-step"><div><h3>Escalate if needed</h3><p>If it is not resolved in the agreed window, it escalates directly to the founder.</p></div></div>
          <div class="process-step"><div><h3>Review and renew</h3><p>A monthly summary of uptime, updates, issues and hours used, ahead of renewal.</p></div></div>
        </div>
      </div>
    </section>

{cta}""".format(
        ok=icon(ICONS["shield"]), code=icon(ICONS["code"]),
        incl="".join("<li>%s</li>" % i for i in incl),
        excl="".join("<li>%s</li>" % e for e in excl),
        cta=final_cta(
            "Need cover for a site you already have?",
            "Tell us what is running and where, and we will quote a maintenance arrangement that "
            "matches it. We also take over sites built by someone else.",
            "Hi MUCO LABS, I need a maintenance and support plan.",
            primary_label="Request a maintenance quote",
            primary="contact.html?service=Maintenance%20%26%20support",
        ),
    )

    return render(
        "maintenance.html",
        "Maintenance &amp; Support Plans | %s" % BRAND,
        "Website maintenance from %s: uptime monitoring, security updates, backups, content "
        "changes, bug fixes and monthly reporting. Clear inclusions and exclusions." % BRAND,
        body,
        schema_blocks=[ORG_JSONLD, breadcrumbs([("Home", ""), ("Maintenance", "maintenance.html")])],
    )


def build_about():
    values = [
        ("We build what we use",
         "Meyra, Ooruva and InkNexis are our own builds, running against our own requirements. "
         "Every hard lesson from them &mdash; multi-tenancy, permissions, offline behaviour, "
         "honest status reporting &mdash; goes into client work."),
        ("You talk to the person building it",
         "There is no account manager relaying your requirements to someone you never meet. "
         "The person who answers your message is the person responsible for the technical work."),
        ("Written scope before code",
         "Every project starts with what is included, what is not, the milestones and the price. "
         "Ambiguity in a scope always becomes an argument later."),
        ("Honest status, always",
         "If a milestone is going to slip, you hear it from us before you notice it. Our own "
         "portfolio is labelled the same way &mdash; specifications are not called products."),
        ("You own everything",
         "On final payment the code, the design and the accounts are yours. No proprietary "
         "builder, no licence you have to keep renewing, no hostage hosting."),
        ("Rooted in Erode",
         "We work in person across Erode, Pallipalayam, Namakkal, Coimbatore, Tiruppur and "
         "Karur, and remotely beyond. Local businesses get a team they can actually meet."),
    ]
    vhtml = "".join(
        '          <article class="card reveal-on-scroll"><h3>%s</h3><p>%s</p></article>\n' % v
        for v in values
    )

    stage_counts = {}
    for p in PROJECTS:
        stage_counts[p["stage"]] = stage_counts.get(p["stage"], 0) + 1

    body = """    <section>
      <div class="container">
        <div class="split" style="align-items:start;">
          <div>
            <span class="eyebrow">About</span>
            <h1>A <span class="accent-serif">founder-led</span> software studio in {city}.</h1>
            <p class="lead">{brand} builds websites, mobile apps, custom software and AI
              automation for businesses across {region}. We are small on purpose: it is the
              only way to keep direct accountability between the person who promises something
              and the person who builds it.</p>

            <p>The studio runs on its own products as much as on client work. {counts} That mix
              is deliberate &mdash; the internal builds are where we make our mistakes, and the
              client work is where the lessons get applied.</p>

            <p style="margin-top:16px;">We do not have an office full of stock photography, a
              wall of client logos or a page of five-star testimonials, because we have not
              earned those yet. What we have is written specifications, working code and a
              portfolio labelled honestly enough that you can check it yourself.</p>

            <div class="btn-group" style="margin-top:28px;">
              <a href="work.html" class="btn btn-secondary">See the work &rarr;</a>
              <a href="contact.html" class="btn btn-accent">Start a project</a>
            </div>

            {trust}
          </div>

          <div class="portrait-frame">
            <picture>
              <source type="image/webp"
                      srcset="assets/founder-420.webp 420w, assets/founder-560.webp 560w, assets/founder-768.webp 768w"
                      sizes="(max-width: 900px) 100vw, 420px" />
              <img src="assets/founder-560.jpg"
                   srcset="assets/founder-420.jpg 420w, assets/founder-560.jpg 560w, assets/founder-768.jpg 768w"
                   sizes="(max-width: 900px) 100vw, 420px"
                   width="560" height="747" loading="lazy" decoding="async"
                   class="portrait"
                   alt="{founder}, founder of {brand}" />
            </picture>
            <p class="portrait-caption">
              <strong style="color:var(--text);">{founder}</strong><br />
              Founder &amp; Chairman, {brand}<br />
              <span class="text-mono" style="font-size:12px;">{city}, {region}</span>
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">How we operate</span>
          <h2>Six commitments, and what each one costs us</h2>
        </div>
        <div class="grid grid-3">
{values}        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container container-narrow">
        <h2>The working arrangement</h2>
        <div class="table-wrap" style="margin-top:22px;">
          <table>
            <caption class="visually-hidden">How MUCO LABS works with clients</caption>
            <tbody>
              <tr><th scope="row">Where we are</th><td>{city}, {region}, India</td></tr>
              <tr><th scope="row">Working hours</th><td>{hours}</td></tr>
              <tr><th scope="row">Primary markets</th><td>{markets}, then the rest of {region}</td></tr>
              <tr><th scope="row">Remote work</th><td>Yes &mdash; most project work happens over calls and shared documents</td></tr>
              <tr><th scope="row">Payment terms</th><td>50% advance, 50% on completion, or milestone payments on larger projects</td></tr>
              <tr><th scope="row">Ownership</th><td>Code, design and accounts transfer to you on final payment</td></tr>
              <tr><th scope="row">Languages</th><td>English and Tamil</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

{cta}""".format(
        city=CITY, region=REGION, brand=BRAND, founder=FOUNDER, hours=HOURS,
        markets=", ".join(MARKETS),
        counts="Across %d recorded projects there are %d active builds, %d written specifications "
               "and %d concepts kept deliberately unbuilt." % (
                   len(PROJECTS), stage_counts.get("build", 0),
                   stage_counts.get("spec", 0), stage_counts.get("concept", 0)),
        trust=trust_row(),
        values=vhtml,
        cta=final_cta(
            "Want to talk it through first?",
            "No sales script and no obligation. Describe the problem and we will tell you honestly "
            "whether we are the right people for it.",
            "Hi MUCO LABS, I would like to talk about a project.",
        ),
    )

    person_jsonld = """{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "%s",
  "jobTitle": "Founder & Chairman",
  "worksFor": { "@id": "%s/#organization" },
  "address": { "@type": "PostalAddress", "addressLocality": "%s", "addressRegion": "%s", "addressCountry": "IN" }
}""" % (FOUNDER, DOMAIN, CITY, REGION)

    return render(
        "about.html",
        "About | Founder-led software studio in %s | %s" % (CITY, BRAND),
        "%s is a founder-led software studio in %s, %s, led by %s. Written scope, direct access "
        "to the builder, and code you own." % (BRAND, CITY, REGION, FOUNDER),
        body,
        og_type="profile",
        schema_blocks=[ORG_JSONLD, person_jsonld,
                       breadcrumbs([("Home", ""), ("About", "about.html")])],
    )


def build_contact():
    service_opts = ["Website design & development", "Mobile app development",
                    "UI/UX and product design", "Custom software & SaaS",
                    "CRM / ERP / HRMS / LMS / billing", "Digital marketing & SEO",
                    "AI & business automation", "Branding, IT & cloud support",
                    "Website review / audit", "Maintenance & support", "Something else"]
    budgets = ["Under ₹25,000", "₹25,000 – ₹75,000", "₹75,000 – ₹2,00,000",
               "₹2,00,000 – ₹5,00,000", "Above ₹5,00,000", "Not decided yet"]
    timelines = ["As soon as possible", "Within 1 month", "1–3 months", "3–6 months",
                 "Just exploring"]

    def options(items, empty):
        out = '<option value="">%s</option>' % empty
        return out + "".join('<option value="%s">%s</option>' % (i, i) for i in items)

    body = """    <section>
      <div class="container">
        <span class="eyebrow">Contact</span>
        <h1>Tell us what you want to <span class="accent-serif">build</span>.</h1>
        <p class="lead">Send a short description and we will come back with questions, a suggested
          approach and a written scope. If we are not the right people for it, we will tell you that
          instead of taking the project.</p>

        <div class="split" style="align-items:start;margin-top:36px;">
          <div class="stack">
            <div class="card card-lg">
              <h2 style="font-size:20px;margin-bottom:18px;">Reach us directly</h2>
              <div class="stack" style="gap:12px;">
                <a href="{wa}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-lg" style="justify-content:flex-start;">
                  {wa_svg}<span>WhatsApp &mdash; {phone}</span>
                </a>
                <a href="tel:{tel}" class="btn btn-secondary btn-lg" style="justify-content:flex-start;">
                  {ic_phone}<span>Call &mdash; {phone}</span>
                </a>
                <a href="mailto:{email}" class="btn btn-secondary btn-lg" style="justify-content:flex-start;">
                  {ic_mail}<span>{email}</span>
                </a>
                <a href="{ig}" target="_blank" rel="noopener noreferrer" class="btn btn-instagram btn-lg" style="justify-content:flex-start;">
                  {ig_svg}<span>@muco_labs on Instagram</span>
                </a>
              </div>

              <dl class="def-list" style="margin-top:26px;padding-top:22px;border-top:1px solid var(--border);">
                <div class="def-row"><dt>Based in</dt><dd>{city}, {region}, India</dd></div>
                <div class="def-row"><dt>Hours</dt><dd>{hours}</dd></div>
                <div class="def-row"><dt>In person</dt><dd>{markets} and across {region}</dd></div>
                <div class="def-row"><dt>Remote</dt><dd>Anywhere &mdash; calls and shared documents</dd></div>
                <div class="def-row"><dt>Languages</dt><dd>English and Tamil</dd></div>
              </dl>
            </div>

            <div class="callout">
              <p style="font-size:14px;"><strong>What happens next.</strong> We read every enquiry
              ourselves. You will usually get a reply with questions or a suggested time to talk.
              We do not publish a guaranteed response time because we would rather meet a
              commitment than advertise one.</p>
            </div>
          </div>

          <div class="form-card">
            <h2 style="font-size:20px;">Project enquiry</h2>
            <p style="font-size:14px;margin:8px 0 22px;">Fill this in and it reaches us directly, and
              opens WhatsApp with the same details already written out so you can talk there too.</p>

            <form id="enquiry-form" novalidate>
              <div class="form-row">
                <div class="form-group">
                  <label for="name">Your name<span class="form-req">*</span></label>
                  <input type="text" id="name" name="name" class="form-control" autocomplete="name" required />
                  <p class="form-error" id="name-error">Please enter your name.</p>
                </div>
                <div class="form-group">
                  <label for="business">Business name</label>
                  <input type="text" id="business" name="business" class="form-control" autocomplete="organization" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="phone">Phone / WhatsApp<span class="form-req">*</span></label>
                  <input type="tel" id="phone" name="phone" class="form-control" autocomplete="tel"
                         inputmode="tel" placeholder="+91 " required />
                  <p class="form-error" id="phone-error">Please enter a number we can reach you on.</p>
                </div>
                <div class="form-group">
                  <label for="email">Email</label>
                  <input type="email" id="email" name="email" class="form-control" autocomplete="email" />
                </div>
              </div>

              <div class="form-group">
                <label for="service">What do you need?</label>
                <select id="service" name="service" class="form-control">{services}</select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="location">Town or city</label>
                  <input type="text" id="location" name="location" class="form-control" placeholder="{city}" />
                </div>
                <div class="form-group">
                  <label for="website">Current website</label>
                  <input type="url" id="website" name="website" class="form-control" placeholder="https://" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="budget">Budget range</label>
                  <select id="budget" name="budget" class="form-control">{budgets}</select>
                </div>
                <div class="form-group">
                  <label for="timeline">Timeline</label>
                  <select id="timeline" name="timeline" class="form-control">{timelines}</select>
                </div>
              </div>

              <div class="form-group">
                <label for="message">What do you want to build?<span class="form-req">*</span></label>
                <textarea id="message" name="message" class="form-control" required
                          placeholder="What the business does, what problem you are trying to solve, and anything you already have."></textarea>
                <p class="form-error" id="message-error">Please tell us a little about the project.</p>
              </div>

              <div class="hp-field" aria-hidden="true">
                <label for="company_website">Leave this field empty</label>
                <input type="text" id="company_website" name="company_website" tabindex="-1" autocomplete="off" />
              </div>

              <div class="form-consent">
                <input type="checkbox" id="consent" name="consent" required />
                <label for="consent">I agree that {brand} may contact me about this enquiry.
                  See the <a href="privacy.html" style="color:var(--accent);">privacy policy</a>.</label>
              </div>
              <p class="form-error" id="consent-error">Please confirm we may contact you.</p>

              <div class="btn-group" style="margin-top:12px;">
                <button type="submit" class="btn btn-whatsapp btn-lg" style="flex:1;">{wa_svg} Send on WhatsApp</button>
                <button type="button" id="send-email" class="btn btn-secondary btn-lg">Send by email</button>
              </div>

              <p class="form-status" id="form-status" role="status" aria-live="polite"></p>

              <p class="form-hint" style="margin-top:16px;">
                Your enquiry is sent to us and also opened in WhatsApp, so it reaches us even if you
                do not press send there. We use these details to reply and quote, nothing else &mdash;
                see the <a href="privacy.html" style="color:var(--accent);">privacy policy</a>.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
""".format(
        wa=wa("Hi MUCO LABS, I would like to discuss a project."),
        wa_svg=WA_SVG, ig_svg=IG_SVG, ig=INSTAGRAM,
        phone=PHONE, tel=PHONE_TEL, email=EMAIL,
        ic_phone=icon('<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.2a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>', 18),
        ic_mail=icon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2.5 6.5L12 13l9.5-6.5"/>', 18),
        city=CITY, region=REGION, hours=HOURS, brand=BRAND,
        markets=", ".join(MARKETS),
        services=options(service_opts, "Select a service"),
        budgets=options(budgets, "Select a range"),
        timelines=options(timelines, "Select a timeline"),
    )

    contact_jsonld = """{
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "url": "%s/contact.html",
  "about": { "@id": "%s/#organization" }
}""" % (DOMAIN, DOMAIN)

    return render(
        "contact.html",
        "Contact | Start a Project | %s" % BRAND,
        "Contact %s in %s, %s. WhatsApp %s, call, email %s, or send a project enquiry with your "
        "scope, budget and timeline." % (BRAND, CITY, REGION, PHONE, EMAIL),
        body,
        schema_blocks=[ORG_JSONLD, contact_jsonld,
                       breadcrumbs([("Home", ""), ("Contact", "contact.html")]),
                       speakable_jsonld(DOMAIN + "/contact.html", ["h1", ".def-list"])],
    )


def build_faq():
    items = "".join(
        """        <details class="faq-item">
          <summary><h2>%s</h2></summary>
          <div class="faq-body">%s</div>
        </details>
""" % (q, a) for q, a in FAQS
    )

    body = page_header(
        "FAQ",
        "The questions we <span class='accent-serif'>actually</span> get asked",
        "Pricing, process, ownership and the things other agencies avoid answering. If your "
        "question is not here, ask it directly.",
    ) + """    <section style="padding-top:0;">
      <div class="container container-narrow">
{items}      </div>
    </section>

{cta}""".format(items=items, cta=final_cta(
        "Still have a question?",
        "Ask it on WhatsApp and you will get a straight answer, whether or not it leads to a project.",
        "Hi MUCO LABS, I have a question: ",
        primary_label="Ask by form",
    ))

    return render(
        "faq.html",
        "FAQ | Pricing, Process &amp; Ownership | %s" % BRAND,
        "Straight answers from %s on website cost, payment terms, project timelines, code "
        "ownership, SEO guarantees and what happens after launch." % BRAND,
        body,
        schema_blocks=[ORG_JSONLD, faq_jsonld(FAQS),
                       breadcrumbs([("Home", ""), ("FAQ", "faq.html")]),
                       speakable_jsonld(DOMAIN + "/faq.html", ["h1", ".faq-item summary h2"])],
    )


def build_careers():
    roles = [
        ("Frontend engineer", "Contract / project",
         "React or vanilla, TypeScript, real accessibility and responsive work down to 320px. "
         "You will own screens end to end, not pixel-push someone else's Figma."),
        ("Backend engineer", "Contract / project",
         "PostgreSQL and Supabase, row-level security, auth and role design, integrations and "
         "payment flows. Comfortable being the person who says a schema is wrong."),
        ("Mobile developer", "Contract / project",
         "Android or cross-platform, with store submission experience. Location, offline "
         "behaviour and low-end device performance matter here more than animation."),
        ("Designer (UI/UX)", "Contract / project",
         "Systems rather than screens. Type scale, spacing, states, accessibility and a handoff "
         "a developer can actually build from."),
        ("SEO & content", "Contract / retainer",
         "Technical SEO, local search for Tamil Nadu, and writing that a business owner would "
         "recognise as true. No keyword stuffing, no spun content."),
    ]
    rhtml = "".join(
        """          <article class="card reveal-on-scroll">
            <div class="tag-row"><span class="tag tag-subtle">%s</span></div>
            <h3>%s</h3>
            <p>%s</p>
            <a href="%s" class="btn btn-secondary btn-sm" style="margin-top:16px;align-self:flex-start;">Apply for this role</a>
          </article>
""" % (kind, title, desc, wa("Hi MUCO LABS, I want to apply for the %s role." % title))
        for title, kind, desc in roles
    )

    body = page_header(
        "Careers &amp; collaboration",
        "We are small, and we hire that way",
        "Most work here is project-based or contract, and we are honest that we are not a large "
        "company with a bench. If you are good and you want direct ownership of what you build, "
        "there is room.",
    ) + """    <section style="padding-top:0;">
      <div class="container">
        <div class="callout" style="margin-bottom:28px;">
          <p><strong>Straight about the stage we are at.</strong> {brand} is founder-led. We do not
          currently advertise salaried full-time positions, employee counts or benefits packages,
          because publishing those before they exist would be dishonest. What we do have is real
          project work, and terms agreed per engagement.</p>
        </div>

        <h2 style="margin-bottom:20px;">Where we usually need help</h2>
        <div class="grid grid-3">
{roles}        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="split">
          <div>
            <span class="eyebrow">Freelancers &amp; studios</span>
            <h2>Collaboration, not subcontracting in the dark</h2>
            <p style="margin-bottom:16px;">We work with independent developers, designers and small
              studios on projects that need more hands or a specific specialism. If you bring the
              client, you stay in the relationship &mdash; we do not go around you.</p>
            <p>Commercial terms, revenue split and ownership are agreed in writing per engagement.
              We are not publishing a fixed split here until it is confirmed in a form we can hold
              ourselves to.</p>
            <div class="btn-group" style="margin-top:24px;">
              <a href="{wa_free}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp">{wa_svg} Talk about collaborating</a>
              <a href="mailto:{email}?subject=Freelance%20collaboration" class="btn btn-secondary">Email us</a>
            </div>
          </div>
          <div class="card card-lg">
            <h3>How to apply</h3>
            <ul class="feature-list" style="margin-top:14px;">
              <li>Message us on WhatsApp or email with the role you want</li>
              <li>Send links to real work &mdash; repositories, live sites or apps</li>
              <li>Tell us what you actually built in each one</li>
              <li>Mention your availability and how you prefer to be paid</li>
            </ul>
            <p style="margin-top:16px;font-size:14px;color:var(--text-dim);">A short honest message
              about two projects beats a long CV. We read everything ourselves.</p>
          </div>
        </div>
      </div>
    </section>

{cta}""".format(
        brand=BRAND, roles=rhtml, email=EMAIL, wa_svg=WA_SVG,
        wa_free=wa("Hi MUCO LABS, I am a freelancer and would like to collaborate."),
        cta=final_cta(
            "Nothing above matches you?",
            "If you are strong at something we have not listed, tell us what it is and what you have "
            "built with it. We would rather hear from you than miss you.",
            "Hi MUCO LABS, I would like to work with you.",
            primary_label="Send an enquiry",
        ),
    )

    return render(
        "careers.html",
        "Careers &amp; Freelancer Collaboration | %s" % BRAND,
        "Contract and project roles at %s in %s: frontend, backend, mobile, design and SEO. Plus "
        "freelancer and studio collaboration with terms agreed in writing." % (BRAND, CITY),
        body,
        schema_blocks=[ORG_JSONLD, breadcrumbs([("Home", ""), ("Careers", "careers.html")])],
    )


# The privacy page has to describe what the site actually does, so this text
# follows GA_MEASUREMENT_ID rather than being written by hand and going stale.
if GA_MEASUREMENT_ID:
    ANALYTICS_PRIVACY_TEXT = (
        "This site uses Google Analytics to count visits and see which pages are useful. It "
        "records the pages you view, roughly where you are (country or region level, not your "
        "address), your device and browser type, and how you arrived here. Advertising features "
        "and ad personalisation are switched off, so this data is not used to target you with "
        "advertising. We use it to decide what to write and fix, nothing else. You can block it "
        "with any ad blocker or your browser's Do Not Track setting, and the site works exactly "
        "the same either way."
    )
else:
    ANALYTICS_PRIVACY_TEXT = (
        "We do not currently run analytics, advertising trackers or third-party cookies on this "
        "website. If that changes, this page will be updated first and consent will be requested "
        "where the law requires it."
    )

LEGAL_NOTICE = """      <div class="callout callout-warn" style="margin-bottom:32px;">
        <p><strong>Please read.</strong> This page describes how {brand} actually operates today and
        is written in plain language. It has not been reviewed by a lawyer and is not a substitute
        for legal advice. If anything here matters to a decision you are making, ask us and we will
        confirm it in your agreement, which is the document that governs the engagement.</p>
      </div>
""".format(brand=BRAND)


def legal_page(slug, nav_title, h1, eyebrow, description, sections):
    blocks = ""
    for heading, paras in sections:
        blocks += "        <h2>%s</h2>\n" % heading
        for p in paras:
            blocks += "        <p>%s</p>\n" % p if not p.startswith("<") else "        %s\n" % p

    body = """    <section>
      <div class="container container-narrow">
        <span class="eyebrow">{eyebrow}</span>
        <h1>{h1}</h1>
        <p class="lead">Last updated {updated}.</p>
{notice}
      <div class="prose">
{blocks}
        <h2>Questions about this page</h2>
        <p>Email <a href="mailto:{email}">{email}</a>, call <a href="tel:{tel}">{phone}</a>, or
        message us on <a href="{wa}" target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>
      </div>
      </div>
    </section>
""".format(eyebrow=eyebrow, h1=h1, updated=LEGAL_REVISED, notice=LEGAL_NOTICE, blocks=blocks,
           email=EMAIL, tel=PHONE_TEL, phone=PHONE, wa=wa("Hi MUCO LABS, a question about your %s." % nav_title.lower()))

    return render(
        slug,
        "%s | %s" % (nav_title, BRAND),
        description,
        body,
        og_type="article",
        schema_blocks=[ORG_JSONLD, breadcrumbs([("Home", ""), (nav_title, slug)])],
    )


def build_privacy():
    return legal_page(
        "privacy.html", "Privacy Policy", "Privacy policy", "Legal",
        "How %s collects, uses and stores the information you send through this website, "
        "WhatsApp, email or phone." % BRAND,
        [
            ("What this website itself collects", [
                "This site is a set of static pages with one piece of server code: the endpoint "
                "that receives the enquiry form. There are no user accounts and no public database.",
                "When you submit the enquiry form, what you typed is sent to us and recorded so we "
                "can reply. The same details are also opened in WhatsApp or your email application "
                "so you can continue the conversation there if you want to \u2014 but the enquiry "
                "reaches us either way, which is the point: before this, an enquiry was lost if "
                "WhatsApp failed to open. Browsing the site without submitting the form sends us "
                "nothing.",
                "Alongside your answers we record the page you submitted from, the site that "
                "referred you and any campaign tags in the link, so we know which of our pages are "
                "actually useful. Your IP address is recorded with the submission as a basic "
                "anti-abuse measure.",
                "Our hosting provider, GitHub, records standard technical request logs such as IP "
                "address and browser type as part of serving the site. We do not control or have "
                "access to those logs. Everything else this site loads \u2014 stylesheets, scripts, "
                "typefaces and images \u2014 is served from this domain, so loading a page makes no "
                "request to any third party.",
                ANALYTICS_PRIVACY_TEXT,
            ]),
            ("What we collect when you contact us", [
                "When you message us on WhatsApp, email us, call us or send an enquiry, we receive "
                "whatever you chose to include: typically your name, business name, phone number, "
                "email address, location, the service you are interested in, your budget range, "
                "your timeline and a description of your project.",
                "We ask only for what we need to understand and quote your project. You are never "
                "required to give us financial details, identity documents or anything sensitive "
                "in order to make an enquiry.",
            ]),
            ("How we use it", [
                "To reply to your enquiry, ask follow-up questions, prepare a scope and a quote, "
                "and deliver the project if you go ahead with it.",
                "For an active project, to keep the records any working relationship needs: the "
                "agreed scope, milestones, invoices and correspondence.",
                "We do not sell your information, rent it, or share it with advertisers. We do not "
                "add you to a marketing list because you asked a question.",
            ]),
            ("Where it is stored", [
                "Enquiries and project correspondence live in the business tools we actually use "
                "to run the company &mdash; our WhatsApp Business account, our email, and our own "
                "project files. Access is limited to the people working on your project.",
                "Where a project requires a third-party service such as a database, payment "
                "gateway or email provider, that is stated in your project agreement along with "
                "who the provider is.",
            ]),
            ("How long we keep it", [
                "Enquiries that do not become projects are kept while there is a realistic chance "
                "of the conversation continuing, and removed on request at any time.",
                "Records relating to a project we delivered are kept for as long as we may need "
                "them for accounting, tax or contractual reasons.",
            ]),
            ("Your choices", [
                "You can ask us what we hold about you, ask for it to be corrected, or ask us to "
                "delete it. Email <a href=\"mailto:" + EMAIL + "\">" + EMAIL + "</a> and we will "
                "confirm what we have done. If deleting something would conflict with a legal or "
                "accounting obligation, we will tell you which part and why.",
                "You can stop hearing from us at any time by saying so in any channel.",
            ]),
            ("Children", [
                "This website and our services are aimed at businesses. We do not knowingly "
                "collect information from children.",
            ]),
            ("Changes", [
                "If our practices change, this page changes with them and the date at the top is "
                "updated. Material changes affecting an active project will be told to you directly.",
            ]),
        ],
    )


def build_terms():
    return legal_page(
        "terms.html", "Terms", "Terms and conditions", "Legal",
        "The terms on which %s provides website, software, app, marketing and support services, "
        "and the terms for using this website." % BRAND,
        [
            ("Using this website", [
                "This website is provided for information about our services. The content, "
                "design, code and images on it belong to " + BRAND + " unless stated otherwise. "
                "You may not copy the site or present it as your own work.",
                "We try to keep everything here accurate and current, particularly project "
                "statuses and prices. Prices shown as \"from\" are starting points, not offers, "
                "and nothing on this website is a binding quotation.",
            ]),
            ("How an engagement starts", [
                "A project begins when we have agreed a written scope and you have confirmed it. "
                "The scope states what is included, what is excluded, the milestones, the timeline "
                "and the price. That document, together with these terms, governs the work.",
                "Where the scope and this page disagree, the scope wins, because it was written "
                "for your specific project.",
            ]),
            ("Payment", [
                "Standard terms are 50% in advance and 50% on completion. Larger projects are "
                "split into milestones, each with its own deliverable and payment.",
                "Work on a stage begins after the payment for that stage is received. Final "
                "deliverables, source code and account access transfer to you once the final "
                "payment has been made.",
                "Domain registration and renewal, third-party subscriptions, paid plugins, payment "
                "gateway charges, advertising budgets, licensed assets and applicable taxes are "
                "separate from the project price unless your scope explicitly includes them.",
            ]),
            ("What we need from you", [
                "Projects depend on content, approvals, access and decisions arriving from your "
                "side. Where these are delayed, timelines move accordingly, and we will tell you "
                "as soon as we can see that happening.",
                "You confirm that any text, images, logos or data you give us are yours to use, or "
                "that you have permission to use them.",
            ]),
            ("Ownership and reuse", [
                "On final payment, the deliverables built specifically for you &mdash; source "
                "code, designs and content we produced &mdash; are yours.",
                "We retain the right to reuse our own general knowledge, techniques and any "
                "non-client-specific components or libraries we developed. We will not reuse your "
                "content, your data or anything identifying your business.",
                "We may describe the work in our portfolio in general terms. We will not publish "
                "your name, screenshots or results without asking you first.",
            ]),
            ("Changes to scope", [
                "New requirements that appear mid-project are welcome and are quoted separately "
                "rather than absorbed silently. Nothing outside the agreed scope is built or "
                "charged for without your written agreement.",
            ]),
            ("What we do not guarantee", [
                "We do not guarantee search engine rankings, traffic volumes, lead counts, sales "
                "or revenue. Those depend on competition, market conditions and platform "
                "decisions that no supplier controls, and anyone promising them is guessing.",
                "We do not guarantee that software will be free of every defect. We do commit to "
                "fixing defects in what we delivered, within the terms of your agreement.",
                "Third-party services &mdash; hosting, payment gateways, messaging platforms, AI "
                "providers, app stores &mdash; have their own terms, availability and pricing, "
                "which they can change. We name the ones a project depends on so you know what "
                "you are relying on.",
            ]),
            ("Liability", [
                "Our liability in connection with a project is limited to the fees you paid us for "
                "that project. We are not liable for indirect or consequential losses such as lost "
                "profit, lost data or business interruption.",
                "Nothing here limits liability that cannot be limited under Indian law.",
            ]),
            ("Ending an engagement", [
                "Either side may end an engagement in writing. You pay for work completed and in "
                "progress up to that point; we hand over what has been paid for. Cancellation and "
                "refund handling is described on the "
                "<a href=\"refund.html\">refund and cancellation policy</a> page.",
            ]),
            ("Governing law", [
                "These terms are governed by the laws of India, and disputes fall to the courts "
                "with jurisdiction over " + CITY + ", " + REGION + ".",
            ]),
        ],
    )


def build_refund():
    return legal_page(
        "refund.html", "Refund &amp; Cancellation", "Refund and cancellation policy", "Legal",
        "How cancellations, refunds and unused work are handled by %s, including what happens to "
        "advance payments and third-party costs." % BRAND,
        [
            ("The principle", [
                "You pay for work that has been done. If you cancel, you owe us for what is "
                "complete and in progress, and we owe you anything you paid beyond that.",
                "We would always rather resolve a problem than process a refund, so please raise "
                "an issue with us before cancelling &mdash; most concerns are a scope "
                "misunderstanding that can be fixed.",
            ]),
            ("Cancelling before work starts", [
                "If you cancel after paying an advance but before we have begun design or "
                "development, the advance is refunded in full, less any third-party costs already "
                "incurred on your behalf (for example a domain registration, which cannot be "
                "reversed).",
            ]),
            ("Cancelling during a project", [
                "If you cancel mid-project, we assess what has been completed and what is in "
                "progress at that point, invoice for it, and refund the balance of anything you "
                "have paid above that amount. If the work completed exceeds what you have paid, "
                "the difference is payable.",
                "You receive the work that has been paid for &mdash; files, designs and source "
                "code as they stand.",
            ]),
            ("After delivery", [
                "Once a project has been delivered and accepted, the fee for that project is not "
                "refundable, because the work has been done and handed over.",
                "Defects in what we delivered are fixed under your agreement rather than refunded. "
                "If we delivered something materially different from the agreed scope, that is our "
                "problem to correct at our cost.",
            ]),
            ("Recurring services", [
                "Maintenance, support and marketing arrangements can be cancelled with the notice "
                "period stated in your agreement. The current period is not refunded, and no "
                "further period is charged after the notice takes effect.",
            ]),
            ("What is never refundable", [
                "<ul><li>Domain registration and renewal fees</li>"
                "<li>Third-party subscriptions, licences and paid plugins</li>"
                "<li>Payment gateway transaction charges</li>"
                "<li>Advertising spend already placed with a platform</li>"
                "<li>Applicable taxes already remitted</li></ul>",
                "These are costs paid to other companies on your behalf, and we cannot recover "
                "them once they are spent.",
            ]),
            ("How to request a refund", [
                "Email <a href=\"mailto:" + EMAIL + "\">" + EMAIL + "</a> with your project name "
                "and the reason. We will respond with a written assessment of completed work and "
                "the refund amount, if any.",
                "Approved refunds are returned to the original payment method. Timing depends on "
                "your bank or payment provider.",
            ]),
            ("Disagreements", [
                "If you do not accept our assessment, tell us why and we will look at it again "
                "with you. We would rather spend an hour resolving something than lose a "
                "relationship over it.",
            ]),
        ],
    )


def build_404():
    links = "".join(
        '          <li><a href="%s">%s</a></li>\n' % (h, l)
        for h, l in NAV[1:] + [("faq.html", "FAQ"), ("careers.html", "Careers")]
    )
    body = """    <section style="min-height:52vh;display:flex;align-items:center;">
      <div class="container container-narrow" style="text-align:center;">
        <span class="eyebrow">404</span>
        <h1>That page does not exist.</h1>
        <p class="lead" style="margin-left:auto;margin-right:auto;">The link may be out of date, or
          the address may have a typo in it. Here is everything that does exist:</p>

        <ul class="chip-cloud" style="justify-content:center;margin-bottom:32px;">
{links}        </ul>

        <div class="btn-group btn-group-center">
          <a href="index.html" class="btn btn-accent btn-lg">Back to home</a>
          <a href="{wa}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-lg">{wa_svg} Ask us directly</a>
        </div>
      </div>
    </section>
""".format(links=links.replace("<li>", '<li class="chip" style="padding:0;background:none;border:none;">'),
           wa=wa("Hi MUCO LABS, I hit a broken link on your website."), wa_svg=WA_SVG)

    return render(
        "404.html", "Page not found | %s" % BRAND,
        "That page does not exist. Use the links here to find what you were after.",
        body, current="", noindex=True,
    )


def work_itemlist(shown):
    els = []
    for i, p in enumerate(shown, 1):
        els.append(
            '{"@type":"ListItem","position":%d,"item":{"@type":"CreativeWork",'
            '"name":"%s","description":"%s","url":"%s/work.html#%s","creator":{"@id":"%s/#organization"}}}'
            % (i, p["name"], p["summary"].replace('"', "'"), DOMAIN, p["id"], DOMAIN)
        )
    return ('{"@context":"https://schema.org","@type":"ItemList",'
            '"name":"Projects built by %s","numberOfItems":%d,"itemListElement":[%s]}'
            % (BRAND, len(shown), ",".join(els)))


def build_llms_txt():
    """llms.txt — an emerging convention (llmstxt.org) that gives language models
    a clean, factual summary of a site instead of leaving them to scrape the
    markup. Cheap to maintain and harmless if nothing reads it."""
    shown = [p for p in PROJECTS if p.get("featured")]
    projects = "\n".join(
        "- **%s** (%s) — %s" % (p["name"], STAGE_LABEL[p["stage"]][0].lower(), p["summary"])
        for p in shown
    )
    services = "\n".join("- **%s** — %s %s" % (sv["title"], sv["outcome"], sv["body"])
                          for sv in SERVICES)
    faqs = "\n".join("- **%s** %s" % (q, re.sub(r"<[^>]+>", " ", a).strip()[:320])
                      for q, a in FAQS[:6])

    txt = """# {brand}

> {description}

{brand} is led by {founder} (Founder & Chairman) and is based in {city}, {region}, India.
Contact: {phone} (phone and WhatsApp), {email}. Working hours: {hours}.
Primary service area: {markets}, and the rest of {region}. Remote work worldwide.

## How {brand} works

- Every project is quoted from a **written scope** that states inclusions, exclusions,
  milestones and price before any work begins. No package price is published, because
  two similar-looking projects can differ several times over in build time.
- Payment terms are **50% in advance and 50% on completion**, or milestone payments on
  larger projects.
- On final payment the client **owns the source code, the design and the accounts**.
  There is no proprietary builder, licence or hosting lock-in.
- The founder reads every enquiry personally. There is no account-manager layer.
- {brand} does not guarantee search rankings, traffic, lead counts or revenue, and does
  not publish testimonials, client logos or metrics it cannot verify.

## Services

{services}

## Work

{brand} publishes six projects, each labelled with its real stage. A written
specification is never presented as a shipped product.

{projects}

Thirteen further systems are specified or at concept stage and are deliberately not
presented as available products.

## Common questions

{faqs}

## Pages

- [Home]({domain}/): positioning, services, selected work
- [Services]({domain}/services.html): all eight service lines and what each includes
{service_pages}
- [Website development in Erode]({domain}/website-development-erode.html): local page for Erode businesses
- [Work]({domain}/work.html): projects with problem, scope and current status
- [Pricing]({domain}/pricing.html): how quotes are made and what changes the number
- [Maintenance]({domain}/maintenance.html): support plan inclusions and exclusions
- [About]({domain}/about.html): the studio, the founder, the operating model
- [FAQ]({domain}/faq.html): cost, timelines, ownership, SEO guarantees
- [Careers]({domain}/careers.html): contract roles and freelancer collaboration
- [Contact]({domain}/contact.html): project enquiry form, WhatsApp, phone, email

## Legal

- [Privacy policy]({domain}/privacy.html)
- [Terms and conditions]({domain}/terms.html)
- [Refund and cancellation policy]({domain}/refund.html)

Last updated: {updated}
""".format(brand=BRAND, description=DESCRIPTION, founder=FOUNDER, city=CITY, region=REGION,
           phone=PHONE, email=EMAIL, hours=HOURS, markets=", ".join(MARKETS),
           services=services, projects=projects, faqs=faqs, domain=DOMAIN, updated=SITE_REVISED,
           service_pages="\n".join(
               "  - [%s](%s/services-%s.html)" % (sv["title"], DOMAIN, sv["slug"])
               for sv in SERVICES))

    txt = clean_urls(txt)

    with open(os.path.join(ROOT, "llms.txt"), "w", encoding="utf-8") as f:
        f.write(txt)
    return len(txt)


def build_manifest():
    txt = '''{
  "name": "%s",
  "short_name": "MUCO",
  "description": "%s",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#05070b",
  "theme_color": "#05070b",
  "lang": "en-IN",
  "dir": "ltr",
  "categories": ["business", "productivity"],
  "icons": [
    { "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" },
    { "src": "/assets/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/assets/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
''' % (BRAND, TAGLINE)
    with open(os.path.join(ROOT, "site.webmanifest"), "w", encoding="utf-8") as f:
        f.write(txt)
    return len(txt)


SITEMAP_PAGES = [
    ("", "1.0", "monthly"),
    ("services.html", "0.9", "monthly"),
    ("work.html", "0.9", "weekly"),
    ("pricing.html", "0.8", "monthly"),
    ("about.html", "0.7", "monthly"),
    ("contact.html", "0.8", "monthly"),
    ("faq.html", "0.6", "monthly"),
    ("maintenance.html", "0.6", "monthly"),
    ("website-development-erode.html", "0.8", "monthly"),
    ("careers.html", "0.5", "monthly"),
    ("privacy.html", "0.3", "yearly"),
    ("terms.html", "0.3", "yearly"),
    ("refund.html", "0.3", "yearly"),
]


def build_sitemap():
    urls = ""
    pages = list(SITEMAP_PAGES)
    idx = [i for i, p in enumerate(pages) if p[0] == "services.html"][0] + 1
    for sv in reversed(SERVICES):
        pages.insert(idx, ("services-%s.html" % sv["slug"], "0.8", "monthly"))
    for path, prio, freq in pages:
        urls += (
            "  <url>\n    <loc>%s/%s</loc>\n    <lastmod>%s</lastmod>\n"
            "    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>\n"
            % (DOMAIN, path, PAGE_REVISED.get(path, SITE_REVISED), freq, prio)
        )
    xml = clean_urls(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % urls)
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(xml)
    return len(xml)


def build_robots():
    """Search crawlers and AI crawlers are both allowed deliberately.

    Being cited by an answer engine is worth more to a studio like this than
    protecting marketing copy from being read, so the AI agents are named
    explicitly rather than left to a wildcard that could change meaning later.
    """
    ai_agents = [
        ("GPTBot", "OpenAI — ChatGPT training and browsing"),
        ("OAI-SearchBot", "OpenAI — ChatGPT search index"),
        ("ChatGPT-User", "OpenAI — user-initiated page fetches"),
        ("ClaudeBot", "Anthropic — Claude"),
        ("Claude-Web", "Anthropic — user-initiated page fetches"),
        ("anthropic-ai", "Anthropic"),
        ("PerplexityBot", "Perplexity"),
        ("Google-Extended", "Google — Gemini and AI Overviews"),
        ("Applebot-Extended", "Apple Intelligence"),
        ("Bingbot", "Microsoft Bing and Copilot"),
        ("CCBot", "Common Crawl"),
        ("Amazonbot", "Amazon"),
        ("meta-externalagent", "Meta AI"),
    ]
    blocks = "".join(
        "\n# %s\nUser-agent: %s\nAllow: /\n" % (why, agent) for agent, why in ai_agents
    )

    txt = """# {domain}
# Everything here is public marketing content. Search engines and answer engines
# are both welcome; llms.txt carries a clean summary for language models.

User-agent: *
Allow: /
Disallow: /404.html
Disallow: /logo-showcase.html
{blocks}
Sitemap: {domain}/sitemap.xml
""".format(domain=DOMAIN, blocks=blocks)

    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(txt)
    return len(txt)



def build_vercel_json():
    """Generated so the Content-Security-Policy can follow GA_MEASUREMENT_ID.

    Widening the policy by hand was the obvious alternative, but then enabling
    analytics would take two edits in two files and forgetting the second one
    fails silently: the tag loads, the browser blocks it, and nothing is
    measured. Generating it keeps the promise that the Measurement ID is the
    only thing you have to set.
    """
    script_src = "'self'"
    connect_src = "'self'"
    if GA_MEASUREMENT_ID:
        script_src += " https://www.googletagmanager.com"
        connect_src += " https://*.google-analytics.com https://*.analytics.google.com"

    csp = "; ".join([
        "default-src 'self'",
        "script-src " + script_src,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src " + connect_src,
        "form-action 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
    ])

    config = {
        "$schema": "https://openapi.vercel.sh/vercel.json",
        "cleanUrls": True,
        "trailingSlash": False,
        "headers": [
            {
                "source": "/(.*)",
                "headers": [
                    {"key": "Content-Security-Policy", "value": csp},
                    {"key": "X-Content-Type-Options", "value": "nosniff"},
                    {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
                    {"key": "X-Frame-Options", "value": "DENY"},
                    {"key": "Permissions-Policy",
                     "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"},
                    {"key": "Cross-Origin-Opener-Policy", "value": "same-origin"},
                ],
            },
            {
                "source": "/assets/fonts/(.*)",
                "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}],
            },
            {
                "source": "/assets/(.*).(jpg|png|webp|svg)",
                "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}],
            },
            {
                "source": "/(favicon.svg|logo-mark.svg|logo-full.svg)",
                "headers": [{"key": "Cache-Control", "value": "public, max-age=604800"}],
            },
        ],
    }

    import json as _json
    txt = _json.dumps(config, indent=2) + "\n"
    with open(os.path.join(ROOT, "vercel.json"), "w", encoding="utf-8") as f:
        f.write(txt)
    return len(txt)


def build_readme():
    txt = """# {brand} — mucolabs.com

Official website for {brand}. {tagline}

Static HTML plus one serverless function (`api/lead.js`). Deployed from `main`.

## Contact

- **Founder:** {founder}
- **Website:** <{domain}>
- **Email:** {email}
- **Phone:** {phone}

## How this repo works

The `.html` files in the root are **generated**. Do not hand-edit them — the next
build will overwrite your changes. Edit the source and rebuild instead:

| File | What it holds |
|---|---|
| `build.py` | Page shell, header, footer, navigation, company facts, schema helpers |
| `content.py` | All page copy, the service list, and the project portfolio data |
| `style.css` | Design system — edit directly |
| `main.js` | Browser behaviour — edit directly |
| `analytics.js` | GA4 event map — edit directly, only loaded when an ID is set |

`vercel.json`, `robots.txt`, `sitemap.xml`, `llms.txt`, `site.webmanifest` and
the `.html` files are all generated. Edit the sources above, not the output.

```bash
python3 build.py
```

No dependencies, no npm, no build server. It writes the `.html` files plus
`robots.txt` and `sitemap.xml`, and you commit the result.

## Pages

Home · Services · Work · Pricing · About · Contact · FAQ · Maintenance ·
Careers · Privacy · Terms · Refund · 404

## Enquiry form

The contact form posts to `api/lead.js`, a Vercel serverless function. It
validates server-side, rate limits by IP, drops honeypot submissions, and
writes every accepted lead to the function log before doing anything else — so
a lead survives an email outage or a missing API key.

Set `RESEND_API_KEY` in Vercel (see `.env.example`) and it also emails the
enquiry to you. Without it nothing breaks; the leads are in
Vercel → Deployments → Functions → Logs, filtered on `[lead]`.

The browser opens WhatsApp *before* awaiting the request, because doing it
afterwards loses the click gesture and pop-up blockers eat the window.

## Turning on analytics

Open `build.py`, put the GA4 Measurement ID in `GA_MEASUREMENT_ID`, and run
`python3 build.py`.

That one line switches on three things at once: the gtag tag on every page,
the event map in `analytics.js`, and the paragraph in the privacy policy that
describes what is being collected. While the value is empty the site loads no
analytics, makes no third-party request, and the privacy policy says exactly
that — so the page can never claim something untrue about itself.

`vercel.json` is generated too, so the Content-Security-Policy widens to allow
Google's hosts only while the ID is set and narrows again when it is cleared.
Any *other* third-party script needs its host adding to `build_vercel_json()`
in `content.py`, or the browser will block it.

Events sent: `whatsapp_click`, `phone_click`, `email_click`,
`instagram_click`, `cta_click`, `form_start`, `form_error`, `generate_lead`,
`faq_open`, `project_detail_open` — see the header of `analytics.js`.

## Content rules

These are enforced by convention, not by code, so please keep to them:

- No fabricated testimonials, client logos, awards, staff or metrics.
- Every project on the Work page carries its real stage: client project,
  active build, specified, or concept. A specification is never shown as a
  shipped product.
- Prices published as "from" are starting points; the real number comes from a
  written scope.
- No guaranteed rankings, lead counts or response times we cannot honour.

## Deploy

Push to `main`; Vercel builds from it and serves the result at
<https://mucolabs-in.vercel.app>.

No custom domain is attached yet: `mucolabs.com` and `mucolabs.in` have no DNS
records pointing anywhere, so neither resolves. There is no `CNAME` file — that
is a GitHub Pages mechanism and GitHub Pages is not serving this repository.
To go live on the real domain, add it in the Vercel project settings and point
DNS at the records Vercel gives you.

## Known limitations

The enquiry form is client-side only: it opens WhatsApp or the visitor's email
app with the message pre-filled. Nothing is stored or transmitted by the page.
Server-side validation, spam protection, lead storage and transactional email
need a backend, which this repository does not have yet.
""".format(brand=BRAND, tagline=TAGLINE, founder=FOUNDER,
           domain=DOMAIN, email=EMAIL, phone=PHONE)
    with open(os.path.join(ROOT, "README.md"), "w", encoding="utf-8") as f:
        f.write(txt)
    return len(txt)


# The serif accent font is subsetted to only the glyphs the accent words use
# (2 KB instead of 22 KB). That is a real saving and a real trap: change an
# accent word to one containing a letter outside this set and the browser
# silently falls back to Georgia for that letter, which looks broken. So the
# build refuses to finish quietly if that happens — re-run build_fonts.py to
# regenerate the subset, then update this string.
SERIF_SUBSET = "-Eabcdefilnoprstuy"


def check_serif_subset():
    """Fail loudly if an accent word needs a glyph the subset does not carry."""
    used = set()
    for name in os.listdir(ROOT):
        if not name.endswith(".html"):
            continue
        html = open(os.path.join(ROOT, name), encoding="utf-8").read()
        for word in re.findall(r'<span class=["\']accent-serif["\']>(.*?)</span>', html):
            used |= set(word)
    missing = sorted(used - set(SERIF_SUBSET))
    if missing:
        raise SystemExit(
            "\n  ERROR: the serif accent uses glyphs missing from the subsetted font: %s\n"
            "  Those letters would silently render in Georgia instead.\n"
            "  Fix: run `python3 build_fonts.py --serif` and update SERIF_SUBSET.\n"
            % "".join(missing)
        )
    return len(used)


def build_all():
    jobs = [
        ("index.html", build_home),
        ("services.html", build_services),
        ("work.html", build_work),
        ("pricing.html", build_pricing),
        ("maintenance.html", build_maintenance),
        ("website-development-erode.html", build_local_erode),
        ("about.html", build_about),
        ("contact.html", build_contact),
        ("faq.html", build_faq),
        ("careers.html", build_careers),
        ("privacy.html", build_privacy),
        ("terms.html", build_terms),
        ("refund.html", build_refund),
        ("404.html", build_404),
        ("sitemap.xml", build_sitemap),
        ("robots.txt", build_robots),
        ("llms.txt", build_llms_txt),
        ("site.webmanifest", build_manifest),
        ("vercel.json", build_vercel_json),
        ("README.md", build_readme),
    ]
    jobs += [("services-%s.html" % sv["slug"], (lambda v: lambda: build_service_page(v))(sv))
             for sv in SERVICES]
    total = 0
    for name, fn in jobs:
        size = fn()
        total += size
        print("  %-18s %6.1f KB" % (name, size / 1024.0))
    print("  %-18s %6.1f KB total across %d files" % ("", total / 1024.0, len(jobs)))
    print("  serif accent glyphs in use: %d, all present in the subset" % check_serif_subset())
