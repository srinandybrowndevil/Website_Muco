#!/usr/bin/env python3
"""
Static site generator for mucolabs.com.

The site is plain HTML served by GitHub Pages. This script exists only so the
header, footer, metadata and project data live in one place instead of being
copy-pasted into every page (which is how the old nav drifted out of sync).

    python3 build.py

No dependencies. Writes the .html files, robots.txt and sitemap.xml into the
repository root. Edit this file, re-run it, commit the generated HTML.
"""

import os
import re
from datetime import date

ROOT = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Company facts. Nothing on the site may claim anything not stated here.
# ---------------------------------------------------------------------------
BRAND = "MUCO LABS"
TAGLINE = "Your Vision, Our Technology."
DOMAIN = "https://mucolabs.com"
PHONE = "+91 6381809844"
PHONE_TEL = "+916381809844"
WHATSAPP = "916381809844"
EMAIL = "mucolabs2026@gmail.com"
INSTAGRAM = "https://www.instagram.com/muco_labs/"
FOUNDER = "Srinivash Mahalingam"
CITY = "Erode"
REGION = "Tamil Nadu"
HOURS = "Monday to Saturday, 9 AM to 7 PM"
MARKETS = ["Erode", "Pallipalayam", "Namakkal", "Coimbatore", "Tiruppur", "Karur"]
GEO_LAT = "11.3410"          # Erode, Tamil Nadu
GEO_LON = "77.7172"
DESCRIPTION = (
    "MUCO LABS is a founder-led software studio in Erode, Tamil Nadu. It builds websites, "
    "mobile apps, custom software and SaaS, business systems such as CRM, ERP, HRMS, LMS and "
    "billing, digital marketing and SEO, and AI and business automation for businesses across "
    "Tamil Nadu. Every project is quoted from a written scope, and the client owns the source "
    "code and accounts on final payment."
)
SERVICE_CATALOG = [
    ("Website design and development", "Business websites, landing pages, e-commerce and customer portals."),
    ("Mobile app development", "Android and iOS applications taken through store submission."),
    ("UI/UX and product design", "User flows, interface design and a reusable design system."),
    ("Custom software and SaaS", "Multi-tenant systems, role-based access, portals, reporting and integrations."),
    ("CRM, ERP, HRMS, LMS and billing systems", "Bookings, inventory, GST-aware invoicing, attendance and dashboards."),
    ("Digital marketing and SEO", "Local SEO, technical SEO, conversion optimisation and honest reporting."),
    ("AI and business automation", "Lead routing, internal assistants, data operations and process automation."),
    ("Branding, IT and cloud support", "Identity design, uptime monitoring, backups, security updates and hosting."),
]
# Real revision dates, not build timestamps. A sitemap <lastmod> and a legal
# "last updated" both claim the content changed on that day, so stamping
# date.today() on every build told crawlers every page changed today and put a
# false revision date on the legal pages. Bump these by hand when the content
# actually changes; PAGE_REVISED overrides SITE_REVISED for a single page.
SITE_REVISED = "2026-09-05"   # last substantive content change anywhere on the site
LEGAL_REVISED = "2026-09-05"  # privacy, terms and refund wording
PAGE_REVISED = {}             # e.g. {"work.html": "2026-10-02"} — key "" is the home page

# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
# Paste the GA4 Measurement ID here (it looks like "G-XXXXXXXXXX") and run
# `python3 build.py`. While this is empty, no analytics tag is emitted, the
# page makes no third-party request, and the privacy policy says so — all of
# that flips automatically when you fill it in. The event map lives in
# analytics.js, which is a separate file because our own CSP blocks the inline
# gtag snippet.
GA_MEASUREMENT_ID = ""


# ---------------------------------------------------------------------------
# Clean URLs
# ---------------------------------------------------------------------------
# The site is hosted on Vercel with "cleanUrls": true (see vercel.json), which
# serves about.html at /about and 308-redirects /about.html to /about. The files
# on disk keep their .html names; only the URLs we publish change. Emitting
# .html links under that setting would put a redirect hop in front of every
# internal link, canonical tag and sitemap entry, so every URL is rewritten
# once here, at the point each file is written.
_REL_HTML = re.compile(
    r'href="(?!https?:|//|mailto:|tel:|#)([^"#?]+)\.html([?#][^"]*)?"')
