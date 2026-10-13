/* =========================================================
   STACKLY AUTO SPA — Dashboard UI toolkit
   toast / modal / confirm / badges / charts / empty states
   Exposes window.UI (plain script)
   ========================================================= */
window.UI = (function () {
	'use strict';

	function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
	function escape(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
	function initials(name) { return (name || '?').split(/\s+/).map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase(); }

	/* ---------- icons ---------- */
	var I = {
		grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
		calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
		users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 20a5.5 5.5 0 0 0-3-4.9"/></svg>',
		wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.5a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.1-5.1a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.3-.6-.6-2.3 2.5-2.7Z"/></svg>',
		tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12.5 12.5 20 4 11.5V4h7.5L20 12.5Z"/><circle cx="8" cy="8" r="1.3"/></svg>',
		car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h18M5 14l1.4-4.4A2 2 0 0 1 8.3 8h7.4a2 2 0 0 1 1.9 1.6L19 14"/><path d="M6 17.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Zm9 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z"/></svg>',
		staff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
		card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>',
		star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z"/></svg>',
		starO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z"/></svg>',
		chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16"/><path d="M8 15l3.5-4 3 2.5L20 7"/></svg>',
		settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.7 9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.7V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></svg>',
		plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
		edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="M14 6l4 4"/></svg>',
		trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>',
		check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>',
		x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
		clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
		logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h12"/></svg>',
		menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
		search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
		bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
		up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
		down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
		receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></svg>',
		gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13"/><path d="M12 8S9.5 3 7.5 4.5 9 8 12 8Zm0 0s2.5-5 4.5-3.5S15 8 12 8Z"/></svg>',
		shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3Z"/><path d="M9.5 12l1.8 1.8L15 10"/></svg>',
		pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
		phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.7 4.7 4 5.5 4h2.2c.7 0 1.3.5 1.4 1.2l.5 2.6c.1.6-.1 1.2-.6 1.5l-1.3.9a12 12 0 0 0 5.1 5.1l.9-1.3c.4-.5 1-.7 1.5-.6l2.6.5c.7.1 1.2.7 1.2 1.4v2.2c0 .8-.7 1.5-1.5 1.5C10.7 20 4 13.3 4 5.5Z"/></svg>',
		mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
		play: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>',
		refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/></svg>',
		filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z"/></svg>',
		eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
		download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M4 20h16"/></svg>',
		chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
	};

	/* ---------- toast ---------- */
	function toast(type, title, msg) {
		var root = document.getElementById('toastRoot');
		if (!root) { root = el('<div id="toastRoot" class="toast-root"></div>'); document.body.appendChild(root); }
		var icons = { success: I.check, error: I.x, info: I.bell, warn: I.clock };
		var t = el('<div class="toast toast--' + (type || 'info') + '">' +
			'<span class="toast__icon">' + (icons[type] || I.bell) + '</span>' +
			'<div><strong>' + escape(title) + '</strong>' + (msg ? '<span>' + escape(msg) + '</span>' : '') + '</div></div>');
		root.appendChild(t);
		setTimeout(function () { t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 260); }, 3200);
	}

	/* ---------- modal ---------- */
	var openCount = 0;
	function modal(opts) {
		opts = opts || {};
		var root = document.getElementById('modalRoot');
		if (!root) { root = el('<div id="modalRoot" class="modal-root"></div>'); document.body.appendChild(root); }
		root.classList.add('is-open');
		var foot = '';
		if (opts.footer) foot = '<div class="modal__foot">' + opts.footer + '</div>';
		var node = el('<div class="modal-root is-open" style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem">' +
			'<div class="modal-backdrop" data-close></div>' +
			'<div class="modal' + (opts.wide ? ' modal--wide' : '') + '" role="dialog" aria-modal="true">' +
			'<div class="modal__head"><div><h3>' + escape(opts.title || '') + '</h3>' + (opts.subtitle ? '<p>' + escape(opts.subtitle) + '</p>' : '') + '</div>' +
			'<button class="modal__close" data-close aria-label="Close">' + I.x + '</button></div>' +
			'<div class="modal__body">' + (opts.body || '') + '</div>' + foot + '</div></div>');
		document.body.appendChild(node);
		openCount++;
		document.body.style.overflow = 'hidden';
		node.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { close(node); }); });
		document.addEventListener('keydown', escClose);
		function escClose(e) { if (e.key === 'Escape') close(node); }
		function close(n) {
			n.remove(); openCount--;
			if (openCount <= 0) { openCount = 0; document.body.style.overflow = ''; }
			document.removeEventListener('keydown', escClose);
			if (opts.onClose) opts.onClose();
		}
		node._close = close;
		if (opts.onOpen) opts.onOpen(node);
		return node;
	}

	function confirm(opts) {
		opts = opts || {};
		return new Promise(function (resolve) {
			var danger = opts.danger !== false;
			var node = modal({
				title: opts.title || 'Are you sure?',
				body: '<div class="confirm-icon ' + (danger ? 'bad' : 'warn') + '">' + (opts.icon || I.x) + '</div>' +
					'<p style="color:#c9ccd4;font-size:.92rem">' + escape(opts.message || 'This action cannot be undone.') + '</p>',
				footer: '<button class="dbtn" data-close>' + escape(opts.cancelText || 'Cancel') + '</button>' +
					'<button class="dbtn ' + (danger ? 'dbtn--danger' : 'dbtn--accent') + '" data-ok>' + escape(opts.confirmText || 'Confirm') + '</button>',
				onClose: function () { resolve(false); }
			});
			node.querySelector('[data-ok]').addEventListener('click', function () { resolve(true); node._close(); });
		});
	}

	/* ---------- small renders ---------- */
	var STATUS_LABEL = {
		'pending': 'Pending', 'confirmed': 'Confirmed', 'in-progress': 'In Progress',
		'completed': 'Completed', 'cancelled': 'Cancelled',
		'paid': 'Paid', 'unpaid': 'Unpaid', 'refunded': 'Refunded',
		'published': 'Published', 'hidden': 'Hidden',
		'available': 'Available', 'busy': 'Busy', 'off': 'Off duty'
	};
	function statusClass(s) {
		var map = { 'in-progress': 'st-progress', 'pending': 'st-pending', 'confirmed': 'st-confirmed', 'completed': 'st-completed', 'cancelled': 'st-cancelled', 'paid': 'st-paid', 'unpaid': 'st-unpaid', 'refunded': 'st-refunded', 'published': 'st-published', 'hidden': 'st-hidden', 'available': 'st-completed', 'busy': 'st-pending', 'off': 'st-cancelled' };
		return map[s] || 'st-pending';
	}
	function badge(s) { return '<span class="badge-status ' + statusClass(s) + '">' + escape(STATUS_LABEL[s] || s) + '</span>'; }
	function stars(n) {
		var out = '<span class="stars" aria-label="' + n + ' out of 5">';
		for (var i = 1; i <= 5; i++) out += (i <= n ? I.star : I.starO);
		return out + '</span>';
	}
	function empty(opts) {
		opts = opts || {};
		return '<div class="empty"><div class="empty__icon">' + (opts.icon || I.search) + '</div>' +
			'<h4>' + escape(opts.title || 'Nothing here yet') + '</h4>' +
			'<p>' + escape(opts.text || '') + '</p>' +
			(opts.action || '') + '</div>';
	}
	function skeletonStats(n) {
		var out = '';
		for (var i = 0; i < (n || 4); i++) out += '<div class="skeleton sk-card"></div>';
		return out;
	}
	function skeletonRows(n) {
		var out = '';
		for (var i = 0; i < (n || 5); i++) out += '<div class="skeleton sk-line" style="height:44px;margin:.5rem 0"></div>';
		return out;
	}
	function avatar(user, size) {
		size = size || 'avatar-sm';
		var img = user && user.avatar ? '<img class="' + size + '" src="' + user.avatar + '" alt="">' : '<span class="' + size + '" style="display:inline-grid;place-items:center;background:var(--surface-2);font-family:var(--font-d);font-size:.8rem;color:#fff">' + initials(user && user.name) + '</span>';
		return img;
	}

	/* ---------- charts (dependency-free SVG) ---------- */
	function defs() {
		return '<defs>' +
			'<linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5a30a"/><stop offset="1" stop-color="#ff6a2b"/></linearGradient>' +
			'<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(245,163,10,.38)"/><stop offset="1" stop-color="rgba(245,163,10,0)"/></linearGradient>' +
			'</defs>';
	}
	function lineChart(data, opts) {
		opts = opts || {};
		var w = 640, h = 230, pl = 42, pr = 14, pt = 16, pb = 34;
		var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
		max = Math.ceil(max / 5) * 5 || 5;
		var iw = w - pl - pr, ih = h - pt - pb;
		var step = data.length > 1 ? iw / (data.length - 1) : iw;
		function X(i) { return pl + i * step; }
		function Y(v) { return pt + ih - (v / max) * ih; }
		var grid = '', i;
		for (i = 0; i <= 4; i++) {
			var gy = pt + (ih / 4) * i;
			var val = Math.round(max - (max / 4) * i);
			grid += '<line class="grid-line" x1="' + pl + '" y1="' + gy + '" x2="' + (w - pr) + '" y2="' + gy + '"/>';
			grid += '<text class="axis-text" x="' + (pl - 8) + '" y="' + (gy + 3) + '" text-anchor="end">' + (opts.money ? '$' + val : val) + '</text>';
		}
		var pts = data.map(function (d, idx) { return [X(idx), Y(d.value)]; });
		var path = pts.map(function (p, idx) { return (idx ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
		var area = path + ' L' + X(data.length - 1).toFixed(1) + ' ' + (pt + ih) + ' L' + X(0).toFixed(1) + ' ' + (pt + ih) + ' Z';
		var labels = data.map(function (d, idx) { return '<text class="axis-text" x="' + X(idx).toFixed(1) + '" y="' + (h - 12) + '" text-anchor="middle">' + escape(d.label) + '</text>'; }).join('');
		var dots = pts.map(function (p) { return '<circle class="dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.4"><title>' + '</title></circle>'; }).join('');
		return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img">' + defs() + grid +
			'<path class="area" d="' + area + '"/><path class="line" d="' + path + '"/>' + dots + labels + '</svg>';
	}
	function barChart(data, opts) {
		opts = opts || {};
		var w = 640, h = 230, pl = 42, pr = 14, pt = 16, pb = 34;
		var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
		max = Math.ceil(max / 5) * 5 || 5;
		var iw = w - pl - pr, ih = h - pt - pb;
		var n = data.length, gap = 18, bw = Math.max(12, (iw - gap * (n + 1)) / n);
		var bars = '', labels = '', i;
		for (i = 0; i <= 4; i++) {
			var gy = pt + (ih / 4) * i, val = Math.round(max - (max / 4) * i);
			bars += '<line class="grid-line" x1="' + pl + '" y1="' + gy + '" x2="' + (w - pr) + '" y2="' + gy + '"/>';
			bars += '<text class="axis-text" x="' + (pl - 8) + '" y="' + (gy + 3) + '" text-anchor="end">' + (opts.money ? '$' + val : val) + '</text>';
		}
		data.forEach(function (d, idx) {
			var x = pl + gap + idx * (bw + gap);
			var bh = (d.value / max) * ih;
			var y = pt + ih - bh;
			bars += '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(2, bh).toFixed(1) + '" rx="5"><title>' + escape(d.label) + ': ' + (opts.money ? '$' : '') + d.value + '</title></rect>';
			labels += '<text class="axis-text" x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 12) + '" text-anchor="middle">' + escape(d.label) + '</text>';
		});
		return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img">' + defs() + bars + labels + '</svg>';
	}
	function donut(data, opts) {
		opts = opts || {};
		var size = 220, cx = 110, cy = 110, r = 78, sw = 22;
		var total = data.reduce(function (s, d) { return s + d.value; }, 0) || 1;
		var colors = opts.colors || ['#f5a30a', '#ff6a2b', '#4b9bff', '#2fbf7a', '#c084fc', '#8b8f99', '#e0b04a'];
		var circ = 2 * Math.PI * r, off = 0, segs = '';
		data.forEach(function (d, i) {
			var frac = d.value / total, len = frac * circ;
			segs += '<circle class="donut-seg" cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke="' + colors[i % colors.length] + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' + escape(d.label) + ': ' + d.value + '</title></circle>';
			off += len;
		});
		var center = '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" fill="#fff" font-family="Sora, sans-serif" font-size="26" font-weight="800">' + (opts.centerValue != null ? opts.centerValue : total) + '</text>' +
			'<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" fill="#8b8f99" font-size="11">' + escape(opts.centerLabel || 'total') + '</text>';
		var svg = '<svg class="chart" viewBox="0 0 ' + size + ' ' + size + '" style="max-height:230px" role="img">' +
			'<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="' + sw + '"/>' + segs + center + '</svg>';
		var legend = '<div class="legend">' + data.map(function (d, i) {
			return '<span class="legend-item"><i style="background:' + colors[i % colors.length] + '"></i>' + escape(d.label) + ' · ' + d.value + '</span>';
		}).join('') + '</div>';
		return '<div style="display:grid;grid-template-columns:minmax(180px,230px) 1fr;gap:1rem;align-items:center">' + svg + legend + '</div>';
	}

	return {
		icons: I, el: el, escape: escape, initials: initials,
		toast: toast, modal: modal, confirm: confirm,
		badge: badge, stars: stars, empty: empty, statusClass: statusClass, STATUS_LABEL: STATUS_LABEL,
		skeletonStats: skeletonStats, skeletonRows: skeletonRows, avatar: avatar,
		lineChart: lineChart, barChart: barChart, donut: donut
	};
})();
