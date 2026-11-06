'use strict';

const { works, concepts, isPrivate } = window.ARCHIVE;
const main = document.querySelector('main');
const conceptById = new Map(concepts.map(concept => [concept.id, concept]));
const workById = new Map(works.map(work => [work.id, work]));
const groups = ['Truths', 'Catechism', 'Themes'];
const tierLabels = ['Unassigned', 'Direct doctrine', 'Chosen instruction', 'Lay synthesis', 'Commentary & practice'];
const rightsLabels = {
  'link-only': 'External reference', 'unconfirmed': 'Permission unconfirmed',
  'catalog-only': 'Public catalog record', 'original-editorial': 'Original editorial', 'cleared': 'Cleared for publication'
};
const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const filters = ['tier', 'author', 'kind', 'topic'];
const searchIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.6" cy="10.6" r="6.1"/><path d="m15 15 4 4"/></svg>';
const arrow = '<span aria-hidden="true">↗</span>';
const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const h = value => String(value ?? '').replace(/[&<>"']/g, character => htmlEntities[character]);
const plural = (number, unit) => `${number} ${unit}${number === 1 ? '' : 's'}`;
const labelTier = tier => tier == null ? 'Unassigned' : `Tier ${tier}`;
const formatCount = number => String(number).padStart(2, '0');
const textCount = works.filter(work => work.pages.length).length;

if (isPrivate) {
  document.querySelector('#edition').innerHTML = '<span aria-hidden="true"></span> Local edition';
  document.title = 'The Sartanic Archive · Local edition';
}

function href(route = 'library', params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return `#${route}${query.size ? '?' + query : ''}`;
}

function readRoute() {
  const [path = 'library', query = ''] = location.hash.slice(1).split('?');
  const [view, id, page] = (path || 'library').split('/');
  return { view, id, page, params: new URLSearchParams(query) };
}

function termsFor(query) {
  return [...new Set((query.slice(0, 200).match(/"[^"]+"|[^\s"]+/g) || [])
    .map(term => term.replace(/^"|"$/g, '').trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean))].slice(0, 12);
}

function highlight(value, terms) {
  if (!terms.length) return h(value);
  const pattern = [...terms].sort((a, b) => b.length - a.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll(' ', '\\s+')).join('|');
  const matches = new RegExp(pattern, 'gi');
  let result = '';
  let last = 0;
  for (const match of value.matchAll(matches)) {
    result += `${h(value.slice(last, match.index))}<mark>${h(match[0])}</mark>`;
    last = match.index + match[0].length;
  }
  return result + h(value.slice(last));
}

function excerpt(value, terms) {
  const text = value.replace(/\s+/g, ' ').trim();
  const lowercase = text.toLowerCase();
  const positions = terms.map(term => lowercase.indexOf(term)).filter(index => index >= 0);
  const start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 48);
  const end = Math.min(text.length, start + 160);
  return (start ? '…' : '') + highlight(text.slice(start, end), terms) + (end < text.length ? '…' : '');
}

function topicLabel(concept) {
  return concept.number ? `Truth ${concept.number} · ${concept.name}` : concept.name;
}

function chip(id) {
  const concept = conceptById.get(id);
  return `<a class="chip" href="${href('topic/' + id)}">${h(topicLabel(concept))}</a>`;
}

function workLink(work, page, search) {
  return href(`work/${work.id}${page ? '/' + page.id : ''}`, search);
}

function tierPill(work) {
  const { tier } = work.authority;
  return `<span class="tier tier-${tier ?? 'none'}">${work.kind === 'OOC guide' ? 'Editorial' : labelTier(tier)}</span>`;
}

function accessLabel(work) {
  if (work.access === 'private' && work.pages.length === 1) return work.pages[0].label;
  if (work.access === 'private' && work.pages.length) return plural(work.pages.length, 'captured section');
  if (work.pages.length) return plural(work.pages.length, 'page');
  return work.references.length ? 'Reference record' : 'Catalog record';
}