_ABS_HTML = re.compile(re.escape(DOMAIN) + r'/([A-Za-z0-9_-]+)\.html(?![A-Za-z0-9._-])')


def _rel(m):
    """m: (path without .html, optional ?query or #fragment)."""
    path, tail = m.group(1), m.group(2) or ""
    root = "/" if path == "index" else "/" + path
    return 'href="%s%s"' % (root, tail)


def clean_urls(text):
    """Rewrite internal .html URLs to their extensionless form."""
    text = _REL_HTML.sub(_rel, text)
    text = _ABS_HTML.sub(
        lambda m: DOMAIN + ("/" if m.group(1) == "index" else "/" + m.group(1)), text)
    return text


def wa(text):
    """WhatsApp deep link with a prefilled, context-carrying message."""
    from urllib.parse import quote

    return "https://wa.me/%s?text=%s" % (WHATSAPP, quote(text))


# ---------------------------------------------------------------------------
# Icons (inline, tree-shaken by hand — no icon library ships to the browser)
# ---------------------------------------------------------------------------
def icon(paths, size=20):
    return (
        '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>'
        % (size, size, paths)
    )


ICONS = {
    "web": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M6 6.5h.01M9 6.5h.01"/>',
    "mobile": '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18.5h2"/>',
    "design": '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
    "saas": '<path d="M20 17.6A4.5 4.5 0 0017.5 9h-1.3A7 7 0 103 16.3"/><path d="M12 12v9M8.5 17.5L12 21l3.5-3.5"/>',
    "systems": '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    "seo": '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/><path d="M8 12l2.2 2.2L14.5 9"/>',
    "ai": '<path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2"/><circle cx="12" cy="12" r="4"/>',
    "support": '<path d="M4 15v-3a8 8 0 0116 0v3"/><path d="M4 15a2 2 0 002 2h1v-5H6a2 2 0 00-2 2zM20 15a2 2 0 01-2 2h-1v-5h1a2 2 0 012 2z"/><path d="M17 17v1a3 3 0 01-3 3h-2"/>',
    "check": '<path d="M20 6L9 17l-5-5"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    "code": '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
    "pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z"/><circle cx="12" cy="10" r="3"/>',
    "user": '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "whatsapp_solid": None,
}

WA_SVG = (
    '<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">'
    '<path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 '
    "11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 "
    "11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 "
    "5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 "
    "9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 "
    "1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 "
    '0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>'
)

IG_SVG = (
    '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">'
    '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 '
    "4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 "
    "0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 "
    "1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 "
    "2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 "
    "1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 "
    "0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 "
    "0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 "
    "10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 "
    '0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>'
)

LOGO_SVG = """<svg class="logo-mark" viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="lg{k}a" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#0f172a"/><stop offset="55%" stop-color="#1e293b"/><stop offset="100%" stop-color="#475569"/>
            </linearGradient>
            <linearGradient id="lg{k}b" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0284c7"/>
            </linearGradient>
            <linearGradient id="lg{k}c" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#94a3b8"/>
            </linearGradient>
          </defs>
          <g transform="translate(10, 10)">
            <path d="M12 66 V26 L26 16 V56 Z" fill="url(#lg{k}a)"/>
            <path d="M12 26 L26 16 L38 24 L24 34 Z" fill="url(#lg{k}c)"/>
            <path d="M24 34 L38 24 L52 48 L38 58 Z" fill="url(#lg{k}b)"/>
            <path d="M52 48 L42 32 L56 22 L66 38 Z" fill="url(#lg{k}a)"/>
            <path d="M56 22 L70 12 L70 52 L56 62 Z" fill="url(#lg{k}b)"/>
            <path d="M42 62 L56 52 L56 68 L42 78 Z" fill="url(#lg{k}a)"/>
          </g>
        </svg>"""

# ---------------------------------------------------------------------------
# Navigation
# ---------------------------------------------------------------------------
NAV = [
    ("index.html", "Home"),
    ("services.html", "Services"),
    ("work.html", "Work"),
    ("pricing.html", "Pricing"),
    ("about.html", "About"),
    ("contact.html", "Contact"),
]

FOOTER_COLS = [
    ("Company", [("about.html", "About"), ("work.html", "Work"), ("careers.html", "Careers"),
                 ("contact.html", "Contact")]),
    ("Explore", [("services.html", "Services"), ("pricing.html", "Pricing"), ("faq.html", "FAQ"),
                 ("maintenance.html", "Maintenance"),
                 ("services-websites.html", "Website development"),
                 ("services-software.html", "Custom software"),
                 ("website-development-erode.html", "Websites in Erode")]),
]

