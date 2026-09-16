"""The Tamil side of the site.

Four pages, written in Tamil rather than translated from the English word for
word. That distinction is the whole point: a business owner in Erode reading
this should not be able to tell it started life in another language, and a
literal rendering of English marketing copy always can be told.

The Tamil pages carry their own header and footer instead of a translated copy
of the English ones. They are a four-page site, so the English seven-item
navigation would advertise four pages that do not exist in Tamil; the switch
back to English is part of the navigation rather than a flag in a corner.

Adding a page here is deliberately a two-step job: write it, then add its slug
to TAMIL_TWINS in build.py. Until that second step it ships with no hreflang
pair and nothing pointing at it, so a half-finished translation can never be
advertised to a search engine as a complete one.
"""

from build import *  # noqa: F401,F403 — shared shell, tokens and helpers


# ---------------------------------------------------------------------------
# Navigation
# ---------------------------------------------------------------------------
TA_NAV = [
    ("/ta", "முகப்பு"),
    ("/ta/services", "சேவைகள்"),
    ("/ta/about", "எங்களைப் பற்றி"),
    ("/ta/contact", "தொடர்பு"),
]

TA_START_URL = "/ta/contact#start-project"
TA_START_LABEL = "திட்டத்தைத் தொடங்குங்கள்"


def ta_nav_links(current, mobile=False):
    out = []
    for href, label in TA_NAV:
        aria = ' aria-current="page"' if href == current else ""
        if mobile:
            out.append('        <a href="%s"%s>%s</a>' % (href, aria, label))
        else:
            out.append('          <li><a href="%s"%s>%s</a></li>' % (href, aria, label))
    return NEWLINE.join(out)


def ta_header(current):
    """A separate template rather than the English one with its strings swapped.

    The English header carries a seven-item navigation and two secondary links.
    Reusing it here would mean four Tamil labels beside nine English ones, which
    is exactly the half-translated page the brief rules out.
    """
    return """  <a class="skip-link" href="#main">உள்ளடக்கத்திற்குச் செல்லவும்</a>

  <div class="ambient-glow" aria-hidden="true"></div>

  <header>
    <div class="container">
      <nav aria-label="முதன்மை வழிசெலுத்தல்">
        <a href="/ta" class="logo-link" aria-label="{brand} முகப்பு">
          {logo}
          <span class="logo-text">{brand}<span class="logo-badge">ஈரோடு</span></span>
        </a>

        <ul class="nav-links">
{desktop}
        </ul>

        <div class="nav-actions">
          <a href="/" class="lang-switch" lang="en" hreflang="en-in">English</a>
          <a href="{start}" class="btn btn-accent btn-sm">{start_label}</a>
          <details class="contact-dock" id="contact-dock">
            <summary class="contact-dock-trigger" aria-label="வாட்ஸ்அப் அல்லது தொலைபேசியில் தொடர்பு கொள்ள">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span class="contact-dock-label">தொடர்பு</span>
            </summary>
            <div class="contact-dock-panel">
              <a href="{whatsapp}" data-whatsapp>வாட்ஸ்அப்</a>
              <a href="{call}">அழைக்க {phone}</a>
            </div>
          </details>
          <button id="menu-toggle" class="menu-toggle" aria-label="வழிசெலுத்தல் பட்டியைத் திறக்க"
                  aria-expanded="false" aria-controls="mobile-menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            <span class="menu-toggle-label">பட்டி</span>
          </button>
        </div>
      </nav>
    </div>

    <div id="mobile-menu" class="mobile-menu">
      <div class="mobile-menu-nav">
{mobile}
      </div>
      <div class="mobile-menu-secondary">
        <a href="/" lang="en" hreflang="en-in">English site</a>
      </div>
      <div class="mobile-menu-actions">
        <a href="{start}" class="btn btn-accent">{start_label}</a>
        <a href="{whatsapp}" class="btn btn-whatsapp" data-whatsapp>வாட்ஸ்அப்பில் பேசுங்கள்</a>
      </div>
    </div>
  </header>
""".format(
        brand=BRAND,
        logo=LOGO_SVG.replace("{k}", "ta"),
        desktop=ta_nav_links(current),
        mobile=ta_nav_links(current, mobile=True),
        start=TA_START_URL,
        start_label=TA_START_LABEL,
        whatsapp=WHATSAPP_URL,
        call=CALL_URL,
        phone=PHONE,
    )