function libraryCard(work, search = {}, terms = [], matchingPages = [], metadataMatch = '') {
  return `<article class="source-card">
    <div class="source-top"><span class="source-kind">${h(work.kind)}</span>${tierPill(work)}</div>
    <h3><a href="${workLink(work, null, search)}">${highlight(work.title, terms)} ${arrow}</a></h3>
    <p class="byline">${highlight(work.author, terms)}${work.edition ? ' · ' + highlight(work.edition, terms) : ''}</p>
    <p class="source-summary">${highlight(work.summary, terms)}</p>
    ${metadataMatch || matchingPages.length ? `<ul class="matches">
      ${metadataMatch ? `<li><p>Editorial record · ${excerpt(metadataMatch, terms)}</p></li>` : ''}
      ${matchingPages.map(page => `<li><a href="${workLink(work, page, search)}">${h(page.label)} · ${highlight(page.title, terms)} ${arrow}</a><p>${excerpt(page.text, terms)}</p></li>`).join('')}
    </ul>` : ''}
    <div class="source-foot"><span>${h(accessLabel(work))}</span><span>${h(work.confidence)} confidence</span></div>
  </article>`;
}

function hero() {
  return `<section class="hero" aria-labelledby="hero-title">
    <div class="hero-text">
      <p class="eyebrow"><span class="diamond" aria-hidden="true"></span> An out-of-character research library</p>
      <h1 id="hero-title">The Sartanic<br><em>Archive.</em></h1>
      <p class="hero-intro">Explore the texts, teachings, and interpretations of Sartanic theology in Achaea. Find the source behind a claim and follow an idea across the collection.</p>
      <a class="button primary" href="#collection" data-scroll="collection">Browse the collection <span aria-hidden="true">↓</span></a>
    </div>
    <div class="hero-art" aria-hidden="true">
      <span class="plate-note plate-top">RESEARCH PLATE 01</span>
      <img src="./seal.svg" alt="" width="480" height="400">
      <span class="plate-note plate-bottom">TRUTHS <i></i> CATECHISM <i></i> THEMES</span>
    </div>
  </section>
  <div class="stats" aria-label="Collection at a glance">
    <div><strong>${formatCount(works.length)}</strong><span>Catalog records</span></div>
    <div><strong>${formatCount(textCount)}</strong><span>Readable works</span></div>
    <div><strong>${formatCount(concepts.length)}</strong><span>Doctrinal topics</span></div>
    <p>${isPrivate ? 'Local edition · includes private source captures' : 'Public edition · nonprofit research library'}</p>
  </div>`;
}

function selectFilter(name, label, options) {
  return `<label class="filter">${label}<select name="${name}"><option value="">All ${label.toLowerCase() === 'authority' ? 'tiers' : label.toLowerCase() + 's'}</option>
    ${options.map(([value, title]) => `<option value="${h(value)}">${h(title)}</option>`).join('')}
  </select></label>`;
}

function uniqueOptions(key) {
  return [...new Set(works.map(work => work[key]))].sort((a, b) => a.localeCompare(b)).map(value => [value, value]);
}