LEGAL_LINKS = [
    ("privacy.html", "Privacy Policy"),
    ("terms.html", "Terms"),
    ("refund.html", "Refund &amp; Cancellation"),
]


def nav_html(current, mobile=False):
    out = []
    for href, label in NAV:
        cur = ' aria-current="page"' if href == current else ""
        if mobile:
            out.append('      <a href="%s"%s>%s</a>' % (href, cur, label))
        else:
            out.append('          <li><a href="%s"%s>%s</a></li>' % (href, cur, label))
    return "\n".join(out)


def header_html(current, key):
    return """  <a class="skip-link" href="#main">Skip to content</a>

  <div class="ambient-glow" aria-hidden="true"></div>

  <header>
    <div class="container">
      <nav aria-label="Primary">
        <a href="index.html" class="logo-link" aria-label="{brand} home">
          {logo}
          <span class="logo-text">{brand}<span class="logo-badge">{city}</span></span>
        </a>

        <ul class="nav-links">
{desktop}
        </ul>

        <div class="nav-actions">
          <a href="contact.html" class="btn btn-accent btn-sm"><span class="cta-long">Start a Project</span><span class="cta-short">Start</span></a>
          <button id="menu-toggle" class="menu-toggle" aria-label="Open navigation menu"
                  aria-expanded="false" aria-controls="mobile-menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            <span class="menu-toggle-label">Menu</span>
          </button>
        </div>
      </nav>
    </div>

    <div id="mobile-menu" class="mobile-menu">
{mobile}
      <a href="faq.html">FAQ</a>
      <a href="careers.html">Careers</a>
      <a href="contact.html" class="btn btn-accent">Start a Project</a>
      <a href="{wa}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp">WhatsApp {phone}</a>
    </div>
  </header>
""".format(
        brand=BRAND,
        city=CITY,
        logo=LOGO_SVG.replace("{k}", key),
        desktop=nav_html(current),
        mobile=nav_html(current, mobile=True),
        wa=wa("Hi MUCO LABS, I would like to discuss a project."),
        phone=PHONE,
    )


def footer_html():
    cols = []
    for title, links in FOOTER_COLS:
        items = "\n".join(
            '            <li><a href="%s">%s</a></li>' % (h, l) for h, l in links
        )
        cols.append(
            """        <nav class="footer-col" aria-label="%s">
          <p class="footer-col-label">%s</p>
          <ul>
%s
          </ul>
        </nav>"""
            % (title, title, items)
        )

    legal = " · ".join('<a href="%s">%s</a>' % (h, l) for h, l in LEGAL_LINKS)

    return """  <footer>
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col footer-brand">
          <strong style="font-size:16px;color:var(--text);">{brand}</strong>
          <p>{tagline} Software, AI systems and automation built for businesses in {city} and across {region}.</p>
          <div class="btn-group" style="margin-top:18px;">
            <a href="{ig}" target="_blank" rel="noopener noreferrer" class="btn btn-instagram btn-sm">{ig_svg} @muco_labs</a>
            <a href="{wa}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-sm">WhatsApp</a>
          </div>
        </div>

{cols}

        <div class="footer-col">
          <p class="footer-col-label">Contact</p>
          <ul>
            <li><a href="tel:{tel}">{phone}</a></li>
            <li><a href="mailto:{email}">{email}</a></li>
            <li><span style="font-size:14px;color:var(--text-muted);">{city}, {region}, India</span></li>
            <li><span style="font-size:14px;color:var(--text-muted);">{hours}</span></li>
          </ul>
        </div>
      </div>

      <div class="footer-copy">
        <span>&copy; {year} {brand}. All rights reserved.</span>
        <span>{legal}</span>
      </div>
    </div>
  </footer>

  <script src="main.js" defer></script>
</body>
</html>
""".format(
        brand=BRAND,
        tagline=TAGLINE,
        city=CITY,
        region=REGION,
        ig=INSTAGRAM,
        ig_svg=IG_SVG,
        wa=wa("Hi MUCO LABS"),
        cols="\n\n".join(cols),
        tel=PHONE_TEL,
        phone=PHONE,
        email=EMAIL,
        hours=HOURS,
        year=date.today().year,
        legal=legal,
    )


