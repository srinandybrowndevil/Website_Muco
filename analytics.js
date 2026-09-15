/**
 * MUCO LABS — event translation for Google Analytics.
 *
 * This file used to run a first-party analytics pipeline alongside GA. That
 * store is gone, so all it does now is turn site interactions into named GA
 * events. It writes nothing to the visitor's browser and posts to no endpoint
 * of ours.
 *
 * - No cookies, no localStorage, no sessionStorage, no fingerprinting.
 * - Honours Do Not Track and Global Privacy Control: when either is set this
 *   file does nothing at all, and no GA events are sent from it.
 * - Never collects form field contents, only page-level context and link text.
 * - Google Analytics itself is loaded by build.py and gated by Consent Mode.
 */
(function () {
  'use strict';

  // Respect visitor privacy signals.
  if (
    navigator.doNotTrack === '1' ||
    navigator.doNotTrack === 'yes' ||
    window.doNotTrack === '1' ||
    navigator.globalPrivacyControl === true
  ) {
    return;
  }

  var page = location.pathname || '/';

  // The anonymous session id that used to live here has been removed along with
  // the first-party analytics store it was written for. Nothing read it once
  // /api/event stopped recording, so it was writing an identifier into every
  // visitor's browser storage for no purpose.

  function utmParams() {
    var out = {};
    try {
      var params = new URL(window.location.href).searchParams;
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
        var v = params.get(k);
        if (v) out[k] = v;
      });
    } catch (e) {
      /* ignore */
    }
    return out;
  }

  var utm = window.mucoAttribution ? window.mucoAttribution() : utmParams();

  function sendEvent(name, params) {
    try {
      // Explicit events keep form values, WhatsApp text and query strings out of GA.
      var gaNames = {form_start: params && params.form_type === 'audit' ? 'audit_started' : 'project_form_started',
        lead_submit: params && params.form_type === 'audit' ? 'audit_submitted' : 'project_form_submitted',
        project_detail_open: 'case_study_view'};
      var gaName = gaNames[name] || name;
      if (name === 'cta_click' && params && params.action) gaName = params.action;
      if (typeof window.gtag === 'function') {
        var ga = {page_location: location.origin + page, page_referrer: utm.referrer || '',
          form_type: params && params.form_type, service: params && params.service,
          link_text: params && params.link_text, campaign_source: utm.utm_source,
          campaign_medium: utm.utm_medium, campaign_name: utm.utm_campaign,
          campaign_content: utm.utm_content, campaign_id: utm.utm_id};
        window.gtag('event', gaName, ga);
        if (name === 'lead_submit') window.gtag('event', 'generate_lead', ga);
      }
      // Google Analytics above is now the only destination. Every event used to
      // be beaconed to /api/event as well, which accepted the payload and threw
      // it away -- one request and one billed function invocation per page view,
      // for nothing.
    } catch (e) {
      /* never break the page for analytics */
    }
  }

  // Expose a minimal global helper so main.js can report the lead submission
  // without duplicating the event logic.
  window.mucoTrackEvent = sendEvent;

  /* ------------------------------------------------------------------ page view */
  sendEvent('page_view');
  if (/^\/pricing(?:\.html)?$/.test(page)) sendEvent('cta_click', {action: 'pricing_view'});

  /* ---------------------------------------------------------- outbound + CTA clicks */
  document.addEventListener(
    'click',
    function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = (a.getAttribute('href') || '').trim();
      var label = (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      var params = { link_text: label, placement: a.closest('header') ? 'header' : a.closest('footer') ? 'footer' : a.closest('.mobile-contact-bar') ? 'mobile_bar' : 'content' };
      if (href.indexOf('/contact') === 0 && a.classList.contains('btn')) sendEvent('contact_click', {action: 'consultation_click', link_text: label});

      if (href.indexOf('wa.me') !== -1) {
        sendEvent('whatsapp_click', params);
      } else if (href.indexOf('tel:') === 0) {
        sendEvent('phone_click', params);
        sendEvent('contact_click', params);
      } else if (href.indexOf('mailto:') === 0) {
        sendEvent('email_click', params);
        sendEvent('contact_click', params);
      } else if (href.indexOf('instagram.com') !== -1) {
        sendEvent('instagram_click', params);
      }

      if (a.classList.contains('btn-accent') || a.classList.contains('btn-primary')) {
        sendEvent('cta_click', params);
      }
    },
    true
  );

  /* ---------------------------------------------------------------- enquiry form */
  var form = document.getElementById('lead-form');
  if (form) {
    var started = false;
    form.addEventListener(
      'input',
      function () {
        if (started) return;
        started = true;
        sendEvent('form_start', {form_type: form.dataset.formType});
      },
      { once: false }
    );
  }

  /* --------------------------------------------------------- content expansions */
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d || d.tagName !== 'DETAILS' || !d.open) return;
    var summary = d.querySelector('summary');
    var text = summary ? (summary.textContent || '').trim().slice(0, 80) : '';

    if (d.classList.contains('faq-item')) {
      sendEvent('faq_open', { question: text });
    } else if (d.classList.contains('work-details')) {
      var card = d.closest('.work-card');
      sendEvent('project_detail_open', { project: card ? card.id : 'unknown' });
    }
  }, true);
})();