function library(params) {
  main.innerHTML = `<div class="shell">
    ${hero()}
    <div class="library-layout" id="collection" tabindex="-1">
      <section class="collection" aria-labelledby="collection-title">
        <p class="eyebrow"><span class="section-number">01</span> Source catalog</p>
        <h2 id="collection-title">The Library</h2>
        <p class="section-intro">Search available text and catalog metadata, or narrow the collection by source and topic.</p>
        <form id="search-form" role="search" aria-label="Search the archive">
          <div class="searchbox">${searchIcon}
            <label class="sr-only" for="keyword">Search available text and records</label>
            <input type="search" id="keyword" name="q" placeholder="Keyword, phrase, or author…" maxlength="200" autocomplete="off">
            <kbd aria-hidden="true">/</kbd>
          </div>
          <div class="filters">
            ${selectFilter('tier', 'Authority', [1, 2, 3, 4].map(tier => [tier, `Tier ${tier} · ${tierLabels[tier]}`]).concat([['none', 'Unassigned']]))}
            ${selectFilter('kind', 'Type', uniqueOptions('kind'))}
            ${selectFilter('author', 'Author', uniqueOptions('author'))}
            ${selectFilter('topic', 'Topic', concepts.map(concept => [concept.id, topicLabel(concept)]))}
          </div>
          <div class="results-bar"><p id="result-count" role="status"></p><button class="quiet-button" type="reset" hidden>Clear search &amp; filters</button></div>
        </form>
        <div id="results" class="source-grid"></div>
      </section>
      <aside class="browse-panel" aria-labelledby="browse-title">
        <p class="eyebrow"><span class="diamond" aria-hidden="true"></span> Topic index</p>
        <h2 id="browse-title">Explore doctrine</h2>
        <p>Follow a Truth, a Catechism practice, or a recurring theme.</p>
        <h3>The Seven Truths</h3>
        <div class="truth-index">${roman.map((number, index) =>
          `<a href="#topic/truth-${index + 1}" aria-label="Truth ${number} · ${h(conceptById.get('truth-' + (index + 1)).name)}">${number}</a>`).join('')}</div>
        <h3>Catechism</h3>
        <div class="chips">${concepts.filter(concept => concept.group === 'Catechism').map(concept => chip(concept.id)).join('')}</div>
        <a class="panel-link" href="#doctrine">Open the doctrine index ${arrow}</a>
      </aside>
    </div>
  </div>`;

  const form = document.querySelector('#search-form');
  for (const name of ['q', ...filters]) {
    form.elements.namedItem(name).value = params.get(name) || '';
  }
  function refresh(updateAddress = true) {
    const selected = Object.fromEntries(new FormData(form));
    const terms = termsFor(selected.q);
    const contains = value => {
      const normalized = value.toLowerCase().replace(/\s+/g, ' ');
      return terms.every(term => normalized.includes(term));
    };
    const matching = [];
    for (const work of works) {
      const tier = String(work.authority.tier ?? 'none');
      if ((selected.tier && selected.tier !== tier)
        || (selected.author && selected.author !== work.author)
        || (selected.kind && selected.kind !== work.kind)
        || (selected.topic && !work.topics.includes(selected.topic))) continue;
      const visibleMetadata = [work.title, work.edition, work.author, work.kind, work.summary].join(' ');
      const editorialMetadata = [work.provenance, work.quality, work.reception, work.confidence,
        work.confidenceNote, work.completeness, work.authority.basis,
        ...work.topics.map(id => topicLabel(conceptById.get(id)))].join(' ');
      const pages = terms.length ? work.pages.filter(page => contains(page.title + ' ' + page.text)) : [];
      const matchesVisible = contains(visibleMetadata);
      const matchesMetadata = matchesVisible || contains(visibleMetadata + ' ' + editorialMetadata);
      if (matchesMetadata || pages.length) {
        matching.push({ work, pages, metadataMatch: matchesMetadata && !matchesVisible ? editorialMetadata : '' });
      }
    }
    const pageHits = matching.reduce((count, hit) => count + hit.pages.length, 0);
    document.querySelector('#result-count').textContent = plural(matching.length, 'record')
      + (terms.length ? ` · ${plural(pageHits, 'text match')}` : '');
    document.querySelector('button[type="reset"]').hidden = !Object.values(selected).some(Boolean);
    document.querySelector('#results').innerHTML = matching.length
      ? matching.map(({ work, pages, metadataMatch }) => libraryCard(work, selected, terms, pages, metadataMatch)).join('')
      : '<p class="empty">No records match. Try a shorter term or clear a filter.</p>';
    if (updateAddress) history.replaceState(null, '', href('library', selected));
  }
  form.addEventListener('input', () => refresh());
  form.addEventListener('submit', event => {
    event.preventDefault();
    refresh();
  });
  form.addEventListener('reset', event => {
    event.preventDefault();
    for (const field of form.querySelectorAll('input, select')) field.value = '';
    refresh();
    form.elements.namedItem('q').focus();
  });
  refresh(false);
}

function pageHeader(label, title, intro, back = 'library', backLabel = 'Back to library') {
  return `<a class="back-link" href="${back.startsWith('#') ? back : href(back)}">← ${backLabel}</a>
    <div class="page-heading">
      <p class="eyebrow"><span class="diamond" aria-hidden="true"></span> ${h(label)}</p>
      <h1>${h(title)}</h1>
      <p>${h(intro)}</p>
    </div>`;
}