# ---------------------------------------------------------------------------
# Structured data
# ---------------------------------------------------------------------------
ORG_JSONLD = """{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "%(domain)s/#organization",
  "name": "%(brand)s",
  "alternateName": "MUCO Labs",
  "slogan": "%(tagline)s",
  "description": "%(description)s",
  "url": "%(domain)s/",
  "image": "%(domain)s/assets/og-image.jpg",
  "logo": "%(domain)s/logo-full.svg",
  "telephone": "%(phone)s",
  "email": "%(email)s",
  "founder": { "@type": "Person", "name": "%(founder)s" },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "%(city)s",
    "addressRegion": "%(region)s",
    "addressCountry": "IN"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": "%(lat)s", "longitude": "%(lon)s" },
  "areaServed": [%(areas)s],
  "sameAs": ["%(ig)s"],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Services",
    "itemListElement": [%(catalog)s]
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    "opens": "09:00",
    "closes": "19:00"
  },
  "knowsAbout": ["Website development","Mobile app development","Custom software","SaaS","AI automation","Digital marketing","SEO"]
}""" % {
    "domain": DOMAIN,
    "brand": BRAND,
    "tagline": TAGLINE,
    "phone": PHONE,
    "email": EMAIL,
    "founder": FOUNDER,
    "city": CITY,
    "region": REGION,
    "areas": ",".join('{"@type":"City","name":"%s"}' % m for m in MARKETS),
    "ig": INSTAGRAM,
    "description": DESCRIPTION.replace('"', "'"),
    "lat": GEO_LAT,
    "lon": GEO_LON,
    "catalog": ",".join(
        '{"@type":"Offer","itemOffered":{"@type":"Service","name":"%s","description":"%s"}}' % (n, d)
        for n, d in SERVICE_CATALOG
    ),
}

WEBSITE_JSONLD = """{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "%s/#website",
  "url": "%s/",
  "name": "%s",
  "publisher": { "@id": "%s/#organization" },
  "inLanguage": "en-IN"
}""" % (DOMAIN, DOMAIN, BRAND, DOMAIN)


def breadcrumbs(items):
    """items: [(name, path), ...] — path '' for home."""
    els = []
    for i, (name, path) in enumerate(items, 1):
        els.append(
            '{"@type":"ListItem","position":%d,"name":"%s","item":"%s/%s"}' % (i, name, DOMAIN, path)
        )
    return (
        '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[%s]}'
        % ",".join(els)
    )


def service_jsonld(name, description, slug):
    """One Service entity per service line. Answer engines use these to say what
    a business actually does, so the wording has to match the page."""
    return """{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "%s",
  "description": "%s",
  "serviceType": "%s",
  "provider": { "@id": "%s/#organization" },
  "areaServed": [%s],
  "url": "%s/services.html#%s",
  "availableChannel": {
    "@type": "ServiceChannel",
    "serviceUrl": "%s/contact.html",
    "servicePhone": "%s"
  }
}""" % (name, description.replace('"', "'"), name, DOMAIN,
        ",".join('{"@type":"City","name":"%s"}' % m for m in MARKETS),
        DOMAIN, slug, DOMAIN, PHONE)


def speakable_jsonld(url, selectors):
    """Marks the passages a voice assistant should read aloud."""
    return """{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "%s",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [%s]
  }
}""" % (url, ",".join('"%s"' % c for c in selectors))


def faq_jsonld(pairs):
    els = []
    for q, a in pairs:
        plain = re.sub(r"<[^>]+>", "", a).replace('"', "'").strip()
        plain = re.sub(r"\s+", " ", plain)
        els.append(
            '{"@type":"Question","name":"%s","acceptedAnswer":{"@type":"Answer","text":"%s"}}'
            % (q.replace('"', "'"), plain)
        )
    return '{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[%s]}' % ",".join(els)


