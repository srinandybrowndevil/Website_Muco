"""Public learning discovery and the separate Way2Me learner portal entry."""
from html import escape
from build import render, page_header, ORG_JSONLD, breadcrumbs
from learning_catalog import COURSE_GROUPS, SOURCE_URL, CONTACT_URL, DASHBOARD_URL, REGISTRATION_URL, LMS_COURSE_URL
from learning_feedback import TUTOR_PROFILE, FEEDBACK_SUMMARY, FEEDBACK_THEMES


def build_learning(services):
    categories = sorted({group for group, _ in COURSE_GROUPS})
    options = ''.join(f'<option value="{escape(group)}">{escape(group)}</option>' for group in categories)
    cards = ''.join(f'''
      <article class="learning-course" data-course data-category="{escape(group)}">
        <p class="eyebrow">{escape(group)}</p>
        <h3>{escape(title)}</h3>
        <p class="learning-provider">Way2Me {'LMS course' if title == 'Advanced Engineering Design Techniques' else 'course'}</p>
        {('<a href="' + LMS_COURSE_URL + '">View course at Way2Me ↗</a>') if title == 'Advanced Engineering Design Techniques' else ''}
        <a href="{CONTACT_URL}" class="learning-enquiry" aria-label="Enquire at Way2Me about {escape(title)}">Enquire at Way2Me <span aria-hidden="true">↗</span></a>
      </article>''' for group, title in COURSE_GROUPS)
    service_cards = ''.join(f'''
      <article class="learning-course learning-service">
        <p class="eyebrow">MUCO LABS service</p><h3>{escape(s['title'])}</h3>
        <p>{escape(s['outcome'])}</p>
        <a href="services-{s['slug']}.html">Explore service <span aria-hidden="true">→</span></a>
      </article>''' for s in services)
    body = page_header(
        'Learning &amp; Courses',
        'Build your skills.<br><span class="accent-serif">Choose your next step.</span>',
        'Explore Way2Me courses and MUCO LABS services. Find a subject, speak directly with Way2Me, or return to your learning portal.',
        extra='''<div class="btn-group mt-5">
          <a href="#courses" class="btn btn-accent btn-lg">Explore courses</a>
          <a href="learning-portal.html" class="btn btn-secondary btn-lg">Learning portal <span aria-hidden="true">→</span></a>
        </div>
        <nav class="learning-jumps" aria-label="Learning page sections">
          <a href="#courses">Way2Me courses</a><a href="#muco-services">MUCO services</a><a href="#way2me-founder">Meet the founder</a>
        </nav>''')
    body += f'''
    <section class="section-divider" id="courses" aria-labelledby="courses-title">
      <div class="container">
        <span class="eyebrow">Way2Me · Course catalogue</span>
        <h2 id="courses-title">Find what you want to learn.</h2>
        <p>Browse {len(COURSE_GROUPS)} course listings: 64 from <a href="{SOURCE_URL}">Way2Me’s public catalogue</a> and one from its <a href="https://way2me.in/courses/">online course directory</a>. Ask Way2Me about current batches, fees, duration and enrolment.</p>
        <div class="learning-controls" data-course-controls hidden>
          <label for="course-search">Search courses<input id="course-search" type="search" placeholder="Try Python, design or AI" autocomplete="off" aria-controls="course-grid" /></label>
          <label for="course-category">Subject<select id="course-category" aria-controls="course-grid"><option value="">All subjects</option>{options}</select></label>
          <button class="btn btn-secondary" type="button" id="course-reset">Clear filters</button>
        </div>
        <p id="course-count" role="status" aria-live="polite">{len(COURSE_GROUPS)} courses listed</p>
        <div class="learning-grid" id="course-grid">{cards}</div>
        <div class="learning-empty" id="course-empty" hidden><h3>No matching courses.</h3><p>Try a broader search or clear the filters. You can also <a href="{CONTACT_URL}">ask Way2Me for guidance</a>.</p></div>
        <p class="learning-source">Catalogue checked 9 September 2026. Listings describe published course topics; batch availability is confirmed by Way2Me.</p>
      </div>
    </section>
    <section class="section-divider" id="muco-services" aria-labelledby="learning-services-title">
      <div class="container">
        <span class="eyebrow">MUCO LABS · Business services</span>
        <h2 id="learning-services-title">Need something built for your business?</h2>
        <p>Our services cover design, development, automation and ongoing support. Explore a service to discuss a project with MUCO LABS.</p>
        <div class="learning-grid">{service_cards}</div>
      </div>
    </section>
    <section class="section-divider" id="way2me-founder" aria-labelledby="learning-founder-title">
      <div class="container learning-founder-layout">
        <figure class="learning-portrait"><img src="assets/yogahari.png" width="1086" height="1448" loading="lazy" decoding="async" alt="S. Yoga hari karan, founder and tutor at Way2Me" /><figcaption>{escape(TUTOR_PROFILE['name'])} · {escape(TUTOR_PROFILE['role'])}</figcaption></figure>
        <div>
          <span class="eyebrow">Tutor profile · Way2Me</span>
          <h2 id="learning-founder-title">{escape(TUTOR_PROFILE['name'])}</h2>
          <p>{escape(TUTOR_PROFILE['bio'])}</p>
          <p>Explore technology and practical skills with Way2Me. Its public programmes span AI, programming, design, engineering and professional development.</p>
          <p>For course guidance, current batches and admission questions, continue directly to the Way2Me team.</p>
          <div class="btn-group mt-5"><a href="{CONTACT_URL}" class="btn btn-accent learning-enquiry">Enquire at Way2Me <span aria-hidden="true">↗</span></a><a href="https://way2me.in/about/" class="btn btn-secondary">About Way2Me</a></div>
        </div>
      </div>
    </section>
    <section class="section-divider" id="learner-feedback" aria-labelledby="learner-feedback-title"><div class="container">
      <span class="eyebrow">Learner feedback · {escape(FEEDBACK_SUMMARY['source_label'])}</span>
      <div class="learning-feedback-heading"><div><h2 id="learner-feedback-title">What learners valued.</h2><p>Feedback was lightly edited for clarity and grouped into themes. Student names are not displayed.</p></div><div class="learning-feedback-stat"><strong>{FEEDBACK_SUMMARY['average_rating']}</strong><span>{FEEDBACK_SUMMARY['responses']} responses</span></div></div>
      <div class="learning-feedback-grid">{''.join(f'<article class="learning-feedback-card"><p>{escape(theme)}</p></article>' for theme in FEEDBACK_THEMES)}</div>
      <p class="learning-source">Source: the supplied Form Responses 1 sheet. Student names are not displayed.</p>
    </div></section>
    <section class="section-divider"><div class="container learning-portal-callout">
      <div><span class="eyebrow">Already a learner?</span><h2>Your learning, in one place.</h2><p>Use the separate learning portal entry to sign in or register with Way2Me.</p></div>
      <a href="learning-portal.html" class="btn btn-accent">Open learning portal <span aria-hidden="true">→</span></a>
    </div></section>'''
    return render('learning.html', 'Learning &amp; Courses | Way2Me &amp; MUCO LABS',
        'Browse Way2Me courses and all eight MUCO LABS services. Enquire directly at Way2Me or open the separate learning portal.', body,
        schema_blocks=[ORG_JSONLD, breadcrumbs([('Home', ''), ('Learning & Courses', 'learning.html')])])