function rankings() {
  main.innerHTML = `<div class="shell inner">
    ${pageHeader('Editorial review', 'Source authority rankings', 'Tiers describe what a source can establish. Quality, documented reception, and confidence are assessed separately. Sources within a tier have equal rank for their stated scope.')}
    ${[1, 2, 3, 4, null].map(tier => {
      const group = works.filter(work => work.authority.tier === tier && work.kind !== 'OOC guide');
      if (!group.length) return '';
      const title = tier == null ? 'Unassigned' : `Tier ${tier} · ${tierLabels[tier]}`;
      return `<section class="doctrine-group" aria-label="${title}">
        <h2>${title}</h2>
        <div class="topic-grid">${group.map(work => `<article class="topic-card ranking-card">
          <h3><a href="${workLink(work)}">${h(work.title)}${work.edition ? ' · ' + h(work.edition) : ''} ${arrow}</a></h3>
          <p class="byline">${h(work.author)}</p>
          <dl class="assessment">
            <dt>Authority and scope</dt><dd>${h(work.authority.basis)}</dd>
            <dt>Quality</dt><dd>${h(work.quality)}</dd>
            <dt>Reception</dt><dd>${h(work.reception)}</dd>
            <dt>Confidence · ${h(work.confidence)}</dt><dd>${h(work.confidenceNote)}</dd>
          </dl>
        </article>`).join('')}</div>
      </section>`;
    }).join('')}
  </div>`;
}

function doctrine() {
  main.innerHTML = `<div class="shell inner">
    ${pageHeader('02 · Topic index', 'Doctrine & themes', 'Trace the Seven Truths, Catechism practices, and related themes. Topic links are editorial study aids.')}
    ${groups.map(group => `<section class="doctrine-group" aria-label="${group}">
      <h2>${group === 'Truths' ? 'The Seven Truths' : group}</h2>
      <div class="topic-grid">${concepts.filter(concept => concept.group === group).map(concept => `
        <article class="topic-card"><h3><a href="#topic/${concept.id}">${h(topicLabel(concept))} ${arrow}</a></h3><p>${h(concept.summary)}</p></article>`).join('')}</div>
    </section>`).join('')}
  </div>`;
}

function topic(id) {
  const concept = conceptById.get(id);
  if (!concept) return missing('Topic');
  const linked = works.filter(work => work.topics.includes(id));
  main.innerHTML = `<div class="shell inner">
    ${pageHeader(concept.group + ' · Editorial topic', topicLabel(concept), concept.summary, 'doctrine', 'Back to doctrine')}
    <section class="panel related"><h2>Related concepts</h2><div class="chips">${concept.related.map(chip).join('')}</div></section>
    <div class="heading-row"><h2>Sources in the archive</h2><a class="button" href="${href('library', { topic: id })}">Filter the library ${arrow}</a></div>
    <div class="source-grid">${linked.length ? linked.map(work => libraryCard(work)).join('') : '<p class="empty">Sources for this topic are awaiting review.</p>'}</div>
  </div>`;
}

