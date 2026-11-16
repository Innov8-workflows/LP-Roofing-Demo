
(function () {
  'use strict';

  var y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  
  var ups = document.querySelectorAll('.up');
  if (ups.length && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('io');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(ups, function (el) { io.observe(el); });
  }

  var quiz = document.querySelector('[data-quiz]');
  if (!quiz) return;

  var WA = quiz.getAttribute('data-wa') || '';
  var SMS = quiz.getAttribute('data-sms') || '';
  var steps = quiz.querySelectorAll('.qstep');
  var fill = quiz.querySelector('[data-quiz-fill]');
  var count = quiz.querySelector('[data-quiz-count]');
  var back = quiz.querySelector('[data-quiz-back]');
  var sumEl = quiz.querySelector('[data-quiz-summary]');
  var errEl = quiz.querySelector('[data-quiz-error]');
  var F = {
    name: quiz.querySelector('[data-quiz-name]'),
    phone: quiz.querySelector('[data-quiz-phone]'),
    postcode: quiz.querySelector('[data-quiz-postcode]')
  };
  var TOTAL = steps.length;
  var current = 1;
  var KEYS = ['work', 'property', 'urgency'];
  var answers = { work: '', property: '', urgency: '' };
  var tried = false;

  function val(k) { return F[k] ? F[k].value.trim() : ''; }
  function track(name, params) { if (window.track) window.track(name, params || {}); }

  function show(n) {
    current = Math.min(Math.max(n, 1), TOTAL);
    Array.prototype.forEach.call(steps, function (s) {
      s.classList.toggle('on', Number(s.getAttribute('data-step')) === current);
    });
    if (fill) fill.style.width = (current / TOTAL * 100) + '%';
    if (count) count.textContent = 'Step ' + current + ' of ' + TOTAL;
    if (back) back.hidden = current === 1;
    if (current === TOTAL) render();
  }

  function message() {
    var lines = ['Hi Lee, I found you on your website and would like a free quote.', ''];
    if (answers.work) lines.push('Job: ' + answers.work);
    if (answers.property) lines.push('Property: ' + answers.property);
    if (answers.urgency) lines.push('Timing: ' + answers.urgency);
    if (val('name')) lines.push('Name: ' + val('name'));
    if (val('phone')) lines.push('Phone: ' + val('phone'));
    if (val('postcode')) lines.push('Address or postcode: ' + val('postcode'));
    lines.push('', 'Sent from the quote page on lproofingltd.co.uk');
    return lines.join('\n');
  }

  function render() {
    if (sumEl) {
      sumEl.textContent = 'Your answers: ' + KEYS.map(function (k) { return answers[k]; }).filter(Boolean).join(', ');
    }
    var text = encodeURIComponent(message());
    var wa = quiz.querySelector('[data-quiz-send="whatsapp"]');
    var sms = quiz.querySelector('[data-quiz-send="sms"]');
    if (wa) wa.href = 'https://wa.me/' + WA + '?text=' + text;
    
    if (sms) sms.href = 'sms:' + SMS + '?&body=' + text;
  }

  
  function check() {
    var missing = [];
    ['name', 'phone', 'postcode'].forEach(function (k) {
      var bad = !val(k) || (k === 'phone' && val(k).replace(/\D/g, '').length < 10);
      if (F[k]) {
        F[k].classList.toggle('bad', bad);
        F[k].setAttribute('aria-invalid', bad ? 'true' : 'false');
      }
      if (bad) missing.push(k);
    });
    if (errEl) {
      errEl.hidden = !missing.length;
      errEl.textContent = missing.length ? 'Please add your ' + missing.map(function (k) {
        return k === 'postcode' ? 'address or postcode' : k === 'phone' ? 'phone number' : 'first name';
      }).join(', ').replace(/, ([^,]*)$/, ' and $1') + ' so Lee can reply.' : '';
    }
    return !missing.length;
  }

  quiz.addEventListener('click', function (e) {
    var opt = e.target && e.target.closest ? e.target.closest('.opt') : null;
    if (!opt) return;
    var step = Number(opt.closest('.qstep').getAttribute('data-step'));
    answers[KEYS[step - 1]] = opt.getAttribute('data-val') || '';
    
    if (step === 1) track('funnel_start', { answer: answers.work });
    track('funnel_step', { step: step, answer: answers[KEYS[step - 1]] });
    show(step + 1);
  });

  if (back) back.addEventListener('click', function () { show(current - 1); });
  Object.keys(F).forEach(function (k) {
    if (F[k]) F[k].addEventListener('input', function () { render(); if (tried) check(); });
  });

  Array.prototype.forEach.call(quiz.querySelectorAll('[data-quiz-send]'), function (btn) {
    btn.addEventListener('click', function (e) {
      render();
      if (!check()) {
        tried = true;
        e.preventDefault();
        var first = ['name', 'phone', 'postcode'].filter(function (k) { return F[k] && F[k].classList.contains('bad'); })[0];
        if (first) F[first].focus();
        return;
      }
      var parts = [];
      if (answers.work) parts.push('Job: ' + answers.work);
      if (answers.property) parts.push('Property: ' + answers.property);
      if (answers.urgency) parts.push('Timing: ' + answers.urgency);
      parts.push('Address or postcode: ' + val('postcode'));
      parts.push('Sent by ' + (btn.getAttribute('data-quiz-send') === 'sms' ? 'text' : 'WhatsApp'));
      if (window.sendLead) {
        window.sendLead({
          type: 'Quote funnel',
          name: val('name'),
          phone: val('phone'),
          service: answers.work,
          details: parts.join(' | '),
          source: 'ad landing page'
        });
      }
      track('generate_lead', { form_name: 'quote funnel', method: btn.getAttribute('data-quiz-send'), service: answers.work, timing: answers.urgency });
    }, false);
  });

  
  var float = document.querySelector('[data-quiz-wa]');
  if (float && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      float.classList.toggle('away', es[0].isIntersecting);
    }, { threshold: 0.15 }).observe(quiz);
  }
  if (float) {
    float.addEventListener('click', function () {
      float.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(message());
    }, true);
  }

  show(1);
})();