def build_learning_portal():
    body = page_header('Way2Me · Learning portal',
        'Pick up where<br><span class="accent-serif">you left off.</span>',
        'Your courses and learner account are hosted by Way2Me. Choose an option below to continue on way2me.in.',
        extra=f'''<div class="btn-group mt-5"><a class="btn btn-accent btn-lg" href="{DASHBOARD_URL}">Sign in at Way2Me <span aria-hidden="true">↗</span></a><a class="btn btn-secondary btn-lg" href="{REGISTRATION_URL}">Register at Way2Me</a></div>''')
    body += f'''<section class="section-divider"><div class="container">
      <div class="learning-grid learning-portal-grid">
        <article class="learning-course"><span class="eyebrow">01 · Discover</span><h2>Find a course</h2><p>Search our list of Way2Me course topics and choose your next skill.</p><a href="learning.html#courses">Browse learning &amp; courses →</a></article>
        <article class="learning-course"><span class="eyebrow">02 · Learn</span><h2>Open your dashboard</h2><p>Sign in using your Way2Me learner account. Registration and access are managed by Way2Me.</p><a href="{DASHBOARD_URL}">Continue to Way2Me ↗</a></article>
        <article class="learning-course"><span class="eyebrow">03 · Get help</span><h2>Speak to Way2Me</h2><p>Ask about course suitability, fees, batches, enrolment or account access.</p><a class="learning-enquiry" href="{CONTACT_URL}">Enquire at Way2Me ↗</a></article>
      </div>
      <div class="learning-account-note"><h2>Use the right account.</h2><p>Use your Way2Me account for learning. Your MUCO LABS customer account is for business projects, requests and files.</p><a href="https://portal.mucolabs.com/login">Go to the MUCO customer portal →</a><p>If the Way2Me dashboard is unavailable, <a href="{CONTACT_URL}">contact the Way2Me team</a>.</p></div>
    </div></section>'''
    return render('learning-portal.html', 'Learning Portal | Way2Me access | MUCO LABS',
        'Open your Way2Me learner dashboard, register for a learner account, browse courses or contact Way2Me for support.', body,
        current='learning.html', schema_blocks=[ORG_JSONLD, breadcrumbs([('Home', ''), ('Learning & Courses', 'learning.html'), ('Learning Portal', 'learning-portal.html')])])
