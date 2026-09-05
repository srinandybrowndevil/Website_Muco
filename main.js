/**
 * MUCO LABS — site behaviour
 *
 * Everything here is progressive enhancement: each page renders and converts
 * with JavaScript disabled. Nothing below hides content on failure.
 */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- header */
  function initHeaderShadow() {
    var header = document.querySelector('header');
    if (!header) return;

    var ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ----------------------------------------------------------- mobile menu */
  function initMobileMenu() {
    var toggle = document.getElementById('menu-toggle');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    var label = toggle.querySelector('.menu-toggle-label');

    // On narrow screens the label is hidden and the button is icon-only, so
    // the accessible name has to be kept in sync too.
    function setOpen(open) {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      if (label) label.textContent = open ? 'Close' : 'Menu';
    }

    toggle.addEventListener('click', function () {
      setOpen(!menu.classList.contains('open'));
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Close when the viewport grows back to the desktop nav.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768 && menu.classList.contains('open')) setOpen(false);
    });
  }

  /* ------------------------------------------------------- spotlight cards */
  function initSpotlight() {
    if (reduceMotion) return;
    var cards = document.querySelectorAll('.spotlight-card');
    if (!cards.length) return;

    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener(
        'pointermove',
        function (e) {
          var rect = card.getBoundingClientRect();
          card.style.setProperty('--mouse-x', e.clientX - rect.left + 'px');
          card.style.setProperty('--mouse-y', e.clientY - rect.top + 'px');
        },
        { passive: true }
      );
      card.addEventListener('pointerleave', function () {
        card.style.removeProperty('--mouse-x');
        card.style.removeProperty('--mouse-y');
      });
    });
  }

  /* -------------------------------------------------------------- ARIA tabs */
  function initTabs() {
    var lists = document.querySelectorAll('[role="tablist"]');
    if (!lists.length) return;

    Array.prototype.forEach.call(lists, function (list) {
      var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
      if (!tabs.length) return;

      function select(tab, focus) {
        tabs.forEach(function (t) {
          var selected = t === tab;
          t.setAttribute('aria-selected', selected ? 'true' : 'false');
          t.setAttribute('tabindex', selected ? '0' : '-1');
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !selected;
        });
        if (focus) tab.focus();
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () {
          select(tab, false);
        });
        tab.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
            next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === 'Home') next = tabs[0];
          else if (e.key === 'End') next = tabs[tabs.length - 1];
          if (next) {
            e.preventDefault();
            select(next, true);
          }
        });
      });
    });
  }

  /* ------------------------------------------------------- scroll reveal */
  function initReveal() {
    var els = document.querySelectorAll('.reveal-on-scroll');
    if (!els.length) return;

    function revealAll() {
      Array.prototype.forEach.call(els, function (el) {
        el.classList.add('is-revealed');
      });
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    Array.prototype.forEach.call(els, function (el) {
      // Anything already on screen at load appears immediately — the effect is
      // for content you scroll to, not for content you are already looking at.
      var box = el.getBoundingClientRect();
      if (box.top < window.innerHeight && box.bottom > 0) {
        el.classList.add('is-revealed');
        return;
      }
      obs.observe(el);
    });

    // Failsafe against total observer failure. This effect must never be the
    // reason a visitor sees a blank page: if nothing at all has been revealed
    // a few seconds in, the observer is not working — show everything.
    setTimeout(function () {
      if (!document.querySelector('.reveal-on-scroll.is-revealed')) {
        obs.disconnect();
        revealAll();
      }
    }, 3000);
  }

  /* --------------------------------------------- Meyra scenario simulator */
  var MEYRA_SCENARIOS = {
    briefing: {
      user: 'Meyra, give me my morning briefing.',
      meyra:
        'Two priority items today: the InkNexis architecture review at 11:30 and the Ooruva vendor pilot check-in at 15:30. One proposal is waiting on your sign-off.'
    },
    followup: {
      user: 'Meyra, run today’s client follow-ups.',
      meyra:
        'Follow-up drafts prepared for three active projects, each with the current milestone and next action. Nothing sends until you approve it.'
    },
    operations: {
      user: 'Meyra, sort the new enquiries and draft next steps.',
      meyra:
        'New enquiries grouped by service and urgency, with a suggested scope question for each. Added to your queue with source and timestamp.'
    }
  };

  function initMeyraSim() {
    var buttons = document.querySelectorAll('[data-meyra-scenario]');
    var userEl = document.getElementById('mockup-user-text');
    var meyraEl = document.getElementById('mockup-meyra-text');
    if (!buttons.length || !userEl || !meyraEl) return;

    var meyraLabel = meyraEl.querySelector('strong');
    var meyraBody = document.getElementById('mockup-meyra-body');

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var data = MEYRA_SCENARIOS[btn.getAttribute('data-meyra-scenario')];
        if (!data) return;

        Array.prototype.forEach.call(buttons, function (b) {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        btn.setAttribute('aria-pressed', 'true');

        userEl.textContent = data.user;
        if (meyraBody) {
          meyraBody.textContent = data.meyra;
        } else {
          meyraEl.textContent = data.meyra;
          if (meyraLabel) meyraEl.insertBefore(meyraLabel, meyraEl.firstChild);
        }
      });
    });
  }

  /* ----------------------------------------------------------------- clock */
  function initClock() {
    var els = document.querySelectorAll('.clock');
    if (!els.length) return; // no timer on pages without a clock

    function tick() {
      var t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      Array.prototype.forEach.call(els, function (el) {
        el.textContent = t;
      });
    }
    tick();
    setInterval(tick, 30000); // minute display — 30s is plenty
  }

  /* ------------------------------------------------------------ enquiry form
   * This is a static site, so there is no server to post to. The form
   * validates in the browser and then hands a fully written message to
   * WhatsApp or the user's email client — no data is stored or transmitted
   * anywhere else. Server-side validation arrives with the backend.
   */
  var WHATSAPP_NUMBER = '916381809844';
  var CONTACT_EMAIL = 'mucolabs2026@gmail.com';

  function initEnquiryForm() {
    var form = document.getElementById('enquiry-form');
    if (!form) return;

    var status = document.getElementById('form-status');

    // Links elsewhere on the site carry the service they came from
    // (e.g. contact.html?service=Digital+marketing+%26+SEO) so the visitor
    // doesn't have to re-state what they already clicked.
    (function prefillService() {
      var select = form.elements.service;
      if (!select) return;
      var wanted;
      try {
        wanted = new URL(window.location.href).searchParams.get('service');
      } catch (e) {
        return;
      }
      if (!wanted) return;
      var target = wanted.trim().toLowerCase();
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value.trim().toLowerCase() === target) {
          select.selectedIndex = i;
          return;
        }
      }
    })();

    function showStatus(kind, message) {
      if (!status) return;
      status.className = 'form-status show form-status-' + kind;
      status.textContent = message;
    }

    function fieldValue(name) {
      var el = form.elements[name];
      return el ? String(el.value || '').trim() : '';
    }

    function validate() {
      var ok = true;
      Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
        var valid = el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim();
        el.setAttribute('aria-invalid', valid ? 'false' : 'true');
        var err = document.getElementById(el.id + '-error');
        if (err) err.classList.toggle('show', !valid);
        if (!valid && ok) {
          el.focus();
          ok = false;
        }
      });
      return ok;
    }

    function buildMessage() {
      var lines = [
        'New project enquiry from mucolabs.com',
        '',
        'Name: ' + fieldValue('name'),
        'Business: ' + (fieldValue('business') || '—'),
        'Phone / WhatsApp: ' + fieldValue('phone'),
        'Email: ' + (fieldValue('email') || '—'),
        'Location: ' + (fieldValue('location') || '—'),
        'Service: ' + (fieldValue('service') || '—'),
        'Current website: ' + (fieldValue('website') || 'None'),
        'Budget range: ' + (fieldValue('budget') || 'Not decided'),
        'Timeline: ' + (fieldValue('timeline') || 'Not decided'),
        '',
        'What they want to build:',
        fieldValue('message')
      ];

      // Attribution: where the enquiry came from, kept in the message itself.
      var src = [];
      try {
        var params = new URL(window.location.href).searchParams;
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
          if (params.get(k)) src.push(k + '=' + params.get(k));
        });
      } catch (e) {
        /* ignore */
      }
      if (document.referrer) src.push('referrer=' + document.referrer);
      if (src.length) lines.push('', '— ' + src.join(' · '));

      return lines.join('\n');
    }

    function submitVia(channel) {
      // Honeypot: a real person never fills this in.
      if (fieldValue('company_website')) {
        showStatus('err', 'Something went wrong. Please message us on WhatsApp instead.');
        return;
      }
      if (!validate()) {
        showStatus('err', 'Please complete the highlighted fields before sending.');
        return;
      }

      var body = buildMessage();

      if (channel === 'email') {
        var subject = 'Project enquiry — ' + (fieldValue('service') || 'General') + ' — ' + fieldValue('name');
        window.location.href =
          'mailto:' + CONTACT_EMAIL +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
        showStatus('ok', 'Opening your email app with the enquiry filled in. Press send there to reach us.');
      } else {
        window.open(
          'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(body),
          '_blank',
          'noopener'
        );
        showStatus('ok', 'Opening WhatsApp with your enquiry filled in. Press send there to reach us.');
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitVia('whatsapp');
    });

    var emailBtn = document.getElementById('send-email');
    if (emailBtn) {
      emailBtn.addEventListener('click', function () {
        submitVia('email');
      });
    }
  }

  /* ------------------------------------------------------------------ boot */
  function init() {
    initHeaderShadow();
    initMobileMenu();
    initSpotlight();
    initTabs();
    initReveal();
    initMeyraSim();
    initClock();
    initEnquiryForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