function method() {
  main.innerHTML = `<div class="shell inner">
    ${pageHeader('03 · Editorial policy', 'Method & rights', 'An independent out-of-character reference for Achaea’s fictional theology. Each assessment describes its evidence and scope.')}
    <div class="method-grid">
      <section class="panel"><p class="eyebrow">Source authority</p><h2>How tiers work</h2>
        <dl class="assessment">
          <dt>Tier 1 · Direct doctrine</dt><dd>Direct divine or administrator-authored statements and attested revelations.</dd>
          <dt>Tier 2 · Chosen instruction</dt><dd>Attested Chosen teaching, sacred collections, and institutional sources within their scope. A ritual record can establish how a rite was practised.</dd>
          <dt>Tier 3 · Lay synthesis</dt><dd>Systematic mortal works and instructional primers whose scope and provenance support this classification, including syntheses of adjacent traditions.</dd>
          <dt>Tier 4 · Commentary &amp; practice</dt><dd>Contextual essays, sermons, rituals, histories, and devotional works whose authority comes from their own circumstances.</dd>
          <dt>Unassigned</dt><dd>Pending verification or outside the doctrinal hierarchy.</dd>
        </dl>
      </section>
      <section class="panel"><p class="eyebrow">Editorial review</p><h2>How to read a record</h2>
        <dl class="assessment">
          <dt>Author &amp; provenance</dt><dd>Who is attributed, which witness or edition is available, and where that attribution comes from.</dd>
          <dt>Quality</dt><dd>How clear or useful the work is for an identified task.</dd>
          <dt>Reception</dt><dd>Who praised, used, or disputed the work, where documented.</dd>
          <dt>Editorial confidence</dt><dd>How well the present description and classification are supported.</dd>
          <dt>Capture completeness</dt><dd>Whether page labels are original, a capture is partial, or a source copy is still needed.</dd>
        </dl>
      </section>
    </div>
    <section class="panel rights-panel"><p class="eyebrow">Publication policy</p><h2>Reading and reproduction</h2>
      <p>The public edition contains original OOC material, editorial reviews, and source texts cleared for nonprofit use. The project owner reported that permission came from Achaea’s main administrator.</p>
      <p>The local edition includes recorded conversations, interviews, and transcripts. Achaea’s Terms of Service §6 addresses IRE’s license to user contributions and ownership of game materials.</p>
      <div class="chips"><a class="chip" href="https://www.achaea.com/tos">Achaea Terms of Service ${arrow}</a>
      <a class="chip" href="https://www.achaea.com/support">Achaea support ${arrow}</a>
      <a class="chip" href="https://www.copyright.gov/circs/circ16a.pdf">Copyright permission guidance ${arrow}</a></div>
    </section>
  </div>`;
}

const stopwords = new Set(('about after again also among and any are been before being but can could each first for from had has have how into its just like made many may more most much must one only other our out over same shall she should some still such than that the their them then there these they this those through too upon use very was were what when where which while who will with would your you say says said voice').split(' '));

function wordCloud(work) {
  const counts = new Map();
  for (const page of work.pages) {
    for (const token of page.text.toLowerCase().matchAll(/\p{L}{4,}/gu)) {
      const word = token[0];
      if (!stopwords.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
    }
  }
  const top = [...counts].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 22);
  if (!top.length) return '';
  return `<details class="panel term-panel"><summary>Word cloud · ${plural(top.length, 'term')}</summary>
    <p>Repeated words across this work’s available text. Select a term to search the library.</p>
    <ul class="cloud">${top.map(([word, count]) => `<li><a href="${href('library', { q: word })}" style="--scale:${1 + count / top[0][1] * 0.65}">${h(word)} <small>${count}</small></a></li>`).join('')}</ul>
  </details>`;
}

function editorial(work) {
  const { tier, basis } = work.authority;
  return `<section class="panel editorial" aria-labelledby="record-title">
    <p class="eyebrow">Editorial record</p><h2 id="record-title">Source assessment</h2>
    <dl class="assessment">
      <dt>Source authority</dt><dd>${tierPill(work)} <span class="tier-name">${tier == null ? '' : tierLabels[tier]}</span><p>${h(basis)}</p></dd>
      <dt>Author &amp; provenance</dt><dd><strong>${h(work.author)}</strong><p>${h(work.provenance)}</p></dd>
      <dt>Quality</dt><dd>${h(work.quality)}</dd>
      <dt>Reception</dt><dd>${h(work.reception)}</dd>
      <dt>Editorial confidence</dt><dd><strong>${h(work.confidence)}</strong><p>${h(work.confidenceNote)}</p></dd>
      <dt>Publication status</dt><dd>${h(rightsLabels[work.rights] || work.rights)}</dd>
    </dl>
    ${work.topics.length ? `<div class="chips">${work.topics.map(chip).join('')}</div>` : ''}
  </section>`;
}

