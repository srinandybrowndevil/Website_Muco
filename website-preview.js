/**
 * MUCO LABS — Website Preview studio
 *
 * A frontend-only visual prototype tool. A visitor describes their business and
 * sees it rendered inside five genuinely different website designs, which they
 * can then customise and approve. Nothing here talks to a server, no AI is
 * involved, and every word in every preview is derived from what the visitor
 * typed plus a template configuration.
 *
 * Three decisions explain most of the file:
 *
 * 1. Previews render inside a SHADOW ROOT. Five business websites -- several of
 *    them light-background -- have to appear inside a dark studio whose global
 *    stylesheet already styles h1, p, a, section and .btn. Prefixed class names
 *    are not isolation: inherited properties and element selectors still land.
 *    An iframe would isolate too, but this site ships frame-src 'self' and an
 *    about:srcdoc frame is a deployment risk, so shadow DOM it is.
 *
 * 2. Because a media query inside a shadow root still measures the browser
 *    window, every breakpoint in every template is a CONTAINER QUERY. The device
 *    switch changes the frame width and the generated site's own breakpoints
 *    fire -- a real responsive test rather than a scaled photograph of one.
 *
 * 3. Each template owns its whole composition rather than five skins sharing
 *    eight section renderers. Sharing them is how five designs quietly become
 *    one design in five colours, which the brief names as the failure condition.
 *    What is shared is the content engine, the theme resolver and the drawing
 *    helpers -- the parts where duplication would cause drift.
 *
 * No dependencies. Loaded only on /website-preview.
 */
