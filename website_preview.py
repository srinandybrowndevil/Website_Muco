"""The Website Preview page — /website-preview.

A separate module for the same reason growth_content.py and learning_pages.py
are separate: content.py is already 4,000 lines, and a feature with its own
stylesheet and its own JavaScript module deserves its own file rather than
another thousand lines in the one everybody opens.

What this file builds is the *page*. The studio itself -- the wizard, the five
concepts, the customiser -- is drawn at runtime by website-preview.js into the
`#wp-studio` div near the bottom. That split is deliberate and not incidental:

  * render() runs two regex post-processors over every page body (rule_labels
    and band_sections in build.py). They rewrite <section> tags and section
    heads. Preview markup written here would be silently rewritten by them.
  * Everything above #wp-studio is real, indexable HTML that explains the tool
    in words. A crawler that never runs the fragment router still reads a
    complete page, which is the whole reason this is one URL and not six.
  * With JavaScript unavailable the page still renders and still converts --
    #wp-studio holds a written explanation and a link to /contact, and nothing
    else on the page changes.
"""

from build import (
    BRAND, DOMAIN, START_PROJECT_URL,
    ICONS, ORG_JSONLD, asset_v, breadcrumbs, faq_jsonld, final_cta, icon,
    page_header, render, service_jsonld, speakable_jsonld,
)

STEPS = [
    ("Tell us about your business",
     "Your business name, what you do, and the town you are in. Three fields. "
     "Everything after that is optional, and skipping it does not stop you."),
    ("Explore five design directions",
     "Not five colour schemes. Five genuinely different websites &mdash; different "
     "headers, different structure, different typography, different density."),
    ("Choose and customise",
     "Pick the one you like and change the colours, the headline, the typeface, "
     "which sections appear and what the main button does. Every change shows "
     "immediately."),
]

FAQS = [
    ("Is this a real website I can publish?",
     "No, and we will not pretend otherwise. It is a design preview: a way to see "
     "what your business could look like online before you commit to anything. "
     "Building the real thing is a project, with a written scope and a price."),
    ("Where does my information go?",
     "Nowhere. Everything you type stays in your own browser, and any logo or "
     "photograph you add is read locally and never uploaded. There is no account, "
     "no sign-up and no submission. If you clear your browser data it is gone."),
    ("Is the content written by AI?",
     "No. The headings and descriptions are assembled from what you typed using "
     "fixed rules, which is why the same details always produce the same page. "
     "Where you leave something blank, the preview shows a clearly marked example "
     "rather than inventing a fact about your business."),
    ("Why does the preview show drawn placeholder pictures?",
     "Because we do not have photographs of your business. Rather than dropping in "
     "a stock photo of somebody else&rsquo;s shop and letting it look like yours, the "
     "preview draws its own placeholder panels. Add your own images and they "
     "replace the panels immediately."),
    ("What happens after I approve a concept?",
     "Nothing automatic &mdash; the concept is saved in your browser, not sent to us. "
     "When you are ready, start a project and tell us which design you picked. We "
     "will use it as the starting point rather than beginning from a blank page."),
]


def _steps_html():
    glyphs = ["user", "design", "check"]
    return "".join(
        """          <article class="spotlight-card reveal-on-scroll">
            <div class="icon-tile">{glyph}</div>
            <h3>{title}</h3>
            <p class="card-body">{body}</p>
          </article>
""".format(glyph=icon(ICONS[g], 20), title=t, body=b)
        for (t, b), g in zip(STEPS, glyphs)
    )


def _faq_html():
    return "".join(
        """        <details class="faq-item">
          <summary><h3>%s</h3></summary>
          <div class="reveal-wrap"><div class="reveal-inner"><div class="faq-body"><p>%s</p></div></div></div>
        </details>
""" % (q, a) for q, a in FAQS
    )