# ---------------------------------------------------------------------------
# Page shell
# ---------------------------------------------------------------------------
SHELL = """<!DOCTYPE html>
<html lang="en-IN" class="no-js">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content="{description}" />
<meta name="theme-color" content="#05070b" />
{robots}<link rel="canonical" href="{domain}/{canonical}" />
<link rel="alternate" hreflang="en-in" href="{domain}/{canonical}" />
<link rel="alternate" hreflang="x-default" href="{domain}/{canonical}" />

<meta property="og:type" content="{og_type}" />
<meta property="og:site_name" content="{brand}" />
<meta property="og:title" content="{og_title}" />
<meta property="og:description" content="{description}" />
<meta property="og:url" content="{domain}/{canonical}" />
<meta property="og:image" content="{domain}/assets/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="{brand} — {tagline}" />
<meta property="og:locale" content="en_IN" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{og_title}" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="{domain}/assets/og-image.jpg" />
<meta name="twitter:image:alt" content="{brand} — {tagline}" />

<link rel="icon" type="image/svg+xml" href="favicon.svg" />
<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png" />
<link rel="manifest" href="site.webmanifest" />
<link rel="preload" as="font" type="font/woff2" href="assets/fonts/plus-jakarta-sans-latin.woff2" crossorigin />
<link rel="preload" as="font" type="font/woff2" href="assets/fonts/jetbrains-mono-latin.woff2" crossorigin />
<link rel="stylesheet" href="style.css" />
{schema}{analytics}</head>
<body>
{header}
  <main id="main">
{body}
  </main>

{footer}"""


def render(slug, title, description, body, current=None, og_type="website",
           schema_blocks=None, noindex=False):
    key = re.sub(r"[^a-z0-9]", "", slug.replace(".html", "")) or "home"
    canonical = "" if slug == "index.html" else slug[:-5] if slug.endswith(".html") else slug
    analytics = ""
    if GA_MEASUREMENT_ID:
        analytics = (
            '<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>\n'
            '<script src="analytics.js" data-ga-id="%s" defer></script>\n'
            % (GA_MEASUREMENT_ID, GA_MEASUREMENT_ID)
        )

    schema = ""
    for block in schema_blocks or []:
        schema += '<script type="application/ld+json">\n%s\n</script>\n' % block

    html = SHELL.format(
        title=title,
        description=description,
        robots='<meta name="robots" content="noindex, follow" />\n' if noindex else "",
        domain=DOMAIN,
        canonical=canonical,
        og_type=og_type,
        og_title=title,
        brand=BRAND,
        tagline=TAGLINE,
        schema=schema,
        analytics=analytics,
        header=header_html(current or slug, key),
        body=body,
        footer=footer_html(),
    )

    html = clean_urls(html)

    with open(os.path.join(ROOT, slug), "w", encoding="utf-8") as f:
        f.write(html)
    return len(html)


# ---------------------------------------------------------------------------
# Shared page fragments
# ---------------------------------------------------------------------------
def final_cta(heading, sub, wa_text, primary_label="Start a Project", primary="contact.html"):
    return """    <section class="section-divider">
      <div class="container">
        <div class="cta-box reveal-on-scroll">
          <span class="eyebrow">Next step</span>
          <h2>{heading}</h2>
          <p style="margin-bottom:28px;">{sub}</p>
          <div class="btn-group btn-group-center">
            <a href="{primary}" class="btn btn-accent btn-lg">{primary_label}</a>
            <a href="{wa}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-lg">{wa_svg} WhatsApp {phone}</a>
            <a href="tel:{tel}" class="btn btn-secondary btn-lg">Call us</a>
          </div>
        </div>
      </div>
    </section>
""".format(
        heading=heading,
        sub=sub,
        primary=primary,
        primary_label=primary_label,
        wa=wa(wa_text),
        wa_svg=WA_SVG,
        phone=PHONE,
        tel=PHONE_TEL,
    )


def crumb_nav(items):
    """Visible breadcrumbs. Google prefers schema that matches what a person can
    actually see on the page, so these pair with the BreadcrumbList JSON-LD."""
    parts = []
    for i, (label, href) in enumerate(items):
        if href:
            parts.append('<li><a href="%s">%s</a></li>' % (href, label))
        else:
            parts.append('<li aria-current="page">%s</li>' % label)
    return ('<nav class="crumbs" aria-label="Breadcrumb"><ol>%s</ol></nav>'
            % "".join(parts))


def page_header(eyebrow, h1, lead, extra=""):
    return """    <section>
      <div class="container">
        <span class="eyebrow">{eyebrow}</span>
        <h1>{h1}</h1>
        <p class="lead">{lead}</p>
{extra}      </div>
    </section>
""".format(eyebrow=eyebrow, h1=h1, lead=lead, extra=extra)


if __name__ == "__main__":
    import content

    content.build_all()