def ta_footer():
    """A short footer. The Tamil site is four pages, and a footer listing the
    fourteen English ones would send every Tamil reader out of the language."""
    return """  <footer>
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col footer-brand">
          <strong class="lede">{brand}</strong>
          <p>ஈரோட்டிலிருந்து வணிக இணையதளங்கள், தனிப்பயன் மென்பொருள், மொபைல் செயலிகள்
            மற்றும் தானியங்கி அமைப்புகள்.</p>
          <p class="footer-place">ஈரோடு, தமிழ்நாடு, இந்தியா &mdash; இந்தியா முழுவதும்,
            வெளிநாட்டு வாடிக்கையாளர்களுக்குத் தொலைவிலிருந்தும்.</p>
        </div>

        <nav class="footer-col" aria-label="தமிழ்ப் பக்கங்கள்">
          <p class="footer-col-label">பக்கங்கள்</p>
          <ul>
{links}
          </ul>
        </nav>

        <nav class="footer-col" aria-label="தொடர்பு">
          <p class="footer-col-label">தொடர்பு</p>
          <ul>
            <li><a href="{whatsapp}" data-whatsapp>வாட்ஸ்அப்</a></li>
            <li><a href="{call}">{phone}</a></li>
            <li><a href="mailto:{email}">{email}</a></li>
            <li><a href="/" lang="en" hreflang="en-in">English site</a></li>
          </ul>
        </nav>
      </div>

      <div class="footer-bottom">
        <p>&copy; {year} {brand}. விலை, சட்டப் பக்கங்கள் மற்றும் முழுச் சேவை விவரங்கள்
          தற்போது <a href="/" lang="en" hreflang="en-in">ஆங்கிலப் பக்கங்களில்</a> உள்ளன.</p>
      </div>
    </div>
  </footer>
""".format(
        brand=BRAND,
        year=date.today().year,
        links=NEWLINE.join(
            '            <li><a href="%s">%s</a></li>' % (h, l) for h, l in TA_NAV),
        whatsapp=WHATSAPP_URL,
        call=CALL_URL,
        phone=PHONE,
        email=EMAIL,
    )


def ta_render(slug, title, description, body, current, schema_blocks=None):
    return render(slug, title, description, body,
                  lang="ta-IN",
                  header=ta_header(current),
                  footer=ta_footer(),
                  schema_blocks=schema_blocks)


# ---------------------------------------------------------------------------
# Shared fragments
# ---------------------------------------------------------------------------
TA_SERVICES = [
    ("websites", "இணையதள வடிவமைப்பும் உருவாக்கமும்",
     "வேகமாக ஏற்றப்படும், தேடலில் கிடைக்கும் இணையதளம் &mdash; பார்வையாளரை விசாரணையாக மாற்றுவது."),
    ("mobile", "மொபைல் செயலி உருவாக்கம்",
     "வாடிக்கையாளர்கள் நீக்காமல் ஃபோனில் வைத்திருக்கும் செயலிகள்."),
    ("product-design", "UI/UX மற்றும் தயாரிப்பு வடிவமைப்பு",
     "தனியாகப் பயிற்சி தேவைப்படாமல் யாரும் பயன்படுத்தக்கூடிய திரைகள்."),
    ("software", "தனிப்பயன் மென்பொருளும் SaaS-உம்",
     "உங்கள் வணிகம் உண்மையில் இயங்கும் விதத்தைச் சுற்றி வடிவமைக்கப்பட்ட மென்பொருள்."),
    ("business-systems", "CRM, ERP, HRMS, LMS மற்றும் பில்லிங்",
     "ஆறு தனித்தனி எக்செல் கோப்புகளுக்குப் பதிலாக ஒரே அமைப்பு."),
    ("marketing", "டிஜிட்டல் மார்க்கெட்டிங்கும் SEO-வும்",
     "ஏற்கெனவே உங்களைத் தேடிக் கொண்டிருப்பவர்களுக்கு நீங்கள் கிடைக்க வேண்டும்."),
    ("ai-automation", "AI மற்றும் வணிகத் தானியங்கிமயமாக்கல்",
     "நாளின் திரும்பத் திரும்ப வரும் பாதி வேலையை மென்பொருளிடம் ஒப்படையுங்கள்."),
    ("support", "பிராண்டிங், IT மற்றும் கிளவுட் ஆதரவு",
     "ஏதாவது பழுதடைந்தால் பதில் சொல்ல ஒருவர் இருப்பார்."),
]


