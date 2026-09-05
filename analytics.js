/**
 * MUCO LABS — analytics event map
 *
 * This file is only loaded when GA_MEASUREMENT_ID is set in build.py. It is a
 * separate file rather than the usual inline gtag snippet because the site
 * sends `script-src 'self' https://www.googletagmanager.com`, which blocks
 * inline scripts — see vercel.json.
 *
 * Everything here is a no-op if gtag failed to load (blocked, offline, or an
 * ad blocker), so measurement never affects whether the site works.
 *
 * EVENT MAP
 *   page_view            automatic, from the config call below
 *   whatsapp_click       any wa.me link, with the page it came from
 *   phone_click          any tel: link
 *   email_click          any mailto: link
 *   instagram_click      the Instagram profile link
 *   cta_click            primary calls to action, with their label
 *   form_start           first real interaction with the enquiry form
 *   form_error           client-side validation refused the submission
 *   generate_lead        enquiry sent — GA4's recommended lead event
 *   faq_open             an FAQ question was expanded, with the question
 *   project_detail_open  a project's problem/scope/status was expanded
 */
(function () {
  'use strict';

  var tag = document.currentScript || document.querySelector('script[data-ga-id]');
  var id = tag && tag.getAttribute('data-ga-id');
  if (!id) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', id, {
    // The site publishes no advertising and sets no marketing cookies.
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  /** Send an event, or do nothing at all if gtag never loaded. */
  function track(name, params) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
    } catch (e) {
      /* measurement must never break the page */
    }
  }
  window.mucoTrack = track;

  var page = location.pathname || '/';

  /* ------------------------------------------------ outbound + CTA clicks */
  document.addEventListener(
    'click',
    function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      // innerText, not textContent: the header CTA carries both a long and a
      // short label and only one is visible at a given width. textContent
      // would report them concatenated ("Start a ProjectStart").
      var label = (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);

      if (href.indexOf('wa.me') !== -1) {
        track('whatsapp_click', { link_text: label, page_path: page });
      } else if (href.indexOf('tel:') === 0) {
        track('phone_click', { page_path: page });
      } else if (href.indexOf('mailto:') === 0) {
        track('email_click', { page_path: page });
      } else if (href.indexOf('instagram.com') !== -1) {
        track('instagram_click', { page_path: page });
      }

      // Primary calls to action, wherever they appear.
      if (a.classList.contains('btn-accent') || a.classList.contains('btn-primary')) {
        track('cta_click', { link_text: label, page_path: page });
      }
    },
    true
  );

  /* ------------------------------------------------------- enquiry form */
  var form = document.getElementById('enquiry-form');
  if (form) {
    var started = false;
    form.addEventListener(
      'input',
      function () {
        if (started) return;
        started = true;
        track('form_start', { page_path: page });
      },
      { once: false }
    );

    // main.js writes the outcome into #form-status; read it rather than
    // duplicating the validation logic here.
    var status = document.getElementById('form-status');
    if (status && 'MutationObserver' in window) {
      new MutationObserver(function () {
        if (!status.classList.contains('show')) return;
        var ok = status.classList.contains('form-status-ok');
        var serviceEl = form.elements.service;
        if (ok) {
          track('generate_lead', {
            service: (serviceEl && serviceEl.value) || 'unspecified',
            method: /email/i.test(status.textContent) ? 'email' : 'whatsapp'
          });
        } else {
          track('form_error', { page_path: page });
        }
      }).observe(status, { attributes: true, childList: true, subtree: true });
    }
  }

  /* --------------------------------------------------- content expansions */
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d || d.tagName !== 'DETAILS' || !d.open) return;
    var summary = d.querySelector('summary');
    var text = summary ? (summary.textContent || '').trim().slice(0, 80) : '';

    if (d.classList.contains('faq-item')) {
      track('faq_open', { question: text, page_path: page });
    } else if (d.classList.contains('work-details')) {
      var card = d.closest('.work-card');
      track('project_detail_open', { project: card ? card.id : 'unknown' });
    }
  }, true);
})();
