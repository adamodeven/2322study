(function(){
'use strict';
var TEST_LEN = 73;
var Q = window.QUESTIONS, DECKS = window.DECKS;
var byId = {}; Q.forEach(function(q){ byId[q.id] = q; });
var deckById = {}; DECKS.forEach(function(d){ deckById[d.id] = d; });
var KEY = 'id2322study.v1';
var $ = function(id){ return document.getElementById(id); };

function shuffle(a){ a = a.slice(); for (var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function slideUrl(deck, page){ return 'slides.html#' + deck + '/' + page; }
function weekShort(title){ return title.split(' - ')[0]; }
function weekLong(title){ return title; }

function newSession(ids){
  var opt = {};
  ids.forEach(function(id){ opt[id] = shuffle([0,1,2,3]); });
  return { queue: shuffle(ids), opt: opt, ans: {}, cur: null, hint: false };
}
function newTest(){ return newSession(shuffle(Q.map(function(q){return q.id;})).slice(0, TEST_LEN)); }
function newTopic(deck){
  var ids = Q.filter(function(q){ return deck === 'all' || q.d === deck; }).map(function(q){ return q.id; });
  var s = newSession(ids); s.deck = deck; return s;
}

var TIME_LIMIT = 60, timer = { id: null, start: 0, stop: null };
function tick(){
  var el = $('timer'); if (!el) return;
  var used = ((timer.stop || Date.now()) - timer.start) / 1000;
  var left = Math.max(0, Math.ceil(TIME_LIMIT - used));
  el.textContent = left > 0 ? Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2) : "Time's up";
  el.className = 'timer' + (left === 0 ? ' up' : left <= 10 ? ' low' : '') + (timer.stop ? ' done' : '');
}
setInterval(tick, 250);
var state;
try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e) { state = null; }
function valid(s){ return s && s.queue && s.queue.every(function(id){ return byId[id]; }); }
if (!state || !valid(state.test)) state = { mode: 'test', test: newTest(), topic: null };
if (state.topic && !valid(state.topic)) state.topic = null;
function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} }
function S(){ return state.mode === 'test' ? state.test : state.topic; }

// topic select
var sel = $('topic');
sel.innerHTML = '<option value="all">All Topics (' + Q.length + ')</option>' + DECKS.map(function(d){
  var n = Q.filter(function(q){ return q.d === d.id; }).length;
  return n ? '<option value="' + d.id + '">' + esc(d.title) + ' (' + n + ')</option>' : '';
}).join('');
sel.onchange = function(){ state.topic = newTopic(sel.value); save(); render(); };

$('m-test').onclick = function(){ state.mode = 'test'; save(); render(); };
$('m-topic').onclick = function(){ state.mode = 'topic'; if (!state.topic) state.topic = newTopic('all'); save(); render(); };
$('reset').onclick = function(){
  if (state.mode === 'test') state.test = newTest(); else state.topic = newTopic(state.topic.deck);
  save(); render(); window.scrollTo({top:0, behavior:'smooth'});
};

function remaining(s){ return s.queue.filter(function(id){ return !s.ans[id]; }); }
function stats(s){
  var ids = Object.keys(s.ans), c = 0;
  ids.forEach(function(id){ if (s.ans[id].ok) c++; });
  return { answered: ids.length, correct: c, total: s.queue.length };
}

function render(){
  var s = S();
  $('m-test').className = state.mode === 'test' ? 'on' : '';
  $('m-topic').className = state.mode === 'topic' ? 'on' : '';
  $('topicWrap').hidden = state.mode !== 'topic';
  if (state.mode === 'topic') sel.value = s.deck;
  var st = stats(s);
  $('score').textContent = (st.answered ? Math.round(100 * st.correct / st.answered) : 0) + '%';
  $('prog').textContent = st.answered + ' / ' + st.total;
  $('pc').textContent = st.answered + ' / ' + st.total;
  var pct = st.total ? Math.round(100 * st.answered / st.total) : 0;
  $('pp').textContent = pct + '%';
  $('pbar').style.width = pct + '%';

  var rem = remaining(s);
  if (s.cur == null || (s.ans[s.cur] && !s.ans[s.cur].showing)) s.cur = rem.length ? rem[0] : null;
  if (s.cur == null) { renderResults(s, st); return; }
  renderQuestion(s, st);
}