def ta_services_index():
    """The eight services as an index, the structure the English page uses.

    The detail pages are English because those are the ones that exist, and the
    link says so in Tamil instead of dropping the reader into another language
    without warning.
    """
    rows = ""
    for i, (slug, title, outcome) in enumerate(TA_SERVICES, start=1):
        rows += index_row(i, title, outcome,
                          href="/services-%s" % slug, go="ஆங்கிலத்தில் விவரம்")
    return '        <div class="index-list">\n%s        </div>\n' % rows


def ta_final_cta(heading, sub):
    return """    <section class="section-divider">
      <div class="container">
        <div class="cta-box reveal-on-scroll">
          <span class="eyebrow">அடுத்த படி</span>
          <h2>{heading}</h2>
          <p class="mb-6">{sub}</p>
          <div class="btn-group btn-group-center">
            <a href="{start}" class="btn btn-accent btn-lg">{start_label}</a>
            <a href="{whatsapp}" class="btn btn-whatsapp btn-lg" data-whatsapp>வாட்ஸ்அப்பில் பேசுங்கள்</a>
          </div>
        </div>
      </div>
    </section>
""".format(heading=heading, sub=sub, start=TA_START_URL,
           start_label=TA_START_LABEL, whatsapp=WHATSAPP_URL)


def ta_page_header(eyebrow, h1, lead, extra=""):
    return """    <section class="page-header{bare}">
      <div class="container">
        <span class="eyebrow">{eyebrow}</span>
        <h1>{h1}</h1>
        <p class="lead">{lead}</p>
{extra}      </div>
    </section>
""".format(eyebrow=eyebrow, h1=h1, lead=lead, extra=extra,
           bare="" if extra.strip() else " page-header-bare")


def ta_rows(pairs):
    return "".join(index_row(n, t, b) for n, (t, b) in enumerate(pairs, start=1))


