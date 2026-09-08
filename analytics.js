/**
 * MUCO LABS — first-party, privacy-conscious analytics.
 *
 * - No cookies, no localStorage, no third-party scripts, no fingerprinting.
 * - Uses a random session UUID held only in sessionStorage for the visit.
 * - Honours Do Not Track and Global Privacy Control signals.
 * - Sends only allowlisted, bounded events to /api/event via sendBeacon or a
 *   fetch keepalive call that cannot block navigation.
 * - Never collects form field contents, only page-level context and link text.
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

  var ENDPOINT = '/api/event';
  var page = location.pathname || '/';

  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      try {
        return crypto.randomUUID();
      } catch (e) {
        /* fall through */
      }
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // A single anonymous random id for the current browser session only.
  function getSessionId() {
    try {
      var key = 'muco_anon_session';
      var existing = window.sessionStorage.getItem(key);
      if (existing) return existing;
      var id = uuid();
      window.sessionStorage.setItem(key, id);
      return id;
    } catch (e) {
      // sessionStorage may be unavailable or blocked; generate a per-page id.
      return uuid();
    }
  }

  var sessionId = getSessionId();

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

  var utm = utmParams();

  function sendEvent(name, params) {
    try {
      var payload = {
        event_name: name,
        path: page,
        referrer: document.referrer || '',
        session_id: sessionId,
        occurred_at: new Date().toISOString(),
        metadata: {}
      };
      if (utm.utm_source) payload.utm_source = utm.utm_source;
      if (utm.utm_medium) payload.utm_medium = utm.utm_medium;
      if (utm.utm_campaign) payload.utm_campaign = utm.utm_campaign;

      if (params && typeof params === 'object') {
        for (var k in params) {
          if (Object.prototype.hasOwnProperty.call(params, k)) {
            var value = params[k];
            if (typeof value === 'string') {
              payload.metadata[k] = value.slice(0, 120);
            }
          }
        }
      }

      var body = JSON.stringify(payload);
      var sent = false;

      if (typeof navigator.sendBeacon === 'function') {
        try {
          sent = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
        } catch (e) {
          sent = false;
        }
      }

      if (!sent && typeof window.fetch === 'function') {
        window.fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).catch(function () {
          /* measurement must never break the page */
        });
      }
    } catch (e) {
      /* never break the page for analytics */
    }
  }

  // Expose a minimal global helper so main.js can report the lead submission
  // without duplicating the event logic.
  window.mucoTrackEvent = sendEvent;

  /* ------------------------------------------------------------------ page view */
  sendEvent('page_view');

  /* ---------------------------------------------------------- outbound + CTA clicks */
  document.addEventListener(
    'click',
    function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = (a.getAttribute('href') || '').trim();
      var label = (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      var params = { link_text: label };

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
      } else if (/\bsignup\b|portal\.mucolabs\.com\/signup|\/signup/.test(href)) {
        sendEvent('signup_click', params);
      }

      if (a.classList.contains('btn-accent') || a.classList.contains('btn-primary')) {
        sendEvent('cta_click', params);
      }
    },
    true
  );

  /* ---------------------------------------------------------------- enquiry form */
  var form = document.getElementById('enquiry-form');
  if (form) {
    var started = false;
    form.addEventListener(
      'input',
      function () {
        if (started) return;
        started = true;
        sendEvent('form_start');
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