function renderQuestion(s, st){
  var q = byId[s.cur], d = deckById[q.d], perm = s.opt[q.id], a = s.ans[q.id];
  var picked = s.picked != null ? s.picked : null;
  var h = '';
  h += '<div class="row"><span class="pill"><span class="short">' + esc(weekShort(d.title)) + '</span><span class="long">' + esc(weekLong(d.title)) + '</span></span>';
  if (timer.id !== q.id) { timer.id = q.id; timer.start = Date.now(); timer.stop = null; }
  if (a && timer.stop == null) timer.stop = Date.now();
  h += '<span class="timer" id="timer"></span>';
  h += '</div>';
  h += '<div class="qnum">Question ' + (Math.min(st.answered + (a ? 0 : 1), st.total)) + ' of ' + st.total + '</div>';
  h += '<h2>' + esc(q.q) + '</h2>';
  if (q.i) h += '<img class="qimg" src="' + esc(q.i) + '" alt="">';
  h += '<div class="opts">';
  perm.forEach(function(oi, k){
    var cls = 'opt';
    if (a) { if (oi === q.a) cls += ' right'; else if (oi === a.sel) cls += ' wrong'; }
    else if (picked === oi) cls += ' sel';
    h += '<button class="' + cls + '" data-oi="' + oi + '"' + (a ? ' disabled' : '') + '><span class="let">' + 'abcd'[k] + '</span><span style="flex:1">' + esc(q.o[oi]) + '</span></button>';
  });
  h += '</div>';
  if (a) {
    h += '<div class="feedback ' + (a.ok ? 'ok' : 'bad') + '">' + (a.ok ? 'Correct.' : 'Not quite. The answer is ' + 'abcd'[perm.indexOf(q.a)] + ') ' + esc(q.o[q.a]) + '.') +
      '<br><a class="src" href="' + slideUrl(q.d, q.p) + '" target="_blank" rel="noopener">See ' + esc(weekShort(d.title)) + ', slide ' + q.p + ' &rarr;</a></div>';
    h += '<div class="actions"><button class="btn" id="next">' + (remaining(s).length ? 'Next Question' : 'See Results') + '</button></div>';
    h += '<div class="keys">Space: next</div>';
  } else {
    h += '<div class="actions"><button class="btn" id="check"' + (picked == null ? ' disabled' : '') + '>Check Answer</button><button class="btn ghost" id="skip" title="Skip this question"' + (remaining(s).length < 2 ? ' disabled' : '') + '>Skip</button></div>';
    h += '<div class="keys">Keys: 1-4 select, Space: check answer</div>';
  }
  var card = $('qcard'); card.innerHTML = h;

  tick();
  if (!a) {
    card.querySelectorAll('.opt').forEach(function(b){ b.onclick = function(){ s.picked = +b.getAttribute('data-oi'); render(); }; });
    $('check').onclick = function(){
      if (s.picked == null) return;
      s.ans[q.id] = { sel: s.picked, ok: s.picked === q.a, showing: true };
      s.picked = null; save(); render();
    };
    $('skip').onclick = function(){
      s.queue.splice(s.queue.indexOf(q.id), 1); s.queue.push(q.id);
      s.cur = null; s.picked = null; s.hint = false; save(); render();
    };
  } else {
    $('next').onclick = function(){ delete a.showing; s.cur = null; s.hint = false; save(); render(); window.scrollTo({top:0, behavior:'smooth'}); };
  }
}

function renderResults(s, st){
  var pct = st.total ? Math.round(100 * st.correct / st.total) : 0;
  var per = {};
  s.queue.forEach(function(id){
    var q = byId[id], r = per[q.d] || (per[q.d] = { n: 0, miss: 0, pages: {} });
    r.n++; if (!s.ans[id].ok) { r.miss++; r.pages[q.p] = 1; }
  });
  var ranked = Object.keys(per).filter(function(k){ return per[k].miss > 0; }).sort(function(x, y){
    var a = per[x], b = per[y];
    return (b.miss - a.miss) || (b.miss / b.n - a.miss / a.n);
  });
  var h = '<div class="stat-l">' + (state.mode === 'test' ? 'Practice test complete' : 'Topic practice complete') + '</div>';
  h += '<div class="big">' + pct + '%</div>';
  h += '<div class="muted">' + st.correct + ' of ' + st.total + ' correct</div>';
  if (state.mode === 'test') {
    h += '<h2 style="margin:2rem 0 0;font-size:1.25rem">What to study</h2>';
    if (!ranked.length) h += '<p>No misses. Every deck held up on this attempt.</p>';
    ranked.slice(0, 2).forEach(function(k, i){
      var d = deckById[k], r = per[k], pages = Object.keys(r.pages).map(Number).sort(function(a,b){return a-b;});
      h += '<div class="study"><h3><span class="rank">' + (i + 1) + '</span>' + esc(d.title) + '</h3>';
      h += '<div class="muted">Missed ' + r.miss + ' of ' + r.n + ' questions from this deck</div>';
      h += '<div class="actions" style="margin-top:1rem"><a class="btn" href="' + slideUrl(k, pages[0]) + '">Open these slides</a></div>';
      h += '<div class="chips">' + pages.map(function(p){ return '<a class="chip" href="' + slideUrl(k, p) + '">Slide ' + p + '</a>'; }).join('') + '</div></div>';
    });
  }
  h += '<div class="wk">' + DECKS.filter(function(d){ return per[d.id]; }).map(function(d){
    var r = per[d.id]; return '<span>' + esc(d.title) + '</span><span>' + (r.n - r.miss) + ' / ' + r.n + '</span>';
  }).join('') + '</div>';
  var missed = s.queue.filter(function(id){ return !s.ans[id].ok; });
  if (missed.length) {
    h += '<details class="review"><summary>Review missed questions (' + missed.length + ')</summary>' + missed.map(function(id){
      var q = byId[id], a = s.ans[id];
      return '<div class="miss"><div><b>' + esc(q.q) + '</b></div><div class="y">Your answer: ' + esc(q.o[a.sel]) + '</div><div class="a">Answer: ' + esc(q.o[q.a]) + '</div><a class="src" href="' + slideUrl(q.d, q.p) + '">' + esc(weekShort(deckById[q.d].title)) + ', slide ' + q.p + ' &rarr;</a></div>';
    }).join('') + '</details>';
  }
  h += '<div class="actions"><button class="btn" id="again">' + (state.mode === 'test' ? 'Start a New 73-Question Test' : 'Restart Topic') + '</button></div>';
  $('qcard').innerHTML = h;
  $('again').onclick = function(){ $('reset').click(); };
}

document.addEventListener('keydown', function(e){
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  var t = e.target && e.target.tagName;
  if (t === 'SELECT' || t === 'INPUT' || t === 'TEXTAREA') return;
  var s = S(); if (s.cur == null) return;
  var a = s.ans[s.cur];
  if (/^[1-4]$/.test(e.key) && !a) {
    var btn = document.querySelectorAll('#qcard .opt')[+e.key - 1];
    if (btn) { e.preventDefault(); btn.click(); }
  } else if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    var b = $(a ? 'next' : 'check');
    if (b && !b.disabled) b.click();
  }
});

render();
})();