def ta_schema(page_slug, name, description):
    return [ORG_JSONLD, json.dumps({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "url": "%s/%s" % (DOMAIN, page_slug),
        "name": unescape(name),
        "description": unescape(description),
        "inLanguage": "ta-IN",
    }, ensure_ascii=False, indent=2)]


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
def build_ta_home():
    title = "ஈரோட்டில் இணையதளம் மற்றும் மென்பொருள் உருவாக்கம் | MUCO LABS"
    description = ("ஈரோட்டில் நிறுவனர் நடத்தும் நிறுவனம். வணிக இணையதளங்கள், தனிப்பயன் "
                   "மென்பொருள், மொபைல் செயலிகள். எழுத்துப்பூர்வமான வேலை விவரம், "
                   "இறுதியில் குறியீடு உங்களுடையது.")

    body = """    <section class="section-flush">
      <div class="container">
        <div class="hero-split">
          <div>
            <span class="eyebrow">நிறுவனர் நடத்தும் நிறுவனம் &middot; ஈரோடு, தமிழ்நாடு</span>
            <h1>வணிகம் வளர உதவும் இணையதளமும்
              <span class="accent-serif">மென்பொருளும்</span></h1>
            <p class="lead">ஈரோட்டிலிருந்து வணிக இணையதளங்கள், தனிப்பயன் மென்பொருள், மொபைல்
              செயலிகள் மற்றும் தானியங்கி அமைப்புகள். வேலையைச் செய்பவரிடமே நேரடியாகப்
              பேசுங்கள், தொடங்கும் முன்பே வேலை விவரம் எழுத்தில் ஒப்புக்கொள்ளப்படும்.</p>

            <div class="btn-group">
              <a href="{start}" class="btn btn-accent btn-lg">{start_label}</a>
              <a href="/work" class="btn btn-secondary btn-lg">எங்கள் வேலையைப் பாருங்கள்</a>
            </div>
          </div>

          <dl class="hero-facts">
            <div class="hero-fact"><dt>விலை எப்படி முடிவாகிறது</dt>
              <dd>எதுவும் தொடங்கும் முன் எழுத்துப்பூர்வமான வேலை விவரம். பின்னால் வரும்
                எதிர்பாராத கட்டணம் இல்லை.</dd></div>
            <div class="hero-fact"><dt>யாரிடம் பேசுவீர்கள்</dt>
              <dd>நிறுவனரிடமே. செய்தியைக் கடத்தும் கணக்கு மேலாளர் இங்கே இல்லை.</dd></div>
            <div class="hero-fact"><dt>உங்களுக்கு எது சொந்தம்</dt>
              <dd>இறுதிக் கட்டணத்தில் மூலக் குறியீடு, வடிவமைப்பு, எல்லாக் கணக்குகளும்.</dd></div>
            <div class="hero-fact"><dt>எங்கே வேலை செய்கிறோம்</dt>
              <dd>ஈரோடு மற்றும் தமிழ்நாட்டில் நேரில், இந்தியா முழுவதும் தொலைவிலிருந்து.</dd></div>
          </dl>
        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">நாங்கள் செய்வது</span>
          <h2>வணிக முடிவிலிருந்து தொடங்குகிறோம், தொழில்நுட்பத்திலிருந்து அல்ல</h2>
          <p class="sub">ஒவ்வொரு சேவையும் உங்கள் வணிகத்தில் என்ன மாறும் என்பதைச் சொல்கிறது.
            விரிவான விளக்கப் பக்கங்கள் தற்போது ஆங்கிலத்தில் மட்டுமே உள்ளன.</p>
        </div>
{services}      </div>
    </section>

    <section class="section-divider">
      <div class="container container-narrow">
        <div class="section-head">
          <span class="eyebrow">நாங்கள் சொல்லாதவை</span>
          <h2>வெளிப்படையான பதில்கள்</h2>
        </div>
        <div class="index-list">
{promises}        </div>
      </div>
    </section>

{cta}""".format(
        start=TA_START_URL,
        start_label=TA_START_LABEL,
        services=ta_services_index(),
        promises=ta_rows([
            ("தரவரிசை உத்தரவாதம் இல்லை",
             "கூகுளின் முடிவுகளை யாரும் கட்டுப்படுத்த முடியாது. தரவரிசைக்கு வழிவகுக்கும் "
             "தொழில்நுட்ப மற்றும் உள்ளடக்க வேலையை நாங்கள் செய்வோம், நடந்ததை அப்படியே "
             "அறிக்கையாகத் தருவோம்."),
            ("கற்பனையான எண்கள் இல்லை",
             "இட்டுக்கட்டிய வாடிக்கையாளர் எண்ணிக்கை, சதவீதம் அல்லது கடையில் வாங்கிய "
             "கருத்துகள் இந்த இணையதளத்தில் எங்கும் இல்லை. உண்மையான முடிவுகள் வெளியிடத் "
             "தயாராகும்போது, வாடிக்கையாளரின் அனுமதியுடன் வெளியிடுவோம்."),
            ("மறைக்கப்பட்ட வேலை இல்லை",
             "மூன்றாம் தரப்பு சந்தாக்கள், பணம் செலுத்தும் நுழைவாயில் கட்டணம், டொமைன் "
             "புதுப்பித்தல், GST மற்றும் தொடர் மார்க்கெட்டிங் ஒவ்வொரு மதிப்பீட்டிலும் "
             "தனித்தனியாகக் குறிப்பிடப்படும்."),
            ("பூட்டி வைப்பது இல்லை",
             "குறியீடு, வடிவமைப்பு மற்றும் கணக்குகள் உங்களுடையவை. வேறு குழுவிடம் செல்ல "
             "முடிவு செய்தால், எல்லாம் சுத்தமாகக் கைமாறும்."),
        ]),
        cta=ta_final_cta(
            "உங்களுக்கு என்ன வேண்டும் என்று சொல்லுங்கள்",
            "பிரச்சினையை விவரியுங்கள். கேள்விகள், அணுகுமுறை மற்றும் எழுத்துப்பூர்வமான "
            "வேலை விவரத்துடன் திரும்பி வருவோம். அந்த விவரத்துக்குக் கட்டணம் இல்லை."),
    )

    return ta_render("ta/index.html", title, description, body, "/ta",
                     schema_blocks=ta_schema("ta", title, description))