def build_website_preview():
    body = page_header(
        "Website preview",
        "See your business online <span class=\"accent-serif\">before</span> you build.",
        "Enter a few details about your business and explore five different website design "
        "directions built around your name, your services and your town. No account, no "
        "upload, and nothing is sent anywhere &mdash; it all happens in your browser.",
        extra="""        <div class="btn-group mt-5">
          <a href="#/create" class="btn btn-accent btn-lg">Create My Website Preview</a>
          <a href="#examples" class="btn btn-secondary btn-lg">View Example Designs</a>
        </div>
        <p class="note mt-5">No technical knowledge required. This is a design preview,
          not a published website.</p>
""") + """    <section class="section-divider" data-wp-landing>
      <div class="container">
        <div class="section-head reveal-on-scroll">
          <span class="eyebrow">How it works</span>
          <h2>Three steps, and you can stop after any of them</h2>
          <p class="section-sub">Most of it is optional. The parts you skip are filled with
            something clearly marked as an example rather than an invented claim about your
            business.</p>
        </div>
        <div class="ecosystem-grid">
{steps}        </div>
      </div>
    </section>

    <section class="section-divider" id="examples" data-wp-landing>
      <div class="container">
        <div class="section-head reveal-on-scroll">
          <span class="eyebrow">Example designs</span>
          <h2>The same bakery, five different websites</h2>
          <p class="section-sub">These are not screenshots. Each one below is a real page,
            drawn in your browser right now by the same engine that will draw yours &mdash;
            which is why the five look like five different websites rather than one website
            in five colours.</p>
        </div>
        <div class="wp-examples" id="wp-examples"></div>
        <p class="note mt-6">Worked example for a fictional bakery in Coimbatore, used here
          to show the five directions. Your own details produce your own pages.</p>
      </div>
    </section>

    <section class="section-divider" data-wp-landing>
      <div class="container container-narrow">
        <div class="section-head reveal-on-scroll">
          <span class="eyebrow">Being straight with you</span>
          <h2>What this is, and what it is not</h2>
        </div>
        <div class="split">
          <div class="card card-lg">
            <h3 class="fs-lg">What it is</h3>
            <ul class="feature-list mt-4">
              <li>A visual prototype of your business website, in five design directions</li>
              <li>Built from the details you type, using fixed rules, in your browser</li>
              <li>Yours to change: colours, typeface, headline, sections, main action</li>
              <li>A better starting point for a real project than a blank page</li>
            </ul>
          </div>
          <div class="card card-lg">
            <h3 class="fs-lg">What it is not</h3>
            <ul class="feature-list mt-4">
              <li>Not a published website, and not ready to go live</li>
              <li>Not written by AI, and not connected to any AI service</li>
              <li>Not stored by us &mdash; nothing leaves your browser</li>
              <li>Not a quote. What a real build costs depends on scope</li>
            </ul>
          </div>
        </div>
        <div class="callout mt-6">
          <p class="fs-sm"><strong>On the placeholder content.</strong> Where you have not given
          us a fact, the preview will not invent one. You will not find a made-up number of
          happy customers, a fabricated review with somebody&rsquo;s name on it, or a stock
          photograph presented as your shop. Anything generic is labelled as an example.</p>
        </div>
      </div>
    </section>

    <section class="section-divider" data-wp-landing>
      <div class="container container-narrow">
        <div class="section-head reveal-on-scroll">
          <span class="eyebrow">Before you start</span>
          <h2>Questions about the preview</h2>
        </div>
{faqs}      </div>
    </section>

    <section class="section-divider" data-band="none">
      <div class="container">
        <div id="wp-studio">
          <div class="wp-nojs">
            <h2>The preview tool needs JavaScript</h2>
            <p>Everything above describes what it does, and it all still applies &mdash; but the
              designs are drawn in your browser, so the tool itself needs JavaScript switched
              on. If you would rather just talk to a person about what your website should
              look like, that works too.</p>
            <a class="btn btn-accent" href="/contact#start-project">Start a Project</a>
          </div>
        </div>
      </div>
    </section>

{cta}""".format(
        steps=_steps_html(),
        faqs=_faq_html(),
        cta=final_cta(
            "Seen something you like?",
            "Tell us which of the five directions you picked and we will start there rather "
            "than from a blank page. You will get questions first, then a written scope and "
            "a price.",
            primary_label="Start a Project",
            primary=START_PROJECT_URL,
        ),
    )

    # The landing sections are hidden while the studio is open, so they carry a
    # marker attribute. page_header() and final_cta() build their own <section>
    # without one, and they are shared by thirty other pages -- so they are
    # tagged here rather than by changing a helper for one caller's benefit.
    body = body.replace('<section class="page-header',
                        '<section data-wp-landing class="page-header', 1)
    body = body.replace('    <section class="section-divider">\n      <div class="container">\n'
                        '        <div class="cta-box',
                        '    <section class="section-divider" data-wp-landing>\n'
                        '      <div class="container">\n        <div class="cta-box', 1)

    return render(
        "website-preview.html",
        "Website Preview: See Your Business Online | %s" % BRAND,
        "Enter your business details and see five genuinely different website designs built "
        "around your brand. Free, no account, and nothing leaves your browser.",
        body,
        head_extra='<link rel="stylesheet" href="%s" />\n' % asset_v("website-preview.css"),
        scripts='\n<script src="%s" defer></script>\n' % asset_v("website-preview.js"),
        schema_blocks=[
            ORG_JSONLD,
            service_jsonld(
                "Website design preview",
                "A free browser-based tool that renders a business's details into five "
                "different website design directions, which can then be customised and kept "
                "as the starting point for a website project. It is a visual prototype and "
                "not a published website.",
                "website-preview"),
            faq_jsonld(FAQS),
            breadcrumbs([("Home", ""), ("Website preview", "website-preview.html")]),
            speakable_jsonld(DOMAIN + "/website-preview.html", ["h1", ".lead"]),
        ],
    )
