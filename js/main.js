/* =========================================================
   STACKLY AUTO SPA — main.js
   GSAP + ScrollTrigger powered interactions (multipage)
   ========================================================= */
(function () {
	'use strict';

	var docEl = document.documentElement;
	docEl.classList.add('js');

	var hasGSAP = typeof window.gsap !== 'undefined';
	var hasST = typeof window.ScrollTrigger !== 'undefined';
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	var animOK = !!(hasGSAP && hasST) && !reduced;

	if (hasGSAP && hasST) gsap.registerPlugin(ScrollTrigger);

	/* -------------------------------------------------
	   Helpers
	-------------------------------------------------- */
	function $(s, c) { return (c || document).querySelector(s); }
	function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

	function clearLoading() { docEl.classList.remove('is-loading'); }

	function showAll() {
		$$('[data-anim], [data-stagger] > *').forEach(function (el) {
			el.style.opacity = '1';
			el.style.visibility = 'visible';
			el.style.transform = 'none';
		});
		$$('.hero__title .line > span, .hero__eyebrow, .hero__lead, .hero__actions > *, ' +
			'.hero__footer .container-fluid > *, .hero__bg img')
			.forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
		clearLoading();
	}

	/* -------------------------------------------------
	   Broken image fallback (never show a broken icon)
	-------------------------------------------------- */
	$$('img').forEach(function (img) {
		img.addEventListener('error', function () {
			img.style.display = 'none';
			if (img.parentElement) img.parentElement.classList.add('img-fallback');
		});
	});

	/* -------------------------------------------------
	   Navbar: scrolled state + mobile menu
	-------------------------------------------------- */
	(function navbar() {
		var nav = $('#navbar');
		var collapseEl = $('#navMenu');
		if (!nav) return;

		function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 40); }
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });

		if (!collapseEl || typeof bootstrap === 'undefined' || !bootstrap.Collapse) return;

		collapseEl.addEventListener('show.bs.collapse', function () {
			document.body.classList.add('nav-open');
			docEl.classList.add('nav-open');
		});
		collapseEl.addEventListener('hidden.bs.collapse', function () {
			document.body.classList.remove('nav-open');
			docEl.classList.remove('nav-open');
		});
		$$('a', collapseEl).forEach(function (a) {
			a.addEventListener('click', function () {
				var instance = bootstrap.Collapse.getInstance(collapseEl);
				if (instance && collapseEl.classList.contains('show')) instance.hide();
			});
		});
	})();

	/* -------------------------------------------------
	   Page transitions (intro + exit)
	-------------------------------------------------- */
	var overlay = $('.page-transition');
	var panels = overlay ? $$('.page-transition__panel', overlay) : [];
	var mark = overlay ? $('.page-transition__mark', overlay) : null;

	function playIntro() {
		if (!overlay) { clearLoading(); return; }
		if (!animOK) { clearLoading(); return; }

		gsap.set(panels, { yPercent: 0 });
		if (mark) gsap.set(mark, { autoAlpha: 1, y: 0 });

		var tl = gsap.timeline({ onComplete: clearLoading });
		if (mark) tl.to(mark, { autoAlpha: 0, y: -14, duration: 0.34, ease: 'power2.in' }, 0.12);
		tl.to(panels, {
			yPercent: -101,
			duration: 0.72,
			ease: 'power4.inOut',
			stagger: 0.06
		}, mark ? '-=.08' : 0.1);
	}

	function playExit(done) {
		if (!overlay || !animOK) { done(); return; }

		var finished = false;
		function go() { if (finished) return; finished = true; done(); }

		gsap.killTweensOf(panels);
		gsap.set(panels, { yPercent: 101 });
		if (mark) gsap.set(mark, { autoAlpha: 0, y: 0 });
		clearLoading();
		void overlay.offsetWidth;
		docEl.classList.add('is-loading');

		gsap.to(panels, {
			yPercent: 0,
			duration: 0.5,
			ease: 'power4.inOut',
			stagger: 0.05,
			onComplete: go
		});
		setTimeout(go, 1300);
	}

	document.addEventListener('click', function (e) {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		var a = e.target.closest ? e.target.closest('a') : null;
		if (!a) return;
		var href = a.getAttribute('href');
		if (!href || href.charAt(0) === '#' || a.target === '_blank' || a.hasAttribute('download')) return;
		if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
		if (/^https?:\/\//i.test(href) && a.host !== location.host) return;

		var url;
		try { url = new URL(href, location.href); } catch (err) { return; }
		if (url.pathname === location.pathname && url.search === location.search) return;

		e.preventDefault();
		playExit(function () { location.href = url.href; });
	});

	window.addEventListener('pageshow', function (e) {
		if (e.persisted) {
			clearLoading();
			if (hasGSAP && panels.length) gsap.set(panels, { yPercent: -101 });
		}
	});

	/* -------------------------------------------------
	   Text splitting
	-------------------------------------------------- */
	function splitWords(el) {
		if (el.dataset.split === 'done') return [];
		var words = el.textContent.trim().split(/\s+/);
		el.innerHTML = words.map(function (w) {
			return '<span class="word"><span class="word__inner">' + w + '</span></span>';
		}).join(' ');
		el.dataset.split = 'done';
		return $$('.word__inner', el);
	}

	/* -------------------------------------------------
	   Page animations
	-------------------------------------------------- */
	var pageStarted = false;

	if (animOK) {
		if ($('.hero')) {
			gsap.set('.hero__title .line > span', { yPercent: 118 });
			gsap.set(['.hero__eyebrow', '.hero__lead', '.hero__actions > *', '.hero__footer .container-fluid > *'],
				{ autoAlpha: 0, y: 34 });
			gsap.set('.hero__bg img', { scale: 1.32 });
		}
		$$('[data-stagger]').forEach(function (wrap) { gsap.set(wrap.children, { autoAlpha: 0, y: 34 }); });
	}

	function startPage() {
		if (pageStarted) return;
		pageStarted = true;

		if (!animOK) { showAll(); initCounters(false); initCompare(); initTestimonials(); initFilters(); return; }

		/* --- Hero intro (home only) --- */
		if ($('.hero')) {
			var heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });
			heroTl
				.to('.hero__bg img', { scale: 1.16, duration: 2, ease: 'power3.out' }, 0)
				.to('.hero__eyebrow', { y: 0, autoAlpha: 1, duration: 0.9 }, 0.1)
				.to('.hero__title .line > span', { yPercent: 0, duration: 1.15, stagger: 0.12 }, 0.2)
				.to('.hero__lead', { y: 0, autoAlpha: 1, duration: 0.9 }, 0.7)
				.to('.hero__actions > *', { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.1 }, 0.85)
				.to('.hero__footer .container-fluid > *', { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08 }, 0.95);

			gsap.to('.hero__bg img', {
				yPercent: 7, ease: 'none',
				scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
			});
			gsap.to('.hero__content', {
				y: -70, autoAlpha: 0.25, ease: 'none',
				scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
			});
		}

		/* --- Scroll reveals --- */
		$$('[data-anim]').forEach(function (el) {
			if (el.hasAttribute('data-split')) {
				var inners = splitWords(el);
				gsap.set(el, { autoAlpha: 1 });
				if (!inners.length) return;
				gsap.from(inners, {
					yPercent: 112, duration: 1, ease: 'power4.out', stagger: 0.055,
					scrollTrigger: { trigger: el, start: 'top 90%' }
				});
			} else {
				gsap.fromTo(el, { y: 44, autoAlpha: 0 },
					{
						y: 0, autoAlpha: 1, duration: 0.95, ease: 'power3.out',
						scrollTrigger: { trigger: el, start: 'top 92%' }
					});
			}
		});

		/* --- Staggered groups --- */
		$$('[data-stagger]').forEach(function (wrap) {
			var kids = wrap.children;
			if (!kids.length) return;
			gsap.to(kids, {
				y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08,
				scrollTrigger: { trigger: wrap, start: 'top 88%' }
			});
		});

		/* --- Parallax images --- */
		$$('[data-parallax]').forEach(function (el) {
			var media = el.querySelector('img') || el;
			var depth = parseFloat(el.getAttribute('data-parallax')) || 0.1;
			gsap.set(media, { scale: 1.14 });
			gsap.fromTo(media,
				{ yPercent: -depth * 55 },
				{
					yPercent: depth * 55, ease: 'none',
					scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
				});
		});

		initCounters(true);
		initProcess();
		initCompare();
		initTestimonials();
		initFilters();

		if (hasST) ScrollTrigger.refresh();
	}

	/* -------------------------------------------------
	   Counters
	-------------------------------------------------- */
	function initCounters(animated) {
		$$('[data-count]').forEach(function (el) {
			var target = parseFloat(el.getAttribute('data-count'));
			var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
			var suffix = el.getAttribute('data-suffix') || '';

			function render(v) {
				var n = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US');
				el.textContent = n + suffix;
			}

			if (!animated || !animOK) { render(target); return; }

			var obj = { v: 0 };
			gsap.to(obj, {
				v: target, duration: 2.1, ease: 'power2.out',
				onUpdate: function () { render(obj.v); },
				scrollTrigger: { trigger: el, start: 'top 94%', once: true }
			});
		});
	}

	/* -------------------------------------------------
	   Horizontal process scroll (desktop, home)
	-------------------------------------------------- */
	function initProcess() {
		if (!animOK) return;
		var track = $('.process__track');
		var section = $('.process');
		if (!track || !section) return;

		gsap.from('.process-step', {
			y: 50, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1,
			scrollTrigger: { trigger: '.process__viewport', start: 'top 88%' }
		});

		var mm = gsap.matchMedia();
		mm.add('(min-width: 992px)', function () {
			var distance = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 40); };
			var tween = gsap.to(track, {
				x: function () { return -distance(); },
				ease: 'none',
				scrollTrigger: {
					trigger: section,
					start: 'top 82%',
					end: function () { return '+=' + (window.innerHeight + distance()); },
					scrub: 1,
					invalidateOnRefresh: true
				}
			});
			return function () {
				if (tween.scrollTrigger) tween.scrollTrigger.kill();
				tween.kill();
				gsap.set(track, { x: 0 });
			};
		});
	}

	/* -------------------------------------------------
	   Before / After comparison slider
	-------------------------------------------------- */
	function initCompare() {
		var box = $('#compare');
		if (!box) return;
		var dragging = false;

		function setPos(clientX) {
			var r = box.getBoundingClientRect();
			var p = (clientX - r.left) / r.width;
			p = Math.max(0, Math.min(1, p));
			box.style.setProperty('--pos', (p * 100).toFixed(2) + '%');
		}

		box.addEventListener('pointerdown', function (e) {
			dragging = true;
			try { box.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
			setPos(e.clientX);
		});
		box.addEventListener('pointermove', function (e) { if (dragging) setPos(e.clientX); });
		['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
			box.addEventListener(ev, function () { dragging = false; });
		});

		if (animOK) {
			var proxy = { p: 88 };
			ScrollTrigger.create({
				trigger: box, start: 'top 78%', once: true,
				onEnter: function () {
					gsap.to(proxy, {
						p: 50, duration: 1.6, ease: 'power3.inOut',
						onUpdate: function () { box.style.setProperty('--pos', proxy.p + '%'); }
					});
				}
			});
		}
	}

	/* -------------------------------------------------
	   Testimonials slider
	-------------------------------------------------- */
	function initTestimonials() {
		var slider = $('#tSlider');
		if (!slider) return;
		var cards = $$('.t-card', slider);
		var dotsWrap = $('#tDots');
		var prev = $('#tPrev');
		var next = $('#tNext');
		var index = 0;
		var timer = null;

		if (!dotsWrap || !cards.length) return;

		cards.forEach(function (_, i) {
			var b = document.createElement('button');
			b.className = 't-dot' + (i === 0 ? ' is-active' : '');
			b.type = 'button';
			b.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
			b.addEventListener('click', function () { go(i); restart(); });
			dotsWrap.appendChild(b);
		});
		var dots = $$('.t-dot', dotsWrap);

		function go(n) {
			if (n === index || n < 0 || n >= cards.length) return;
			var current = cards[index];
			var target = cards[n];

			target.classList.add('is-active');
			if (hasGSAP && !reduced) {
				gsap.fromTo(target, { autoAlpha: 0, y: 30 },
					{ autoAlpha: 1, y: 0, duration: 0.65, ease: 'power3.out', overwrite: true });
				gsap.to(current, {
					autoAlpha: 0, y: -22, duration: 0.35, ease: 'power2.in', overwrite: true,
					onComplete: function () {
						current.classList.remove('is-active');
						gsap.set(current, { clearProps: 'opacity,visibility,transform' });
					}
				});
			} else {
				current.classList.remove('is-active');
			}

			dots.forEach(function (d, i) { d.classList.toggle('is-active', i === n); });
			index = n;
		}

		function restart() {
			if (timer) clearInterval(timer);
			timer = setInterval(function () { go((index + 1) % cards.length); }, 6500);
		}

		if (prev) prev.addEventListener('click', function () { go((index - 1 + cards.length) % cards.length); restart(); });
		if (next) next.addEventListener('click', function () { go((index + 1) % cards.length); restart(); });
		slider.addEventListener('mouseenter', function () { if (timer) clearInterval(timer); });
		slider.addEventListener('mouseleave', restart);
		restart();
	}

	/* -------------------------------------------------
	   Gallery filters
	-------------------------------------------------- */
	function initFilters() {
		var bar = $('.filter-bar');
		if (!bar) return;
		var btns = $$('.filter-btn', bar);
		var items = $$('.gallery__item[data-cat]');

		btns.forEach(function (btn) {
			btn.addEventListener('click', function () {
				var filter = btn.getAttribute('data-filter') || 'all';
				btns.forEach(function (b) {
					var on = b === btn;
					b.classList.toggle('is-active', on);
					b.setAttribute('aria-pressed', on ? 'true' : 'false');
				});

				items.forEach(function (item) {
					var show = filter === 'all' || item.getAttribute('data-cat') === filter;
					if (animOK) {
						gsap.killTweensOf(item);
						if (show) {
							item.style.display = '';
							gsap.fromTo(item, { autoAlpha: 0, scale: 0.94, y: 18 },
								{ autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: 'power3.out', overwrite: true });
						} else {
							gsap.to(item, {
								autoAlpha: 0, scale: 0.94, duration: 0.25, ease: 'power2.in', overwrite: true,
								onComplete: function () { item.style.display = 'none'; }
							});
						}
					} else {
						item.style.display = show ? '' : 'none';
					}
				});

				if (hasST) setTimeout(function () { ScrollTrigger.refresh(); }, 520);
			});
		});
	}

	/* -------------------------------------------------
	   Marquee (infinite)
	-------------------------------------------------- */
	function initMarquee() {
		var track = $('.marquee__track');
		if (!track || !hasGSAP || reduced) return;
		var group = $('.marquee__group', track);
		if (!group) return;
		var width = group.getBoundingClientRect().width;
		if (!width) return;
		gsap.to(track, { x: -width, duration: 28, ease: 'none', repeat: -1 });
	}

	/* -------------------------------------------------
	   Magnetic buttons
	-------------------------------------------------- */
	function initMagnetic() {
		if (!hasGSAP || !finePointer || reduced) return;
		$$('[data-magnetic]').forEach(function (el) {
			el.addEventListener('mousemove', function (e) {
				var r = el.getBoundingClientRect();
				gsap.to(el, {
					x: (e.clientX - r.left - r.width / 2) * 0.26,
					y: (e.clientY - r.top - r.height / 2) * 0.4,
					duration: 0.5, ease: 'power3.out'
				});
			});
			el.addEventListener('mouseleave', function () {
				gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,0.4)' });
			});
		});
	}

	/* -------------------------------------------------
	   Smooth same-page anchors + back to top
	-------------------------------------------------- */
	function initAnchors() {
		document.addEventListener('click', function (e) {
			var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
			if (!a) return;
			var id = a.getAttribute('href');
			if (!id || id === '#') return;
			var target = document.querySelector(id);
			if (!target) return;
			e.preventDefault();
			var navbar = document.getElementById('navbar');
			var offset = navbar ? navbar.offsetHeight - 10 : 0;
			var top = target.getBoundingClientRect().top + window.scrollY - offset;
			window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
		});

		var toTop = $('#toTop');
		if (toTop) {
			window.addEventListener('scroll', function () {
				toTop.classList.toggle('is-visible', window.scrollY > 600);
			}, { passive: true });
			toTop.addEventListener('click', function () {
				window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
			});
		}
	}

	/* -------------------------------------------------
	   Forms
	-------------------------------------------------- */
	function initForms() {
		var form = $('#bookingForm');
		if (form) {
			var dateField = $('#bfDate');
			if (dateField) {
				var d = new Date();
				dateField.min = d.toISOString().split('T')[0];
			}

			form.addEventListener('submit', function (e) {
				e.preventDefault();
				var valid = true;
				$$('[required]', form).forEach(function (f) {
					var ok = f.value && f.value.trim() !== '' && f.checkValidity();
					f.classList.toggle('is-invalid', !ok);
					if (!ok) valid = false;
				});

				var nm = $('#bfName'), nmErr = $('#bfNameError');
				if (nm && !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(nm.value.trim())) {
					if (nmErr) nmErr.style.display = 'block';
					nm.classList.add('is-invalid');
					valid = false;
				}
				var ph = $('#bfPhone'), phErr = $('#bfPhoneError');
				if (ph && !/^[0-9]{7,20}$/.test(ph.value.trim())) {
					if (phErr) phErr.style.display = 'block';
					ph.classList.add('is-invalid');
					valid = false;
				}

				if (!valid) {
					if (hasGSAP && !reduced) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.35)' });
					return;
				}

				if (nmErr) nmErr.style.display = 'none';
				if (phErr) phErr.style.display = 'none';
				$$('[required]', form).forEach(function (f) { f.classList.remove('is-invalid'); });
				var success = $('#formSuccess');
				if (success) success.classList.add('is-visible');
				window.location.href = '404.html';
			});

			$$('[required]', form).forEach(function (f) {
				f.addEventListener('input', function () { f.classList.remove('is-invalid'); });
				f.addEventListener('change', function () { f.classList.remove('is-invalid'); });
			});

			var nameInput = $('#bfName');
			if (nameInput) {
				nameInput.addEventListener('input', function () {
					var cleaned = this.value.replace(/[^A-Za-z ]/g, '');
					if (cleaned !== this.value) this.value = cleaned;
					var e = $('#bfNameError');
					if (e) e.style.display = 'none';
				});
			}
			var phoneInput = $('#bfPhone');
			if (phoneInput) {
				phoneInput.addEventListener('input', function () {
					var cleaned = this.value.replace(/[^0-9]/g, '');
					if (cleaned !== this.value) this.value = cleaned;
					var e = $('#bfPhoneError');
					if (e) e.style.display = 'none';
				});
			}
		}

		var news = $('#newsForm');
		if (news) {
			news.addEventListener('submit', function (e) {
				var input = news.querySelector('input');
				var error = news.parentElement ? news.parentElement.querySelector('.footer-news-error') : null;
				var msg = $('#newsMsg');
				var emailRegex = /^[A-Za-z0-9]+@[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/;
				if (!input) {
					e.preventDefault();
					return;
				}
				var val = input.value.trim();
				if (!emailRegex.test(val)) {
					e.preventDefault();
					if (error) {
						error.style.display = 'block';
					}
					if (msg) msg.textContent = '';
					input.focus();
					return;
				}
				if (error) error.style.display = 'none';
				if (msg) msg.textContent = '';
				e.preventDefault();
				news.reset();
				window.location.href = '404.html';
			});
		}
	}

	/* -------------------------------------------------
	   Opening hours: highlight today
	-------------------------------------------------- */
	function initHours() {
		var list = $('[data-hours]');
		if (!list) return;
		var today = new Date().getDay();
		$$('li', list).forEach(function (li) {
			if (String(li.getAttribute('data-day')) === String(today)) li.classList.add('is-today');
		});
	}

	/* -------------------------------------------------
	   Footer year
	-------------------------------------------------- */
	var yearEl = $('#year');
	if (yearEl) yearEl.textContent = new Date().getFullYear();

	/* -------------------------------------------------
	   Boot
	-------------------------------------------------- */
	initAnchors();
	initForms();
	initHours();
	initMagnetic();

	if (!hasGSAP || !hasST) showAll();

	playIntro();

	if (animOK) gsap.delayedCall(0.65, startPage);
	else startPage();

	if (document.readyState === 'complete') initMarquee();
	else window.addEventListener('load', initMarquee);

	window.addEventListener('load', function () {
		if (hasST) ScrollTrigger.refresh();
	});

	/* Safety nets: never leave content hidden */
	setTimeout(function () { if (!pageStarted) startPage(); }, 2400);
	setTimeout(clearLoading, 2600);
})();