def build_ta_services():
    title = "சேவைகள் | MUCO LABS, ஈரோடு"
    description = ("இணையதளம், மொபைல் செயலி, தனிப்பயன் மென்பொருள், CRM, ERP, SEO மற்றும் "
                   "AI தானியங்கிமயமாக்கல். ஈரோட்டிலிருந்து, எழுத்துப்பூர்வமான வேலை "
                   "விவரத்துடன்.")

    body = ta_page_header(
        "சேவைகள்",
        "எட்டு சேவைகள், ஒவ்வொன்றும் ஒரு வணிக முடிவு",
        "தொழில்நுட்பப் பட்டியலாக அல்லாமல், உங்கள் வணிகத்தில் என்ன மாறும் என்பதாக "
        "எழுதப்பட்டுள்ளது. எதுவும் தொடங்கும் முன் வேலை விவரம் எழுத்தில் ஒப்புக்கொள்ளப்படும்.",
        extra='        <div class="btn-group mt-5"><a class="btn btn-accent" href="%s">%s</a>'
              '<a class="btn btn-whatsapp" href="%s" data-whatsapp>வாட்ஸ்அப்பில் பேசுங்கள்</a></div>\n'
              % (TA_START_URL, TA_START_LABEL, WHATSAPP_URL),
    ) + """    <section class="section-flush">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">என்ன கட்டுகிறோம்</span>
          <h2>ஒவ்வொரு சேவையும், அது தீர்க்கும் பிரச்சினையும்</h2>
        </div>
{services}      </div>
    </section>

    <section class="band-deep">
      <div class="container container-narrow">
        <div class="section-head">
          <span class="eyebrow">எப்படி வேலை நடக்கிறது</span>
          <h2>மதிப்பீட்டிலிருந்து ஒப்படைப்பு வரை</h2>
        </div>
        <div class="index-list">
{process}        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container container-narrow">
        <p class="note">ஒவ்வொரு சேவைக்கும் விரிவான பக்கம் &mdash; உள்ளடக்கம், விலை அமைப்பு,
          அடிக்கடி கேட்கப்படும் கேள்விகள் &mdash; தற்போது ஆங்கிலத்தில் உள்ளது. ஆனால் முடிவு
          எடுப்பதற்கு ஆங்கிலம் தேவையில்லை: வாட்ஸ்அப்பிலோ தொலைபேசியிலோ தமிழில் பேசுங்கள்.</p>
      </div>
    </section>

{cta}""".format(
        services=ta_services_index(),
        process=ta_rows([
            ("பேசுதல்",
             "நீங்கள் தீர்க்க விரும்பும் வணிகப் பிரச்சினையைச் சொல்கிறீர்கள். நாங்கள் "
             "கேள்விகள் கேட்கிறோம். இதற்குக் கட்டணம் இல்லை."),
            ("எழுத்துப்பூர்வமான வேலை விவரம்",
             "என்ன அடங்கும், என்ன அடங்காது, எத்தனை கட்டங்கள், என்ன விலை &mdash; எல்லாம் "
             "எழுத்தில். தெளிவின்மை பின்னால் எப்போதும் தகராறாக மாறுகிறது."),
            ("உருவாக்கம்",
             "வேலை நடக்கும்போது நிலை உங்களுக்குத் தெரியும். ஒரு கட்டம் தாமதமாகப் போகிறது "
             "என்றால், நீங்கள் கவனிக்கும் முன்பே நாங்கள் சொல்வோம்."),
            ("சோதனையும் ஒப்படைப்பும்",
             "நிஜ சாதனங்களில் சோதனை. இறுதிக் கட்டணத்தில் குறியீடு, வடிவமைப்பு மற்றும் "
             "கணக்குகள் உங்கள் பெயருக்கு மாறும்."),
            ("பராமரிப்பு, தேவைப்பட்டால்",
             "அது தனி ஒப்பந்தம். வேண்டாம் என்றால் வேண்டாம் &mdash; இணையதளம் உங்களுடையது, "
             "வேறு யாரிடமும் கொண்டு செல்லலாம்."),
        ]),
        cta=ta_final_cta(
            "எந்தச் சேவை தேவை என்று உறுதியாகத் தெரியவில்லையா?",
            "பிரச்சினையைச் சொன்னால் போதும். எந்த வேலை உண்மையில் தேவை என்பதை நாங்கள் "
            "சொல்கிறோம் &mdash; தேவையில்லாதது எது என்பதையும் சொல்வோம்."),
    )

    return ta_render("ta/services.html", title, description, body, "/ta/services",
                     schema_blocks=ta_schema("ta/services", title, description))


