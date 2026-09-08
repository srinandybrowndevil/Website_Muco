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

    // Reading progress shares this handler rather than adding a second scroll
    // listener. Only transform is written, so it stays off the main thread.
    var bar = null;
    if (!reduceMotion && document.body.scrollHeight > window.innerHeight * 2.2) {
      bar = document.createElement('div');
      bar.className = 'read-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }

    var ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var pct = max > 0 ? window.scrollY / max : 0;
        bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, pct)) + ')';
      }
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

    // While the menu is open, Tab cycles through the toggle and the menu's
    // links instead of falling through to the page behind it.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !menu.classList.contains('open')) return;
      var items = [toggle].concat(
        Array.prototype.slice.call(menu.querySelectorAll('a'))
      );
      var idx = items.indexOf(document.activeElement);
      var next;
      if (e.shiftKey) {
        next = idx <= 0 ? items[items.length - 1] : items[idx - 1];
      } else {
        next = idx === -1 || idx === items.length - 1 ? items[0] : items[idx + 1];
      }
      e.preventDefault();
      next.focus();
    });

    // Close when the viewport grows back to the desktop nav.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768 && menu.classList.contains('open')) setOpen(false);
    });
  }

  /* ------------------------------------------------------- spotlight cards */
  function initSpotlight() {
    if (reduceMotion) return;
    var cards = document.querySelectorAll('.spotlight-card, .work-card');
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

    // Number each card within its own grid so siblings appear in sequence.
    // Capped so a long grid never leaves the last card waiting.
    Array.prototype.forEach.call(
      document.querySelectorAll('.work-grid, .ecosystem-grid, .grid'),
      function (grid) {
        var i = 0;
        Array.prototype.forEach.call(grid.children, function (child) {
          if (child.classList.contains('reveal-on-scroll')) {
            child.style.setProperty('--i', Math.min(i++, 5));
          }
        });
      }
    );

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

  /* --------------------------------------------- portfolio screen recordings */
  function initClips() {
    var vids = document.querySelectorAll('video[data-clip]');
    if (!vids.length) return;

    // On reduced-motion the poster frame is the whole experience. It is still
    // a real capture of the product, so nothing is lost but the movement.
    if (reduceMotion) {
      Array.prototype.forEach.call(vids, function (v) {
        var fig = v.closest('.preview-clip');
        if (fig) fig.classList.add('is-paused');
      });
      wireToggles(true);
      return;
    }

    function play(v) {
      if (v.dataset.paused === 'true') return;
      if (v.preload === 'none') v.preload = 'auto';
      // Autoplay can still be refused (a data-saver setting, a battery mode).
      // The poster stays up and the pause button already reads Play, so a
      // rejected promise needs nothing beyond not throwing.
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }

    // Half the card has to be on screen. A clip playing in the corner of the
    // viewport is decoration; one you are looking at is evidence.
    function halfVisible(v) {
      var box = v.getBoundingClientRect();
      if (!box.height) return false;
      var shown = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
      return shown / box.height >= 0.5;
    }

    function sweep() {
      Array.prototype.forEach.call(vids, function (v) {
        if (halfVisible(v)) play(v);
        else v.pause();
      });
    }

    var obs = null;
    if ('IntersectionObserver' in window) {
      obs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) play(entry.target);
            else entry.target.pause();
          });
        },
        { threshold: 0.5 }
      );
      Array.prototype.forEach.call(vids, function (v) {
        obs.observe(v);
      });

      // The same failsafe the reveal effect carries, for the same reason:
      // there are rendering contexts where observer records are never
      // delivered. A panel labelled Screen recording that never moves is worse
      // than one that was never labelled -- so if nothing has started a few
      // seconds in while a clip sits in view, fall back to scrolling.
      setTimeout(function () {
        var started = false;
        var inView = false;
        Array.prototype.forEach.call(vids, function (v) {
          if (!v.paused || v.currentTime > 0) started = true;
          if (halfVisible(v)) inView = true;
        });
        if (started || !inView) return;
        obs.disconnect();
        obs = null;
        bindScroll();
        sweep();
      }, 3000);
    } else {
      bindScroll();
      sweep();
    }

    function bindScroll() {
      var ticking = false;
      function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          sweep();
        });
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
    }

    // A backgrounded tab should not keep six videos decoding.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) return;
      Array.prototype.forEach.call(vids, function (v) {
        v.pause();
      });
    });

    wireToggles(false);
  }

  function wireToggles(startPaused) {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-clip-toggle]'),
      function (btn) {
        var fig = btn.closest('.preview-clip');
        var vid = fig && fig.querySelector('video[data-clip]');
        if (!vid) return;

        // The label names the project, so it is set from what is already there
        // rather than rebuilt from a string this function would have to know.
        var label = btn.getAttribute('aria-label') || '';
        var subject = label.replace(/^(Pause|Play) the /, '');

        function sync(paused) {
          vid.dataset.paused = paused ? 'true' : 'false';
          fig.classList.toggle('is-paused', paused);
          btn.setAttribute('aria-label', (paused ? 'Play the ' : 'Pause the ') + subject);
        }

        sync(startPaused);

        btn.addEventListener('click', function () {
          var paused = vid.dataset.paused !== 'true';
          sync(paused);
          if (paused) {
            vid.pause();
          } else {
            if (vid.preload === 'none') vid.preload = 'auto';
            var p = vid.play();
            if (p && p.catch) p.catch(function () {});
          }
        });
      }
    );
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
    var target = meyraBody || meyraEl;

    // The reply is announced when it finishes typing, not on every keystroke.
    meyraEl.setAttribute('aria-live', 'polite');

    // A run id cancels a sequence still in flight when the visitor clicks a
    // second scenario before the first has finished typing.
    var run = 0;

    function playReply(text) {
      var id = ++run;

      if (reduceMotion) {
        target.textContent = text;
        return;
      }

      // "Composing" beat: the bubble shows the dots for a moment before the
      // reply starts, which is what makes the panel read as a live product
      // rather than a paragraph that swapped.
      meyraEl.classList.add('is-thinking');
      target.textContent = '';
      var dots = document.createElement('span');
      dots.className = 'typing-dots';
      dots.setAttribute('aria-hidden', 'true');
      dots.innerHTML = '<span></span><span></span><span></span>';
      target.appendChild(dots);

      setTimeout(function () {
        if (id !== run) return;
        meyraEl.classList.remove('is-thinking');
        meyraEl.classList.add('is-typing');
        target.removeChild(dots);

        var i = 0;
        (function step() {
          if (id !== run) return;
          i += Math.random() < 0.3 ? 2 : 1;
          target.textContent = text.slice(0, i);
          if (i < text.length) {
            setTimeout(step, 14 + Math.random() * 24);
          } else {
            meyraEl.classList.remove('is-typing');
          }
        })();
      }, 600);
    }

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
          playReply(data.meyra);
        } else {
          meyraEl.textContent = data.meyra;
          if (meyraLabel) meyraEl.insertBefore(meyraLabel, meyraEl.firstChild);
        }
      });
    });
  }

  function initLivePlatform() {
    var root = document.querySelector('[data-live-platform]');
    if (!root) return;

    var clock = root.querySelector('[data-live-clock]');
    var relative = root.querySelector('[data-live-relative]');
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-live-view]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[data-live-panel]'));
    var title = root.querySelector('[data-live-title]');
    var pulse = root.querySelector('[data-live-pulse]');
    var feed = root.querySelector('[data-live-feed]');
    var checkedAt = Date.now();
    var labels = {
      overview: 'Business overview',
      enquiries: 'Enquiry operations',
      delivery: 'Delivery status'
    };

    function tick() {
      var now = new Date();
      if (clock) {
        clock.textContent = now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
      if (relative) {
        var elapsed = Math.floor((Date.now() - checkedAt) / 1000);
        relative.textContent = elapsed < 5 ? 'Checked just now' : 'Checked ' + elapsed + 's ago';
      }
    }

    function select(name) {
      tabs.forEach(function (tab) {
        var selected = tab.getAttribute('data-live-view') === name;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      panels.forEach(function (panel) {
        var selected = panel.getAttribute('data-live-panel') === name;
        panel.hidden = !selected;
        panel.classList.toggle('is-active', selected);
      });
      if (title) title.textContent = labels[name] || labels.overview;
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        select(tab.getAttribute('data-live-view'));
      });
    });

    if (pulse) {
      pulse.addEventListener('click', function () {
        pulse.classList.remove('is-running');
        void pulse.offsetWidth;
        pulse.classList.add('is-running');
        pulse.textContent = 'Refreshing…';
        setTimeout(function () {
          checkedAt = Date.now();
          pulse.textContent = 'Demo data refreshed';
          if (feed) {
            var row = document.createElement('p');
            row.innerHTML = '<i class="ok"></i><span><b>Demo data refreshed</b><small>Mock services responding normally</small></span><time>now</time>';
            feed.insertBefore(row, feed.firstChild);
            while (feed.children.length > 3) feed.removeChild(feed.lastChild);
          }
          setTimeout(function () {
            pulse.textContent = 'Refresh demo';
            pulse.classList.remove('is-running');
          }, 1800);
        }, 700);
      });
    }

    tick();
    setInterval(tick, 1000);
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
  var CONTACT_EMAIL = 'founder@mucolabs.com';

  function initEnquiryForm() {
    var form = document.getElementById('enquiry-form');
    if (!form) return;

    var status = document.getElementById('form-status');

    // Links elsewhere on the site carry the service they came from
    // (e.g. /contact?service=Digital+marketing+%26+SEO) so the visitor
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

    // The industries matrix on the home page links here with the sector the
    // visitor picked. There is no industry field, so it opens the message for
    // them instead of quietly dropping what they told us.
    (function prefillIndustry() {
      var message = form.elements.message;
      if (!message || message.value) return;
      var wanted;
      try {
        wanted = new URL(window.location.href).searchParams.get('industry');
      } catch (e) {
        return;
      }
      if (!wanted) return;
      wanted = wanted.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 80);
      if (!wanted) return;
      message.value = 'Industry: ' + wanted + '\n\n';
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

    function fieldIsValid(el) {
      if (el.type === 'checkbox') return !el.required || el.checked;
      var value = el.value.trim();
      if (!value) return !el.required;
      // Match the API's contact checks before opening WhatsApp or email.
      if (el.name === 'phone' && (value.match(/\d/g) || []).length < 7) return false;
      if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return false;
      return el.checkValidity();
    }

    function markField(el) {
      var valid = fieldIsValid(el);
      el.setAttribute('aria-invalid', valid ? 'false' : 'true');
      var err = document.getElementById(el.id + '-error');
      if (err) err.classList.toggle('show', !valid);
      return valid;
    }

    function validate() {
      var ok = true;
      Array.prototype.forEach.call(form.querySelectorAll('[required], input[type="email"], input[type="url"]'), function (el) {
        if (!markField(el) && ok) {
          el.focus();
          ok = false;
        }
      });
      return ok;
    }

    // Once a field has been flagged, clear the flag the moment it is fixed.
    // Leaving an error visible under a field the visitor has already corrected
    // reads as "this is still wrong" and it isn't.
    Array.prototype.forEach.call(form.querySelectorAll('[required], input[type="email"], input[type="url"]'), function (el) {
      var event = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(event, function () {
        if (el.getAttribute('aria-invalid') === 'true' && fieldIsValid(el)) markField(el);
      });
      // Flag on blur only once the visitor has actually typed something, so an
      // empty field they merely tabbed through is not accused of being wrong.
      el.addEventListener('blur', function () {
        if (el.type !== 'checkbox' && el.value.trim()) markField(el);
      });
    });

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

      // Open WhatsApp or the mail client first, synchronously. Doing it after
      // an awaited fetch loses the user-gesture context and pop-up blockers
      // then swallow the window — so the hand-off happens now and the enquiry
      // is recorded in parallel.
      if (channel === 'email') {
        var subject = 'Project enquiry — ' + (fieldValue('service') || 'General') + ' — ' + fieldValue('name');
        window.location.href =
          'mailto:' + CONTACT_EMAIL +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
      } else {
        window.open(
          'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(body),
          '_blank',
          'noopener'
        );
      }

      recordLead(channel);
    }

    /**
     * Send the enquiry to /api/lead so it is recorded whether or not the
     * visitor actually presses send in WhatsApp. keepalive lets the request
     * finish even though the page may be navigating away to a mail client.
     */
    function recordLead(channel) {
      var payload = {
        name: fieldValue('name'),
        business: fieldValue('business'),
        phone: fieldValue('phone'),
        email: fieldValue('email'),
        location: fieldValue('location'),
        service: fieldValue('service'),
        website: fieldValue('website'),
        budget: fieldValue('budget'),
        timeline: fieldValue('timeline'),
        message: fieldValue('message'),
        consent: !!form.elements.consent && form.elements.consent.checked,
        channel: channel,
        page: window.location.pathname,
        referrer: document.referrer || ''
      };

      try {
        var params = new URL(window.location.href).searchParams;
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
          if (params.get(k)) payload[k] = params.get(k);
        });
      } catch (e) {
        /* attribution is a bonus, never a blocker */
      }

      var handedOff =
        channel === 'email'
          ? 'Opening your email app with the enquiry filled in.'
          : 'Opening WhatsApp with your enquiry filled in.';

      if (!window.fetch) {
        showStatus('ok', handedOff + ' Press send there to reach us.');
        return;
      }

      showStatus('ok', handedOff + ' Sending it to us as well…');

      window
        .fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        })
        .then(function (r) {
          if (r.ok) {
            // A 200 means the lead was accepted and written to the function log,
            // not that an email was sent. The response tells us whether email
            // notification actually fired, so the message stays truthful.
            return r
              .json()
              .then(function (data) {
                if (typeof window.mucoTrackEvent === 'function') {
                  window.mucoTrackEvent('lead_submit', {
                    service: fieldValue('service') || 'unspecified',
                    channel: channel
                  });
                }
                var recorded = 'Your enquiry has been recorded.';
                var reply = data.emailed
                  ? ' We will reply to you directly.'
                  : ' We will reply as soon as we can.';
                var whatsappNote =
                  channel === 'whatsapp'
                    ? ' You can still press send in WhatsApp if you would like to talk there.'
                    : '';
                showStatus('ok', recorded + reply + whatsappNote);
              })
              .catch(function () {
                showStatus(
                  'ok',
                  'Your enquiry has been recorded. We will reply as soon as we can.'
                );
              });
          } else {
            // The WhatsApp window is already open, so the enquiry is not lost.
            showStatus('ok', handedOff + ' Press send there so we receive it.');
          }
        })
        .catch(function () {
          showStatus('ok', handedOff + ' Press send there so we receive it.');
        });
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

  /* ------------------------------------------- nav sliding indicator */
  // One underline that travels between items rather than six underlines
  // each appearing in place. Keyboard focus moves it too, so the effect is
  // not pointer-only decoration.
  function initNavIndicator() {
    var list = document.querySelector('.nav-links');
    if (!list) return;

    var current = list.querySelector('a[aria-current="page"]');
    var indicator = document.createElement('span');
    indicator.className = 'nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    var indicatorWrap = document.createElement('li');
    indicatorWrap.className = 'nav-indicator-wrap';
    indicatorWrap.setAttribute('aria-hidden', 'true');
    indicatorWrap.appendChild(indicator);
    list.appendChild(indicatorWrap);
    list.classList.add('nav-indicator-on');

    function place(link, animate) {
      // offsetParent is null while the bar is display:none (mobile), which
      // is also the signal to hide the indicator entirely.
      if (!link || !link.offsetParent) {
        indicator.style.opacity = '0';
        return;
      }
      if (!animate) indicator.style.transition = 'none';
      indicator.style.opacity = '1';
      indicator.style.width = link.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + link.offsetLeft + 'px)';
      if (!animate) {
        void indicator.offsetWidth; // reflow so the next move animates
        indicator.style.transition = '';
      }
    }

    Array.prototype.forEach.call(list.querySelectorAll('a'), function (link) {
      link.addEventListener('pointerenter', function () {
        place(link, true);
      });
      link.addEventListener('focus', function () {
        place(link, true);
      });
    });

    list.addEventListener('pointerleave', function () {
      place(current, true);
    });
    list.addEventListener('focusout', function () {
      if (!list.contains(document.activeElement)) place(current, true);
    });
    window.addEventListener(
      'resize',
      function () {
        place(current, false);
      },
      { passive: true }
    );

    // First paint lands on the current page with no visible slide.
    place(current, false);
  }

  /* ---------------------------------------------------- hero entrance */
  // Staged rise on the hero, defined in the stylesheet under .hero-enter.
  // Skipped for reduced motion and absent entirely without JS.
  function initHeroEntrance() {
    if (reduceMotion) return;
    if (!document.querySelector('.hero-split')) return;
    document.body.classList.add('hero-enter');
  }

  /* ------------------------------------------------------------------ boot */
  function init() {
    initHeaderShadow();
    initMobileMenu();
    initNavIndicator();
    initHeroEntrance();
    initSpotlight();
    initTabs();
    initReveal();
    initClips();
    initMeyraSim();
    initLivePlatform();
    initClock();
    initEnquiryForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
