/* First-visit campaign context for an enquiry, without contact details or URL queries. */
(function () {
  'use strict';
  var key = 'muco_acquisition_v1';
  var fields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'];
  function clean(value) { return typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 100) : ''; }
  function path(value) { return typeof value === 'string' && /^\/(?!\/)/.test(value) ? value.split(/[?#]/)[0].slice(0, 200) : '/'; }
  function referrer(value) {
    try { var u = new URL(value); return /^https?:$/.test(u.protocol) && u.origin !== location.origin ? u.origin : ''; }
    catch (_) { return ''; }
  }
  var saved;
  try { saved = JSON.parse(sessionStorage.getItem(key)); } catch (_) { /* storage may be disabled */ }
  var source = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : null;
  var data = { landing_page: path(source ? source.landing_page : location.pathname), referrer: referrer(source ? source.referrer : document.referrer) };
  var query = new URLSearchParams(location.search);
  fields.forEach(function (field) { data[field] = clean(source ? source[field] : query.get(field)); });
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch (_) { /* in-memory fallback */ }
  window.mucoAttribution = function () { return Object.assign({}, data); };
})();