def build_ta_about():
    title = "எங்களைப் பற்றி | MUCO LABS, ஈரோடு"
    description = ("MUCO LABS ஈரோட்டைச் சேர்ந்த, நிறுவனர் நடத்தும் மென்பொருள் நிறுவனம். "
                   "நாங்கள் எப்படி வேலை செய்கிறோம், என்ன உறுதியளிக்கிறோம், என்ன "
                   "உறுதியளிப்பதில்லை என்பது இங்கே.")

    body = ta_page_header(
        "எங்களைப் பற்றி",
        "நாங்கள் சிறியவர்கள், அதை மறைக்கவில்லை",
        "MUCO LABS ஈரோட்டிலிருந்து நிறுவனர் நடத்தும் நிறுவனம். பெரிய குழு இருப்பதாகவோ "
        "நூற்றுக்கணக்கான வாடிக்கையாளர்கள் இருப்பதாகவோ நாங்கள் சொல்லப் போவதில்லை. "
        "உங்களுக்குக் கிடைப்பது நேரடித் தொடர்பும், எழுத்தில் ஒப்புக்கொண்ட வேலையும்.",
    ) + """    <section class="section-flush">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">நாங்கள் எப்படி வேலை செய்கிறோம்</span>
          <h2>ஆறு உறுதிமொழிகள், ஒவ்வொன்றும் எங்களுக்கு என்ன விலை</h2>
        </div>
        <div class="index-list">
{values}        </div>
      </div>
    </section>

    <section class="band-deep">
      <div class="container container-narrow">
        <div class="section-head">
          <span class="eyebrow">வெளிப்படையான விவரங்கள்</span>
          <h2>வேலை ஒப்பந்தம்</h2>
        </div>
        <div class="table-wrap mt-5">
          <table>
            <caption class="visually-hidden">MUCO LABS வாடிக்கையாளர்களுடன் எப்படி வேலை செய்கிறது</caption>
            <tbody>
              <tr><th scope="row">எங்கே இருக்கிறோம்</th><td>ஈரோடு, தமிழ்நாடு, இந்தியா</td></tr>
              <tr><th scope="row">நேரில் வேலை</th><td>ஈரோடு, பள்ளிப்பாளையம், நாமக்கல், கோயம்புத்தூர், திருப்பூர், கரூர்</td></tr>
              <tr><th scope="row">தொலைவிலிருந்து</th><td>இந்தியா முழுவதும், வெளிநாட்டு வாடிக்கையாளர்களுக்கும்</td></tr>
              <tr><th scope="row">பேசும் மொழிகள்</th><td>தமிழ் மற்றும் ஆங்கிலம்</td></tr>
              <tr><th scope="row">உரிமை</th><td>இறுதிக் கட்டணத்தில் குறியீடு, வடிவமைப்பு, கணக்குகள் உங்களுடையவை</td></tr>
              <tr><th scope="row">தொடர்பு</th><td><a href="{whatsapp}" data-whatsapp>வாட்ஸ்அப்</a> &middot; <a href="{call}">{phone}</a> &middot; <a href="mailto:{email}">{email}</a></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

{cta}""".format(
        whatsapp=WHATSAPP_URL, call=CALL_URL, phone=PHONE, email=EMAIL,
        values=ta_rows([
            ("நாங்கள் பயன்படுத்துவதையே கட்டுகிறோம்",
             "Meyra, Ooruva, InkNexis &mdash; இவை எங்கள் சொந்த உருவாக்கங்கள், எங்கள் சொந்தத் "
             "தேவைகளுக்கு எதிராக இயங்குகின்றன. அங்கே கற்ற பாடங்கள் நேரடியாக வாடிக்கையாளர் "
             "வேலைக்குச் செல்கின்றன."),
            ("கட்டுபவரிடமே பேசுவீர்கள்",
             "உங்கள் தேவையை நீங்கள் சந்திக்காத ஒருவரிடம் கடத்தும் கணக்கு மேலாளர் இங்கே "
             "இல்லை. உங்கள் செய்திக்குப் பதில் சொல்பவரே தொழில்நுட்ப வேலைக்குப் "
             "பொறுப்பானவர்."),
            ("குறியீட்டுக்கு முன் எழுத்துப்பூர்வமான விவரம்",
             "என்ன அடங்கும், என்ன அடங்காது, கட்டங்கள், விலை &mdash; ஒவ்வொரு திட்டமும் "
             "இதிலிருந்தே தொடங்குகிறது."),
            ("நிலை எப்போதும் உண்மையாக",
             "ஒரு கட்டம் தாமதமாகப் போகிறது என்றால், நீங்கள் கவனிக்கும் முன்பே "
             "எங்களிடமிருந்து அது தெரியும். எங்கள் சொந்தத் திட்டப் பட்டியலும் அதே "
             "நேர்மையுடன் குறிக்கப்பட்டுள்ளது &mdash; வரைபடம் தயாரிப்பு அல்ல."),
            ("எல்லாம் உங்களுக்குச் சொந்தம்",
             "இறுதிக் கட்டணத்தில் குறியீடு, வடிவமைப்பு, கணக்குகள் உங்களுடையவை. தனியுரிமக் "
             "கருவி இல்லை, திரும்பத் திரும்பப் புதுப்பிக்க வேண்டிய உரிமம் இல்லை, பிடித்து "
             "வைக்கும் ஹோஸ்டிங் இல்லை."),
            ("ஈரோட்டில் வேர்",
             "ஈரோடு, பள்ளிப்பாளையம், நாமக்கல், கோயம்புத்தூர், திருப்பூர், கரூர் &mdash; "
             "இங்கெல்லாம் நேரில் வேலை செய்கிறோம். உள்ளூர் வணிகங்களுக்கு நேரில் சந்திக்கக்கூடிய "
             "குழு கிடைக்கிறது."),
        ]),
        cta=ta_final_cta(
            "முதலில் பேசிப் பார்க்கலாமா?",
            "எந்த வேலையையும் ஒப்புக்கொள்ளும் முன், பிரச்சினை என்ன என்பதைப் புரிந்துகொள்ள "
            "ஒரு உரையாடல். அதற்குக் கட்டணம் இல்லை."),
    )

    return ta_render("ta/about.html", title, description, body, "/ta/about",
                     schema_blocks=ta_schema("ta/about", title, description))


