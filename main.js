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

  // Progressive enhancement: the full course list is readable without JS.
  function initLearningCourses() {
    var grid = document.getElementById('course-grid');
    if (!grid) return;
    var search = document.getElementById('course-search');
    var category = document.getElementById('course-category');
    var reset = document.getElementById('course-reset');
    var count = document.getElementById('course-count');
    var empty = document.getElementById('course-empty');
    var emptyReset = document.getElementById('course-empty-reset');
    var cards = Array.from(grid.querySelectorAll('[data-course]'));
    document.querySelector('[data-course-controls]').hidden = false;
    function filter() {
      var words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      var visible = 0;
      cards.forEach(function (card) {
        var text = card.querySelector('h3').textContent.toLocaleLowerCase();
        var matches = (!category.value || card.dataset.category === category.value) &&
          words.every(function (word) { return text.indexOf(word) !== -1; });
        card.hidden = !matches;
        if (matches) visible += 1;
      });
      count.textContent = visible + ' of ' + cards.length + ' courses shown';
      empty.hidden = visible !== 0;
    }
    search.addEventListener('input', filter);
    category.addEventListener('change', filter);
    reset.addEventListener('click', function () {
      search.value = '';
      category.value = '';
      filter();
      search.focus();
    });
    if (emptyReset) emptyReset.addEventListener('click', function () { reset.click(); });
    document.querySelectorAll('[data-course-suggestion]').forEach(function (button) {
      button.addEventListener('click', function () {
        search.value = button.dataset.courseSuggestion || '';
        category.value = '';
        filter();
        search.focus();
      });
    });
    filter();
  }

  /* ------------------------------------------------------------------ boot */
  // The enquiry form. Every visitor who fills this in becomes a lead in the
  // CRM without needing an account, which is the point: an account is a
  // reasonable thing to ask of a client and an unreasonable thing to ask of
  // someone deciding whether to talk to us at all.
  //
  // Contact details stay behind sign-in. This collects rather than exposes, so
  // it adds a way in without giving scrapers an address to harvest.
  function initLeadForm() {
    var form = document.getElementById('lead-form');
    if (!form) return;

    var status = document.getElementById('lead-status');
    var submit = document.getElementById('lead-submit');
    var FIELDS = ['name', 'business', 'phone', 'email', 'location', 'service',
                  'website', 'budget', 'timeline', 'message'];

    function clearErrors() {
      FIELDS.concat(['consent']).forEach(function (field) {
        var slot = document.getElementById('err-' + field);
        if (slot) slot.textContent = '';
        var input = form.elements[field];
        if (input && input.removeAttribute) input.removeAttribute('aria-invalid');
      });
      form.classList.remove('is-error');
    }

    function showErrors(errors) {
      var first = null;
      Object.keys(errors).forEach(function (field) {
        var slot = document.getElementById('err-' + field);
        if (slot) slot.textContent = errors[field];
        var input = form.elements[field];
        if (input && input.setAttribute) input.setAttribute('aria-invalid', 'true');
        if (!first && input && input.focus) first = input;
      });
      // Send focus to the first thing that needs fixing, rather than leaving
      // someone to hunt for the red text.
      if (first) first.focus();
    }

    function param(name) {
      try {
        return new URLSearchParams(window.location.search).get(name) || '';
      } catch (err) {
        return '';
      }
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors();

      var payload = {
        consent: form.elements.consent && form.elements.consent.checked,
        company_website: form.elements.company_website ? form.elements.company_website.value : '',
        page: window.location.pathname,
        referrer: document.referrer || '',
        utm_source: param('utm_source'),
        utm_medium: param('utm_medium'),
        utm_campaign: param('utm_campaign')
      };
      FIELDS.forEach(function (field) {
        var input = form.elements[field];
        payload[field] = input ? String(input.value || '').trim() : '';
      });

      submit.disabled = true;
      var original = submit.textContent;
      submit.textContent = 'Sending…';
      status.className = 'form-status';
      status.textContent = '';

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          return { status: response.status, body: body };
        });
      }).then(function (result) {
        submit.disabled = false;
        submit.textContent = original;

        if (result.status === 400 && result.body.errors) {
          form.classList.add('is-error');
          showErrors(result.body.errors);
          status.className = 'form-status form-status-err';
          status.textContent = 'Please check the highlighted fields.';
          return;
        }
        if (result.status === 429) {
          status.className = 'form-status form-status-err';
          status.textContent = 'That is a lot of enquiries at once. Wait a minute and try again.';
          return;
        }
        if (!result.body.ok) {
          // Never a dead end: if the enquiry could not be saved, say so and
          // leave a way through that does not depend on this form working.
          status.className = 'form-status form-status-err';
          status.textContent = 'We could not save that. Please try again, or sign in to the portal and send it there.';
          return;
        }

        form.reset();
        status.className = 'form-status form-status-ok';
        status.textContent = 'Thank you — your enquiry has reached us. We usually reply the same working day.';
        status.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }).catch(function () {
        submit.disabled = false;
        submit.textContent = original;
        status.className = 'form-status form-status-err';
        status.textContent = 'That did not send — check your connection and try again.';
      });
    });
  }

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
    initLearningCourses();
    initLeadForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