function reader(id, requestedPage, params) {
  const work = workById.get(id);
  if (!work) return missing('Source');
  const index = requestedPage ? work.pages.findIndex(page => page.id === requestedPage) : 0;
  if (index < 0) return missing('Page');
  const page = work.pages[index];
  const search = Object.fromEntries(['q', ...filters].map(key => [key, params.get(key)]));
  const terms = termsFor(search.q || '');
  const notes = work.notes.filter(note => note.page === page?.id);
  const pagination = work.pages.length > 1 ? `<nav class="page-nav" aria-label="Page navigation">
    ${index > 0 ? `<a href="${workLink(work, work.pages[index - 1], search)}">← Previous</a>` : '<span></span>'}
    <span>${index + 1} of ${work.pages.length}</span>
    ${index + 1 < work.pages.length ? `<a href="${workLink(work, work.pages[index + 1], search)}">Next →</a>` : '<span></span>'}
  </nav>` : '';
  const references = work.references.map(({ label, url }) => `<a class="button" href="${h(url)}">${h(label)} ${arrow}</a>`).join('');
  main.innerHTML = `<div class="shell inner">
    ${pageHeader(`${work.kind} · ${accessLabel(work)}`, work.title, work.summary, href('library', search))}
    ${work.edition ? `<p class="edition-detail">${h(work.edition)}</p>` : ''}
    <div class="reader-layout">
      <div class="reader-column">
        <section class="panel reader" aria-labelledby="reader-title">
          <p class="eyebrow">${page ? (work.kind === 'OOC guide' ? 'Original OOC guide' : 'Source text') : 'Source access'}</p>
          <h2 id="reader-title">${page ? h(page.title) : 'Availability'}</h2>
          <p class="capture-note">${h(work.completeness)}</p>
          ${page ? `<nav class="page-index" aria-label="Contents">${work.pages.map(item =>
            `<a class="chip" href="${workLink(work, item, search)}"${item.id === page.id ? ' aria-current="page"' : ''}>${h(item.label)}</a>`).join('')}</nav>
            <div class="transcript">${highlight(page.text, terms)}</div>${pagination}` : ''}
          ${references ? `<div class="reference-links">${references}</div>` : ''}
        </section>
        ${notes.length ? `<section class="panel notes"><h2>Page annotations</h2>${notes.map(note => `<p>${h(note.text)}</p>`).join('')}</section>` : ''}
        ${page ? wordCloud(work) : ''}
      </div>
      ${editorial(work)}
    </div>
  </div>`;
}

function missing(kind) {
  main.innerHTML = `<div class="shell inner">${pageHeader('Archive', kind + ' unavailable', 'This address does not point to a record in this edition.')}</div>`;
}

function render(moveFocus = false) {
  const { view, id, page, params } = readRoute();
  const nav = view === 'topic' ? 'doctrine' : view === 'work' ? 'library' : view;
  for (const link of document.querySelectorAll('[data-nav]')) {
    if (link.dataset.nav === nav) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (view === 'library') library(params);
  else if (view === 'rankings') rankings();
  else if (view === 'doctrine') doctrine();
  else if (view === 'topic') topic(id);
  else if (view === 'method') method();
  else if (view === 'work') reader(id, page, params);
  else missing('Page');
  if (moveFocus) {
    main.focus({ preventScroll: true });
    window.scrollTo(0, params.size && view === 'library' ? document.querySelector('#collection').offsetTop - 24 : 0);
  }
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-scroll], .skip');
  if (!target) return;
  event.preventDefault();
  const destination = document.getElementById(target.dataset.scroll || 'main');
  destination.focus({ preventScroll: true });
  destination.scrollIntoView();
});
document.addEventListener('keydown', event => {
  if (event.key !== '/' || event.altKey || event.ctrlKey || event.metaKey
    || event.target.closest('input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  if (readRoute().view !== 'library') {
    location.hash = '#library';
    window.addEventListener('hashchange', () => document.querySelector('#keyword')?.focus(), { once: true });
  } else document.querySelector('#keyword').focus();
});
window.addEventListener('hashchange', () => render(true));
render();
if (readRoute().view === 'library' && readRoute().params.size) {
  document.querySelector('#collection').scrollIntoView();
}