def build_ta_contact():
    title = "தொடர்பு | MUCO LABS, ஈரோடு"
    description = ("ஈரோட்டில் MUCO LABS-ஐத் தொடர்பு கொள்ளுங்கள். வாட்ஸ்அப், தொலைபேசி "
                   "அல்லது படிவம். கணக்கு உருவாக்கத் தேவையில்லை. தமிழில் பேசலாம்.")

    body = ta_page_header(
        "நிறுவனரிடம் பேசுங்கள்",
        "உங்களுக்கு என்ன கட்ட வேண்டும் என்று சொல்லுங்கள்",
        "கணக்கு உருவாக்க வேண்டாம், உள்நுழைவு இல்லை. வேலையைச் செய்யப்போகும் நபரிடமிருந்தே "
        "பதில் வரும். தமிழில் பேசுவதில் எந்தப் பிரச்சினையும் இல்லை.",
    ) + """    <section class="section-flush" id="start-project">
      <div class="container container-narrow">
        <div class="section-head">
          <span class="eyebrow">உடனடித் தொடர்பு</span>
          <h2>வேகமான வழி: வாட்ஸ்அப் அல்லது தொலைபேசி</h2>
          <p class="sub">தமிழில் பேசுங்கள். படிவத்தை விட இது வேகமானது, இதற்கு எந்தக்
            கணக்கும் தேவையில்லை.</p>
        </div>
        <div class="btn-group">
          <a href="{whatsapp}" class="btn btn-whatsapp btn-lg" data-whatsapp>வாட்ஸ்அப்பில் பேசுங்கள்</a>
          <a href="{call}" class="btn btn-accent btn-lg">{phone} &mdash; அழைக்கவும்</a>
          <a href="mailto:{email}" class="btn btn-secondary btn-lg">மின்னஞ்சல்</a>
        </div>
      </div>
    </section>

    <section class="section-divider">
      <div class="container container-narrow">
        <div class="section-head">
          <span class="eyebrow">எழுதி அனுப்ப விரும்பினால்</span>
          <h2>விசாரணைப் படிவம்</h2>
          <p class="sub">படிவத்தின் புலப் பெயர்கள் தற்போது ஆங்கிலத்தில் உள்ளன, ஆனால்
            நீங்கள் தமிழில் எழுதி அனுப்பலாம் &mdash; பதிலும் தமிழிலேயே வரும்.</p>
        </div>
        <div class="btn-group">
          <a href="/contact#start-project" class="btn btn-secondary btn-lg">விசாரணைப் படிவத்திற்குச் செல்லவும்</a>
        </div>
      </div>
    </section>

    <section class="band-deep">
      <div class="container container-narrow">
        <div class="section-head">
          <span class="eyebrow">அனுப்பிய பிறகு</span>
          <h2>உங்கள் விசாரணைக்கு என்ன நடக்கும்?</h2>
        </div>
        <div class="index-list">
{steps}        </div>
      </div>
    </section>

{cta}""".format(
        whatsapp=WHATSAPP_URL, call=CALL_URL, phone=PHONE, email=EMAIL,
        steps=ta_rows([
            ("நாங்கள் படிக்கிறோம்",
             "உங்கள் தேவையைப் படித்து, அதன் பின்னால் இருக்கும் வணிகப் பிரச்சினை என்ன "
             "என்பதைத் தெளிவுபடுத்திக் கொள்கிறோம்."),
            ("தேவைப்பட்டால் ஒரு உரையாடல்",
             "பயனுள்ளது என்றால் ஒரு விவரக் கலந்துரையாடல். பிறகு எழுத்துப்பூர்வமான வேலை "
             "விவரமும் விலையும் தயாரிக்கிறோம்."),
            ("முடிவு உங்களுடையது",
             "தொடரலாமா வேண்டாமா என்பதை நீங்கள் முடிவு செய்கிறீர்கள். வேலை விவரம் "
             "தயாரிப்பதற்குக் கட்டணம் இல்லை, கட்டாயமும் இல்லை."),
        ]),
        cta=ta_final_cta(
            "தயாரா? ஒரு செய்தி போதும்",
            "என்ன கட்ட வேண்டும், எதற்காக &mdash; இரண்டு வரி எழுதினால் கூடப் போதும்."),
    )

    return ta_render("ta/contact.html", title, description, body, "/ta/contact",
                     schema_blocks=ta_schema("ta/contact", title, description))


TAMIL_PAGES = [
    ("ta/index.html", build_ta_home),
    ("ta/services.html", build_ta_services),
    ("ta/about.html", build_ta_about),
    ("ta/contact.html", build_ta_contact),
]