(function () {
  'use strict';

  var mount = document.getElementById('wp-studio');
  if (!mount) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasContainerQueries =
    window.CSS && CSS.supports && CSS.supports('container-type', 'inline-size');

  /* ====================================================================== */
  /* Small helpers                                                          */
  /* ====================================================================== */

  /** Everything a visitor typed passes through here before it reaches markup. */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** For href values: the same treatment plus a scheme check. */
  function safeUrl(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(https?:|mailto:|tel:)/i.test(raw)) return esc(raw);
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(raw)) return esc('https://' + raw);
    return '';
  }

  function telHref(value) {
    var digits = String(value || '').replace(/[^\d+]/g, '');
    return digits ? 'tel:' + esc(digits) : '';
  }

  function waHref(value, message) {
    var digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) digits = '91' + digits;
    return 'https://wa.me/' + esc(digits) +
      (message ? '?text=' + encodeURIComponent(message) : '');
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }

  function initials(value) {
    var words = String(value || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  function listSentence(items, joiner) {
    var list = (items || []).filter(Boolean);
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    if (list.length === 2) return list[0] + ' ' + (joiner || 'and') + ' ' + list[1];
    return list.slice(0, -1).join(', ') + ' ' + (joiner || 'and') + ' ' + list[list.length - 1];
  }

  /**
   * Run `fn` on the next frame, or shortly afterwards if frames are not coming.
   *
   * requestAnimationFrame is the right way to batch a repaint, but it is only a
   * promise about the next *painted* frame -- and a browser that has stopped
   * painting (a background tab, a throttled window, a minimised app) never
   * delivers one. Everything live in this studio hangs off this call, so on
   * bare rAF the preview would silently stop responding to the controls in
   * exactly those cases. The timer is a floor, not a second run: whichever
   * arrives first cancels the other.
   */
  function nextFrame(fn) {
    var done = false;
    function once() {
      if (done) return;
      done = true;
      fn();
    }
    if (window.requestAnimationFrame) window.requestAnimationFrame(once);
    window.setTimeout(once, 120);
  }

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
        if (attrs[key] == null || attrs[key] === false) continue;
        if (key === 'class') node.className = attrs[key];
        else if (key === 'text') node.textContent = attrs[key];
        else node.setAttribute(key, attrs[key] === true ? '' : attrs[key]);
      }
    }
    if (html != null) node.innerHTML = html;
    return node;
  }

  /* ====================================================================== */
  /* Colour                                                                 */
  /*                                                                        */
  /* A visitor can pick any colour, including one that would put white text  */
  /* on cream or black text on navy. Rather than refusing the colour, the    */
  /* palette is derived from it: fills keep the chosen hue, and text colours */
  /* are walked until they clear the contrast ratio.                        */
  /* ====================================================================== */

  function parseHex(hex) {
    var value = String(hex || '').trim().replace('#', '');
    if (value.length === 3) {
      value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
    }
    if (!/^[0-9a-f]{6}$/i.test(value)) return null;
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16)
    ];
  }

  function toHex(rgb) {
    return '#' + rgb.map(function (n) {
      var clamped = Math.max(0, Math.min(255, Math.round(n)));
      return (clamped < 16 ? '0' : '') + clamped.toString(16);
    }).join('');
  }

  function isHex(value) { return parseHex(value) !== null; }

  function channelLuminance(channel) {
    var c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function luminance(hex) {
    var rgb = parseHex(hex) || [0, 0, 0];
    return 0.2126 * channelLuminance(rgb[0]) +
      0.7152 * channelLuminance(rgb[1]) +
      0.0722 * channelLuminance(rgb[2]);
  }

  function contrast(a, b) {
    var la = luminance(a);
    var lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /** Black or white, whichever is legible on this background. */
  function inkOn(background) {
    return contrast('#ffffff', background) >= contrast('#111111', background)
      ? '#ffffff' : '#111111';
  }

  function mix(a, b, amount) {
    var ra = parseHex(a) || [0, 0, 0];
    var rb = parseHex(b) || [255, 255, 255];
    return toHex([
      ra[0] + (rb[0] - ra[0]) * amount,
      ra[1] + (rb[1] - ra[1]) * amount,
      ra[2] + (rb[2] - ra[2]) * amount
    ]);
  }

  function darken(hex, amount) { return mix(hex, '#000000', amount); }
  function lighten(hex, amount) { return mix(hex, '#ffffff', amount); }

  /**
   * Walk a colour toward black or white until it is legible on `background`.
   * Used for link and label colours, so a pale brand colour still gives readable
   * text without being replaced by a colour the visitor did not choose.
   */
  function legibleOn(colour, background, ratio) {
    var target = ratio || 4.5;
    if (contrast(colour, background) >= target) return colour;
    var towardsDark = luminance(background) > 0.4;
    for (var step = 1; step <= 20; step++) {
      var candidate = towardsDark
        ? darken(colour, step * 0.05)
        : lighten(colour, step * 0.05);
      if (contrast(candidate, background) >= target) return candidate;
    }
    return towardsDark ? '#111111' : '#ffffff';
  }

  function rotateHue(hex, degrees) {
    var rgb = parseHex(hex) || [0, 0, 0];
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    h = (h + degrees + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var seg = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
    return toHex([(seg[0] + m) * 255, (seg[1] + m) * 255, (seg[2] + m) * 255]);
  }

  /* ====================================================================== */
  /* Configuration                                                          */
  /* ====================================================================== */

  /**
   * Sections a preview can contain. This is the whole vocabulary; a category
   * decides which are on by default and what they are called, and a template
   * decides how they are drawn.
   *
   * There is deliberately no "stats" section. A stats band is numbers, we have
   * no true numbers about the visitor's business, and inventing "500+ happy
   * customers" is exactly the fabrication the brief forbids and that this studio
   * refuses elsewhere on the site. Process and Hours are offered instead,
   * because those are things the visitor genuinely knows.
   */
  var SECTIONS = ['about', 'services', 'products', 'gallery', 'process',
    'testimonials', 'faq', 'hours', 'contact'];

  var SECTION_LABEL = {
    about: 'About', services: 'Services', products: 'Products', gallery: 'Gallery',
    process: 'How it works', testimonials: 'Social proof layout', faq: 'FAQ',
    hours: 'Find us', contact: 'Contact'
  };

  /**
   * Fourteen categories. Each one carries more than a label: the noun it uses
   * for what it sells, the verb on its main button, which sections make sense,
   * what the section headings are called, and a drawing motif. This is what
   * stops a Premium Bakery and a Premium Construction Company from being the
   * same page with the words swapped.
   */
  var CATEGORIES = [
    {
      id: 'restaurant', label: 'Restaurant / Cafe', offering: 'dishes',
      action: 'book', motif: 'arcs',
      sections: ['about', 'products', 'gallery', 'hours', 'testimonials', 'contact'],
      labels: { products: 'On the menu', gallery: 'Inside the room', services: 'What we serve' },
      lead: 'Food, the room, and how to find a table.',
      examples: ['Breakfast', 'Lunch thali', 'Filter coffee', 'Party orders'],
      exampleKind: 'menu sections',
      verbs: { hero: 'Eat well at', alt: 'A table waiting at' }
    },
    {
      id: 'bakery', label: 'Bakery', offering: 'bakes',
      action: 'order', motif: 'arcs',
      sections: ['about', 'products', 'gallery', 'hours', 'contact'],
      labels: { products: 'From the counter', gallery: 'Fresh today', services: 'What we bake' },
      lead: 'What is on the counter, and how to order it.',
      examples: ['Cakes to order', 'Daily bread', 'Savoury snacks', 'Celebration boxes'],
      exampleKind: 'product groups',
      verbs: { hero: 'Baked fresh at', alt: 'Made this morning at' }
    },
    {
      id: 'gym', label: 'Gym / Fitness', offering: 'programmes',
      action: 'enquire', motif: 'bars',
      sections: ['about', 'services', 'gallery', 'process', 'hours', 'contact'],
      labels: { services: 'Training programmes', gallery: 'The floor', process: 'Getting started' },
      lead: 'Programmes, the floor, and how to join.',
      examples: ['Strength training', 'Weight loss programme', 'Personal training', 'Group classes'],
      exampleKind: 'programmes',
      verbs: { hero: 'Train stronger at', alt: 'Start training at' }
    },
    {
      id: 'salon', label: 'Salon / Beauty', offering: 'treatments',
      action: 'book', motif: 'petals',
      sections: ['about', 'services', 'gallery', 'hours', 'testimonials', 'contact'],
      labels: { services: 'Treatments', gallery: 'Recent work' },
      lead: 'Treatments, recent work, and how to book.',
      examples: ['Hair styling', 'Colour', 'Bridal package', 'Skin treatments'],
      exampleKind: 'treatments',
      verbs: { hero: 'Look your best at', alt: 'Book your chair at' }
    },
    {
      id: 'clinic', label: 'Clinic / Healthcare', offering: 'services',
      action: 'book', motif: 'cross',
      sections: ['about', 'services', 'process', 'hours', 'faq', 'contact'],
      labels: { services: 'What we treat', process: 'Your visit' },
      lead: 'What is treated here, and how to make an appointment.',
      examples: ['Consultation', 'Diagnostics', 'Follow-up care', 'Health checks'],
      exampleKind: 'services',
      verbs: { hero: 'Care you can reach at', alt: 'Book a consultation at' }
    },
    {
      id: 'construction', label: 'Construction', offering: 'projects',
      action: 'quote', motif: 'strata',
      sections: ['about', 'services', 'gallery', 'process', 'faq', 'contact'],
      labels: { services: 'What we build', gallery: 'Recent site work', process: 'How a project runs' },
      lead: 'What gets built, how a project runs, and how to ask for a quote.',
      examples: ['Residential builds', 'Commercial interiors', 'Renovation', 'Site supervision'],
      exampleKind: 'work types',
      verbs: { hero: 'Built properly by', alt: 'Your project, built by' }
    },
    {
      id: 'realestate', label: 'Real Estate', offering: 'properties',
      action: 'enquire', motif: 'strata',
      sections: ['about', 'services', 'gallery', 'process', 'faq', 'contact'],
      labels: { services: 'How we help', gallery: 'Listings layout', process: 'From viewing to keys' },
      lead: 'What is available, and who to speak to about it.',
      examples: ['Residential plots', 'Apartments', 'Commercial space', 'Rental management'],
      exampleKind: 'property types',
      verbs: { hero: 'Find your place with', alt: 'Property, handled by' }
    },
    {
      id: 'retail', label: 'Retail Shop', offering: 'products',
      action: 'visit', motif: 'grid',
      sections: ['about', 'products', 'gallery', 'hours', 'contact'],
      labels: { products: 'What we stock', gallery: 'In store' },
      lead: 'What is in stock, and where the shop is.',
      examples: ['New arrivals', 'Everyday range', 'Gifting', 'Offers'],
      exampleKind: 'product groups',
      verbs: { hero: 'Everything you need at', alt: 'Come and see' }
    },
    {
      id: 'textile', label: 'Textile / Fashion', offering: 'collections',
      action: 'enquire', motif: 'weave',
      sections: ['about', 'products', 'gallery', 'process', 'contact'],
      labels: { products: 'Collections', gallery: 'Lookbook', process: 'From order to dispatch' },
      lead: 'Collections, capability, and how to place an order.',
      examples: ['Cotton range', 'Wedding collection', 'Bulk orders', 'Custom stitching'],
      exampleKind: 'collections',
      verbs: { hero: 'Woven with care at', alt: 'Cloth worth keeping from' }
    },
    {
      id: 'education', label: 'Education / Training', offering: 'courses',
      action: 'enquire', motif: 'bars',
      sections: ['about', 'services', 'process', 'faq', 'testimonials', 'contact'],
      labels: { services: 'Courses', process: 'How a batch runs' },
      lead: 'What is taught, how a batch runs, and how to enrol.',
      examples: ['Foundation course', 'Advanced batch', 'Weekend classes', 'One-to-one coaching'],
      exampleKind: 'courses',
      verbs: { hero: 'Learn it properly at', alt: 'Start your course at' }
    },
    {
      id: 'professional', label: 'Professional Services', offering: 'services',
      action: 'enquire', motif: 'grid',
      sections: ['about', 'services', 'process', 'faq', 'contact'],
      labels: { services: 'What we handle', process: 'How we work' },
      lead: 'What is handled here, how the work runs, and how to start.',
      examples: ['Advisory', 'Compliance', 'Documentation', 'Ongoing support'],
      exampleKind: 'service areas',
      verbs: { hero: 'Straight answers from', alt: 'Work handled properly by' }
    },
    {
      id: 'automotive', label: 'Automotive', offering: 'services',
      action: 'book', motif: 'cog',
      sections: ['about', 'services', 'gallery', 'hours', 'faq', 'contact'],
      labels: { services: 'Workshop services', gallery: 'In the workshop' },
      lead: 'What the workshop does, and how to book it in.',
      examples: ['General service', 'Repairs', 'Detailing', 'Roadside help'],
      exampleKind: 'workshop services',
      verbs: { hero: 'Back on the road with', alt: 'Looked after by' }
    },
    {
      id: 'homeservices', label: 'Home Services', offering: 'services',
      action: 'call', motif: 'cog',
      sections: ['about', 'services', 'process', 'gallery', 'faq', 'contact'],
      labels: { services: 'What we do', process: 'How a visit works' },
      lead: 'What gets fixed or fitted, and how to get someone out.',
      examples: ['Installation', 'Repairs', 'Annual maintenance', 'Emergency call-out'],
      exampleKind: 'jobs',
      verbs: { hero: 'Sorted the same week by', alt: 'Someone who turns up:' }
    },
    {
      id: 'general', label: 'General Business / Other', offering: 'services',
      action: 'enquire', motif: 'grid',
      sections: ['about', 'services', 'gallery', 'contact'],
      labels: {},
      lead: 'What the business does, and how to get in touch.',
      examples: ['What we offer', 'How we help', 'Working with us'],
      exampleKind: 'areas',
      verbs: { hero: 'Welcome to', alt: 'This is' }
    }
  ];

  var CATEGORY_BY_ID = {};
  CATEGORIES.forEach(function (c) { CATEGORY_BY_ID[c.id] = c; });
  function category(id) { return CATEGORY_BY_ID[id] || CATEGORY_BY_ID.general; }

  /**
   * Primary actions. Each one names the field it needs, so the customiser can
   * disable an option and say why rather than offering a button that goes
   * nowhere.
   */
  var ACTIONS = {
    call: { label: 'Call', needs: 'phone', needsLabel: 'phone number', cta: 'Call Now' },
    whatsapp: { label: 'WhatsApp', needs: 'whatsapp', needsLabel: 'WhatsApp number', cta: 'WhatsApp Us' },
    enquire: { label: 'Enquire', needs: null, cta: 'Enquire Now' },
    book: { label: 'Book', needs: null, cta: 'Book Now' },
    order: { label: 'Order', needs: null, cta: 'Order Now' },
    quote: { label: 'Request a quote', needs: null, cta: 'Request a Quote' },
    visit: { label: 'Visit shop', needs: null, cta: 'Visit the Shop' },
    directions: { label: 'Get directions', needs: 'mapsUrl', needsLabel: 'Google Maps link',
      cta: 'Get Directions' }
  };
  var ACTION_ORDER = ['call', 'whatsapp', 'enquire', 'book', 'order', 'quote', 'visit', 'directions'];

  /**
   * Five type sets built from the three families this site self-hosts, plus
   * system stacks. font-src is 'self', so a sixth family loaded from a CDN would
   * be blocked by the browser rather than merely slow. Differentiation therefore
   * comes from family, weight, case, tracking and scale -- which is where most
   * of a typographic voice lives anyway.
   */
  var TYPESETS = [
    {
      id: 'clean', name: 'Clean Sans', note: 'Neutral and quiet. Gets out of the way.',
      head: "'Inter Tight', system-ui, sans-serif", headWeight: 600,
      headTrack: '-0.02em', headCase: 'none',
      body: "'Inter Tight', system-ui, sans-serif", bodyWeight: 400
    },
    {
      id: 'grotesk', name: 'Modern Grotesk', note: 'Wide tracked capitals. Reads as a brand.',
      head: "system-ui, 'Segoe UI', Helvetica, Arial, sans-serif", headWeight: 700,
      headTrack: '0.06em', headCase: 'uppercase',
      body: "system-ui, 'Segoe UI', Helvetica, Arial, sans-serif", bodyWeight: 400
    },
    {
      id: 'serif', name: 'Elegant Serif', note: 'A serif headline over a plain body. Warm.',
      head: "'Instrument Serif', Georgia, 'Times New Roman', serif", headWeight: 400,
      headTrack: '0', headCase: 'none',
      body: "'Inter Tight', system-ui, sans-serif", bodyWeight: 400
    },
    {
      id: 'display', name: 'Bold Display', note: 'Heavy and tight. Loud on purpose.',
      head: "'Inter Tight', system-ui, sans-serif", headWeight: 800,
      headTrack: '-0.045em', headCase: 'none',
      body: "'Inter Tight', system-ui, sans-serif", bodyWeight: 400
    },
    {
      id: 'mono', name: 'Technical Mono', note: 'Monospaced capitals. Precise, technical.',
      head: "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace", headWeight: 600,
      headTrack: '0.08em', headCase: 'uppercase',
      body: "'Inter Tight', system-ui, sans-serif", bodyWeight: 400
    }
  ];
  var TYPESET_BY_ID = {};
  TYPESETS.forEach(function (t) { TYPESET_BY_ID[t.id] = t; });
  function typeset(id) { return TYPESET_BY_ID[id] || TYPESETS[0]; }

  /**
   * The five design directions. `palettes` holds each template's own default
   * colours per mode; a visitor's chosen primary replaces `primary` only, and
   * everything derived from it is recomputed by resolveTheme().
   */
  var TEMPLATES = [
    {
      id: 'minimal', name: 'Minimalist', family: 'minimal',
      blurb: 'Centred, quiet and mostly white space. Nothing competes with the words.',
      detail: 'Hairlines instead of boxes, one column, a text link where most sites put a button.',
      defaultMode: 'light', typeset: 'serif', supportsAlign: false,
      palettes: {
        light: { paper: '#fbfaf8', ink: '#16150f', primary: '#2e2b22', accent: '#9a7b4f' },
        dark: { paper: '#141310', ink: '#f0ece3', primary: '#e6e1d5', accent: '#c8a97a' }
      }
    },
    {
      id: 'maximal', name: 'Maximalist', family: 'maximal',
      blurb: 'Full-bleed colour, enormous type and a moving strip of what you do.',
      detail: 'Hard shadows, three-pixel borders, zero radius. Impossible to scroll past.',
      defaultMode: 'light', typeset: 'display', supportsAlign: false,
      palettes: {
        light: { paper: '#fffdf6', ink: '#0d0d0d', primary: '#f03d2f', accent: '#1d4ed8' },
        dark: { paper: '#0d0d0d', ink: '#fffdf6', primary: '#f03d2f', accent: '#facc15' }
      }
    },
    {
      id: 'business', name: 'Modern Business', family: 'business',
      blurb: 'The conversion layout: cards, a clear offer panel, and the phone number in the header.',
      detail: 'Two calls to action above the fold, a process strip and an FAQ. Built to be enquired with.',
      defaultMode: 'light', typeset: 'clean', supportsAlign: true,
      palettes: {
        light: { paper: '#f4f6fa', ink: '#101828', primary: '#1d4ed8', accent: '#0f9d76' },
        dark: { paper: '#0b1220', ink: '#e8eefb', primary: '#4b81f7', accent: '#22c79a' }
      }
    },
    {
      id: 'editorial', name: 'Geometric Editorial', family: 'editorial',
      blurb: 'An asymmetric twelve-column grid you can actually see, set like a printed page.',
      detail: 'Uneven spans, a giant outlined numeral, mono captions and a pull quote. No rounded corners anywhere.',
      defaultMode: 'light', typeset: 'mono', supportsAlign: true,
      palettes: {
        light: { paper: '#f2f0e9', ink: '#111111', primary: '#111111', accent: '#d64520' },
        dark: { paper: '#111111', ink: '#f2f0e9', primary: '#f2f0e9', accent: '#f26f4c' }
      }
    },
    {
      id: 'premium', name: 'Premium', family: 'premium',
      blurb: 'Dark, spacious and set in a light serif. For businesses selling care rather than price.',
      detail: 'A full-height opening, wide-tracked micro labels, hairline rules and tall image panels.',
      defaultMode: 'dark', typeset: 'serif', supportsAlign: false,
      palettes: {
        light: { paper: '#f6f2ec', ink: '#1a1712', primary: '#2b2620', accent: '#a07c43' },
        dark: { paper: '#0c0b0a', ink: '#efe8dd', primary: '#efe8dd', accent: '#c9a227' }
      }
    }
  ];
  var TEMPLATE_BY_ID = {};
  TEMPLATES.forEach(function (t) { TEMPLATE_BY_ID[t.id] = t; });
  function template(id) { return TEMPLATE_BY_ID[id] || TEMPLATES[0]; }

  /* ====================================================================== */
  /* Content engine                                                         */
  /*                                                                        */
  /* Deterministic. The same business record always produces the same words. */
  /* It may rearrange and describe what the visitor typed; it may never add   */
  /* a fact. No years in business, no customer counts, no ratings, no awards, */
  /* no prices, no names, no testimonials. Where a fact is missing the copy   */
  /* says something true and general instead of inventing a specific.        */
  /* ====================================================================== */

  function derive(biz) {
    var cat = category(biz.category);
    var name = (biz.businessName || '').trim() || 'Your Business';
    var city = (biz.location || '').trim();
    var services = (biz.services || []).filter(Boolean);
    var products = (biz.products || []).filter(Boolean);

    /* Services and products fall back to category examples. They are shown with
       a visible "example" note wherever they are used, so nobody mistakes them
       for a claim about this business. */
    var serviceItems = services.length ? services : cat.examples.slice(0, 4);
    var serviceIsExample = !services.length;
    var productItems = products.length ? products : cat.examples.slice(0, 4);
    var productIsExample = !products.length;

    var headline = biz.tagline
      ? biz.tagline
      : (city ? cat.verbs.hero + ' ' + name : cat.verbs.alt + ' ' + name);

    var where = city ? ' in ' + city : '';
    var subheadline;
    if (biz.description) {
      subheadline = biz.description;
    } else if (services.length) {
      subheadline = listSentence(services.slice(0, 3)) + where + '.';
    } else {
      subheadline = cat.lead + (city ? ' Based in ' + city + '.' : '');
    }

    var aboutBody = [];
    if (biz.description) {
      aboutBody.push(biz.description);
    } else {
      aboutBody.push(name + ' is a ' + cat.label.toLowerCase().split(' / ')[0] +
        ' business' + where + '. This paragraph is where you would describe it in your own words.');
    }
    if (services.length || products.length) {
      aboutBody.push('What we offer: ' + listSentence(services.concat(products).slice(0, 5)) + '.');
    }

    var contact = {
      phone: (biz.phone || '').trim(),
      whatsapp: (biz.whatsapp || '').trim(),
      email: (biz.email || '').trim(),
      address: (biz.address || '').trim(),
      maps: (biz.mapsUrl || '').trim(),
      instagram: (biz.instagram || '').trim(),
      facebook: (biz.facebook || '').trim()
    };
    var hasContact = !!(contact.phone || contact.whatsapp || contact.email || contact.address);

    /* Questions a visitor can genuinely answer from what they typed, or that are
       true of any business. Nothing here asserts a policy we were not told. */
    var faq = [
      ['Where are you based?',
        contact.address ? contact.address : (city ? name + ' is based in ' + city + '.' :
          'Add your address in the details step and it will appear here.')],
      ['What do you offer?',
        listSentence(serviceItems.slice(0, 4)) + '.'],
      ['How do I get in touch?',
        hasContact
          ? 'Use the contact details in the footer, or the button at the top of the page.'
          : 'Add a phone number, WhatsApp number or email and this answer will fill itself in.']
    ];

    return {
      name: name,
      city: city,
      slug: slugify(name) || 'your-business',
      category: cat,
      initials: initials(name),
      headline: headline,
      subheadline: subheadline,
      about: aboutBody,
      services: serviceItems,
      serviceIsExample: serviceIsExample,
      products: productItems,
      productIsExample: productIsExample,
      faq: faq,
      contact: contact,
      hasContact: hasContact,
      language: biz.language || 'en'
    };
  }

  /**
   * A short line for each service or product. Nothing here is a claim: it names
   * the item and the town, which are both things the visitor told us.
   */
  function itemBody(content, item, index) {
    var lines = [
      'Tell your customers what ' + item.toLowerCase() + ' involves, in one or two sentences.',
      'A short description of ' + item.toLowerCase() + ' goes here.',
      'What ' + item.toLowerCase() + ' includes, and who it suits.'
    ];
    return lines[index % lines.length];
  }

  /** The nav a generated site shows, built from the sections that are on. */
  function navFor(content, sections) {
    var labels = content.category.labels || {};
    var out = [];
    sections.forEach(function (id) {
      if (id === 'contact' || id === 'hours') return;
      out.push({ id: id, label: labels[id] || SECTION_LABEL[id] });
    });
    out = out.slice(0, 4);
    out.push({ id: 'contact', label: 'Contact' });
    return out;
  }

  /**
   * Resolve the primary action into a real link. When the data it needs is
   * missing the action becomes an in-page jump to the contact block rather than
   * a dead button -- brief section 50, no dead CTAs.
   */
  function actionFor(content, actionId) {
    var def = ACTIONS[actionId] || ACTIONS.enquire;
    var c = content.contact;
    var href = '#contact';
    var external = false;
    if (actionId === 'call' && c.phone) href = telHref(c.phone);
    else if (actionId === 'whatsapp' && (c.whatsapp || c.phone)) {
      href = waHref(c.whatsapp || c.phone,
        'Hello ' + content.name + ', I found you online and would like to enquire.');
      external = true;
    } else if (actionId === 'directions' && c.maps) {
      href = safeUrl(c.maps); external = true;
    }
    return { label: def.cta, href: href || '#contact', external: external };
  }

  /* ====================================================================== */
  /* Placeholder imagery                                                    */
  /*                                                                        */
  /* Generated, never photographic. A stock photograph on a preview implies  */
  /* it is a photograph of the visitor's business, which the brief forbids   */
  /* and which this studio would not do anyway. Drawing the panels also      */
  /* means the whole feature ships zero image bytes.                          */
  /* ====================================================================== */

  var MOTIFS = {
    arcs: '<path d="M0 120 A120 120 0 0 1 240 120" /><path d="M40 120 A80 80 0 0 1 200 120" />' +
      '<path d="M80 120 A40 40 0 0 1 160 120" /><path d="M0 150h240" />',
    bars: '<path d="M20 170V70" /><path d="M64 170V30" /><path d="M108 170V96" />' +
      '<path d="M152 170V54" /><path d="M196 170V110" /><path d="M8 170h224" />',
    petals: '<path d="M120 30c40 34 40 76 0 110-40-34-40-76 0-110z" />' +
      '<path d="M120 140c34-40 76-40 110 0-34 40-76 40-110 0z" />' +
      '<path d="M120 140c-34-40-76-40-110 0 34 40 76 40 110 0z" />',
    cross: '<path d="M96 40h48v56h56v48h-56v56H96v-56H40V96h56z" />',
    strata: '<path d="M0 160h240" /><path d="M0 120h180" /><path d="M0 80h240" />' +
      '<path d="M60 40h180" /><path d="M60 40v140" /><path d="M180 20v160" />',
    grid: '<path d="M30 30h60v60H30zM150 30h60v60h-60zM30 120h60v60H30zM150 120h60v60h-60z" />',
    weave: '<path d="M20 40h200M20 70h200M20 100h200M20 130h200M20 160h200" />' +
      '<path d="M50 20v170M100 20v170M150 20v170M200 20v170" opacity=".45" />',
    cog: '<circle cx="120" cy="105" r="46" /><circle cx="120" cy="105" r="16" />' +
      '<path d="M120 35v22M120 153v22M50 105h22M168 105h22M71 56l16 16M153 138l16 16M169 56l-16 16M87 138l-16 16" />'
  };

  /**
   * A drawn panel standing in for a photograph. `tone` decides how loud it is:
   * templates that want a quiet grey square and templates that want a full
   * colour block both come through here.
   */
  function motifPanel(content, theme, options) {
    var opts = options || {};
    var glyph = MOTIFS[content.category.motif] || MOTIFS.grid;
    var fill = opts.fill || theme.panel;
    var stroke = opts.stroke || theme.panelInk;
    var label = opts.label || '';
    return '<div class="wp-panel" style="--panel-bg:' + fill + ';--panel-ink:' + stroke + '"' +
      (opts.tall ? ' data-tall="1"' : '') + '>' +
      '<svg viewBox="0 0 240 200" aria-hidden="true" focusable="false" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round">' + glyph + '</svg>' +
      (label ? '<span class="wp-panel-cap">' + esc(label) + '</span>' : '') +
      '</div>';
  }

  /**
   * An image slot. Uses an image the visitor supplied when there is one, and the
   * drawn panel when there is not. The alt text never claims the picture shows
   * the business -- it says what it is.
   */
  function mediaSlot(content, theme, images, index, options) {
    var opts = options || {};
    var shots = (images && images.shots) || [];
    if (shots.length) {
      var src = shots[index % shots.length];
      return '<div class="wp-panel wp-panel-photo"' + (opts.tall ? ' data-tall="1"' : '') + '>' +
        '<img src="' + esc(src) + '" alt="' + esc(opts.alt || ('Image supplied for ' + content.name)) +
        '" loading="lazy" decoding="async" />' +
        (opts.label ? '<span class="wp-panel-cap">' + esc(opts.label) + '</span>' : '') +
        '</div>';
    }
    return motifPanel(content, theme, opts);
  }

  /** The business mark: an uploaded logo, or the name set in the display face. */
  function brandMark(content, images, className) {
    if (images && images.logo) {
      return '<span class="' + (className || 'wp-brand') + '">' +
        '<img class="wp-logo" src="' + esc(images.logo) + '" alt="' + esc(content.name) + '" /></span>';
    }
    return '<span class="' + (className || 'wp-brand') + '">' + esc(content.name) + '</span>';
  }

  /* ====================================================================== */
  /* Theme resolution                                                       */
  /*                                                                        */
  /* Everything a template's stylesheet needs, derived from four inputs: the */
  /* template, the mode, and the two colours the visitor picked. Contrast is */
  /* enforced here rather than trusted to the template, so no template can   */
  /* ship an unreadable combination and no colour choice can create one.     */
  /* ====================================================================== */

  function resolveMode(tpl, requested) {
    if (requested === 'light' || requested === 'dark') return requested;
    return tpl.defaultMode;
  }

  function resolveTheme(tpl, custom) {
    var mode = resolveMode(tpl, custom.mode);
    var base = tpl.palettes[mode];
    var paper = base.paper;
    var ink = base.ink;

    var primary = isHex(custom.colors && custom.colors.primary)
      ? custom.colors.primary : base.primary;
    var accent = isHex(custom.colors && custom.colors.accent)
      ? custom.colors.accent : base.accent;

    var dark = mode === 'dark';
    var onPrimary = inkOn(primary);
    var onAccent = inkOn(accent);

    /* Surfaces are stepped away from the paper rather than being a fixed grey,
       so a cream page gets warm panels and a navy page gets cooler ones. */
    var surface = dark ? lighten(paper, 0.07) : darken(paper, 0.035);
    var surface2 = dark ? lighten(paper, 0.13) : darken(paper, 0.07);
    var line = dark ? lighten(paper, 0.18) : darken(paper, 0.14);
    var lineStrong = dark ? lighten(paper, 0.32) : darken(paper, 0.28);

    return {
      mode: mode,
      paper: paper,
      ink: ink,
      /* Body text one step back from the heading colour, still clearing 4.5:1. */
      muted: legibleOn(dark ? darken(ink, 0.30) : lighten(ink, 0.36), paper, 4.5),
      faint: dark ? lighten(paper, 0.42) : darken(paper, 0.42),
      surface: surface,
      surface2: surface2,
      line: line,
      lineStrong: lineStrong,
      primary: primary,
      onPrimary: onPrimary,
      /* The same hue, made legible as text on the page background. */
      primaryInk: legibleOn(primary, paper, 4.5),
      primarySoft: mix(paper, primary, dark ? 0.16 : 0.10),
      accent: accent,
      onAccent: onAccent,
      accentInk: legibleOn(accent, paper, 4.5),
      accentSoft: mix(paper, accent, dark ? 0.18 : 0.12),
      panel: mix(paper, primary, dark ? 0.12 : 0.08),
      panelInk: legibleOn(primary, mix(paper, primary, dark ? 0.12 : 0.08), 3),
      focus: legibleOn(accent, paper, 3)
    };
  }

  /** The shared part of every template stylesheet: a reset and the shared bits. */
  function baseCss(theme, set) {
    return [
      ':host{all:initial;display:block;contain:content;}',
      '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}',
      '.wp-site{',
      '  container-type:inline-size;container-name:site;',
      '  background:' + theme.paper + ';color:' + theme.ink + ';',
      '  font-family:' + set.body + ';font-weight:' + set.bodyWeight + ';',
      '  font-size:16px;line-height:1.6;text-align:left;',
      '  -webkit-font-smoothing:antialiased;overflow-x:hidden;',
      '}',
      '.wp-site img{max-width:100%;display:block;}',
      '.wp-site a{color:inherit;text-decoration:none;}',
      '.wp-site a:focus-visible,.wp-site button:focus-visible{',
      '  outline:2px solid ' + theme.focus + ';outline-offset:3px;}',
      '.wp-site h1,.wp-site h2,.wp-site h3,.wp-site h4{',
      '  font-family:' + set.head + ';font-weight:' + set.headWeight + ';',
      '  letter-spacing:' + set.headTrack + ';text-transform:' + set.headCase + ';',
      '  line-height:1.08;}',
      '.wp-site ul{list-style:none;}',
      '.wp-site button{font:inherit;cursor:pointer;border:0;background:none;color:inherit;}',
      /* Drawn placeholder panels, shared by every template. */
      '.wp-panel{position:relative;aspect-ratio:4/3;background:var(--panel-bg);',
      '  color:var(--panel-ink);display:grid;place-items:center;overflow:hidden;}',
      '.wp-panel[data-tall]{aspect-ratio:3/4;}',
      '.wp-panel svg{width:56%;height:auto;opacity:.5;}',
      '.wp-panel-photo{background:' + theme.surface + ';}',
      '.wp-panel-photo img{width:100%;height:100%;object-fit:cover;}',
      '.wp-panel-cap{position:absolute;left:0;bottom:0;padding:6px 10px;font-size:11px;',
      '  letter-spacing:.08em;text-transform:uppercase;background:' + theme.paper + ';',
      '  color:' + theme.muted + ';}',
      '.wp-logo{height:34px;width:auto;object-fit:contain;}',
      /* The one label every preview carries, so a screenshot of it can never be
         mistaken for a live website. */
      '.wp-stamp{position:sticky;bottom:0;z-index:5;padding:7px 14px;font-size:11px;',
      '  letter-spacing:.09em;text-transform:uppercase;text-align:center;',
      '  font-family:' + TYPESETS[4].head + ';',
      '  background:' + theme.ink + ';color:' + theme.paper + ';}',
      /* Preview-only form furniture. Disabled, and labelled as such. */
      '.wp-fauxform{display:grid;gap:10px;}',
      '.wp-fauxform input,.wp-fauxform textarea{width:100%;padding:12px 14px;font:inherit;',
      '  background:' + theme.paper + ';color:' + theme.muted + ';',
      '  border:1px solid ' + theme.line + ';}',
      '@media (prefers-reduced-motion:reduce){.wp-site *{animation:none!important;',
      '  transition:none!important;}}'
    ].join('\n');
  }

  /* ====================================================================== */
  /* Templates                                                              */
  /*                                                                        */
  /* One entry per design direction. Each owns its own stylesheet and its    */
  /* own composition. They share the content engine, the theme resolver and  */
  /* the drawing helpers, and nothing else -- because a shared section       */
  /* renderer is precisely how five designs become one design in five        */
  /* colours, which the brief names as the failure condition.                */
  /*                                                                        */
  /* Every breakpoint is a CONTAINER query on `site`, so the device switch    */
  /* makes these layouts genuinely respond rather than merely scale.          */
  /* ====================================================================== */

  var RENDERERS = {};

  /**
   * Emit a template's sections in the order the visitor arranged them.
   *
   * Each template supplies its own `parts` -- its own markup, its own classes,
   * its own composition. What this shares is only the sequencing, because
   * hard-coding the sequence inside each template is what made Move up and Move
   * down silently do nothing: the control changed the stored order and every
   * template went on rendering its own fixed run of sections.
   */
  function emitSections(ctx, parts) {
    var seen = {};
    return ctx.sections.map(function (id) {
      if (seen[id] || !parts[id]) return '';
      seen[id] = true;
      return parts[id]();
    }).join('');
  }

  /* ---------------------------------------------------------------------- */
  /* 1. Minimalist — centred, hairlines, no boxes, a text link for a CTA     */
  /* ---------------------------------------------------------------------- */
  RENDERERS.minimal = {
    css: function (t, s) {
      return [
        '.m-wrap{max-width:1000px;margin:0 auto;padding:0 28px;}',
        '.m-narrow{max-width:620px;margin:0 auto;}',
        '.m-head{padding:34px 0 22px;text-align:center;border-bottom:1px solid ' + t.line + ';}',
        '.m-brand{font-family:' + s.head + ';font-weight:' + s.headWeight + ';',
        '  text-transform:' + s.headCase + ';letter-spacing:' + s.headTrack + ';',
        '  font-size:23px;display:inline-block;color:' + t.primaryInk + ';}',
        '.m-nav{display:flex;gap:26px;justify-content:center;margin-top:18px;flex-wrap:wrap;}',
        '.m-nav a{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:' + t.muted + ';}',
        '.m-nav a:hover{color:' + t.ink + ';}',
        '.m-hero{padding:104px 0 96px;text-align:center;}',
        '.m-eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;',
        '  color:' + t.muted + ';display:block;margin-bottom:26px;}',
        '.m-hero h1{font-size:clamp(28px,4.6cqw,50px);margin-bottom:22px;',
        '  color:' + t.primaryInk + ';}',
        '.m-hero p{color:' + t.muted + ';font-size:17px;line-height:1.65;}',
        '.m-link{display:inline-block;margin-top:34px;font-size:14px;letter-spacing:.04em;',
        '  border-bottom:1px solid ' + t.primaryInk + ';padding-bottom:3px;color:' + t.primaryInk + ';}',
        '.m-sec{padding:84px 0;border-top:1px solid ' + t.line + ';}',
        '.m-sec h2{font-size:clamp(20px,2.4cqw,27px);text-align:center;margin-bottom:12px;}',
        '.m-sub{text-align:center;color:' + t.muted + ';font-size:14px;margin-bottom:44px;}',
        '.m-rows{border-top:1px solid ' + t.line + ';}',
        '.m-row{display:grid;grid-template-columns:44px 1fr;gap:20px;padding:26px 2px;',
        '  border-bottom:1px solid ' + t.line + ';align-items:baseline;}',
        '.m-num{font-size:12px;color:' + t.faint + ';letter-spacing:.1em;}',
        '.m-row h3{font-size:17px;margin-bottom:6px;}',
        '.m-row p{color:' + t.muted + ';font-size:14px;}',
        '.m-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}',
        '.m-quote{text-align:center;font-family:' + s.head + ';font-size:clamp(19px,2.6cqw,28px);',
        '  line-height:1.4;max-width:660px;margin:0 auto;}',
        '.m-note{text-align:center;font-size:11px;color:' + t.faint + ';margin-top:20px;',
        '  letter-spacing:.06em;text-transform:uppercase;}',
        '.m-contact{display:grid;gap:8px;text-align:center;font-size:15px;color:' + t.muted + ';}',
        '.m-contact a{border-bottom:1px solid ' + t.line + ';}',
        '.m-foot{padding:42px 0;text-align:center;border-top:1px solid ' + t.line + ';',
        '  font-size:12px;color:' + t.faint + ';letter-spacing:.05em;}',
        '@container site (max-width:760px){',
        '  .m-hero{padding:64px 0 56px;}.m-sec{padding:56px 0;}',
        '  .m-grid{grid-template-columns:1fr 1fr;}',
        '  .m-nav{gap:16px;}}',
        '@container site (max-width:460px){',
        '  .m-wrap{padding:0 20px;}.m-grid{grid-template-columns:1fr;}',
        '  .m-row{grid-template-columns:1fr;gap:4px;}}'
      ].join('\n');
    },

    body: function (ctx) {
      var c = ctx.c, t = ctx.t, out = [];
      var nav = navFor(c, ctx.sections);

      out.push('<header class="m-head"><div class="m-wrap">' +
        brandMark(c, ctx.images, 'm-brand') +
        '<nav class="m-nav" aria-label="Main">' +
        nav.map(function (n) {
          return '<a href="#' + n.id + '">' + esc(n.label) + '</a>';
        }).join('') + '</nav></div></header>');

      out.push('<section class="m-hero"><div class="m-wrap m-narrow">' +
        (c.city ? '<span class="m-eyebrow">' + esc(c.city) + '</span>' : '') +
        '<h1>' + esc(ctx.heroHeadline) + '</h1>' +
        '<p>' + esc(ctx.heroSub) + '</p>' +
        '<a class="m-link" href="' + ctx.action.href + '"' + ctx.actionRel + '>' +
        esc(ctx.heroCta) + '</a>' +
        '</div></section>');

      if (ctx.mini) {
        out.push(this.rows(ctx, 'services'));
        out.push('<footer class="m-foot"><div class="m-wrap">' + esc(c.name) +
          (c.city ? ' &middot; ' + esc(c.city) : '') + '</div></footer>');
        return out.join('');
      }

      var self = this;
      var parts = {
        about: function () {
          return '<section class="m-sec" id="about"><div class="m-wrap m-narrow">' +
            '<h2>' + esc(ctx.label('about')) + '</h2>' +
            c.about.map(function (p) {
              return '<p style="color:' + t.muted + ';text-align:center;margin-top:16px">' +
                esc(p) + '</p>';
            }).join('') + '</div></section>';
        },
        services: function () { return self.rows(ctx, 'services'); },
        products: function () { return self.rows(ctx, 'products'); },
        gallery: function () {
          return '<section class="m-sec" id="gallery"><div class="m-wrap">' +
            '<h2>' + esc(ctx.label('gallery')) + '</h2>' +
            '<p class="m-sub">' + esc(ctx.imageNote) + '</p>' +
            '<div class="m-grid">' +
            [0, 1, 2].map(function (i) {
              return mediaSlot(c, t, ctx.images, i, { alt: ctx.label('gallery') + ' image ' + (i + 1) });
            }).join('') + '</div></div></section>';
        },
        process: function () {
          return '<section class="m-sec" id="process"><div class="m-wrap m-narrow">' +
            '<h2>' + esc(ctx.label('process')) + '</h2><div class="m-rows">' +
            ctx.steps.map(function (step, i) {
              return '<div class="m-row"><span class="m-num">' + ('0' + (i + 1)) +
                '</span><div><h3>' + esc(step[0]) + '</h3><p>' + esc(step[1]) + '</p></div></div>';
            }).join('') + '</div></div></section>';
        },
        hours: function () {
          return '<section class="m-sec" id="hours"><div class="m-wrap m-narrow">' +
            '<h2>' + esc(ctx.label('hours')) + '</h2>' +
            '<div class="m-contact">' + ctx.findUs.join('') + '</div></div></section>';
        },
        testimonials: function () {
          return '<section class="m-sec"><div class="m-wrap">' +
            '<p class="m-quote">&ldquo;' + esc(ctx.quote) + '&rdquo;</p>' +
            '<p class="m-note">Example testimonial layout &mdash; no real review is shown</p>' +
            '</div></section>';
        },
        faq: function () {
          return '<section class="m-sec" id="faq"><div class="m-wrap m-narrow">' +
            '<h2>' + esc(ctx.label('faq')) + '</h2><div class="m-rows">' +
            c.faq.map(function (pair, i) {
              return '<div class="m-row"><span class="m-num">' + ('0' + (i + 1)) +
                '</span><div><h3>' + esc(pair[0]) + '</h3><p>' + esc(pair[1]) + '</p></div></div>';
            }).join('') + '</div></div></section>';
        },
        contact: function () {
          return '<section class="m-sec" id="contact"><div class="m-wrap m-narrow">' +
            '<h2>' + esc(ctx.contactHeading) + '</h2>' +
            '<p class="m-sub">' + esc(ctx.contactSub) + '</p>' +
            '<div class="m-contact">' + ctx.contactLines.join('') + '</div>' +
            '</div></section>';
        }
      };
      out.push(emitSections(ctx, parts));

      out.push('<footer class="m-foot"><div class="m-wrap">' + esc(c.name) +
        (c.city ? ' &middot; ' + esc(c.city) : '') + '</div></footer>');
      return out.join('');
    },

    rows: function (ctx, kind) {
      var c = ctx.c;
      var items = kind === 'products' ? c.products : c.services;
      var isExample = kind === 'products' ? c.productIsExample : c.serviceIsExample;
      return '<section class="m-sec" id="' + kind + '"><div class="m-wrap m-narrow">' +
        '<h2>' + esc(ctx.label(kind)) + '</h2>' +
        (isExample ? '<p class="m-sub">Example ' + esc(c.category.exampleKind) +
          ' &mdash; add your own in your details</p>' : '') +
        '<div class="m-rows">' +
        items.slice(0, 5).map(function (item, i) {
          return '<div class="m-row"><span class="m-num">' + ('0' + (i + 1)) +
            '</span><div><h3>' + esc(item) + '</h3><p>' + esc(itemBody(c, item, i)) +
            '</p></div></div>';
        }).join('') + '</div></div></section>';
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 2. Maximalist — full-bleed colour, enormous type, hard shadows          */
  /* ---------------------------------------------------------------------- */
  RENDERERS.maximal = {
    css: function (t, s) {
      return [
        '.x-wrap{max-width:1280px;margin:0 auto;padding:0 32px;}',
        '.x-head{background:' + t.primary + ';color:' + t.onPrimary + ';',
        '  display:flex;align-items:center;justify-content:space-between;gap:18px;',
        '  padding:16px 32px;flex-wrap:wrap;border-bottom:3px solid ' + t.ink + ';}',
        '.x-brand{font-family:' + s.head + ';font-weight:900;font-size:20px;',
        '  text-transform:uppercase;letter-spacing:-.01em;}',
        '.x-nav{display:flex;gap:20px;flex-wrap:wrap;}',
        '.x-nav a{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;}',
        '.x-cta{background:' + t.accent + ';color:' + t.onAccent + ';font-weight:800;',
        '  text-transform:uppercase;font-size:12px;letter-spacing:.08em;padding:12px 20px;',
        '  border-radius:999px;border:2px solid ' + t.ink + ';display:inline-block;}',
        '.x-hero{background:' + t.primary + ';color:' + t.onPrimary + ';padding:64px 0 0;',
        '  border-bottom:3px solid ' + t.ink + ';}',
        '.x-hero h1{font-size:clamp(38px,9cqw,104px);font-weight:900;letter-spacing:-.04em;',
        '  line-height:.92;text-transform:none;}',
        '.x-hero-sub{background:' + t.ink + ';color:' + t.paper + ';padding:18px 22px;',
        '  margin-top:30px;max-width:640px;font-size:17px;line-height:1.45;font-weight:600;}',
        '.x-hero-actions{display:flex;gap:14px;flex-wrap:wrap;margin:30px 0 56px;}',
        '.x-btn{background:' + t.paper + ';color:' + t.ink + ';font-weight:800;',
        '  text-transform:uppercase;font-size:13px;letter-spacing:.07em;padding:16px 26px;',
        '  border:3px solid ' + t.ink + ';box-shadow:7px 7px 0 ' + t.ink + ';display:inline-block;}',
        '.x-btn-ghost{background:transparent;color:' + t.onPrimary + ';',
        '  border-color:' + t.onPrimary + ';box-shadow:none;}',
        '.x-marquee{border-top:3px solid ' + t.ink + ';background:' + t.accent + ';',
        '  color:' + t.onAccent + ';overflow:hidden;white-space:nowrap;padding:12px 0;}',
        '.x-marquee span{display:inline-block;font-weight:900;font-size:19px;',
        '  text-transform:uppercase;letter-spacing:.02em;padding-right:26px;}',
        '.x-marquee-track{display:inline-block;animation:x-slide 24s linear infinite;}',
        '@keyframes x-slide{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
        '.x-sec{padding:72px 0;border-bottom:3px solid ' + t.ink + ';}',
        '.x-sec-alt{background:' + t.surface + ';}',
        '.x-kicker{display:inline-block;background:' + t.ink + ';color:' + t.paper + ';',
        '  font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;',
        '  padding:7px 13px;margin-bottom:22px;}',
        '.x-sec h2{font-size:clamp(26px,5cqw,56px);font-weight:900;letter-spacing:-.03em;',
        '  margin-bottom:12px;}',
        '.x-lead{font-size:17px;font-weight:600;max-width:640px;color:' + t.muted + ';}',
        '.x-blocks{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:40px;}',
        '.x-block{background:' + t.paper + ';border:3px solid ' + t.ink + ';padding:26px;',
        '  box-shadow:8px 8px 0 ' + t.ink + ';}',
        '.x-block b{display:block;font-family:' + s.head + ';font-size:44px;font-weight:900;',
        '  line-height:1;letter-spacing:-.05em;color:' + t.primaryInk + ';margin-bottom:12px;}',
        '.x-block h3{font-size:21px;font-weight:900;margin-bottom:8px;letter-spacing:-.02em;}',
        '.x-block p{font-size:14px;color:' + t.muted + ';font-weight:500;}',
        '.x-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:40px;}',
        '.x-gal .wp-panel{border:3px solid ' + t.ink + ';}',
        '.x-quote{background:' + t.accent + ';color:' + t.onAccent + ';padding:52px 32px;',
        '  border-bottom:3px solid ' + t.ink + ';}',
        '.x-quote p{font-family:' + s.head + ';font-size:clamp(22px,4cqw,40px);font-weight:900;',
        '  letter-spacing:-.03em;line-height:1.12;max-width:900px;}',
        '.x-quote small{display:block;margin-top:18px;font-size:12px;font-weight:800;',
        '  letter-spacing:.1em;text-transform:uppercase;opacity:.85;}',
        '.x-contact{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:34px;}',
        '.x-contact a,.x-contact span{display:block;font-weight:700;font-size:16px;',
        '  padding:14px 0;border-bottom:3px solid ' + t.ink + ';}',
        '.x-foot{background:' + t.ink + ';color:' + t.paper + ';padding:40px 0 18px;overflow:hidden;}',
        '.x-foot-word{font-family:' + s.head + ';font-weight:900;font-size:clamp(40px,13cqw,150px);',
        '  letter-spacing:-.05em;line-height:.82;white-space:nowrap;}',
        '.x-foot small{display:block;margin-top:16px;font-size:12px;letter-spacing:.08em;',
        '  text-transform:uppercase;opacity:.75;}',
        '@container site (max-width:900px){.x-blocks{grid-template-columns:1fr;}',
        '  .x-gal{grid-template-columns:1fr 1fr;}.x-contact{grid-template-columns:1fr;}}',
        '@container site (max-width:560px){.x-wrap{padding:0 20px;}.x-head{padding:14px 20px;}',
        '  .x-nav{display:none;}.x-sec{padding:48px 0;}.x-gal{grid-template-columns:1fr;}',
        '  .x-block{box-shadow:5px 5px 0 ' + t.ink + ';padding:20px;}}',
        '@media (prefers-reduced-motion:reduce){.x-marquee-track{animation:none;}}'
      ].join('\n');
    },

    body: function (ctx) {
      var c = ctx.c, t = ctx.t, out = [];
      var nav = navFor(c, ctx.sections);
      var strip = c.services.concat([c.name]).slice(0, 6);

      out.push('<header class="x-head">' + brandMark(c, ctx.images, 'x-brand') +
        '<nav class="x-nav" aria-label="Main">' +
        nav.map(function (n) { return '<a href="#' + n.id + '">' + esc(n.label) + '</a>'; }).join('') +
        '</nav><a class="x-cta" href="' + ctx.action.href + '"' + ctx.actionRel + '>' +
        esc(ctx.heroCta) + '</a></header>');

      out.push('<section class="x-hero"><div class="x-wrap">' +
        '<h1>' + esc(ctx.heroHeadline) + '</h1>' +
        '<p class="x-hero-sub">' + esc(ctx.heroSub) + '</p>' +
        '<div class="x-hero-actions">' +
        '<a class="x-btn" href="' + ctx.action.href + '"' + ctx.actionRel + '>' + esc(ctx.heroCta) + '</a>' +
        '<a class="x-btn x-btn-ghost" href="#contact">Find us</a>' +
        '</div></div>' +
        '<div class="x-marquee" aria-hidden="true"><div class="x-marquee-track">' +
        strip.concat(strip).map(function (item) {
          return '<span>' + esc(item) + ' &bull;</span>';
        }).join('') + '</div></div></section>');

      if (ctx.mini) {
        out.push(this.blocks(ctx, 'services'));
        return out.join('');
      }

      var self = this;
      var parts = {
        about: function () {
          return '<section class="x-sec x-sec-alt" id="about"><div class="x-wrap">' +
            '<span class="x-kicker">' + esc(ctx.label('about')) + '</span>' +
            '<h2>' + esc(c.name) + '</h2>' +
            c.about.map(function (p) {
              return '<p class="x-lead" style="margin-top:14px">' + esc(p) + '</p>';
            }).join('') + '</div></section>';
        },
        services: function () { return self.blocks(ctx, 'services'); },
        products: function () { return self.blocks(ctx, 'products'); },
        gallery: function () {
          return '<section class="x-sec x-sec-alt" id="gallery"><div class="x-wrap">' +
            '<span class="x-kicker">Gallery</span><h2>' + esc(ctx.label('gallery')) + '</h2>' +
            '<p class="x-lead">' + esc(ctx.imageNote) + '</p><div class="x-gal">' +
            [0, 1, 2].map(function (i) {
              return mediaSlot(c, t, ctx.images, i, { alt: ctx.label('gallery') + ' image ' + (i + 1) });
            }).join('') + '</div></div></section>';
        },
        process: function () {
          return '<section class="x-sec" id="process"><div class="x-wrap">' +
            '<span class="x-kicker">Process</span><h2>' + esc(ctx.label('process')) + '</h2>' +
            '<div class="x-blocks">' + ctx.steps.map(function (step, i) {
              return '<div class="x-block"><b>' + ('0' + (i + 1)) + '</b><h3>' + esc(step[0]) +
                '</h3><p>' + esc(step[1]) + '</p></div>';
            }).join('') + '</div></div></section>';
        },
        hours: function () {
          return '<section class="x-sec" id="hours"><div class="x-wrap">' +
            '<span class="x-kicker">' + esc(ctx.label('hours')) + '</span>' +
            '<h2>' + esc(ctx.label('hours')) + '</h2>' +
            '<div class="x-contact">' + ctx.findUs.join('') + '</div></div></section>';
        },
        testimonials: function () {
          return '<section class="x-quote"><div class="x-wrap"><p>&ldquo;' + esc(ctx.quote) +
            '&rdquo;</p><small>Example testimonial layout &mdash; no real review is shown</small>' +
            '</div></section>';
        },
        faq: function () {
          return '<section class="x-sec" id="faq"><div class="x-wrap">' +
            '<span class="x-kicker">FAQ</span><h2>' + esc(ctx.label('faq')) + '</h2>' +
            '<div class="x-blocks">' + c.faq.map(function (pair, i) {
              return '<div class="x-block"><b>Q' + (i + 1) + '</b><h3>' + esc(pair[0]) +
                '</h3><p>' + esc(pair[1]) + '</p></div>';
            }).join('') + '</div></div></section>';
        },
        contact: function () {
          return '<section class="x-sec x-sec-alt" id="contact"><div class="x-wrap">' +
            '<span class="x-kicker">Contact</span><h2>' + esc(ctx.contactHeading) + '</h2>' +
            '<p class="x-lead">' + esc(ctx.contactSub) + '</p>' +
            '<div class="x-contact">' + ctx.contactLines.join('') + '</div></div></section>';
        }
      };
      out.push(emitSections(ctx, parts));

      out.push('<footer class="x-foot"><div class="x-wrap">' +
        '<div class="x-foot-word">' + esc(c.name) + '</div>' +
        '<small>' + (c.city ? esc(c.city) + ' &middot; ' : '') + 'Website concept preview</small>' +
        '</div></footer>');
      return out.join('');
    },

    blocks: function (ctx, kind) {
      var c = ctx.c;
      var items = kind === 'products' ? c.products : c.services;
      var isExample = kind === 'products' ? c.productIsExample : c.serviceIsExample;
      return '<section class="x-sec" id="' + kind + '"><div class="x-wrap">' +
        '<span class="x-kicker">' + esc(ctx.label(kind)) + '</span>' +
        '<h2>' + esc(ctx.label(kind)) + '</h2>' +
        (isExample ? '<p class="x-lead">Example ' + esc(c.category.exampleKind) +
          ' &mdash; add your own in your details.</p>' : '') +
        '<div class="x-blocks">' + items.slice(0, 4).map(function (item, i) {
          return '<div class="x-block"><b>' + ('0' + (i + 1)) + '</b><h3>' + esc(item) +
            '</h3><p>' + esc(itemBody(c, item, i)) + '</p></div>';
        }).join('') + '</div></div></section>';
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 3. Modern Business — cards, an offer panel, the phone number up top     */
  /* ---------------------------------------------------------------------- */
  RENDERERS.business = {
    css: function (t, s) {
      return [
        '.b-wrap{max-width:1160px;margin:0 auto;padding:0 28px;}',
        '.b-head{position:sticky;top:0;z-index:4;background:' + t.paper + ';',
        '  border-bottom:1px solid ' + t.line + ';box-shadow:0 1px 14px rgba(0,0,0,.05);}',
        '.b-head-in{display:flex;align-items:center;gap:22px;padding:14px 0;}',
        '.b-brand{font-family:' + s.head + ';font-weight:' + Math.max(s.headWeight, 600) + ';',
        '  font-size:19px;letter-spacing:' + s.headTrack + ';text-transform:' + s.headCase + ';}',
        '.b-nav{display:flex;gap:22px;margin-left:auto;}',
        '.b-nav a{font-size:14px;color:' + t.muted + ';font-weight:500;}',
        '.b-nav a:hover{color:' + t.primaryInk + ';}',
        '.b-phone{font-size:14px;font-weight:600;color:' + t.primaryInk + ';}',
        '.b-btn{background:' + t.primary + ';color:' + t.onPrimary + ';font-weight:600;',
        '  font-size:14px;padding:11px 18px;border-radius:10px;display:inline-block;}',
        '.b-btn-soft{background:' + t.primarySoft + ';color:' + t.primaryInk + ';',
        '  border:1px solid ' + t.line + ';}',
        '.b-hero{background:' + t.surface + ';padding:66px 0 72px;',
        '  border-bottom:1px solid ' + t.line + ';}',
        '.b-hero-in{display:grid;grid-template-columns:1.1fr .9fr;gap:44px;align-items:center;}',
        '.b-pill{display:inline-flex;align-items:center;gap:8px;background:' + t.primarySoft + ';',
        '  color:' + t.primaryInk + ';font-size:12px;font-weight:600;padding:7px 14px;',
        '  border-radius:999px;margin-bottom:20px;}',
        '.b-hero h1{font-size:clamp(28px,4.4cqw,46px);line-height:1.1;margin-bottom:18px;}',
        '.b-hero p{font-size:17px;color:' + t.muted + ';line-height:1.6;max-width:30em;}',
        '.b-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px;}',
        '.b-trust{display:flex;gap:18px;flex-wrap:wrap;margin-top:26px;font-size:13px;',
        '  color:' + t.muted + ';}',
        '.b-trust span{display:flex;align-items:center;gap:7px;}',
        '.b-dot{width:7px;height:7px;border-radius:50%;background:' + t.accent + ';flex:none;}',
        '.b-card{background:' + t.paper + ';border:1px solid ' + t.line + ';border-radius:14px;',
        '  padding:26px;box-shadow:0 18px 40px -26px rgba(0,0,0,.45);}',
        '.b-card h2{font-size:18px;margin-bottom:16px;}',
        '.b-card li{display:flex;gap:11px;align-items:flex-start;padding:9px 0;font-size:14px;',
        '  color:' + t.muted + ';border-bottom:1px solid ' + t.line + ';}',
        '.b-card li:last-child{border-bottom:0;}',
        '.b-tick{width:18px;height:18px;border-radius:50%;background:' + t.accentSoft + ';',
        '  color:' + t.accentInk + ';font-size:11px;display:grid;place-items:center;flex:none;',
        '  margin-top:2px;font-weight:700;}',
        '.b-sec{padding:70px 0;}',
        '.b-sec-alt{background:' + t.surface + ';border-block:1px solid ' + t.line + ';}',
        '.b-head-row{text-align:center;max-width:620px;margin:0 auto 42px;}',
        '.b-eyebrow{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;',
        '  color:' + t.accentInk + ';display:block;margin-bottom:12px;}',
        '.b-sec h2{font-size:clamp(23px,3cqw,34px);margin-bottom:12px;}',
        '.b-sec-sub{color:' + t.muted + ';font-size:15px;}',
        '.b-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}',
        '.b-tile{background:' + t.paper + ';border:1px solid ' + t.line + ';border-radius:14px;',
        '  padding:24px;box-shadow:0 12px 30px -24px rgba(0,0,0,.4);}',
        '.b-icon{width:42px;height:42px;border-radius:11px;background:' + t.primarySoft + ';',
        '  color:' + t.primaryInk + ';display:grid;place-items:center;margin-bottom:16px;',
        '  font-weight:700;font-size:15px;}',
        '.b-tile h3{font-size:17px;margin-bottom:8px;}',
        '.b-tile p{font-size:14px;color:' + t.muted + ';}',
        '.b-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}',
        '.b-step{position:relative;padding-left:52px;}',
        '.b-step b{position:absolute;left:0;top:0;width:36px;height:36px;border-radius:50%;',
        '  background:' + t.primary + ';color:' + t.onPrimary + ';display:grid;place-items:center;',
        '  font-size:14px;font-weight:700;}',
        '.b-step h3{font-size:16px;margin-bottom:6px;}',
        '.b-step p{font-size:14px;color:' + t.muted + ';}',
        '.b-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}',
        '.b-gal .wp-panel{border-radius:14px;border:1px solid ' + t.line + ';}',
        '.b-faq{max-width:760px;margin:0 auto;}',
        '.b-faq div{border:1px solid ' + t.line + ';border-radius:12px;padding:18px 20px;',
        '  margin-bottom:12px;background:' + t.paper + ';}',
        '.b-faq h3{font-size:16px;margin-bottom:7px;}',
        '.b-faq p{font-size:14px;color:' + t.muted + ';}',
        '.b-quote{max-width:720px;margin:0 auto;text-align:center;}',
        '.b-quote p{font-size:clamp(18px,2.4cqw,24px);line-height:1.45;}',
        '.b-quote small{display:block;margin-top:16px;font-size:12px;color:' + t.faint + ';',
        '  letter-spacing:.06em;text-transform:uppercase;}',
        '.b-contact{display:grid;grid-template-columns:1fr 1fr;gap:34px;align-items:start;}',
        '.b-detail{display:block;padding:13px 0;border-bottom:1px solid ' + t.line + ';',
        '  font-size:15px;color:' + t.muted + ';}',
        '.b-detail b{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;',
        '  color:' + t.faint + ';margin-bottom:3px;font-weight:600;}',
        '.b-formnote{font-size:12px;color:' + t.faint + ';margin-top:10px;}',
        '.b-foot{background:' + t.surface2 + ';border-top:1px solid ' + t.line + ';',
        '  padding:30px 0;font-size:13px;color:' + t.muted + ';}',
        '.b-foot-in{display:flex;gap:14px;justify-content:space-between;flex-wrap:wrap;}',
        '@container site (max-width:940px){.b-hero-in{grid-template-columns:1fr;gap:32px;}',
        '  .b-grid,.b-steps,.b-gal{grid-template-columns:1fr 1fr;}',
        '  .b-contact{grid-template-columns:1fr;}}',
        '@container site (max-width:600px){.b-wrap{padding:0 18px;}.b-nav,.b-phone{display:none;}',
        '  .b-grid,.b-steps,.b-gal{grid-template-columns:1fr;}.b-sec{padding:48px 0;}',
        '  .b-hero{padding:44px 0 48px;}}'
      ].join('\n');
    },

    body: function (ctx) {
      var c = ctx.c, t = ctx.t, out = [];
      var nav = navFor(c, ctx.sections);

      out.push('<header class="b-head"><div class="b-wrap b-head-in">' +
        brandMark(c, ctx.images, 'b-brand') +
        '<nav class="b-nav" aria-label="Main">' +
        nav.map(function (n) { return '<a href="#' + n.id + '">' + esc(n.label) + '</a>'; }).join('') +
        '</nav>' +
        (c.contact.phone
          ? '<a class="b-phone" href="' + telHref(c.contact.phone) + '">' + esc(c.contact.phone) + '</a>'
          : '') +
        '<a class="b-btn" href="' + ctx.action.href + '"' + ctx.actionRel + '>' +
        esc(ctx.heroCta) + '</a></div></header>');

      var offer = c.services.slice(0, 5);
      out.push('<section class="b-hero"><div class="b-wrap b-hero-in"><div>' +
        (c.city ? '<span class="b-pill"><span class="b-dot"></span>' + esc(c.city) + '</span>' : '') +
        '<h1>' + esc(ctx.heroHeadline) + '</h1>' +
        '<p>' + esc(ctx.heroSub) + '</p>' +
        '<div class="b-actions">' +
        '<a class="b-btn" href="' + ctx.action.href + '"' + ctx.actionRel + '>' + esc(ctx.heroCta) + '</a>' +
        '<a class="b-btn b-btn-soft" href="#contact">See contact details</a></div>' +
        '<div class="b-trust">' +
        ['Talk to us directly', 'Clear about what is included', 'Local to ' + (c.city || 'your area')]
          .map(function (line) {
            return '<span><span class="b-dot"></span>' + esc(line) + '</span>';
          }).join('') +
        '</div></div>' +
        '<div class="b-card"><h2>' + esc(ctx.label('services')) + '</h2><ul>' +
        offer.map(function (item) {
          return '<li><span class="b-tick" aria-hidden="true">&#10003;</span>' + esc(item) + '</li>';
        }).join('') + '</ul>' +
        (c.serviceIsExample
          ? '<p class="b-formnote">Example ' + esc(c.category.exampleKind) +
            ' &mdash; add your own in your details.</p>' : '') +
        '</div></div></section>');

      if (ctx.mini) { out.push(this.tiles(ctx, 'services')); return out.join(''); }

      var self = this;
      var parts = {
        about: function () {
          return '<section class="b-sec" id="about"><div class="b-wrap"><div class="b-head-row">' +
            '<span class="b-eyebrow">' + esc(ctx.label('about')) + '</span>' +
            '<h2>' + esc(c.name) + '</h2>' +
            c.about.map(function (p) {
              return '<p class="b-sec-sub" style="margin-top:10px">' + esc(p) + '</p>';
            }).join('') + '</div></div></section>';
        },
        services: function () { return self.tiles(ctx, 'services'); },
        products: function () { return self.tiles(ctx, 'products'); },
        process: function () {
          return '<section class="b-sec b-sec-alt" id="process"><div class="b-wrap">' +
            '<div class="b-head-row"><span class="b-eyebrow">Process</span>' +
            '<h2>' + esc(ctx.label('process')) + '</h2></div><div class="b-steps">' +
            ctx.steps.map(function (step, i) {
              return '<div class="b-step"><b>' + (i + 1) + '</b><h3>' + esc(step[0]) +
                '</h3><p>' + esc(step[1]) + '</p></div>';
            }).join('') + '</div></div></section>';
        },
        gallery: function () {
          return '<section class="b-sec" id="gallery"><div class="b-wrap">' +
            '<div class="b-head-row"><span class="b-eyebrow">Gallery</span>' +
            '<h2>' + esc(ctx.label('gallery')) + '</h2>' +
            '<p class="b-sec-sub">' + esc(ctx.imageNote) + '</p></div><div class="b-gal">' +
            [0, 1, 2].map(function (i) {
              return mediaSlot(c, t, ctx.images, i, { alt: ctx.label('gallery') + ' image ' + (i + 1) });
            }).join('') + '</div></div></section>';
        },
        hours: function () {
          return '<section class="b-sec" id="hours"><div class="b-wrap">' +
            '<div class="b-head-row"><span class="b-eyebrow">' + esc(ctx.label('hours')) +
            '</span><h2>' + esc(ctx.label('hours')) + '</h2></div>' +
            '<div class="b-card" style="max-width:640px;margin:0 auto">' +
            ctx.findUs.map(function (line) {
              return '<p class="b-detail">' + line + '</p>';
            }).join('') + '</div></div></section>';
        },
        testimonials: function () {
          return '<section class="b-sec b-sec-alt"><div class="b-wrap"><div class="b-quote">' +
            '<p>&ldquo;' + esc(ctx.quote) + '&rdquo;</p>' +
            '<small>Example testimonial layout &mdash; no real review is shown</small>' +
            '</div></div></section>';
        },
        faq: function () {
          return '<section class="b-sec" id="faq"><div class="b-wrap">' +
            '<div class="b-head-row"><span class="b-eyebrow">FAQ</span>' +
            '<h2>' + esc(ctx.label('faq')) + '</h2></div><div class="b-faq">' +
            c.faq.map(function (pair) {
              return '<div><h3>' + esc(pair[0]) + '</h3><p>' + esc(pair[1]) + '</p></div>';
            }).join('') + '</div></div></section>';
        },
        contact: function () {
          return '<section class="b-sec b-sec-alt" id="contact">' +
            '<div class="b-wrap b-contact"><div>' +
            '<span class="b-eyebrow">Contact</span><h2>' + esc(ctx.contactHeading) + '</h2>' +
            '<p class="b-sec-sub" style="margin:10px 0 20px">' + esc(ctx.contactSub) + '</p>' +
            ctx.contactDetails.join('') + '</div>' +
            '<div class="b-card"><h2>Send an enquiry</h2>' +
            '<div class="wp-fauxform">' +
            '<input type="text" value="Your name" disabled aria-hidden="true" />' +
            '<input type="text" value="Phone or email" disabled aria-hidden="true" />' +
            '<textarea rows="3" disabled aria-hidden="true">What you need</textarea>' +
            '<span class="b-btn" style="text-align:center">Send enquiry</span></div>' +
            '<p class="b-formnote">Enquiry form &mdash; preview only. It is not connected to ' +
            'anything.</p></div></div></section>';
        }
      };
      out.push(emitSections(ctx, parts));

      out.push('<footer class="b-foot"><div class="b-wrap b-foot-in">' +
        '<span>' + esc(c.name) + (c.city ? ' &middot; ' + esc(c.city) : '') + '</span>' +
        '<span>Website concept preview</span></div></footer>');
      return out.join('');
    },

    tiles: function (ctx, kind) {
      var c = ctx.c;
      var items = kind === 'products' ? c.products : c.services;
      var isExample = kind === 'products' ? c.productIsExample : c.serviceIsExample;
      return '<section class="b-sec" id="' + kind + '"><div class="b-wrap">' +
        '<div class="b-head-row"><span class="b-eyebrow">' + esc(ctx.label(kind)) + '</span>' +
        '<h2>' + esc(ctx.label(kind)) + '</h2>' +
        (isExample ? '<p class="b-sec-sub">Example ' + esc(c.category.exampleKind) +
          ' &mdash; add your own in your details.</p>' : '') +
        '</div><div class="b-grid">' +
        items.slice(0, 6).map(function (item, i) {
          return '<div class="b-tile"><div class="b-icon" aria-hidden="true">' +
            ('0' + (i + 1)) + '</div><h3>' + esc(item) + '</h3><p>' +
            esc(itemBody(c, item, i)) + '</p></div>';
        }).join('') + '</div></div></section>';
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 4. Geometric Editorial — a visible 12-column grid, uneven spans         */
  /* ---------------------------------------------------------------------- */
  RENDERERS.editorial = {
    css: function (t, s) {
      return [
        '.e-grid{max-width:1240px;margin:0 auto;padding:0 30px;',
        '  display:grid;grid-template-columns:repeat(12,1fr);gap:20px;}',
        /* The grid is drawn, not implied. It is the whole idea of this design. */
        '.e-rule{position:relative;}',
        '.e-rule::before{content:"";position:absolute;inset:0;pointer-events:none;',
        '  max-width:1240px;margin:0 auto;left:0;right:0;',
        '  background-image:repeating-linear-gradient(to right,' + t.lineStrong + ' 0 1px,',
        '  transparent 1px calc(100%/12));background-size:calc(100% - 60px) 100%;',
        '  background-position:30px 0;background-repeat:no-repeat;opacity:.16;}',
        '.e-head{border-top:2px solid ' + t.ink + ';border-bottom:1px solid ' + t.line + ';',
        '  padding:16px 0;}',
        '.e-brand{grid-column:1/5;color:' + t.primaryInk + ';font-family:' + s.head + ';font-size:17px;',
        '  font-weight:' + s.headWeight + ';letter-spacing:' + s.headTrack + ';',
        '  text-transform:' + s.headCase + ';align-self:center;}',
        '.e-meta{grid-column:5/8;font-size:11px;letter-spacing:.1em;text-transform:uppercase;',
        '  color:' + t.muted + ';align-self:center;}',
        '.e-nav{grid-column:8/13;display:flex;gap:18px;justify-content:flex-end;',
        '  align-self:center;flex-wrap:wrap;}',
        '.e-nav a{font-size:11px;letter-spacing:.11em;text-transform:uppercase;}',
        '.e-nav a:hover{color:' + t.accentInk + ';}',
        '.e-hero{padding:72px 0 64px;border-bottom:2px solid ' + t.ink + ';}',
        '.e-hero-main{grid-column:1/8;}',
        '.e-hero h1{font-size:clamp(30px,5.4cqw,64px);line-height:1.02;margin-bottom:22px;',
        '  color:' + t.primaryInk + ';}',
        '.e-hero h1 em{font-style:normal;font-family:' + TYPESETS[2].head + ';',
        '  text-transform:none;letter-spacing:-.01em;color:' + t.accentInk + ';}',
        '.e-hero p{font-size:16px;color:' + t.muted + ';max-width:34em;line-height:1.6;}',
        '.e-cap{font-family:' + TYPESETS[4].head + ';font-size:11px;letter-spacing:.12em;',
        '  text-transform:uppercase;color:' + t.muted + ';display:block;margin-bottom:20px;}',
        '.e-hero-side{grid-column:9/13;display:flex;flex-direction:column;',
        '  justify-content:space-between;gap:20px;}',
        '.e-numeral{font-family:' + s.head + ';font-size:clamp(70px,11cqw,150px);line-height:.8;',
        '  font-weight:' + s.headWeight + ';color:transparent;',
        '  -webkit-text-stroke:1px ' + mix(t.paper, t.primary, 0.55) + ';letter-spacing:-.04em;}',
        '.e-act{display:inline-block;border:1px solid ' + t.ink + ';padding:13px 20px;',
        '  font-size:12px;letter-spacing:.1em;text-transform:uppercase;',
        '  background:' + t.accent + ';color:' + t.onAccent + ';border-color:' + t.accent + ';}',
        '.e-act-plain{background:transparent;color:' + t.ink + ';border-color:' + t.ink + ';}',
        '.e-sec{padding:64px 0;border-bottom:1px solid ' + t.line + ';}',
        '.e-t{grid-column:1/5;}',
        '.e-t h2{font-size:clamp(18px,2.2cqw,25px);margin-bottom:10px;}',
        '.e-t p{font-size:13px;color:' + t.muted + ';}',
        '.e-b{grid-column:5/13;}',
        '.e-b-wide{grid-column:1/13;}',
        '.e-b-left{grid-column:1/9;}',
        '.e-b-right{grid-column:9/13;}',
        '.e-mods{display:grid;grid-template-columns:repeat(2,1fr);gap:0;',
        '  border-top:1px solid ' + t.ink + ';border-left:1px solid ' + t.ink + ';}',
        '.e-mod{border-right:1px solid ' + t.ink + ';border-bottom:1px solid ' + t.ink + ';',
        '  padding:24px;}',
        '.e-mod span{font-family:' + TYPESETS[4].head + ';font-size:11px;letter-spacing:.12em;',
        '  color:' + t.accentInk + ';display:block;margin-bottom:12px;}',
        '.e-mod h3{font-size:17px;margin-bottom:8px;}',
        '.e-mod p{font-size:13px;color:' + t.muted + ';line-height:1.55;}',
        '.e-body p{font-size:15px;color:' + t.muted + ';line-height:1.7;margin-bottom:14px;',
        '  max-width:40em;}',
        '.e-figs{display:grid;grid-template-columns:2fr 1fr;gap:20px;}',
        '.e-figs .wp-panel{border:1px solid ' + t.ink + ';}',
        '.e-pull{grid-column:2/12;font-family:' + TYPESETS[2].head + ';',
        '  font-size:clamp(20px,3.2cqw,36px);line-height:1.28;text-transform:none;',
        '  letter-spacing:-.01em;text-indent:-.4em;}',
        '.e-pull small{display:block;margin-top:18px;font-family:' + TYPESETS[4].head + ';',
        '  font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:' + t.muted + ';',
        '  text-indent:0;}',
        '.e-dl{border-top:1px solid ' + t.ink + ';}',
        '.e-dl > div{display:grid;grid-template-columns:1fr 2fr;gap:20px;padding:16px 0;',
        '  border-bottom:1px solid ' + t.line + ';}',
        '.e-dl b{font-family:' + TYPESETS[4].head + ';font-size:11px;letter-spacing:.11em;',
        '  text-transform:uppercase;color:' + t.muted + ';font-weight:400;}',
        '.e-dl p,.e-dl a{font-size:15px;}',
        '.e-foot{padding:34px 0;border-top:2px solid ' + t.ink + ';}',
        '.e-foot div:first-child{grid-column:1/7;font-size:12px;letter-spacing:.06em;',
        '  text-transform:uppercase;}',
        '.e-foot div:last-child{grid-column:9/13;font-size:12px;text-align:right;',
        '  color:' + t.muted + ';letter-spacing:.06em;text-transform:uppercase;}',
        '@container site (max-width:900px){',
        '  .e-hero-main,.e-hero-side,.e-t,.e-b,.e-b-wide,.e-b-left,.e-b-right,.e-pull,',
        '  .e-foot div:first-child,.e-foot div:last-child{grid-column:1/13;}',
        '  .e-foot div:last-child{text-align:left;}',
        '  .e-brand{grid-column:1/8;}.e-meta{display:none;}.e-nav{grid-column:8/13;}',
        '  .e-figs{grid-template-columns:1fr;}}',
        '@container site (max-width:560px){.e-grid{padding:0 18px;gap:14px;}',
        '  .e-mods{grid-template-columns:1fr;}.e-sec{padding:44px 0;}',
        '  .e-hero{padding:48px 0 44px;}.e-nav{display:none;}.e-brand{grid-column:1/13;}',
        '  .e-rule::before{display:none;}}'
      ].join('\n');
    },

    body: function (ctx) {
      var c = ctx.c, t = ctx.t, out = [];
      var nav = navFor(c, ctx.sections);
      var heroWords = esc(ctx.heroHeadline).split(' ');
      var lead = heroWords.slice(0, Math.max(1, heroWords.length - 2)).join(' ');
      var tail = heroWords.slice(Math.max(1, heroWords.length - 2)).join(' ');

      out.push('<header class="e-head e-rule"><div class="e-grid">' +
        brandMark(c, ctx.images, 'e-brand') +
        '<span class="e-meta">' + esc(c.city || c.category.label) + ' &mdash; ' +
        esc(c.category.label.split(' / ')[0]) + '</span>' +
        '<nav class="e-nav" aria-label="Main">' +
        nav.map(function (n) { return '<a href="#' + n.id + '">' + esc(n.label) + '</a>'; }).join('') +
        '</nav></div></header>');

      out.push('<section class="e-hero e-rule"><div class="e-grid">' +
        '<div class="e-hero-main">' +
        '<span class="e-cap">' + esc(c.category.label) + (c.city ? ' / ' + esc(c.city) : '') + '</span>' +
        '<h1>' + lead + ' <em>' + tail + '</em></h1>' +
        '<p>' + esc(ctx.heroSub) + '</p></div>' +
        '<div class="e-hero-side"><div class="e-numeral" aria-hidden="true">01</div>' +
        '<a class="e-act" href="' + ctx.action.href + '"' + ctx.actionRel + '>' +
        esc(ctx.heroCta) + '</a></div></div></section>');

      if (ctx.mini) { out.push(this.modules(ctx, 'services')); return out.join(''); }

      var self = this;
      var parts = {
        about: function () {
          return '<section class="e-sec e-rule" id="about"><div class="e-grid">' +
            '<div class="e-t"><h2>' + esc(ctx.label('about')) + '</h2>' +
            '<p>' + esc(c.category.lead) + '</p></div>' +
            '<div class="e-b e-body">' + c.about.map(function (p) {
              return '<p>' + esc(p) + '</p>';
            }).join('') + '</div></div></section>';
        },
        services: function () { return self.modules(ctx, 'services'); },
        products: function () { return self.modules(ctx, 'products'); },
        gallery: function () {
          return '<section class="e-sec e-rule" id="gallery"><div class="e-grid">' +
            '<div class="e-t"><h2>' + esc(ctx.label('gallery')) + '</h2>' +
            '<p>' + esc(ctx.imageNote) + '</p></div>' +
            '<div class="e-b"><div class="e-figs">' +
            mediaSlot(c, t, ctx.images, 0, { alt: ctx.label('gallery') + ' image 1' }) +
            mediaSlot(c, t, ctx.images, 1, { tall: true, alt: ctx.label('gallery') + ' image 2' }) +
            '</div></div></div></section>';
        },
        process: function () {
          return '<section class="e-sec e-rule" id="process"><div class="e-grid">' +
            '<div class="e-b-wide"><div class="e-mods">' +
            ctx.steps.map(function (step, i) {
              return '<div class="e-mod"><span>' + ('0' + (i + 1)) + '</span><h3>' +
                esc(step[0]) + '</h3><p>' + esc(step[1]) + '</p></div>';
            }).join('') + '</div></div></div></section>';
        },
        hours: function () {
          return '<section class="e-sec e-rule" id="hours"><div class="e-grid">' +
            '<div class="e-t"><h2>' + esc(ctx.label('hours')) + '</h2></div>' +
            '<div class="e-b"><div class="e-dl">' +
            ctx.findUs.map(function (line) {
              return '<div><b>Location</b><p>' + line + '</p></div>';
            }).join('') + '</div></div></div></section>';
        },
        testimonials: function () {
          return '<section class="e-sec e-rule"><div class="e-grid">' +
            '<blockquote class="e-pull">&ldquo;' + esc(ctx.quote) + '&rdquo;' +
            '<small>Example testimonial layout &mdash; no real review is shown</small>' +
            '</blockquote></div></section>';
        },
        faq: function () {
          return '<section class="e-sec e-rule" id="faq"><div class="e-grid">' +
            '<div class="e-t"><h2>' + esc(ctx.label('faq')) + '</h2></div>' +
            '<div class="e-b"><div class="e-dl">' + c.faq.map(function (pair) {
              return '<div><b>' + esc(pair[0]) + '</b><p>' + esc(pair[1]) + '</p></div>';
            }).join('') + '</div></div></div></section>';
        },
        contact: function () {
          return '<section class="e-sec e-rule" id="contact"><div class="e-grid">' +
            '<div class="e-t"><h2>' + esc(ctx.contactHeading) + '</h2>' +
            '<p>' + esc(ctx.contactSub) + '</p>' +
            '<a class="e-act e-act-plain" style="margin-top:18px" href="' + ctx.action.href + '"' +
            ctx.actionRel + '>' + esc(ctx.heroCta) + '</a></div>' +
            '<div class="e-b"><div class="e-dl">' + ctx.contactRows.join('') + '</div></div>' +
            '</div></section>';
        }
      };
      out.push(emitSections(ctx, parts));

      out.push('<footer class="e-foot"><div class="e-grid">' +
        '<div>' + esc(c.name) + '</div><div>Website concept preview</div></div></footer>');
      return out.join('');
    },

    modules: function (ctx, kind) {
      var c = ctx.c;
      var items = kind === 'products' ? c.products : c.services;
      var isExample = kind === 'products' ? c.productIsExample : c.serviceIsExample;
      return '<section class="e-sec e-rule" id="' + kind + '"><div class="e-grid">' +
        '<div class="e-t"><h2>' + esc(ctx.label(kind)) + '</h2>' +
        (isExample ? '<p>Example ' + esc(c.category.exampleKind) + '. Add your own in your details.</p>' : '') +
        '</div><div class="e-b"><div class="e-mods">' +
        items.slice(0, 4).map(function (item, i) {
          return '<div class="e-mod"><span>' + ('0' + (i + 1)) + '</span><h3>' + esc(item) +
            '</h3><p>' + esc(itemBody(c, item, i)) + '</p></div>';
        }).join('') + '</div></div></div></section>';
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 5. Premium — dark, spacious, light serif, hairline rules               */
  /* ---------------------------------------------------------------------- */
  RENDERERS.premium = {
    css: function (t, s) {
      var hair = mix(t.paper, t.accent, 0.42);
      return [
        '.p-wrap{max-width:1180px;margin:0 auto;padding:0 34px;}',
        '.p-narrow{max-width:760px;margin:0 auto;}',
        '.p-head{position:absolute;top:0;left:0;right:0;z-index:3;padding:28px 0;}',
        '.p-head-in{text-align:center;}',
        '.p-brand{font-family:' + TYPESETS[2].head + ';font-size:20px;letter-spacing:.2em;',
        '  text-transform:uppercase;display:inline-block;color:' + t.primaryInk + ';}',
        '.p-nav{display:flex;gap:30px;justify-content:center;margin-top:18px;flex-wrap:wrap;}',
        '.p-nav a{font-size:10px;letter-spacing:.2em;text-transform:uppercase;',
        '  color:' + t.muted + ';}',
        '.p-nav a:hover{color:' + t.accentInk + ';}',
        '.p-hero{position:relative;min-height:92cqh;display:grid;place-items:center;',
        '  text-align:center;padding:150px 0 90px;overflow:hidden;}',
        '.p-hero::after{content:"";position:absolute;inset:0;pointer-events:none;',
        '  background:radial-gradient(120% 82% at 50% 8%,transparent 38%,' +
        (t.mode === 'dark' ? 'rgba(0,0,0,.62)' : 'rgba(0,0,0,.14)') + ' 100%);}',
        '.p-hero-in{position:relative;z-index:1;max-width:820px;}',
        '.p-kicker{font-size:10px;letter-spacing:.34em;text-transform:uppercase;',
        '  color:' + t.accentInk + ';display:block;margin-bottom:34px;}',
        '.p-hero h1{font-size:clamp(32px,5.4cqw,68px);font-weight:300;line-height:1.14;',
        '  letter-spacing:-.005em;margin-bottom:26px;color:' + t.primaryInk + ';}',
        '.p-hero p{font-size:17px;color:' + t.muted + ';line-height:1.75;max-width:33em;',
        '  margin:0 auto;}',
        '.p-outline{display:inline-block;margin-top:42px;border:1px solid ' + t.lineStrong + ';',
        '  padding:16px 34px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;}',
        '.p-outline:hover{border-color:' + t.accentInk + ';color:' + t.accentInk + ';}',
        '.p-hair{height:1px;background:' + hair + ';opacity:.5;max-width:1180px;margin:0 auto;}',
        '.p-sec{padding:118px 0;}',
        '.p-lab{font-size:10px;letter-spacing:.3em;text-transform:uppercase;',
        '  color:' + t.accentInk + ';display:block;margin-bottom:26px;}',
        '.p-sec h2{font-size:clamp(23px,3.2cqw,38px);font-weight:300;line-height:1.24;',
        '  margin-bottom:22px;color:' + t.primaryInk + ';}',
        '.p-sec p{color:' + t.muted + ';font-size:16px;line-height:1.8;}',
        '.p-split{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center;}',
        '.p-list{border-top:1px solid ' + t.line + ';margin-top:46px;}',
        '.p-list > div{padding:26px 0;border-bottom:1px solid ' + t.line + ';',
        '  display:grid;grid-template-columns:70px 1fr;gap:26px;align-items:baseline;}',
        '.p-list b{font-size:10px;letter-spacing:.24em;color:' + t.accentInk + ';font-weight:400;}',
        '.p-list h3{font-size:21px;font-weight:300;margin-bottom:8px;}',
        '.p-list p{font-size:14px;}',
        '.p-panels{display:grid;grid-template-columns:1fr 1fr;gap:26px;}',
        '.p-quote{text-align:center;}',
        '.p-quote p{font-family:' + TYPESETS[2].head + ';font-size:clamp(20px,3cqw,32px);',
        '  font-weight:300;line-height:1.5;color:' + t.ink + ';max-width:22em;margin:0 auto;}',
        '.p-quote small{display:block;margin-top:28px;font-size:10px;letter-spacing:.22em;',
        '  text-transform:uppercase;color:' + t.faint + ';}',
        '.p-dl{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;',
        '  background:' + t.line + ';border:1px solid ' + t.line + ';margin-top:46px;}',
        '.p-dl > div{background:' + t.paper + ';padding:28px;}',
        '.p-dl b{display:block;font-size:10px;letter-spacing:.24em;text-transform:uppercase;',
        '  color:' + t.faint + ';margin-bottom:10px;font-weight:400;}',
        '.p-dl a,.p-dl span{font-size:16px;color:' + t.ink + ';}',
        '.p-foot{padding:64px 0;text-align:center;border-top:1px solid ' + t.line + ';}',
        '.p-foot .p-brand{font-size:15px;}',
        '.p-foot small{display:block;margin-top:16px;font-size:10px;letter-spacing:.2em;',
        '  text-transform:uppercase;color:' + t.faint + ';}',
        '@container site (max-width:900px){.p-split{grid-template-columns:1fr;gap:44px;}',
        '  .p-sec{padding:82px 0;}.p-panels{grid-template-columns:1fr;}',
        '  .p-dl{grid-template-columns:1fr;}}',
        '@container site (max-width:560px){.p-wrap{padding:0 22px;}',
        '  .p-hero{min-height:auto;padding:130px 0 72px;}.p-sec{padding:60px 0;}',
        '  .p-nav{gap:16px;}.p-list > div{grid-template-columns:1fr;gap:6px;}}'
      ].join('\n');
    },

    body: function (ctx) {
      var c = ctx.c, t = ctx.t, out = [];
      var nav = navFor(c, ctx.sections);
      var hair = '<div class="p-hair"></div>';

      out.push('<header class="p-head"><div class="p-wrap p-head-in">' +
        brandMark(c, ctx.images, 'p-brand') +
        '<nav class="p-nav" aria-label="Main">' +
        nav.map(function (n) { return '<a href="#' + n.id + '">' + esc(n.label) + '</a>'; }).join('') +
        '</nav></div></header>');

      out.push('<section class="p-hero"><div class="p-wrap p-hero-in">' +
        '<span class="p-kicker">' + esc(c.city || c.category.label) + '</span>' +
        '<h1>' + esc(ctx.heroHeadline) + '</h1>' +
        '<p>' + esc(ctx.heroSub) + '</p>' +
        '<a class="p-outline" href="' + ctx.action.href + '"' + ctx.actionRel + '>' +
        esc(ctx.heroCta) + '</a></div></section>');

      if (ctx.mini) { out.push(this.list(ctx, 'services')); return out.join(''); }

      var self = this;
      var parts = {
        about: function () {
          return hair + '<section class="p-sec" id="about"><div class="p-wrap p-split"><div>' +
            '<span class="p-lab">' + esc(ctx.label('about')) + '</span>' +
            '<h2>' + esc(c.name) + '</h2>' +
            c.about.map(function (p) {
              return '<p style="margin-top:14px">' + esc(p) + '</p>';
            }).join('') +
            '</div>' + mediaSlot(c, t, ctx.images, 0, { tall: true, alt: 'Image for ' + c.name }) +
            '</div></section>';
        },
        services: function () { return hair + self.list(ctx, 'services'); },
        products: function () { return hair + self.list(ctx, 'products'); },
        gallery: function () {
          return hair + '<section class="p-sec" id="gallery"><div class="p-wrap">' +
            '<span class="p-lab">' + esc(ctx.label('gallery')) + '</span>' +
            '<h2 style="max-width:16em">' + esc(ctx.imageNote) + '</h2>' +
            '<div class="p-panels" style="margin-top:44px">' +
            mediaSlot(c, t, ctx.images, 0, { tall: true, alt: ctx.label('gallery') + ' image 1' }) +
            mediaSlot(c, t, ctx.images, 1, { tall: true, alt: ctx.label('gallery') + ' image 2' }) +
            '</div></div></section>';
        },
        process: function () {
          return hair + '<section class="p-sec" id="process"><div class="p-wrap p-narrow">' +
            '<span class="p-lab">Process</span><h2>' + esc(ctx.label('process')) + '</h2>' +
            '<div class="p-list">' + ctx.steps.map(function (step, i) {
              return '<div><b>' + ('0' + (i + 1)) + '</b><div><h3>' + esc(step[0]) +
                '</h3><p>' + esc(step[1]) + '</p></div></div>';
            }).join('') + '</div></div></section>';
        },
        hours: function () {
          return hair + '<section class="p-sec" id="hours"><div class="p-wrap p-narrow" ' +
            'style="text-align:center">' +
            '<span class="p-lab">' + esc(ctx.label('hours')) + '</span>' +
            '<h2>' + esc(ctx.label('hours')) + '</h2>' +
            '<div class="p-dl" style="text-align:left">' +
            ctx.findUs.map(function (line) {
              return '<div><b>Location</b>' + line + '</div>';
            }).join('') + '</div></div></section>';
        },
        testimonials: function () {
          return hair + '<section class="p-sec"><div class="p-wrap p-quote">' +
            '<p>&ldquo;' + esc(ctx.quote) + '&rdquo;</p>' +
            '<small>Example testimonial layout &mdash; no real review is shown</small>' +
            '</div></section>';
        },
        faq: function () {
          return hair + '<section class="p-sec" id="faq"><div class="p-wrap p-narrow">' +
            '<span class="p-lab">Questions</span><h2>' + esc(ctx.label('faq')) + '</h2>' +
            '<div class="p-list">' + c.faq.map(function (pair, i) {
              return '<div><b>' + ('0' + (i + 1)) + '</b><div><h3>' + esc(pair[0]) +
                '</h3><p>' + esc(pair[1]) + '</p></div></div>';
            }).join('') + '</div></div></section>';
        },
        contact: function () {
          return hair + '<section class="p-sec" id="contact"><div class="p-wrap p-narrow" ' +
            'style="text-align:center">' +
            '<span class="p-lab">Contact</span><h2>' + esc(ctx.contactHeading) + '</h2>' +
            '<p>' + esc(ctx.contactSub) + '</p>' +
            '<div class="p-dl" style="text-align:left">' + ctx.contactCells.join('') + '</div>' +
            '</div></section>';
        }
      };
      out.push(emitSections(ctx, parts));

      out.push('<footer class="p-foot"><div class="p-wrap">' +
        brandMark(c, ctx.images, 'p-brand') +
        '<small>' + (c.city ? esc(c.city) + ' &middot; ' : '') + 'Website concept preview</small>' +
        '</div></footer>');
      return out.join('');
    },

    list: function (ctx, kind) {
      var c = ctx.c;
      var items = kind === 'products' ? c.products : c.services;
      var isExample = kind === 'products' ? c.productIsExample : c.serviceIsExample;
      return '<section class="p-sec" id="' + kind + '"><div class="p-wrap p-narrow">' +
        '<span class="p-lab">' + esc(ctx.label(kind)) + '</span>' +
        '<h2>' + esc(ctx.label(kind)) + '</h2>' +
        (isExample ? '<p>Example ' + esc(c.category.exampleKind) +
          '. Add your own in your details.</p>' : '') +
        '<div class="p-list">' + items.slice(0, 5).map(function (item, i) {
          return '<div><b>' + ('0' + (i + 1)) + '</b><div><h3>' + esc(item) +
            '</h3><p>' + esc(itemBody(c, item, i)) + '</p></div></div>';
        }).join('') + '</div></div></section>';
    }
  };

  /* ====================================================================== */
  /* Rendering a preview                                                    */
  /* ====================================================================== */

  /** Generic, honest process steps. Nothing here claims a policy we were told. */
  function processSteps(content) {
    var cat = content.category;
    var map = {
      construction: [
        ['Site visit', 'We look at the site and understand what you want built.'],
        ['Written estimate', 'Scope and cost, in writing, before anything starts.'],
        ['Build', 'Work proceeds on the agreed plan with regular updates.'],
        ['Handover', 'Final walkthrough and handover.']
      ],
      clinic: [
        ['Book a slot', 'Call or message to find a time that works.'],
        ['Consultation', 'A proper conversation about what is going on.'],
        ['Plan and follow-up', 'What happens next, explained clearly.']
      ],
      education: [
        ['Enquire', 'Tell us what you want to learn and your current level.'],
        ['Join a batch', 'Pick a batch and a schedule that suits you.'],
        ['Learn and practise', 'Sessions plus practice work between them.']
      ],
      homeservices: [
        ['Tell us the problem', 'Describe the job over a call or a message.'],
        ['We visit', 'Someone comes out, looks, and tells you the cost.'],
        ['Job done', 'The work is completed and you are shown what changed.']
      ]
    };
    return map[cat.id] || [
      ['Get in touch', 'Tell us what you need. A call or a message is enough.'],
      ['We talk it through', 'We understand what you want before quoting anything.'],
      ['We get it done', 'Agreed work, on the terms you were told.']
    ];
  }

  /**
   * Assemble everything a template needs. Building it here rather than in each
   * template is what keeps the five compositions different without letting their
   * content drift apart.
   */
  function buildContext(biz, tpl, custom, images, options) {
    var opts = options || {};
    var content = derive(biz);
    var theme = resolveTheme(tpl, custom);
    var set = typeset(custom.typeset || tpl.typeset);

    var enabled = (custom.order && custom.order.length ? custom.order : content.category.sections)
      .filter(function (id) {
        if (custom.sections && Object.prototype.hasOwnProperty.call(custom.sections, id)) {
          return !!custom.sections[id];
        }
        return content.category.sections.indexOf(id) !== -1;
      });

    var action = actionFor(content, custom.primaryAction || content.category.action);
    var hero = custom.hero || {};
    var c = content.contact;

    var rows = [];
    if (c.phone) rows.push(['Phone', esc(c.phone), telHref(c.phone), false]);
    if (c.whatsapp) rows.push(['WhatsApp', esc(c.whatsapp),
      waHref(c.whatsapp, 'Hello ' + content.name + ', I would like to enquire.'), true]);
    if (c.email) rows.push(['Email', esc(c.email), 'mailto:' + esc(c.email), false]);
    if (c.address) rows.push(['Address', esc(c.address), c.maps ? safeUrl(c.maps) : '', !!c.maps]);
    if (c.instagram) rows.push(['Instagram', 'Instagram', safeUrl(c.instagram), true]);
    if (c.facebook) rows.push(['Facebook', 'Facebook', safeUrl(c.facebook), true]);
    if (!rows.length) {
      rows.push(['Contact', 'Add a phone number, WhatsApp number or email in your details ' +
        'and it will appear here.', '', false]);
    }

    function wrap(label, value, href, external, open, close) {
      var inner = href
        ? '<a href="' + href + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
          '>' + value + '</a>'
        : '<span>' + value + '</span>';
      return open + '<b>' + esc(label) + '</b>' + inner + close;
    }

    var ctx = {
      c: content,
      t: theme,
      s: set,
      biz: biz,
      images: images || {},
      sections: enabled,
      mini: !!opts.mini,
      action: action,
      actionRel: action.external ? ' target="_blank" rel="noopener noreferrer"' : '',
      heroHeadline: hero.headline || content.headline,
      heroSub: hero.subheadline || content.subheadline,
      heroCta: hero.ctaLabel || action.label,
      steps: processSteps(content),
      quote: 'This is where a customer review would sit once you have one to show.',
      imageNote: (images && images.shots && images.shots.length)
        ? 'Images you supplied.'
        : 'Drawn placeholders. Your own photographs would go here.',
      contactHeading: content.hasContact ? 'Get in touch' : 'How to reach ' + content.name,
      contactSub: content.city
        ? content.name + ' &mdash; ' + content.city
        : 'The details below appear exactly as you entered them.',
      label: function (id) {
        return (content.category.labels && content.category.labels[id]) || SECTION_LABEL[id];
      }
    };

    /* Four presentations of the same contact rows, one per template's idiom. */
    ctx.contactLines = rows.map(function (r) {
      return r[2]
        ? '<a href="' + r[2] + '"' + (r[3] ? ' target="_blank" rel="noopener noreferrer"' : '') +
          '>' + r[1] + '</a>'
        : '<span>' + r[1] + '</span>';
    });
    ctx.contactDetails = rows.map(function (r) {
      return wrap(r[0], r[1], r[2], r[3], '<div class="b-detail">', '</div>');
    });
    ctx.contactRows = rows.map(function (r) {
      return wrap(r[0], r[1], r[2], r[3], '<div>', '</div>');
    });
    ctx.contactCells = rows.map(function (r) {
      return wrap(r[0], r[1], r[2], r[3], '<div>', '</div>');
    });

    /* "Find us" shows the address and the map link -- the location facts the
       wizard actually collects. It used to be labelled "Hours & location",
       which promised opening times nothing ever asked the visitor for. */
    var place = [];
    if (c.address) {
      place.push(c.maps
        ? '<a href="' + safeUrl(c.maps) + '" target="_blank" rel="noopener noreferrer">' +
          esc(c.address) + '</a>'
        : '<span>' + esc(c.address) + '</span>');
    } else if (content.city) {
      place.push('<span>' + esc(content.name + ' &mdash; ' + content.city) + '</span>');
    }
    if (c.maps && !c.address) {
      place.push('<a href="' + safeUrl(c.maps) + '" target="_blank" rel="noopener noreferrer">' +
        'Open in Google Maps</a>');
    }
    if (!place.length) {
      place.push('<span>Add your address in your details and it will appear here.</span>');
    }
    ctx.findUs = place;
    ctx.contactLines = ctx.contactLines.length ? ctx.contactLines : ['<span>&mdash;</span>'];

    /* The contact block is always reachable even when the visitor switched it
       off, because a website with a CTA and no contact anchor is a dead end. */
    if (enabled.indexOf('contact') === -1) enabled.push('contact');
    return ctx;
  }

  /** Produce the full document fragment for one preview. */
  function renderSite(biz, tpl, custom, images, options) {
    var ctx = buildContext(biz, tpl, custom, images, options);
    var renderer = RENDERERS[tpl.family] || RENDERERS.minimal;
    var css = baseCss(ctx.t, ctx.s) + '\n' + renderer.css(ctx.t, ctx.s);
    var stamp = options && options.mini
      ? ''
      : '<div class="wp-stamp">Website concept preview &mdash; not a live website</div>';
    var body = '<div class="wp-site">' + renderer.body(ctx) + stamp + '</div>';
    return { css: css, html: body, ctx: ctx };
  }

  /**
   * Paint a preview into a host element's shadow root.
   *
   * The host carries `container-type: inline-size`, which is what makes every
   * @container rule in the template describe the frame rather than the window.
   * Browsers without container query support get the desktop composition, which
   * is a degraded preview rather than a broken one.
   */
  function paint(host, biz, tpl, custom, images, options) {
    var shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    var result;
    try {
      result = renderSite(biz, tpl, custom, images, options);
    } catch (error) {
      shadow.innerHTML = '<div style="padding:28px;font:15px/1.6 system-ui;color:#555">' +
        'This preview could not be drawn.</div>';
      if (window.console && console.error) console.error('[website-preview]', error);
      return null;
    }
    shadow.innerHTML = '<style>' + result.css + '</style>' + result.html;
    host.style.containerType = 'inline-size';
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label',
      result.ctx.c.name + ' shown in the ' + tpl.name + ' design — a preview, not a live website');
    return result;
  }

  /* ====================================================================== */
  /* Persistence                                                            */
  /*                                                                        */
  /* One interface, one local implementation. A later phase can swap in a     */
  /* server-backed repository without the screens knowing, which is the only  */
  /* thing brief section 46 asks for -- so there is no speculative queue, no  */
  /* sync layer and no fake network call here.                               */
  /* ====================================================================== */

  var KEYS = {
    business: 'muco.wp.business.v1',
    selection: 'muco.wp.selection.v1',
    custom: 'muco.wp.custom.v1',
    step: 'muco.wp.step.v1',
    approved: 'muco.wp.approved.v1',
    images: 'muco.wp.images.v1'
  };

  /* Images are data URLs and can be large. They go to sessionStorage, under a
     cap, and the visitor is told plainly when they will not survive a refresh
     rather than being quietly surprised by it. */
  var IMAGE_BUDGET = 1500000;

  function safeStore(kind) {
    try {
      var store = kind === 'session' ? window.sessionStorage : window.localStorage;
      var probe = '__wp_probe__';
      store.setItem(probe, '1');
      store.removeItem(probe);
      return store;
    } catch (error) {
      return null;
    }
  }

  function LocalPreviewRepository() {
    var local = safeStore('local');
    var session = safeStore('session');
    this.available = !!local;
    this.imagesPersist = !!session;

    function read(store, key, fallback) {
      if (!store) return fallback;
      try {
        var raw = store.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (error) { return fallback; }
    }
    function write(store, key, value) {
      if (!store) return false;
      try {
        if (value == null) store.removeItem(key);
        else store.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) { return false; }
    }

    this.loadDraft = function () { return read(local, KEYS.business, null); };
    this.saveDraft = function (draft) { return write(local, KEYS.business, draft); };
    this.loadSelection = function () { return read(local, KEYS.selection, null); };
    this.saveSelection = function (sel) { return write(local, KEYS.selection, sel); };
    this.loadCustomizations = function () { return read(local, KEYS.custom, {}) || {}; };
    this.saveCustomizations = function (all) { return write(local, KEYS.custom, all); };
    this.loadStep = function () { return read(local, KEYS.step, null); };
    this.saveStep = function (step) { return write(local, KEYS.step, step); };
    this.loadApproval = function () { return read(local, KEYS.approved, null); };
    this.saveApproval = function (record) { return write(local, KEYS.approved, record); };
    this.loadImages = function () { return read(session, KEYS.images, { logo: '', shots: [] }); };
    this.saveImages = function (images) {
      var payload = JSON.stringify(images || {});
      if (payload.length > IMAGE_BUDGET) return false;
      return write(session, KEYS.images, images);
    };
    this.clear = function () {
      Object.keys(KEYS).forEach(function (name) {
        write(local, KEYS[name], null);
        write(session, KEYS[name], null);
      });
    };
  }

  var repo = new LocalPreviewRepository();

  function blankBusiness() {
    return {
      businessName: '', category: '', location: '', tagline: '', description: '',
      services: [], products: [], address: '', phone: '', whatsapp: '', email: '',
      instagram: '', facebook: '', mapsUrl: '',
      language: 'en', preferredMode: 'recommended', preferredPrimaryColor: ''
    };
  }

  /**
   * Template defaults, with the two brand preferences the visitor expressed in
   * the wizard folded in. Customisations are keyed by template id, so returning
   * to a design you customised earlier restores that design -- not the one you
   * were looking at a moment ago. That separation is brief section 19, and it is
   * the reason this function takes the template as an argument.
   */
  function defaultCustomization(tpl, biz) {
    var cat = category(biz.category);
    var mode = resolveMode(tpl, biz.preferredMode);
    var base = tpl.palettes[mode];
    var primary = isHex(biz.preferredPrimaryColor) ? biz.preferredPrimaryColor : base.primary;
    var sections = {};
    SECTIONS.forEach(function (id) { sections[id] = cat.sections.indexOf(id) !== -1; });
    return {
      templateId: tpl.id,
      mode: biz.preferredMode === 'recommended' ? 'recommended' : mode,
      colors: {
        primary: primary,
        accent: isHex(biz.preferredPrimaryColor)
          ? rotateHue(biz.preferredPrimaryColor, 168) : base.accent
      },
      typeset: tpl.typeset,
      hero: { headline: '', subheadline: '', ctaLabel: '', align: 'left' },
      sections: sections,
      order: cat.sections.slice(),
      primaryAction: cat.action
    };
  }

  /** The single mutable record the screens read from. */
  var state = {
    business: repo.loadDraft() || blankBusiness(),
    selection: repo.loadSelection(),
    customs: repo.loadCustomizations(),
    step: repo.loadStep() || 'intro',
    images: repo.loadImages() || { logo: '', shots: [] },
    approved: repo.loadApproval(),
    imagesDropped: false,
    device: 'desktop'
  };

  function activeTemplate() {
    return template(state.selection && state.selection.templateId);
  }

  function customFor(tpl) {
    if (!state.customs[tpl.id]) {
      state.customs[tpl.id] = defaultCustomization(tpl, state.business);
    }
    return state.customs[tpl.id];
  }

  function persist() {
    repo.saveDraft(state.business);
    repo.saveSelection(state.selection);
    repo.saveCustomizations(state.customs);
    repo.saveStep(state.step);
    if (!repo.saveImages(state.images)) state.imagesDropped = true;
  }

  function hasRequired() {
    var b = state.business;
    return !!(b.businessName && b.category && b.location);
  }

  /* ====================================================================== */
  /* Studio shell and routing                                               */
  /*                                                                        */
  /* Steps live in the fragment, so back and forward work, a refresh lands   */
  /* where you were, and the static marketing content above stays in the     */
  /* document for anything that never runs the router.                       */
  /* ====================================================================== */

  var STEPS = ['intro', 'create', 'designs', 'preview', 'customize', 'approve'];
  var landing = Array.prototype.slice.call(document.querySelectorAll('[data-wp-landing]'));
  var liveRegion = el('p', { class: 'wp-live visually-hidden', 'aria-live': 'polite' });
  var screen = el('div', { class: 'wp-screen' });
  mount.textContent = '';
  mount.appendChild(liveRegion);
  mount.appendChild(screen);

  function announce(message) { liveRegion.textContent = message; }

  /* The studio lives inside its own band. Hiding only the inner div would leave
     the band's 112px of padding behind as an unexplained gap. */
  var studioBand = mount.closest('section') || mount;

  function setLandingVisible(visible) {
    landing.forEach(function (node) {
      if (visible) node.removeAttribute('hidden');
      else node.setAttribute('hidden', '');
    });
    studioBand.hidden = visible;
  }

  function stepFromHash() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    return STEPS.indexOf(raw) === -1 ? 'intro' : raw;
  }

  var navigating = false;
  function go(step, replace) {
    if (STEPS.indexOf(step) === -1) step = 'intro';
    /* pushState rather than assigning location.hash, because the landing state
       should be a clean URL rather than a dangling "#". It also does not fire
       hashchange, so the router runs once per navigation instead of twice. */
    var target = step === 'intro'
      ? location.pathname + location.search
      : location.pathname + location.search + '#/' + step;
    navigating = true;
    try {
      if (replace) history.replaceState(null, '', target);
      else history.pushState(null, '', target);
    } catch (error) {
      location.hash = step === 'intro' ? '' : '/' + step;
    }
    navigating = false;
    render(step);
  }

  window.addEventListener('popstate', function () { render(stepFromHash()); });

  window.addEventListener('hashchange', function () {
    if (navigating) return;
    render(stepFromHash());
  });

  /* Shared furniture ----------------------------------------------------- */

  function crumb(current) {
    var order = [
      ['create', 'Your details'], ['designs', 'Designs'],
      ['preview', 'Preview'], ['customize', 'Customise'], ['approve', 'Approve']
    ];
    var reached = order.map(function (pair) { return pair[0]; }).indexOf(current);
    return '<nav class="wp-flow" aria-label="Where you are"><ol>' +
      order.map(function (pair, i) {
        var done = i < reached;
        var here = i === reached;
        return '<li' + (here ? ' aria-current="step"' : '') +
          ' class="' + (done ? 'is-done' : here ? 'is-here' : 'is-todo') + '">' +
          '<span class="wp-flow-n">' + (i + 1) + '</span>' + esc(pair[1]) + '</li>';
      }).join('') + '</ol></nav>';
  }

  function bar(title, note) {
    return '<div class="wp-bar"><div><h2 class="wp-bar-title" tabindex="-1">' + title + '</h2>' +
      (note ? '<p class="wp-bar-note">' + note + '</p>' : '') + '</div>' +
      '<div class="wp-bar-actions" data-bar-actions></div></div>';
  }

  function focusHeading() {
    var heading = screen.querySelector('.wp-bar-title, h2');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  function storageNotice() {
    var notes = [];
    if (!repo.available) {
      notes.push('This browser is not letting the page store anything, so your ' +
        'progress will not survive a refresh. Everything else still works.');
    }
    if (state.imagesDropped) {
      notes.push('Your images are too large to keep for a refresh. They are still ' +
        'shown now, but you would need to add them again after reloading.');
    }
    if (!notes.length) return '';
    return '<p class="wp-notice" role="status">' + notes.map(esc).join(' ') + '</p>';
  }

  /* ====================================================================== */
  /* Step 1 — the wizard                                                    */
  /* ====================================================================== */

  var WIZARD_STEPS = [
    { id: 'business', label: 'Business' },
    { id: 'details', label: 'Details' },
    { id: 'contact', label: 'Contact' },
    { id: 'brand', label: 'Brand' },
    { id: 'review', label: 'Review' }
  ];
  var wizardIndex = 0;
  var fieldErrors = {};

  var VALIDATORS = {
    businessName: function (v) {
      return v.trim() ? '' : 'Enter the name your customers know you by.';
    },
    category: function (v) {
      return v ? '' : 'Choose the closest category. You can change it later.';
    },
    location: function (v) {
      return v.trim() ? '' : 'Enter the town or city your customers are in.';
    },
    email: function (v) {
      if (!v.trim()) return '';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
        ? '' : 'That does not look like an email address. Check for a missing @ or dot.';
    },
    phone: function (v) { return phoneError(v); },
    whatsapp: function (v) { return phoneError(v); },
    instagram: function (v) { return urlError(v); },
    facebook: function (v) { return urlError(v); },
    mapsUrl: function (v) { return urlError(v); }
  };

  function phoneError(value) {
    if (!value.trim()) return '';
    var digits = value.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      return 'Enter a phone number between 7 and 15 digits, with or without the country code.';
    }
    return '';
  }

  function urlError(value) {
    if (!value.trim()) return '';
    return safeUrl(value) ? '' : 'Enter a full web address, for example https://example.com';
  }

  function validateStep(index) {
    var required = { 0: ['businessName', 'category', 'location'], 1: [], 2: [], 3: [], 4: [] };
    var optional = { 0: [], 1: [], 2: ['phone', 'whatsapp', 'email', 'instagram', 'facebook', 'mapsUrl'], 3: [], 4: [] };
    var names = (required[index] || []).concat(optional[index] || []);
    fieldErrors = {};
    names.forEach(function (name) {
      var check = VALIDATORS[name];
      if (!check) return;
      var message = check(String(state.business[name] || ''));
      if (message) fieldErrors[name] = message;
    });
    return Object.keys(fieldErrors).length === 0;
  }

  function field(name, label, options) {
    var opts = options || {};
    var id = 'wp-' + name;
    var value = state.business[name] || '';
    var error = fieldErrors[name];
    var describedBy = [];
    if (opts.hint) describedBy.push(id + '-hint');
    if (error) describedBy.push(id + '-err');
    var attrs = ' id="' + id + '" name="' + name + '"' +
      (describedBy.length ? ' aria-describedby="' + describedBy.join(' ') + '"' : '') +
      (error ? ' aria-invalid="true"' : '') +
      (opts.required ? ' required' : '') +
      (opts.type ? ' type="' + opts.type + '"' : ' type="text"') +
      (opts.autocomplete ? ' autocomplete="' + opts.autocomplete + '"' : '') +
      (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : '');

    var control;
    if (opts.textarea) {
      control = '<textarea id="' + id + '" name="' + name + '" rows="4"' +
        (describedBy.length ? ' aria-describedby="' + describedBy.join(' ') + '"' : '') +
        '>' + esc(value) + '</textarea>';
    } else if (opts.select) {
      control = '<select id="' + id + '" name="' + name + '"' +
        (describedBy.length ? ' aria-describedby="' + describedBy.join(' ') + '"' : '') +
        (error ? ' aria-invalid="true"' : '') + '>' +
        '<option value="">Choose a category</option>' +
        CATEGORIES.map(function (cat) {
          return '<option value="' + cat.id + '"' + (value === cat.id ? ' selected' : '') + '>' +
            esc(cat.label) + '</option>';
        }).join('') + '</select>';
    } else {
      control = '<input' + attrs + ' value="' + esc(value) + '" />';
    }

    return '<div class="wp-field' + (error ? ' has-error' : '') + '">' +
      '<label for="' + id + '">' + esc(label) +
      (opts.required ? ' <span class="wp-req">required</span>' : '') + '</label>' +
      control +
      (opts.hint ? '<p class="wp-hint" id="' + id + '-hint">' + esc(opts.hint) + '</p>' : '') +
      (error ? '<p class="wp-error" id="' + id + '-err">' + esc(error) + '</p>' : '') +
      '</div>';
  }

  function chipList(name, label, hint) {
    var items = state.business[name] || [];
    return '<div class="wp-field"><label for="wp-add-' + name + '">' + esc(label) + '</label>' +
      '<div class="wp-add"><input type="text" id="wp-add-' + name + '" data-chip-input="' + name +
      '" aria-describedby="wp-add-' + name + '-hint" />' +
      '<button type="button" class="btn btn-secondary" data-chip-add="' + name + '">Add</button></div>' +
      '<p class="wp-hint" id="wp-add-' + name + '-hint">' + esc(hint) + '</p>' +
      (items.length
        ? '<ul class="wp-chips">' + items.map(function (item, i) {
            return '<li><span>' + esc(item) + '</span><button type="button" ' +
              'data-chip-remove="' + name + '" data-index="' + i + '" ' +
              'aria-label="Remove ' + esc(item) + '">&times;</button></li>';
          }).join('') + '</ul>'
        : '<p class="wp-empty">Nothing added yet. The preview will show example ' +
          esc(category(state.business.category).exampleKind) + ' instead.</p>') +
      '</div>';
  }

  function wizardPanel() {
    var b = state.business;
    switch (wizardIndex) {
      case 0:
        return '<h3 class="wp-step-title">Tell us about your business</h3>' +
          '<p class="wp-step-sub">Three things are enough to draw something real. ' +
          'Everything after this is optional.</p>' +
          field('businessName', 'Business name', { required: true, autocomplete: 'organization',
            hint: 'Exactly as you would write it on a signboard.' }) +
          field('category', 'Category', { required: true, select: true,
            hint: 'This decides which sections each design starts with.' }) +
          field('location', 'City or town', { required: true, autocomplete: 'address-level2',
            hint: 'Where your customers are. It appears on the page.' }) +
          field('tagline', 'Tagline', {
            hint: 'Optional. Leave it blank and we will write a headline from your name and category.' });
      case 1:
        return '<h3 class="wp-step-title">What you offer</h3>' +
          '<p class="wp-step-sub">All optional. Anything you skip is filled with a clearly ' +
          'marked example rather than an invented claim.</p>' +
          field('description', 'Short description', { textarea: true,
            hint: 'One or two sentences about the business, in your own words.' }) +
          chipList('services', 'Main services',
            'Add them one at a time. Press Enter or use Add.') +
          chipList('products', 'Main products',
            'Optional. Useful for shops, bakeries and anywhere with a counter.') +
          field('address', 'Address', { autocomplete: 'street-address',
            hint: 'Optional. Shown in the contact section if you add it.' });
      case 2:
        return '<h3 class="wp-step-title">How customers reach you</h3>' +
          '<p class="wp-step-sub">None of this is required to see your designs, and none of ' +
          'it is sent anywhere. It only makes the buttons in the preview do something real.</p>' +
          field('phone', 'Phone', { type: 'tel', inputmode: 'tel', autocomplete: 'tel',
            hint: 'Used by the Call button in the preview.' }) +
          field('whatsapp', 'WhatsApp number', { type: 'tel', inputmode: 'tel',
            hint: 'A ten-digit Indian number gets +91 added automatically.' }) +
          field('email', 'Email', { type: 'email', autocomplete: 'email' }) +
          field('instagram', 'Instagram', { type: 'url' }) +
          field('facebook', 'Facebook', { type: 'url' }) +
          field('mapsUrl', 'Google Maps link', { type: 'url',
            hint: 'Used by the Get directions action.' });
      case 3:
        return '<h3 class="wp-step-title">Your brand</h3>' +
          '<p class="wp-step-sub">All optional. Files stay in this browser &mdash; nothing is ' +
          'uploaded anywhere.</p>' +
          '<div class="wp-field"><label for="wp-logo">Logo</label>' +
          '<input type="file" id="wp-logo" accept="image/png,image/jpeg,image/webp" data-file="logo" />' +
          '<p class="wp-hint" id="wp-logo-hint">PNG, JPG or WEBP, up to 3 MB. No logo? The preview ' +
          'sets your business name in each design&rsquo;s own typeface.</p>' +
          (state.images.logo
            ? '<div class="wp-thumbs"><span class="wp-thumb"><img src="' + esc(state.images.logo) +
              '" alt="The logo you added" /><button type="button" data-file-clear="logo" ' +
              'aria-label="Remove the logo">&times;</button></span></div>'
            : '') +
          '<p class="wp-error" data-file-error="logo" hidden></p></div>' +

          '<div class="wp-field"><label for="wp-shots">Business or product images</label>' +
          '<input type="file" id="wp-shots" accept="image/png,image/jpeg,image/webp" multiple ' +
          'data-file="shots" />' +
          '<p class="wp-hint">Up to four, 3 MB each. Without them the preview draws its own ' +
          'placeholder panels rather than showing a stock photograph of somebody else&rsquo;s shop.</p>' +
          (state.images.shots.length
            ? '<div class="wp-thumbs">' + state.images.shots.map(function (src, i) {
                return '<span class="wp-thumb"><img src="' + esc(src) + '" alt="Image ' + (i + 1) +
                  ' you added" /><button type="button" data-file-clear="shots" data-index="' + i +
                  '" aria-label="Remove image ' + (i + 1) + '">&times;</button></span>';
              }).join('') + '</div>'
            : '') +
          '<p class="wp-error" data-file-error="shots" hidden></p></div>' +

          '<div class="wp-field"><label for="wp-colour">Preferred main colour</label>' +
          '<div class="wp-colour"><input type="color" id="wp-colour" name="preferredPrimaryColor" ' +
          'value="' + esc(isHex(b.preferredPrimaryColor) ? b.preferredPrimaryColor : '#cf9061') + '" />' +
          '<input type="text" data-colour-text value="' + esc(b.preferredPrimaryColor) + '" ' +
          'placeholder="#RRGGBB" aria-label="Main colour as a hex value" spellcheck="false" />' +
          (b.preferredPrimaryColor
            ? '<button type="button" class="btn btn-secondary" data-colour-clear>Use each design&rsquo;s own</button>'
            : '') +
          '</div><p class="wp-hint">Leave it alone and each design uses the palette it was ' +
          'drawn with. Any colour you pick is contrast-checked before it is used.</p></div>' +

          radioGroup('preferredMode', 'Light or dark', [
            ['recommended', 'Recommended', 'Each design uses whichever it was designed for.'],
            ['light', 'Light', 'Force every design onto a light background.'],
            ['dark', 'Dark', 'Force every design onto a dark background.']
          ]) +
          radioGroup('language', 'Language', [
            ['en', 'English', ''],
            ['ta', 'Tamil', 'Recorded for the brief. This preview renders in English.'],
            ['en-ta', 'English + Tamil', 'Recorded for the brief. This preview renders in English.']
          ]);
      default:
        return reviewPanel();
    }
  }

  function radioGroup(name, legend, options) {
    var value = state.business[name];
    return '<fieldset class="wp-field wp-radios"><legend>' + esc(legend) + '</legend>' +
      options.map(function (opt) {
        var id = 'wp-' + name + '-' + opt[0];
        return '<label class="wp-radio" for="' + id + '">' +
          '<input type="radio" id="' + id + '" name="' + name + '" value="' + opt[0] + '"' +
          (value === opt[0] ? ' checked' : '') + ' />' +
          '<span><b>' + esc(opt[1]) + '</b>' +
          (opt[2] ? '<small>' + esc(opt[2]) + '</small>' : '') + '</span></label>';
      }).join('') + '</fieldset>';
  }

  function reviewPanel() {
    var b = state.business;
    var groups = [
      [0, 'Business', [
        ['Name', b.businessName], ['Category', category(b.category).label],
        ['Location', b.location], ['Tagline', b.tagline]
      ]],
      [1, 'Details', [
        ['Description', b.description],
        ['Services', (b.services || []).join(', ')],
        ['Products', (b.products || []).join(', ')],
        ['Address', b.address]
      ]],
      [2, 'Contact', [
        ['Phone', b.phone], ['WhatsApp', b.whatsapp], ['Email', b.email],
        ['Instagram', b.instagram], ['Facebook', b.facebook], ['Maps', b.mapsUrl]
      ]],
      [3, 'Brand', [
        ['Logo', state.images.logo ? 'Added' : ''],
        ['Images', state.images.shots.length ? state.images.shots.length + ' added' : ''],
        ['Main colour', b.preferredPrimaryColor],
        ['Mode', b.preferredMode], ['Language', b.language]
      ]]
    ];
    return '<h3 class="wp-step-title">Check this over</h3>' +
      '<p class="wp-step-sub">Anything blank is fine. The designs will fill it with something ' +
      'clearly marked as an example.</p>' +
      groups.map(function (group) {
        var filled = group[2].filter(function (row) { return row[1]; });
        return '<div class="wp-review"><div class="wp-review-head"><h4>' + esc(group[1]) + '</h4>' +
          '<button type="button" class="wp-linkbtn" data-goto-step="' + group[0] + '">Edit ' +
          esc(group[1].toLowerCase()) + '</button></div>' +
          (filled.length
            ? '<dl>' + filled.map(function (row) {
                return '<div><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></div>';
              }).join('') + '</dl>'
            : '<p class="wp-empty">Nothing added.</p>') + '</div>';
      }).join('');
  }

  function renderWizard() {
    var isLast = wizardIndex === WIZARD_STEPS.length - 1;
    screen.innerHTML = crumb('create') + storageNotice() +
      '<div class="wp-panel-card">' +
      '<nav class="wp-substeps" aria-label="Detail steps"><ol>' +
      WIZARD_STEPS.map(function (step, i) {
        var status = i < wizardIndex ? 'is-done' : i === wizardIndex ? 'is-here' : 'is-todo';
        return '<li class="' + status + '"' + (i === wizardIndex ? ' aria-current="step"' : '') + '>' +
          (i <= wizardIndex
            ? '<button type="button" data-goto-step="' + i + '"><i>' + (i + 1) + '</i>' +
              esc(step.label) + '</button>'
            : '<span><i>' + (i + 1) + '</i>' + esc(step.label) + '</span>') + '</li>';
      }).join('') + '</ol></nav>' +
      '<form class="wp-form" novalidate data-wizard>' + wizardPanel() +
      '<div class="wp-form-actions">' +
      (wizardIndex === 0
        ? '<button type="button" class="btn btn-secondary" data-back-intro>Back</button>'
        : '<button type="button" class="btn btn-secondary" data-prev>Back</button>') +
      '<button type="submit" class="btn btn-accent btn-lg">' +
      (isLast ? 'Generate My Website Concepts' : 'Next') + '</button>' +
      '</div></form></div>' + demoPresets();
    wireWizard();
    focusHeading();
  }

  function demoPresets() {
    if (!/[?&]demo=1(&|$)/.test(location.search)) return '';
    return '<div class="wp-demo"><p><b>Demo presets.</b> Visible because this page was opened ' +
      'with <code>?demo=1</code>. They are for testing the five designs and never appear in ' +
      'the customer flow.</p><div class="wp-demo-row">' +
      DEMOS.map(function (demo, i) {
        return '<button type="button" class="btn btn-secondary" data-demo="' + i + '">' +
          esc(demo.businessName) + '</button>';
      }).join('') + '</div></div>';
  }

  var DEMOS = [
    { businessName: 'SLS Gym', category: 'gym', location: 'Erode',
      services: ['Strength training', 'Weight loss programme', 'Personal training'],
      phone: '6381809844', description: '' },
    { businessName: 'Sri Murugan Bakery', category: 'bakery', location: 'Coimbatore',
      products: ['Cakes to order', 'Daily bread', 'Savoury snacks'],
      phone: '6381809844', description: '' },
    { businessName: 'Sathyam Construction', category: 'construction', location: 'Tamil Nadu',
      services: ['Residential builds', 'Commercial interiors', 'Renovation'],
      phone: '6381809844', description: '' }
  ];

  function wireWizard() {
    var form = screen.querySelector('[data-wizard]');
    if (!form) return;

    form.addEventListener('input', function (event) {
      var target = event.target;
      if (!target.name || target.type === 'file' || target.type === 'radio') return;
      if (target.hasAttribute('data-chip-input')) return;
      state.business[target.name] = target.value;
      if (target.name === 'preferredPrimaryColor') {
        var text = screen.querySelector('[data-colour-text]');
        if (text) text.value = target.value;
      }
      persist();
    });

    form.addEventListener('change', function (event) {
      var target = event.target;
      if (target.type === 'radio' && target.name) {
        state.business[target.name] = target.value;
        persist();
      }
    });

    form.addEventListener('blur', function (event) {
      var target = event.target;
      var check = target.name && VALIDATORS[target.name];
      if (!check) return;
      var message = check(String(target.value || ''));
      if (message) fieldErrors[target.name] = message; else delete fieldErrors[target.name];
      var box = target.closest('.wp-field');
      if (!box) return;
      var existing = box.querySelector('.wp-error');
      if (existing) existing.remove();
      box.classList.toggle('has-error', !!message);
      if (message) {
        target.setAttribute('aria-invalid', 'true');
        box.appendChild(el('p', { class: 'wp-error', id: target.id + '-err', text: message }));
      } else {
        target.removeAttribute('aria-invalid');
      }
    }, true);

    var colourText = screen.querySelector('[data-colour-text]');
    if (colourText) {
      colourText.addEventListener('input', function () {
        if (!isHex(colourText.value)) return;
        state.business.preferredPrimaryColor = colourText.value;
        var picker = screen.querySelector('#wp-colour');
        if (picker) picker.value = colourText.value;
        persist();
      });
    }

    form.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      var target = event.target;
      if (target.hasAttribute && target.hasAttribute('data-chip-input')) {
        event.preventDefault();
        addChip(target.getAttribute('data-chip-input'));
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!validateStep(wizardIndex)) {
        renderWizard();
        var first = screen.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
        announce('Some details need checking.');
        return;
      }
      if (wizardIndex < WIZARD_STEPS.length - 1) {
        wizardIndex++;
        renderWizard();
        announce('Step ' + (wizardIndex + 1) + ' of ' + WIZARD_STEPS.length);
        return;
      }
      if (!state.business.businessName || !state.business.category || !state.business.location) {
        wizardIndex = 0;
        validateStep(0);
        renderWizard();
        announce('Your business name, category and city are still needed.');
        return;
      }
      persist();
      go('designs');
    });

  }

  /* Bound once. Binding it inside wireWizard() would add another listener on
     every re-render, so the fifth click would fire five times. */
  screen.addEventListener('click', function wizardClicks(event) {
    if (!event.target.closest) return;
    var target = event.target.closest('[data-prev],[data-back-intro],[data-goto-step],' +
      '[data-chip-add],[data-chip-remove],[data-file-clear],[data-colour-clear],[data-demo]');
    if (!target || !screen.contains(target)) return;

    if (target.hasAttribute('data-prev')) { wizardIndex--; renderWizard(); return; }
    if (target.hasAttribute('data-back-intro')) { go('intro'); return; }
    if (target.hasAttribute('data-goto-step')) {
      wizardIndex = parseInt(target.getAttribute('data-goto-step'), 10) || 0;
      fieldErrors = {}; renderWizard(); return;
    }
    if (target.hasAttribute('data-chip-add')) {
      addChip(target.getAttribute('data-chip-add')); return;
    }
    if (target.hasAttribute('data-chip-remove')) {
      var name = target.getAttribute('data-chip-remove');
      var index = parseInt(target.getAttribute('data-index'), 10);
      state.business[name].splice(index, 1);
      persist(); renderWizard(); return;
    }
    if (target.hasAttribute('data-file-clear')) {
      var kind = target.getAttribute('data-file-clear');
      if (kind === 'logo') state.images.logo = '';
      else state.images.shots.splice(parseInt(target.getAttribute('data-index'), 10), 1);
      persist(); renderWizard(); return;
    }
    if (target.hasAttribute('data-colour-clear')) {
      state.business.preferredPrimaryColor = '';
      /* A cleared brand colour has to reach the designs, and the designs cache
         their palette per template -- so drop the cached customisations that
         were built from it rather than leaving stale colours behind. */
      state.customs = {};
      persist(); renderWizard(); return;
    }
    if (target.hasAttribute('data-demo')) {
      var demo = DEMOS[parseInt(target.getAttribute('data-demo'), 10)];
      state.business = Object.assign(blankBusiness(), demo);
      state.customs = {};
      persist(); renderWizard();
      announce('Loaded the ' + demo.businessName + ' demo.');
    }
  });

  function addChip(name) {
    var input = screen.querySelector('[data-chip-input="' + name + '"]');
    if (!input) return;
    var value = input.value.trim();
    if (!value) { input.focus(); return; }
    if (!state.business[name]) state.business[name] = [];
    if (state.business[name].length >= 8) {
      announce('Eight is enough for a preview.');
      return;
    }
    state.business[name].push(value);
    persist();
    renderWizard();
    var again = screen.querySelector('[data-chip-input="' + name + '"]');
    if (again) again.focus();
    announce(value + ' added.');
  }

  /* File handling. Read as data URLs, never object URLs: this site ships
     img-src 'self' data:, so a blob: URL would be blocked by the browser. */
  var MAX_FILE = 3 * 1024 * 1024;
  var OK_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

  function fileError(kind, message) {
    var node = screen.querySelector('[data-file-error="' + kind + '"]');
    if (!node) return;
    node.textContent = message;
    node.hidden = !message;
  }

  mount.addEventListener('change', function (event) {
    var input = event.target;
    if (!input.hasAttribute || !input.hasAttribute('data-file')) return;
    var kind = input.getAttribute('data-file');
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    fileError(kind, '');

    var accepted = [];
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (OK_TYPES.indexOf(file.type) === -1) {
        fileError(kind, file.name + ' is not a PNG, JPG or WEBP file.');
        continue;
      }
      if (file.size > MAX_FILE) {
        fileError(kind, file.name + ' is ' + Math.round(file.size / 1048576 * 10) / 10 +
          ' MB. The limit is 3 MB.');
        continue;
      }
      accepted.push(file);
    }
    if (!accepted.length) { input.value = ''; return; }

    var pending = accepted.length;
    accepted.slice(0, kind === 'logo' ? 1 : 4).forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        if (kind === 'logo') state.images.logo = reader.result;
        else if (state.images.shots.length < 4) state.images.shots.push(reader.result);
        if (--pending <= 0) {
          state.imagesDropped = false;
          persist();
          renderWizard();
          announce(kind === 'logo' ? 'Logo added.' : 'Images added.');
        }
      };
      reader.onerror = function () {
        pending--;
        fileError(kind, 'That file could not be read. Try a different one.');
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  });

  /* ====================================================================== */
  /* Frames                                                                 */
  /*                                                                        */
  /* A preview is rendered at a logical width and then scaled to fit. The     */
  /* scale is cosmetic; the LAYOUT is decided by the logical width through    */
  /* the container queries, which is why switching to Mobile produces the     */
  /* mobile composition rather than a shrunken desktop one.                   */
  /* ====================================================================== */

  var DEVICES = {
    desktop: { width: 1280, label: 'Desktop', note: '1280px' },
    tablet: { width: 834, label: 'Tablet', note: '834px' },
    mobile: { width: 390, label: 'Mobile', note: '390px' }
  };

  function Frame(node, logicalWidth) {
    this.node = node;
    this.width = logicalWidth;
    this.scroll = node.querySelector('.wp-scroll');
    this.sizer = node.querySelector('.wp-sizer');
    this.scale = node.querySelector('.wp-scale');
    this.host = node.querySelector('.wp-host');
    this.host.style.width = logicalWidth + 'px';
    this.scale.style.width = logicalWidth + 'px';
    var self = this;
    if (window.ResizeObserver) {
      this.observer = new ResizeObserver(function () { self.fit(); });
      this.observer.observe(this.host);
      this.observer.observe(this.scroll);
    }
  }

  Frame.prototype.setWidth = function (logicalWidth) {
    this.width = logicalWidth;
    this.host.style.width = logicalWidth + 'px';
    this.scale.style.width = logicalWidth + 'px';
    this.fit();
  };

  Frame.prototype.fit = function () {
    var available = this.scroll.clientWidth;
    if (!available) return 1;
    var k = Math.min(1, available / this.width);
    this.scale.style.transform = k === 1 ? 'none' : 'scale(' + k + ')';
    var height = this.host.scrollHeight || this.host.offsetHeight;
    this.sizer.style.width = Math.round(this.width * k) + 'px';
    this.sizer.style.height = Math.round(height * k) + 'px';
    if (this.onScale) this.onScale(k);
    return k;
  };

  Frame.prototype.destroy = function () {
    if (this.observer) this.observer.disconnect();
  };

  function frameMarkup(options) {
    var opts = options || {};
    return '<div class="wp-frame' + (opts.className ? ' ' + opts.className : '') + '"' +
      (opts.device ? ' data-device="' + opts.device + '"' : '') + '>' +
      (opts.chrome === false ? '' :
        '<div class="wp-chrome" aria-hidden="true"><span class="wp-dots"><i></i><i></i><i></i></span>' +
        '<span class="wp-url">' + esc(opts.url || 'example.com') + '</span></div>') +
      '<div class="wp-scroll"><div class="wp-sizer"><div class="wp-scale">' +
      '<div class="wp-host"></div></div></div></div></div>';
  }

  var liveFrames = [];
  function dropFrames() {
    liveFrames.forEach(function (frame) { frame.destroy(); });
    liveFrames = [];
  }

  /* ====================================================================== */
  /* Step 2 — the five concepts                                             */
  /* ====================================================================== */

  function renderDesigns() {
    var chosen = state.selection && state.selection.templateId;
    screen.innerHTML = crumb('designs') + storageNotice() +
      bar('Five directions for ' + esc(state.business.businessName),
        'Every one of these is a real page built from your details, not a picture of one. ' +
        'Open any of them full size, or pick one and start customising.') +
      '<div class="wp-cards">' + TEMPLATES.map(function (tpl, i) {
        var selected = tpl.id === chosen;
        return '<article class="wp-card' + (selected ? ' is-chosen' : '') + '">' +
          '<div class="wp-card-top"><span class="wp-card-n">' + ('0' + (i + 1)) + '</span>' +
          '<div><h3>' + esc(tpl.name) + '</h3><p>' + esc(tpl.blurb) + '</p></div>' +
          (selected ? '<span class="wp-chosen-badge">Chosen</span>' : '') + '</div>' +
          '<div class="wp-card-preview" data-mini="' + tpl.id + '">' +
          frameMarkup({ chrome: true, url: state.business.businessName
            ? slugify(state.business.businessName) + '.com' : 'example.com',
            className: 'wp-frame-mini' }) + '</div>' +
          '<p class="wp-card-detail">' + esc(tpl.detail) + '</p>' +
          '<div class="wp-card-actions">' +
          '<button type="button" class="btn btn-secondary" data-open="' + tpl.id + '">Preview</button>' +
          '<button type="button" class="btn btn-accent" data-choose="' + tpl.id + '" ' +
          'aria-pressed="' + (selected ? 'true' : 'false') + '">' +
          (selected ? 'Chosen' : 'Choose This Design') + '</button></div></article>';
      }).join('') + '</div>' +
      '<div class="wp-after"><button type="button" class="btn btn-secondary" data-edit-details>' +
      'Change my details</button></div>';

    mountMiniPreviews();
    focusHeading();
  }

  /**
   * Mini previews are built as their cards approach the viewport. Painting five
   * complete websites into five shadow roots on first render is exactly the cost
   * the brief warns about, and none of them are visible at that moment anyway.
   */
  function mountMiniPreviews() {
    var slots = Array.prototype.slice.call(screen.querySelectorAll('[data-mini]'));
    var build = function (slot) {
      if (slot.getAttribute('data-built')) return;
      slot.setAttribute('data-built', '1');
      var tpl = template(slot.getAttribute('data-mini'));
      var host = slot.querySelector('.wp-host');
      paint(host, state.business, tpl, customFor(tpl), state.images, { mini: true });
      /* A picture of a website should not put forty links in the tab order of a
         comparison screen. */
      host.setAttribute('aria-hidden', 'true');
      host.removeAttribute('role');
      host.removeAttribute('aria-label');
      if ('inert' in HTMLElement.prototype) host.inert = true;
      var frame = new Frame(slot.querySelector('.wp-frame'), 1280);
      liveFrames.push(frame);
      nextFrame(function () { frame.fit(); });
    };

    if (!window.IntersectionObserver) { slots.forEach(build); return; }
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        build(entry.target);
        watcher.unobserve(entry.target);
      });
    }, { rootMargin: '400px' });
    slots.forEach(function (slot) { watcher.observe(slot); });
  }

  /* ====================================================================== */
  /* Step 3 — full preview                                                  */
  /* ====================================================================== */

  var previewFrame = null;

  function renderPreview() {
    var tpl = activeTemplate();
    var chosen = state.selection && state.selection.templateId === tpl.id;
    screen.innerHTML = crumb('preview') + storageNotice() +
      '<div class="wp-toolbar">' +
      '<button type="button" class="btn btn-secondary" data-back-designs>&larr; All designs</button>' +
      '<div class="wp-toolbar-mid"><h2 class="wp-bar-title" tabindex="-1">' + esc(tpl.name) +
      '</h2><p class="wp-scale-note" data-scale-note></p></div>' +
      '<fieldset class="wp-devices"><legend class="visually-hidden">Screen size</legend>' +
      Object.keys(DEVICES).map(function (key) {
        return '<label><input type="radio" name="wp-device" value="' + key + '"' +
          (state.device === key ? ' checked' : '') + ' /><span>' + DEVICES[key].label +
          '</span></label>';
      }).join('') + '</fieldset>' +
      '<button type="button" class="btn btn-accent" data-like="' + tpl.id + '">' +
      (chosen ? 'Customise this design' : 'I Like This Design') + '</button></div>' +
      '<div data-confirm></div>' +
      frameMarkup({ url: slugify(state.business.businessName) + '.com',
        className: 'wp-frame-full', device: state.device });

    var host = screen.querySelector('.wp-host');
    paint(host, state.business, tpl, customFor(tpl), state.images, {});
    previewFrame = new Frame(screen.querySelector('.wp-frame'), DEVICES[state.device].width);
    var note = screen.querySelector('[data-scale-note]');
    previewFrame.onScale = function (k) {
      note.textContent = k < 0.995
        ? DEVICES[state.device].note + ' layout, shown at ' + Math.round(k * 100) + '%'
        : DEVICES[state.device].note + ' layout, shown at full size';
    };
    liveFrames.push(previewFrame);
    nextFrame(function () { previewFrame.fit(); });
    focusHeading();
  }

  function confirmChoice(tpl) {
    var box = screen.querySelector('[data-confirm]');
    if (!box) return;
    box.innerHTML = '<div class="wp-confirm" role="status"><p>You selected the <b>' +
      esc(tpl.name) + '</b> design. Your business details stay exactly as they are.</p>' +
      '<div class="wp-confirm-actions">' +
      '<button type="button" class="btn btn-accent" data-customize>Customize This Design</button>' +
      '<button type="button" class="btn btn-secondary" data-keep>Keep This Design</button>' +
      '</div></div>';
    announce('You selected the ' + tpl.name + ' design.');
  }

  /* ====================================================================== */
  /* Step 4 — customisation                                                 */
  /* ====================================================================== */

  var customTab = 'brand';
  var customFrame = null;

  function renderCustomize() {
    var tpl = activeTemplate();
    var custom = customFor(tpl);
    screen.innerHTML = crumb('customize') + storageNotice() +
      '<div class="wp-toolbar">' +
      '<button type="button" class="btn btn-secondary" data-back-designs>&larr; All designs</button>' +
      '<div class="wp-toolbar-mid"><h2 class="wp-bar-title" tabindex="-1">Customise the ' +
      esc(tpl.name) + ' design</h2>' +
      '<p class="wp-scale-note">Every change shows immediately. Nothing needs saving.</p></div>' +
      '<button type="button" class="btn btn-accent" data-approve-step>Review &amp; approve</button>' +
      '</div>' +
      '<div class="wp-studio-split">' +
      '<div class="wp-rail" data-rail>' + customTabs(tpl, custom) + '</div>' +
      '<div class="wp-stage">' +
      frameMarkup({ url: slugify(state.business.businessName) + '.com',
        className: 'wp-frame-full' }) + '</div></div>' +
      '<button type="button" class="wp-sheet-open btn btn-accent" data-sheet-open>Customise</button>';

    repaintCustom();
    focusHeading();
  }

  function repaintCustom() {
    var tpl = activeTemplate();
    var host = screen.querySelector('.wp-stage .wp-host');
    if (!host) return;
    paint(host, state.business, tpl, customFor(tpl), state.images, {});
    if (!customFrame || customFrame.host !== host) {
      if (customFrame) customFrame.destroy();
      customFrame = new Frame(screen.querySelector('.wp-stage .wp-frame'), 1280);
      liveFrames.push(customFrame);
    }
    nextFrame(function () { customFrame.fit(); });
  }

  var CUSTOM_TABS = [
    ['brand', 'Brand'], ['type', 'Type'], ['hero', 'Hero'],
    ['sections', 'Sections'], ['action', 'Action']
  ];

  function customTabs(tpl, custom) {
    return '<div class="wp-tabs" role="tablist" aria-label="What to customise">' +
      CUSTOM_TABS.map(function (pair) {
        var on = customTab === pair[0];
        return '<button type="button" role="tab" id="wp-tab-' + pair[0] + '" ' +
          'aria-selected="' + on + '" aria-controls="wp-tabpanel" ' +
          'tabindex="' + (on ? '0' : '-1') + '" data-tab="' + pair[0] + '">' +
          esc(pair[1]) + '</button>';
      }).join('') + '</div>' +
      '<div class="wp-tabpanel" id="wp-tabpanel" role="tabpanel" ' +
      'aria-labelledby="wp-tab-' + customTab + '" tabindex="0">' +
      customPanel(tpl, custom) + '</div>' +
      '<button type="button" class="wp-linkbtn wp-reset" data-reset>Reset this design</button>';
  }

  function customPanel(tpl, custom) {
    var theme = resolveTheme(tpl, custom);
    if (customTab === 'brand') {
      return '<div class="wp-ctl"><label for="wp-c-primary">Main colour</label>' +
        '<div class="wp-colour"><input type="color" id="wp-c-primary" data-colour="primary" ' +
        'value="' + esc(theme.primary) + '" />' +
        '<input type="text" data-colour-hex="primary" value="' + esc(theme.primary) + '" ' +
        'aria-label="Main colour as a hex value" spellcheck="false" /></div></div>' +
        '<div class="wp-ctl"><label for="wp-c-accent">Accent colour</label>' +
        '<div class="wp-colour"><input type="color" id="wp-c-accent" data-colour="accent" ' +
        'value="' + esc(theme.accent) + '" />' +
        '<input type="text" data-colour-hex="accent" value="' + esc(theme.accent) + '" ' +
        'aria-label="Accent colour as a hex value" spellcheck="false" /></div></div>' +
        '<p class="wp-hint">Text colours are recalculated from these so the page stays ' +
        'readable. A colour that would be illegible as text is darkened or lightened for ' +
        'text only &mdash; fills keep the colour you picked.</p>' +
        '<div class="wp-ctl"><span class="wp-ctl-label">Background</span>' +
        '<div class="wp-seg">' + [['recommended', 'Recommended'], ['light', 'Light'], ['dark', 'Dark']]
          .map(function (pair) {
            return '<label><input type="radio" name="wp-mode" value="' + pair[0] + '"' +
              (custom.mode === pair[0] ? ' checked' : '') + ' /><span>' + pair[1] + '</span></label>';
          }).join('') + '</div>' +
        '<p class="wp-hint">Recommended uses the mode this design was drawn for &mdash; ' +
        esc(tpl.defaultMode) + '.</p></div>';
    }
    if (customTab === 'type') {
      return '<div class="wp-specimens">' + TYPESETS.map(function (set) {
        var on = (custom.typeset || tpl.typeset) === set.id;
        return '<button type="button" class="wp-specimen' + (on ? ' is-on' : '') + '" ' +
          'data-typeset="' + set.id + '" aria-pressed="' + on + '">' +
          '<span class="wp-specimen-sample" style="font-family:' + set.head +
          ';font-weight:' + set.headWeight + ';letter-spacing:' + set.headTrack +
          ';text-transform:' + set.headCase + '">' +
          esc(state.business.businessName || 'Your Business') + '</span>' +
          '<b>' + esc(set.name) + '</b><small>' + esc(set.note) + '</small></button>';
      }).join('') + '</div>';
    }
    if (customTab === 'hero') {
      var content = derive(state.business);
      return '<div class="wp-ctl"><label for="wp-h-head">Headline</label>' +
        '<textarea id="wp-h-head" rows="2" data-hero="headline" placeholder="' +
        esc(content.headline) + '">' + esc(custom.hero.headline) + '</textarea>' +
        '<p class="wp-hint">Blank uses the headline written from your details.</p></div>' +
        '<div class="wp-ctl"><label for="wp-h-sub">Subheadline</label>' +
        '<textarea id="wp-h-sub" rows="3" data-hero="subheadline" placeholder="' +
        esc(content.subheadline) + '">' + esc(custom.hero.subheadline) + '</textarea></div>' +
        '<div class="wp-ctl"><label for="wp-h-cta">Button text</label>' +
        '<input type="text" id="wp-h-cta" data-hero="ctaLabel" placeholder="' +
        esc(actionFor(content, custom.primaryAction).label) + '" value="' +
        esc(custom.hero.ctaLabel) + '" /></div>' +
        (tpl.supportsAlign
          ? '<div class="wp-ctl"><span class="wp-ctl-label">Alignment</span><div class="wp-seg">' +
            [['left', 'Left'], ['center', 'Centred']].map(function (pair) {
              return '<label><input type="radio" name="wp-align" value="' + pair[0] + '"' +
                (custom.hero.align === pair[0] ? ' checked' : '') + ' /><span>' + pair[1] +
                '</span></label>';
            }).join('') + '</div></div>'
          : '');
    }
    if (customTab === 'sections') {
      var cat = category(state.business.category);
      var order = custom.order && custom.order.length ? custom.order : cat.sections.slice();
      var offered = order.concat(SECTIONS.filter(function (id) {
        return order.indexOf(id) === -1 && cat.sections.indexOf(id) !== -1;
      }));
      var extras = SECTIONS.filter(function (id) {
        return offered.indexOf(id) === -1 && id !== 'hours';
      });
      return '<ul class="wp-sections">' + offered.map(function (id, i) {
        var on = custom.sections[id] !== false;
        return '<li><label><input type="checkbox" data-section="' + id + '"' +
          (on ? ' checked' : '') + ' /><span>' + esc(SECTION_LABEL[id]) + '</span></label>' +
          '<span class="wp-move"><button type="button" data-move="up" data-id="' + id + '" ' +
          (i === 0 ? 'disabled ' : '') + 'aria-label="Move ' + esc(SECTION_LABEL[id]) +
          ' up">&uarr;</button>' +
          '<button type="button" data-move="down" data-id="' + id + '" ' +
          (i === offered.length - 1 ? 'disabled ' : '') + 'aria-label="Move ' +
          esc(SECTION_LABEL[id]) + ' down">&darr;</button></span></li>';
      }).join('') + '</ul>' +
      (extras.length
        ? '<p class="wp-hint">Also available for this category: ' +
          extras.map(function (id) {
            return '<button type="button" class="wp-linkbtn" data-add-section="' + id + '">' +
              esc(SECTION_LABEL[id]) + '</button>';
          }).join(', ') + '</p>'
        : '') +
      '<p class="wp-hint">Contact always stays reachable, because a page with a button and ' +
      'no way to get in touch is a dead end.</p>';
    }
    /* action */
    var derived = derive(state.business);
    return '<ul class="wp-actions-list">' + ACTION_ORDER.map(function (id) {
      var def = ACTIONS[id];
      var missing = def.needs && !derived.contact[def.needs === 'mapsUrl' ? 'maps' : def.needs];
      var on = (custom.primaryAction || category(state.business.category).action) === id;
      return '<li><label class="' + (missing ? 'is-off' : '') + '">' +
        '<input type="radio" name="wp-action" value="' + id + '"' + (on ? ' checked' : '') +
        (missing ? ' disabled' : '') + ' /><span><b>' + esc(def.label) + '</b>' +
        (missing
          ? '<small>Add a ' + esc(def.needsLabel || def.needs) +
            ' in your details to use this.</small>'
          : '<small>Button reads &ldquo;' + esc(def.cta) + '&rdquo;</small>') +
        '</span></label></li>';
    }).join('') + '</ul>';
  }

  /* ====================================================================== */
  /* Step 5 — approval                                                      */
  /* ====================================================================== */

  function renderApprove() {
    var tpl = activeTemplate();
    var custom = customFor(tpl);
    var theme = resolveTheme(tpl, custom);
    var b = state.business;
    var enabled = SECTIONS.filter(function (id) { return custom.sections[id] !== false &&
      (custom.order || []).concat(category(b.category).sections).indexOf(id) !== -1; });

    if (state.approved) {
      screen.innerHTML = crumb('approve') +
        '<div class="wp-done"><div class="wp-done-mark" aria-hidden="true">' +
        '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" ' +
        'stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="21"/>' +
        '<path d="M15 24.5l6.5 6.5L34 18"/></svg></div>' +
        '<h2 class="wp-bar-title" tabindex="-1">Your website concept is ready.</h2>' +
        '<p>This design is saved in this browser only. <b>Nothing has been sent to MUCO LABS ' +
        'yet</b> &mdash; when you are ready, start a project and we will pick it up from here.</p>' +
        '<div class="wp-done-actions">' +
        '<a class="btn btn-accent btn-lg" href="/contact#start-project">Start a Project</a>' +
        '<button type="button" class="btn btn-secondary" data-goto="preview">Back to Preview</button>' +
        '<button type="button" class="btn btn-secondary" data-goto="customize">Edit Design</button>' +
        '<button type="button" class="btn btn-secondary" data-start-over>Start Over</button>' +
        '</div></div>' +
        frameMarkup({ url: slugify(b.businessName) + '.com', className: 'wp-frame-full' });
      paintFinal();
      focusHeading();
      return;
    }

    var rows = [
      ['Business name', b.businessName], ['Category', category(b.category).label],
      ['Selected design', tpl.name], ['Background', theme.mode === 'dark' ? 'Dark' : 'Light'],
      ['Main colour', theme.primary], ['Accent colour', theme.accent],
      ['Type', typeset(custom.typeset || tpl.typeset).name],
      ['Sections', enabled.map(function (id) { return SECTION_LABEL[id]; }).join(', ')],
      ['Main action', (ACTIONS[custom.primaryAction] || ACTIONS.enquire).label],
      ['Language', { en: 'English', ta: 'Tamil', 'en-ta': 'English + Tamil' }[b.language] || 'English']
    ];

    screen.innerHTML = crumb('approve') + storageNotice() +
      bar('Review your concept', 'This is what you would hand us as a starting point.') +
      '<div class="wp-summary"><dl>' + rows.map(function (row) {
        var swatch = /colour/i.test(row[0]) && isHex(row[1])
          ? '<i class="wp-swatch" style="background:' + esc(row[1]) + '"></i>' : '';
        return '<div><dt>' + esc(row[0]) + '</dt><dd>' + swatch + esc(row[1] || '&mdash;') + '</dd></div>';
      }).join('') + '</dl></div>' +
      frameMarkup({ url: slugify(b.businessName) + '.com', className: 'wp-frame-full' }) +
      '<div class="wp-after wp-after-split">' +
      '<button type="button" class="btn btn-secondary" data-goto="customize">Keep customising</button>' +
      '<button type="button" class="btn btn-accent btn-lg" data-approve>Approve This Website Concept</button>' +
      '</div>';
    paintFinal();
    focusHeading();
  }

  function paintFinal() {
    var tpl = activeTemplate();
    var host = screen.querySelector('.wp-host');
    if (!host) return;
    paint(host, state.business, tpl, customFor(tpl), state.images, {});
    var frame = new Frame(screen.querySelector('.wp-frame'), 1280);
    liveFrames.push(frame);
    nextFrame(function () { frame.fit(); });
  }

  /* ====================================================================== */
  /* Router                                                                 */
  /* ====================================================================== */

  function render(step) {
    dropFrames();
    previewFrame = null;
    customFrame = null;
    state.step = step;
    repo.saveStep(step);

    if (step === 'intro') {
      setLandingVisible(true);
      screen.innerHTML = '';
      return;
    }

    /* Guard rails, so a bookmarked #/customize cannot land on an empty studio. */
    if (step !== 'create' && !hasRequired()) {
      announce('Your business details are needed first.');
      go('create', true);
      return;
    }
    if ((step === 'preview' || step === 'customize' || step === 'approve') && !state.selection) {
      go('designs', true);
      return;
    }

    setLandingVisible(false);
    if (step === 'create') renderWizard();
    else if (step === 'designs') renderDesigns();
    else if (step === 'preview') renderPreview();
    else if (step === 'customize') renderCustomize();
    else if (step === 'approve') renderApprove();

    if (!reduceMotion) {
      screen.classList.remove('wp-in');
      void screen.offsetWidth;
      screen.classList.add('wp-in');
    }
    /* getBoundingClientRect, not offsetTop: offsetTop is measured from the
       nearest positioned ancestor, so the moment any wrapper gains a position
       it stops being a document coordinate. It read as "scroll to the bottom of
       the page", which landed past the studio -- and because the cards were
       then above the viewport, their IntersectionObserver never fired and the
       five previews stayed blank. */
    var top = studioBand.getBoundingClientRect().top + window.pageYOffset - 88;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ====================================================================== */
  /* Events                                                                 */
  /* ====================================================================== */

  function choose(templateId) {
    var tpl = template(templateId);
    var previous = state.selection && state.selection.templateId;
    state.selection = { templateId: tpl.id, styleFamily: tpl.family };
    customFor(tpl);
    persist();
    return previous && previous !== tpl.id;
  }

  screen.addEventListener('click', function (event) {
    var target = event.target.closest('[data-open],[data-choose],[data-edit-details],' +
      '[data-back-designs],[data-like],[data-customize],[data-keep],[data-approve-step],' +
      '[data-approve],[data-goto],[data-start-over],[data-tab],[data-typeset],[data-reset],' +
      '[data-move],[data-add-section],[data-sheet-open],[data-sheet-close]');
    if (!target) return;

    if (target.hasAttribute('data-open')) {
      choose(target.getAttribute('data-open'));
      go('preview'); return;
    }
    if (target.hasAttribute('data-choose')) {
      var switched = choose(target.getAttribute('data-choose'));
      announce('You selected the ' + activeTemplate().name + ' design.' +
        (switched ? ' Your business details are unchanged.' : ''));
      go('customize'); return;
    }
    if (target.hasAttribute('data-edit-details')) { wizardIndex = 0; go('create'); return; }
    if (target.hasAttribute('data-back-designs')) { go('designs'); return; }
    if (target.hasAttribute('data-like')) {
      choose(target.getAttribute('data-like'));
      confirmChoice(activeTemplate());
      target.textContent = 'Customise this design';
      return;
    }
    if (target.hasAttribute('data-customize')) { go('customize'); return; }
    if (target.hasAttribute('data-keep')) { go('approve'); return; }
    if (target.hasAttribute('data-approve-step')) { go('approve'); return; }
    if (target.hasAttribute('data-goto')) { go(target.getAttribute('data-goto')); return; }

    if (target.hasAttribute('data-approve')) {
      state.approved = {
        templateId: activeTemplate().id,
        business: state.business.businessName
      };
      repo.saveApproval(state.approved);
      renderApprove();
      announce('Concept approved. Nothing has been sent to MUCO LABS.');
      return;
    }
    if (target.hasAttribute('data-start-over')) {
      if (!window.confirm('Start over? This clears your business details, the design you ' +
        'picked and everything you customised, in this browser.')) return;
      repo.clear();
      state.business = blankBusiness();
      state.selection = null;
      state.customs = {};
      state.images = { logo: '', shots: [] };
      state.approved = null;
      wizardIndex = 0;
      go('intro');
      announce('Cleared. You can start again.');
      return;
    }
    if (target.hasAttribute('data-sheet-open')) { setSheet(true); return; }
    if (target.hasAttribute('data-sheet-close')) { setSheet(false); return; }

    /* Customisation controls ------------------------------------------- */
    var tpl = activeTemplate();
    var custom = customFor(tpl);

    if (target.hasAttribute('data-tab')) {
      customTab = target.getAttribute('data-tab');
      var rail = screen.querySelector('[data-rail]');
      rail.innerHTML = customTabs(tpl, custom);
      var active = rail.querySelector('[aria-selected="true"]');
      if (active) active.focus();
      return;
    }
    if (target.hasAttribute('data-typeset')) {
      custom.typeset = target.getAttribute('data-typeset');
      persist(); refreshRail(); repaintCustom(); return;
    }
    if (target.hasAttribute('data-reset')) {
      state.customs[tpl.id] = defaultCustomization(tpl, state.business);
      persist(); refreshRail(); repaintCustom();
      announce('The ' + tpl.name + ' design is back to its defaults.');
      return;
    }
    if (target.hasAttribute('data-move')) {
      var id = target.getAttribute('data-id');
      var order = custom.order && custom.order.length
        ? custom.order.slice() : category(state.business.category).sections.slice();
      var at = order.indexOf(id);
      var to = target.getAttribute('data-move') === 'up' ? at - 1 : at + 1;
      if (at === -1 || to < 0 || to >= order.length) return;
      order.splice(to, 0, order.splice(at, 1)[0]);
      custom.order = order;
      persist(); refreshRail(); repaintCustom();
      announce(SECTION_LABEL[id] + ' moved.');
      return;
    }
    if (target.hasAttribute('data-add-section')) {
      var add = target.getAttribute('data-add-section');
      custom.order = (custom.order || []).concat([add]);
      custom.sections[add] = true;
      persist(); refreshRail(); repaintCustom();
    }
  });

  function refreshRail() {
    var rail = screen.querySelector('[data-rail]');
    if (rail) rail.innerHTML = customTabs(activeTemplate(), customFor(activeTemplate()));
  }

  /* Live controls: colour, mode, type, hero text, sections, action. Every one
     of these repaints on the next frame. There is deliberately no Save. */
  var repaintQueued = false;
  function queueRepaint() {
    if (repaintQueued) return;
    repaintQueued = true;
    nextFrame(function () {
      repaintQueued = false;
      repaintCustom();
    });
  }

  screen.addEventListener('input', function (event) {
    var target = event.target;
    var tpl = activeTemplate();
    var custom = state.customs[tpl.id];
    if (!custom) return;

    if (target.hasAttribute('data-colour') || target.hasAttribute('data-colour-hex')) {
      var key = target.getAttribute('data-colour') || target.getAttribute('data-colour-hex');
      if (!isHex(target.value)) return;
      custom.colors[key] = target.value;
      var twin = screen.querySelector(target.hasAttribute('data-colour')
        ? '[data-colour-hex="' + key + '"]' : '[data-colour="' + key + '"]');
      if (twin) twin.value = target.value;
      persist(); queueRepaint(); return;
    }
    if (target.hasAttribute('data-hero')) {
      custom.hero[target.getAttribute('data-hero')] = target.value;
      persist(); queueRepaint();
    }
  });

  screen.addEventListener('change', function (event) {
    var target = event.target;

    if (target.name === 'wp-device') {
      state.device = target.value;
      if (previewFrame) {
        previewFrame.setWidth(DEVICES[state.device].width);
        var frame = screen.querySelector('.wp-frame');
        if (frame) frame.setAttribute('data-device', state.device);
        announce(DEVICES[state.device].label + ' layout, ' + DEVICES[state.device].note);
      }
      return;
    }

    var tpl = activeTemplate();
    var custom = state.customs[tpl.id];
    if (!custom) return;

    if (target.name === 'wp-mode') { custom.mode = target.value; }
    else if (target.name === 'wp-align') { custom.hero.align = target.value; }
    else if (target.name === 'wp-action') { custom.primaryAction = target.value; }
    else if (target.hasAttribute('data-section')) {
      custom.sections[target.getAttribute('data-section')] = target.checked;
    } else { return; }
    persist();
    queueRepaint();
  });

  /* The mobile control sheet. Focus is trapped while it is open and the page
     behind it is inert, because a drawer you can tab out of is a drawer that
     reads as broken to anyone not using a mouse. */
  var sheetOpen = false;
  function setSheet(open) {
    var rail = screen.querySelector('[data-rail]');
    var stage = screen.querySelector('.wp-stage');
    if (!rail) return;
    sheetOpen = open;
    rail.classList.toggle('is-open', open);
    rail.setAttribute('aria-modal', open ? 'true' : 'false');
    if (open) {
      rail.setAttribute('role', 'dialog');
      rail.setAttribute('aria-label', 'Customisation controls');
      if (!rail.querySelector('[data-sheet-close]')) {
        rail.insertBefore(el('button', {
          type: 'button', class: 'wp-sheet-close', 'data-sheet-close': true,
          'aria-label': 'Close customisation controls', text: '×'
        }), rail.firstChild);
      }
      if (stage && 'inert' in HTMLElement.prototype) stage.inert = true;
      var focusable = rail.querySelector('button, input, textarea, select');
      if (focusable) focusable.focus();
    } else {
      rail.removeAttribute('role');
      if (stage && 'inert' in HTMLElement.prototype) stage.inert = false;
      var opener = screen.querySelector('[data-sheet-open]');
      if (opener) opener.focus();
    }
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !sheetOpen) return;
    setSheet(false);
  });

  /* ====================================================================== */
  /* Landing example strip                                                  */
  /*                                                                        */
  /* The landing page shows all five concepts drawn by the real engine for a  */
  /* worked example, rather than five screenshots. If anything throws, the    */
  /* strip removes itself and the rest of the page is untouched.             */
  /* ====================================================================== */

  function mountExamples() {
    var host = document.getElementById('wp-examples');
    if (!host) return;
    var sample = Object.assign(blankBusiness(), {
      businessName: 'Sri Murugan Bakery', category: 'bakery', location: 'Coimbatore',
      products: ['Cakes to order', 'Daily bread', 'Savoury snacks'],
      description: 'A neighbourhood bakery making everything on the premises each morning.'
    });
    try {
      host.innerHTML = TEMPLATES.map(function (tpl) {
        return '<figure class="wp-example" data-example="' + tpl.id + '">' +
          frameMarkup({ url: 'srimuruganbakery.com', className: 'wp-frame-mini' }) +
          '<figcaption><b>' + esc(tpl.name) + '</b><span>' + esc(tpl.blurb) + '</span>' +
          '</figcaption></figure>';
      }).join('');
    } catch (error) {
      host.remove();
      return;
    }

    var slots = Array.prototype.slice.call(host.querySelectorAll('[data-example]'));
    var build = function (slot) {
      if (slot.getAttribute('data-built')) return;
      slot.setAttribute('data-built', '1');
      var tpl = template(slot.getAttribute('data-example'));
      var inner = slot.querySelector('.wp-host');
      var ok = paint(inner, sample, tpl, defaultCustomization(tpl, sample), {}, { mini: true });
      if (!ok) { slot.remove(); return; }
      inner.setAttribute('aria-hidden', 'true');
      inner.removeAttribute('role');
      inner.removeAttribute('aria-label');
      if ('inert' in HTMLElement.prototype) inner.inert = true;
      var frame = new Frame(slot.querySelector('.wp-frame'), 1280);
      nextFrame(function () { frame.fit(); });
    };

    if (!window.IntersectionObserver) { slots.forEach(build); return; }
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        build(entry.target);
        watcher.unobserve(entry.target);
      });
    }, { rootMargin: '300px' });
    slots.forEach(function (slot) { watcher.observe(slot); });
  }

  /* ====================================================================== */
  /* Boot                                                                   */
  /* ====================================================================== */

  document.documentElement.classList.add('wp-ready');
  if (!hasContainerQueries) {
    mount.setAttribute('data-no-container-queries', '1');
  }

  /* Any anchor on the page can enter the studio. */
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#/"]');
    if (!link) return;
    var step = link.getAttribute('href').replace(/^#\//, '');
    if (STEPS.indexOf(step) === -1) return;
    event.preventDefault();
    go(step);
  });

  mountExamples();

  /* A refresh lands where you were; a fresh visit lands on the page itself. */
  var initial = location.hash ? stepFromHash() : 'intro';
  if (initial !== 'intro' && !hasRequired()) initial = 'create';
  render(initial);

})();
