/* =========================================================
   STACKLY AUTO SPA — Customer dashboard controller
   ========================================================= */
(function () {
	'use strict';
	var user = Auth.guard('customer');
	if (!user) return;

	/* ---------------- helpers ---------------- */
	function $(s, c) { return (c || document).querySelector(s); }
	function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
	function esc(s) { return UI.escape(s); }
	function money(n) { return DB.fmtMoney(n); }
	function svcNames(ids) { var names = DB.services(ids).map(function (s) { return s.name; }); return names.length ? names.join(' + ') : '—'; }
	function veh(id) { return DB.vehicle(id) || { make: '—', model: '', reg: '—', type: '—', color: '' }; }
	function priceOf(booking) { return booking.price || DB.computePrice(booking.serviceIds); }
	function myBookings() { return DB.customerBookings(user.id); }
	function myVehicles() { return DB.customerVehicles(user.id); }
	function activeStatus(st) { return st === 'pending' || st === 'confirmed' || st === 'in-progress'; }
	function activeBookings() { return myBookings().filter(function (b) { return activeStatus(b.status); }); }
	function upcomingBookings() { return activeBookings().filter(function (b) { return b.date >= DB.today(); }); }
	function reviewFor(bookingId) { return DB.list('reviews').filter(function (r) { return r.bookingId === bookingId; })[0] || null; }
	function reviewableBookings() { return myBookings().filter(function (b) { return b.status === 'completed' && !reviewFor(b.id); }); }
	var I = UI.icons;

	var NAV_ICONS = { overview: I.grid, book: I.calendar, bookings: I.clock, tracking: I.pin, vehicles: I.car, payments: I.card, offers: I.gift, reviews: I.star, profile: I.settings };
	Object.keys(NAV_ICONS).forEach(function (k) {
		var el = document.querySelector('.dash-nav [href="#' + k + '"] .ico'); if (el) el.innerHTML = NAV_ICONS[k];
	});
	$('#burger').innerHTML = I.menu;
	$('#notifBtn .b-ico').innerHTML = I.bell;

	Auth.mountChrome(user);

	/* ---------------- view state ---------------- */
	var state = { q: '', bookingFilter: 'upcoming' };
	var VIEWS = ['overview', 'book', 'bookings', 'tracking', 'vehicles', 'payments', 'offers', 'reviews', 'profile'];
	function currentView() { var h = location.hash.replace('#', '').split('?')[0]; return VIEWS.indexOf(h) >= 0 ? h : 'overview'; }

	/* ---------------- shared bits ---------------- */
	function pageHead(title, sub, actions) {
		return '<div class="page-head"><div><h2>' + esc(title) + '</h2><p>' + esc(sub) + '</p></div>' +
			(actions ? '<div class="page-head__actions">' + actions + '</div>' : '') + '</div>';
	}
	function sampleSeed(key) {
		var s = 'stackly-sample:' + String(key), h = 0;
		for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
		return h;
	}
	function sampleValue(value, label) {
		var s = String(value);
		if (s === '0') return String(1 + (sampleSeed('n:' + label) % 9));
		if (s === '$0') return money(75 + (sampleSeed('m:' + label) % 425));
		return value;
	}
	function statCard(label, value, icon, delta, accent) {
		return '<article class="stat' + (accent ? ' stat--accent' : '') + '"><div class="stat__top">' +
			'<div><div class="stat__label">' + esc(label) + '</div><div class="stat__value">' + sampleValue(value, label) + '</div>' +
			(delta ? '<span class="stat__delta ' + delta.dir + '">' + (delta.dir === 'up' ? I.up : delta.dir === 'down' ? I.down : '') + ' ' + esc(delta.text) + '</span>' : '') +
			'</div><div class="stat__icon">' + icon + '</div></div></article>';
	}

	/* ---------------- OVERVIEW ---------------- */
	function renderOverview(root) {
		var bs = myBookings();
		var upcoming = DB.sortBookings(upcomingBookings(), 'asc');
		var next = upcoming[0];
		var completed = bs.filter(function (b) { return b.status === 'completed'; });
		var outstanding = bs.filter(function (b) { return b.paymentStatus === 'unpaid' && b.status !== 'cancelled'; })
			.reduce(function (t, b) { return t + priceOf(b); }, 0);
		var recent = bs.slice().sort(function (a, b) { return (b.createdAt || '') < (a.createdAt || '') ? -1 : 1; }).slice(0, 5);
		var openOffers = activeOffers();

		root.innerHTML =
			pageHead('Hello, ' + esc(user.name.split(' ')[0]) + ' 👋', 'Here is everything happening with your car.', '<button class="dbtn dbtn--accent" data-goto="#book">' + I.plus + ' Book a service</button>') +
			'<div class="grid grid--stats" style="margin-bottom:1rem">' +
			statCard('Upcoming', activeBookings().length, I.calendar, { dir: activeBookings().length ? 'up' : 'flat', text: 'Active appointments' }) +
			statCard('Completed details', completed.length, I.check, { dir: 'up', text: 'All time' }) +
			statCard('Outstanding', money(outstanding), I.card, { dir: outstanding ? 'down' : 'up', text: outstanding ? 'Awaiting payment' : 'All settled' }) +
			statCard('My vehicles', myVehicles().length, I.car, { dir: 'flat', text: 'On file' }) +
			'</div>' +
			'<div class="grid grid--2" style="margin-bottom:1rem">' +
			'<div class="panel"><div class="panel__head"><div><h3>Next appointment</h3><p>Your soonest booking</p></div>' + (next ? '<button class="dbtn dbtn--sm" data-goto="#tracking">' + I.pin + ' Track</button>' : '') + '</div>' +
			(next ? nextAppointment(next) : UI.empty({ icon: I.calendar, title: 'No upcoming bookings', text: 'Book a service and it will show up here.', action: '<button class="dbtn dbtn--accent" data-goto="#book">' + I.plus + ' Book a service</button>' })) + '</div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Quick actions</h3><p>Shortcuts for your account</p></div></div>' +
			'<div class="list-rows">' +
			'<div class="list-row"><div class="list-row__icon">' + I.calendar + '</div><div class="list-row__body"><strong>Book a service</strong><span>Reserve a wash, coating or detail</span></div><button class="dbtn dbtn--sm dbtn--accent" data-goto="#book">Book</button></div>' +
			'<div class="list-row"><div class="list-row__icon">' + I.car + '</div><div class="list-row__body"><strong>Add a vehicle</strong><span>' + myVehicles().length + ' vehicle(s) on file</span></div><button class="dbtn dbtn--sm" data-vadd>Add</button></div>' +
			'<div class="list-row"><div class="list-row__icon">' + I.receipt + '</div><div class="list-row__body"><strong>Invoices &amp; receipts</strong><span>View your payment history</span></div><button class="dbtn dbtn--sm" data-goto="#payments">View</button></div>' +
			'<div class="list-row"><div class="list-row__icon">' + I.gift + '</div><div class="list-row__body"><strong>Offers</strong><span>' + openOffers.length + ' promotion(s) available</span></div><button class="dbtn dbtn--sm" data-goto="#offers">View</button></div>' +
			'</div></div>' +
			'</div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Recent activity</h3><p>Your latest bookings</p></div><button class="dbtn dbtn--sm" data-goto="#bookings">View all</button></div>' +
			(recent.length ? '<div class="list-rows">' + recent.map(function (b) {
				return '<div class="list-row"><div class="list-row__icon">' + I.clock + '</div><div class="list-row__body"><strong>' + esc(svcNames(b.serviceIds)) + '</strong><span>' + DB.fmtDate(b.date) + ' · ' + DB.fmtTime(b.time) + ' · ' + esc(veh(b.vehicleId).reg) + '</span></div>' + UI.badge(b.status) + '</div>';
			}).join('') + '</div>' : UI.empty({ icon: I.calendar, title: 'No activity yet', text: 'Your booking history will appear here.' })) +
			'</div>';
		wireCommon(root);
	}

	function nextAppointment(b) {
		var v = veh(b.vehicleId);
		var d = new Date(b.date + 'T00:00:00');
		var day = d.toLocaleDateString('en-US', { weekday: 'short' });
		var dt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		return '<div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">' +
			'<div class="bk-card__when"><b>' + dt + '</b><span>' + day + '</span></div>' +
			'<div style="flex:1 1 200px;min-width:0">' +
			'<h4 style="color:#fff;font-size:1rem">' + esc(svcNames(b.serviceIds)) + '</h4>' +
			'<p class="cell-sub">' + esc(DB.fmtTime(b.time)) + ' · ' + esc(v.make + ' ' + v.model) + ' · ' + esc(v.reg) + '</p>' +
			'<p class="cell-sub">' + (b.mode === 'pickup' ? 'Pickup &amp; delivery' : 'Drop-off at studio') + '</p>' +
			'</div>' + UI.badge(b.status) + '</div>' +
			'<div class="panel__tools" style="margin-top:1rem"><button class="dbtn dbtn--sm" data-view="' + b.id + '">' + I.eye + ' Details</button><button class="dbtn dbtn--sm" data-resched="' + b.id + '">' + I.refresh + ' Reschedule</button></div>';
	}

	/* ---------------- BOOK A SERVICE ---------------- */
	function renderBook(root) {
		var services = DB.list('services').filter(function (s) { return s.active; });
		var vehicles = myVehicles();
		if (!services.length) { root.innerHTML = pageHead('Book a Service', 'The menu is being updated.') + UI.empty({ icon: I.wrench, title: 'No services available', text: 'Please check back soon.' }); return; }

		root.innerHTML = pageHead('Book a Service', 'Choose your services, slot and handover preference.') +
			'<div class="grid grid--2" style="align-items:start">' +
			'<div class="panel"><div class="panel__head"><div><h3>1 · Select services</h3><p>Pick one or more</p></div></div>' +
			'<div style="display:grid;gap:.5rem">' +
			services.map(function (s) {
				return '<label class="checkline" style="justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:.7rem .9rem"><span style="display:flex;align-items:center;gap:.6rem"><input type="checkbox" value="' + s.id + '" data-svc> <span><strong style="color:#fff">' + esc(s.name) + '</strong><span class="cell-sub">' + esc(s.duration || '') + '</span></span></span><b style="color:var(--accent);font-family:var(--font-d)">' + money(s.price) + '</b></label>';
			}).join('') +
			'</div></div>' +
			'<div class="panel"><div class="panel__head"><div><h3>2 · Date &amp; vehicle</h3><p>When should we expect you?</p></div></div>' +
			'<div class="dash-field"><label>Vehicle <span class="req">*</span></label><select class="dash-input" id="bkVehicle">' + (vehicles.length ? vehicles.map(function (v) { return '<option value="' + v.id + '">' + esc(v.make + ' ' + v.model + ' · ' + v.reg) + '</option>'; }).join('') : '<option value="">No vehicles — add one first</option>') + '</select>' + (vehicles.length ? '' : '<button class="dbtn dbtn--sm" data-vadd style="margin-top:.5rem;align-self:flex-start">' + I.plus + ' Add a vehicle</button>') + '</div>' +
			'<div class="form-grid"><div class="dash-field"><label>Date <span class="req">*</span></label><input type="date" class="dash-input" id="bkDate" min="' + DB.today() + '" value="' + DB.today() + '"></div>' +
			'<div class="dash-field"><label>Time slot <span class="req">*</span></label><select class="dash-input" id="bkTime"></select></div></div>' +
			'<div class="dash-field"><label>Handover</label><select class="dash-input" id="bkMode"><option value="dropoff">I will drop it off</option>' + (DB.settings().pickup ? '<option value="pickup">Pickup &amp; delivery</option>' : '') + '</select></div>' +
			'<div class="dash-field"><label>Notes</label><textarea class="dash-input" id="bkNotes" placeholder="Anything the detailer should know…"></textarea></div>' +
			'<div class="divider"></div>' +
			'<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap"><div><span class="cell-sub">Estimated total</span><div class="stat__value" style="font-size:1.5rem" id="bkTotal">$0</div></div><button class="dbtn dbtn--accent" id="bkSubmit">' + I.check + ' Confirm booking</button></div>' +
			'<p class="form-note" id="bkSlotNote" style="margin-top:.8rem">Slots already booked are hidden.</p>' +
			'</div></div>';
		wireCommon(root);

		var timeEl = $('#bkTime', root);
		function fillSlots() {
			var slots = DB.availableSlots($('#bkDate', root).value);
			timeEl.innerHTML = slots.length ? slots.map(function (t) { return '<option value="' + t + '">' + DB.fmtTime(t) + '</option>'; }).join('') : '<option value="">No slots available</option>';
		}
		function total() {
			var ids = $$('[data-svc]:checked', root).map(function (x) { return x.value; });
			$('#bkTotal', root).textContent = money(DB.computePrice(ids));
		}
		fillSlots(); total();
		$('#bkDate', root).addEventListener('change', fillSlots);
		$$('[data-svc]', root).forEach(function (x) { x.addEventListener('change', total); });
		$('#bkSubmit', root).addEventListener('click', function () {
			var ids = $$('[data-svc]:checked', root).map(function (x) { return x.value; });
			var vehicleId = $('#bkVehicle', root).value;
			if (!ids.length) { UI.toast('error', 'No services selected', 'Choose at least one service.'); return; }
			if (!vehicleId) { UI.toast('error', 'No vehicle', 'Add a vehicle before booking.'); return; }
			if (!timeEl.value) { UI.toast('error', 'No slot', 'Pick a date with an available slot.'); return; }
			var res = DB.createBooking({ customerId: user.id, vehicleId: vehicleId, serviceIds: ids, date: $('#bkDate', root).value, time: timeEl.value, mode: $('#bkMode', root).value, notes: $('#bkNotes', root).value });
			if (!res.ok) { UI.toast('error', 'Booking failed', res.error); return; }
			UI.toast('success', 'Booking requested', res.booking.id + ' is pending confirmation.');
			location.hash = '#bookings';
		});
	}

	/* ---------------- MY BOOKINGS ---------------- */
	function bookingCard(b) {
		var v = veh(b.vehicleId);
		var d = new Date(b.date + 'T00:00:00');
		var day = d.toLocaleDateString('en-US', { weekday: 'short' });
		var dt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		var actions = '<button class="dbtn dbtn--sm" data-view="' + b.id + '">' + I.eye + ' Details</button>';
		if (b.status !== 'cancelled' && b.status !== 'completed') {
			actions += '<button class="dbtn dbtn--sm" data-resched="' + b.id + '">' + I.refresh + ' Reschedule</button>';
			actions += '<button class="dbtn dbtn--sm dbtn--danger" data-cancel="' + b.id + '">' + I.x + ' Cancel</button>';
		}
		if (b.paymentStatus === 'unpaid' && b.status !== 'cancelled') actions += '<button class="dbtn dbtn--sm dbtn--ok" data-pay="' + b.id + '">Pay ' + money(priceOf(b)) + '</button>';
		return '<div class="bk-card"><div class="bk-card__when"><b>' + dt + '</b><span>' + day + '</span></div>' +
			'<div class="bk-card__main"><h4>' + esc(svcNames(b.serviceIds)) + '</h4>' +
			'<div class="bk-card__meta"><span>' + esc(DB.fmtTime(b.time)) + '</span><span>' + esc(v.make + ' ' + v.model) + ' · ' + esc(v.reg) + '</span><span>' + (b.mode === 'pickup' ? 'Pickup' : 'Drop-off') + '</span></div>' +
			'<div class="bk-card__meta" style="margin-top:.5rem">' + UI.badge(b.status) + UI.badge(b.paymentStatus) + '<span class="cell-strong">' + money(priceOf(b)) + '</span></div></div>' +
			'<div class="bk-card__side">' + actions + '</div></div>';
	}
	function filteredBookings() {
		var q = state.q.toLowerCase();
		return myBookings().filter(function (b) {
			if (state.bookingFilter === 'upcoming' && !activeStatus(b.status)) return false;
			if (state.bookingFilter === 'completed' && b.status !== 'completed') return false;
			if (state.bookingFilter === 'cancelled' && b.status !== 'cancelled') return false;
			if (q) {
				var v = veh(b.vehicleId);
				var hay = (b.id + ' ' + svcNames(b.serviceIds) + ' ' + v.reg + ' ' + v.make + ' ' + v.model).toLowerCase();
				if (hay.indexOf(q) === -1) return false;
			}
			return true;
		});
	}
	function renderBookings(root) {
		var chips = [['upcoming', 'Upcoming'], ['all', 'All'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
		var list = DB.sortBookings(filteredBookings(), 'desc');
		root.innerHTML = pageHead('My Bookings', 'Track, reschedule or cancel your appointments.', '<button class="dbtn dbtn--accent" data-goto="#book">' + I.plus + ' New booking</button>') +
			'<div class="panel"><div class="panel__head"><div class="panel__tools">' +
			chips.map(function (c) { return '<button class="chip' + (state.bookingFilter === c[0] ? ' is-active' : '') + '" data-bfilter="' + c[0] + '">' + c[1] + '</button>'; }).join('') +
			'</div></div>' +
			(list.length ? '<div class="bk-list">' + list.map(bookingCard).join('') + '</div>' : UI.empty({ icon: I.calendar, title: 'No bookings here', text: 'Nothing matches this filter yet.', action: '<button class="dbtn dbtn--accent" data-goto="#book">' + I.plus + ' Book a service</button>' })) +
			'</div>';
		wireCommon(root);
		$$('[data-bfilter]', root).forEach(function (c) { c.addEventListener('click', function () { state.bookingFilter = c.getAttribute('data-bfilter'); renderBookings(root); }); });
		wireBookingActions(root);
	}

	function wireBookingActions(root) {
		$$('[data-view]', root).forEach(function (b) { b.addEventListener('click', function () { openBookingDetail(DB.find('bookings', b.getAttribute('data-view'))); }); });
		$$('[data-resched]', root).forEach(function (b) { b.addEventListener('click', function () { openReschedule(DB.find('bookings', b.getAttribute('data-resched'))); }); });
		$$('[data-cancel]', root).forEach(function (b) { b.addEventListener('click', function () {
			var id = b.getAttribute('data-cancel');
			UI.confirm({ title: 'Cancel this booking?', message: 'Cancelling ' + id + ' will release your slot. You can book again anytime.', confirmText: 'Cancel booking', cancelText: 'Keep it' }).then(function (ok) {
				if (!ok) return; DB.cancelBooking(id); UI.toast('warn', 'Booking cancelled', id + ' was cancelled.'); refresh();
			});
		}); });
		$$('[data-pay]', root).forEach(function (b) { b.addEventListener('click', function () {
			var id = b.getAttribute('data-pay'), bk = DB.find('bookings', id);
			UI.confirm({ title: 'Pay ' + money(priceOf(bk)) + '?', message: 'This demo marks invoice ' + id.replace('BK-', 'INV-') + ' as paid.', confirmText: 'Pay now', cancelText: 'Not yet', danger: false, icon: I.card }).then(function (ok) {
				if (!ok) return; DB.update('bookings', id, { paymentStatus: 'paid' }); UI.toast('success', 'Payment complete', 'Thank you — ' + money(priceOf(bk)) + ' received.'); refresh();
			});
		}); });
	}

	function openReschedule(b) {
		var node = UI.modal({
			title: 'Reschedule ' + b.id, subtitle: 'Pick a new date and an available time slot.',
			body: '<div class="form-grid"><div class="dash-field"><label>Date <span class="req">*</span></label><input type="date" class="dash-input" id="rsDate" min="' + DB.today() + '" value="' + (b.date < DB.today() ? DB.today() : b.date) + '"></div>' +
				'<div class="dash-field"><label>Time slot <span class="req">*</span></label><select class="dash-input" id="rsTime"></select></div></div>' +
				'<p class="form-note" id="rsNote">Slots already booked are hidden.</p>',
			footer: '<button class="dbtn" data-close>Cancel</button><button class="dbtn dbtn--accent" id="rsSave">Save changes</button>'
		});
		var dateEl = node.querySelector('#rsDate'), timeEl = node.querySelector('#rsTime');
		function fill() {
			var slots = DB.availableSlots(dateEl.value, b.id);
			timeEl.innerHTML = slots.length ? slots.map(function (t) { return '<option value="' + t + '"' + (t === b.time && dateEl.value === b.date ? ' selected' : '') + '>' + DB.fmtTime(t) + '</option>'; }).join('') : '<option value="">No slots available</option>';
		}
		fill(); dateEl.addEventListener('change', fill);
		node.querySelector('#rsSave').addEventListener('click', function () {
			if (!dateEl.value || !timeEl.value) { UI.toast('error', 'Missing details', 'Choose a date with an available slot.'); return; }
			var res = DB.rescheduleBooking(b.id, dateEl.value, timeEl.value);
			if (!res.ok) { UI.toast('error', 'Slot unavailable', res.error); return; }
			node._close(); UI.toast('success', 'Rescheduled', b.id + ' moved to ' + DB.fmtDate(dateEl.value) + ' ' + DB.fmtTime(timeEl.value) + '.'); refresh();
		});
	}

	function openBookingDetail(b) {
		var v = veh(b.vehicleId);
		var staff = DB.staffMember(b.staffId);
		var log = (b.statusLog || []).map(function (l) { return '<div class="timeline__item"><strong>' + UI.STATUS_LABEL[l.status] + '</strong><span>' + new Date(l.at).toLocaleString() + '</span></div>'; }).join('');
		UI.modal({
			title: 'Booking ' + b.id, subtitle: DB.fmtDate(b.date) + ' at ' + DB.fmtTime(b.time),
			body: '<div class="grid grid--2" style="gap:1rem">' +
				'<div><h4 style="color:#fff;margin-bottom:.6rem">Vehicle</h4><span class="cell-strong">' + esc(v.make + ' ' + v.model) + '</span><span class="cell-sub">' + esc(v.reg) + ' · ' + esc(v.type) + ' · ' + esc(v.color || '') + '</span></div>' +
				'<div><h4 style="color:#fff;margin-bottom:.6rem">Detailer</h4><span class="cell-strong">' + (staff ? esc(staff.name) : 'To be assigned') + '</span><span class="cell-sub">' + (staff ? esc(staff.role) : '') + '</span></div>' +
				'</div><div class="divider"></div>' +
				'<p style="margin-bottom:.6rem"><strong style="color:#fff">Services:</strong> ' + esc(svcNames(b.serviceIds)) + '</p>' +
				'<p style="margin-bottom:.6rem"><strong style="color:#fff">Handover:</strong> ' + (b.mode === 'pickup' ? 'Pickup &amp; delivery' : 'Customer drop-off') + '</p>' +
				'<p style="margin-bottom:.6rem"><strong style="color:#fff">Total:</strong> ' + money(priceOf(b)) + ' · ' + UI.badge(b.paymentStatus) + ' · ' + UI.badge(b.status) + '</p>' +
				(b.notes ? '<p style="margin-bottom:.6rem"><strong style="color:#fff">Notes:</strong> ' + esc(b.notes) + '</p>' : '') +
				(log ? '<div class="divider"></div><h4 style="color:#fff;margin-bottom:.6rem">Status history</h4><div class="timeline">' + log + '</div>' : ''),
			footer: '<button class="dbtn" data-close>Close</button>'
		});
	}

	/* ---------------- TRACKING ---------------- */
	function statusTimeline(b) {
		var steps = [['pending', 'Requested'], ['confirmed', 'Confirmed'], ['in-progress', 'In the bay'], ['completed', 'Completed']];
		if (b.status === 'cancelled') {
			return '<div class="timeline"><div class="timeline__item current"><strong>Cancelled</strong><span>' + DB.fmtDate(b.date) + '</span></div></div>';
		}
		var idx = steps.map(function (s) { return s[0]; }).indexOf(b.status);
		return '<div class="timeline">' + steps.map(function (s, i) {
			var cls = i < idx ? 'done' : i === idx ? 'current' : '';
			var at = (b.statusLog || []).filter(function (l) { return l.status === s[0]; }).pop();
			return '<div class="timeline__item ' + cls + '"><strong>' + s[1] + '</strong><span>' + (at ? new Date(at.at).toLocaleString() : (i <= idx ? DB.fmtDate(b.date) : 'Pending')) + '</span></div>';
		}).join('') + '</div>';
	}
	function renderTracking(root) {
		var active = DB.sortBookings(activeBookings(), 'asc');
		if (!active.length) {
			root.innerHTML = pageHead('Track Service', 'Follow your car through every stage of the detail.') +
				UI.empty({ icon: I.pin, title: 'Nothing to track', text: 'You have no active bookings right now.', action: '<button class="dbtn dbtn--accent" data-goto="#book">' + I.plus + ' Book a service</button>' });
			wireCommon(root); return;
		}
		var current = active[0];
		var qs = new URLSearchParams(location.search).get('b') || new URLSearchParams(location.hash.split('?')[1] || '').get('b');
		if (qs) { var found = active.filter(function (b) { return b.id === qs; })[0]; if (found) current = found; }
		var v = veh(current.vehicleId);
		var staff = DB.staffMember(current.staffId);
		var selector = active.length > 1 ? '<select class="dash-input" style="width:auto" id="trackSel">' + active.map(function (b) { return '<option value="' + b.id + '"' + (b.id === current.id ? ' selected' : '') + '>' + esc(b.id + ' · ' + svcNames(b.serviceIds)) + '</option>'; }).join('') + '</select>' : '';
		root.innerHTML = pageHead('Track Service', 'Follow your car through every stage of the detail.', selector) +
			'<div class="grid grid--2" style="align-items:start">' +
			'<div class="panel"><div class="panel__head"><div><h3>' + esc(svcNames(current.serviceIds)) + '</h3><p>' + esc(current.id) + ' · ' + DB.fmtDate(current.date) + ' at ' + DB.fmtTime(current.time) + '</p></div>' + UI.badge(current.status) + '</div>' + statusTimeline(current) + '</div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Details</h3><p>Your appointment</p></div></div>' +
			'<div class="list-rows">' +
			'<div class="list-row"><div class="list-row__icon">' + I.car + '</div><div class="list-row__body"><strong>' + esc(v.make + ' ' + v.model) + '</strong><span>' + esc(v.reg) + ' · ' + esc(v.color || '') + '</span></div></div>' +
			'<div class="list-row"><div class="list-row__icon">' + I.staff + '</div><div class="list-row__body"><strong>' + (staff ? esc(staff.name) : 'To be assigned') + '</strong><span>' + (staff ? esc(staff.role) : 'A detailer will be assigned') + '</span></div></div>' +
			'<div class="list-row"><div class="list-row__icon">' + I.pin + '</div><div class="list-row__body"><strong>' + (current.mode === 'pickup' ? 'Pickup &amp; delivery' : 'Drop-off') + '</strong><span>' + esc(DB.settings().address) + '</span></div></div>' +
			'<div class="list-row"><div class="list-row__icon">' + I.card + '</div><div class="list-row__body"><strong>' + money(priceOf(current)) + '</strong><span>Estimated total</span></div>' + UI.badge(current.paymentStatus) + '</div>' +
			'</div>' +
			'<div class="panel__tools" style="margin-top:1rem"><button class="dbtn dbtn--sm" data-view="' + current.id + '">' + I.eye + ' Details</button><button class="dbtn dbtn--sm" data-resched="' + current.id + '">' + I.refresh + ' Reschedule</button></div>' +
			'</div></div>';
		wireCommon(root);
		wireBookingActions(root);
		var sel = $('#trackSel', root); if (sel) sel.addEventListener('change', function () { location.hash = '#tracking?b=' + sel.value; render(); });
	}

	/* ---------------- VEHICLES ---------------- */
	function renderVehicles(root) {
		var q = state.q.toLowerCase();
		var vs = myVehicles().filter(function (v) { return !q || (v.reg + ' ' + v.make + ' ' + v.model + ' ' + v.type).toLowerCase().indexOf(q) !== -1; });
		var cards = vs.map(function (v) {
			return '<article class="panel"><div class="panel__head" style="margin-bottom:.8rem"><div class="cell-user"><div class="list-row__icon" style="width:46px;height:46px">' + I.car + '</div><div><span class="cell-strong">' + esc(v.make + ' ' + v.model) + '</span><span class="cell-sub">' + esc(v.reg) + '</span></div></div></div>' +
				'<div class="bk-card__meta"><span>' + esc(v.type) + '</span><span>' + esc(v.color || '—') + '</span><span>' + esc(v.year || '—') + '</span></div>' +
				'<div class="panel__tools" style="margin-top:.9rem"><button class="dbtn dbtn--sm" data-vedit="' + v.id + '">' + I.edit + ' Edit</button><button class="dbtn dbtn--sm dbtn--danger" data-vdel="' + v.id + '">' + I.trash + ' Remove</button></div></article>';
		}).join('');
		root.innerHTML = pageHead('My Vehicles', 'Manage the cars we look after for you.', '<button class="dbtn dbtn--accent" data-vadd>' + I.plus + ' Add vehicle</button>') +
			(cards ? '<div class="grid grid--3">' + cards + '</div>' : UI.empty({ icon: I.car, title: 'No vehicles yet', text: 'Add a vehicle to book a service.', action: '<button class="dbtn dbtn--accent" data-vadd>' + I.plus + ' Add vehicle</button>' }));
		wireCommon(root);
		$$('[data-vedit]', root).forEach(function (b) { b.addEventListener('click', function () { openVehicleForm(DB.vehicle(b.getAttribute('data-vedit'))); }); });
		$$('[data-vdel]', root).forEach(function (b) { b.addEventListener('click', function () {
			var v = DB.vehicle(b.getAttribute('data-vdel'));
			UI.confirm({ title: 'Remove vehicle?', message: 'Remove ' + v.reg + ' (' + v.make + ' ' + v.model + ') from your garage.' }).then(function (ok) { if (!ok) return; DB.remove('vehicles', v.id); UI.toast('warn', 'Vehicle removed', v.reg + ' deleted.'); refresh(); });
		}); });
	}
	function openVehicleForm(v) {
		v = v || {};
		var node = UI.modal({
			title: v.id ? 'Edit vehicle' : 'Add vehicle', subtitle: v.id ? v.reg : 'Register a car to your account.',
			body: '<div class="form-grid">' +
				'<div class="dash-field"><label>Registration <span class="req">*</span></label><input class="dash-input" id="vfReg" value="' + esc(v.reg || '') + '" placeholder="8KLM214"></div>' +
				'<div class="dash-field"><label>Make <span class="req">*</span></label><input class="dash-input" id="vfMake" value="' + esc(v.make || '') + '" placeholder="Tesla"></div>' +
				'<div class="dash-field"><label>Model <span class="req">*</span></label><input class="dash-input" id="vfModel" value="' + esc(v.model || '') + '" placeholder="Model 3"></div>' +
				'<div class="dash-field"><label>Type</label><select class="dash-input" id="vfType">' + ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Truck', 'Van', 'Convertible'].map(function (t) { return '<option' + (v.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
				'<div class="dash-field"><label>Colour</label><input class="dash-input" id="vfColor" value="' + esc(v.color || '') + '" placeholder="Pearl White"></div>' +
				'<div class="dash-field"><label>Year</label><input class="dash-input" id="vfYear" type="number" min="1950" max="2030" value="' + esc(v.year || '') + '"></div>' +
				'</div>',
			footer: '<button class="dbtn" data-close>Cancel</button><button class="dbtn dbtn--accent" id="vfSave">' + (v.id ? 'Save changes' : 'Add vehicle') + '</button>'
		});
		node.querySelector('#vfSave').addEventListener('click', function () {
			var data = { reg: node.querySelector('#vfReg').value.trim(), make: node.querySelector('#vfMake').value.trim(), model: node.querySelector('#vfModel').value.trim(), type: node.querySelector('#vfType').value, color: node.querySelector('#vfColor').value.trim(), year: node.querySelector('#vfYear').value };
			if (!data.reg || !data.make || !data.model) { UI.toast('error', 'Missing fields', 'Registration, make and model are required.'); return; }
			if (v.id) { DB.update('vehicles', v.id, data); UI.toast('success', 'Vehicle updated', data.reg + ' saved.'); }
			else { DB.insert('vehicles', Object.assign({ customerId: user.id }, data)); UI.toast('success', 'Vehicle added', data.reg + ' registered.'); }
			node._close(); refresh();
		});
	}

	/* ---------------- PAYMENTS ---------------- */
	function renderPayments(root) {
		var bs = DB.sortBookings(myBookings().filter(function (b) { return b.status !== 'cancelled' || b.paymentStatus === 'refunded'; }), 'desc');
		var paid = bs.filter(function (b) { return b.paymentStatus === 'paid'; }).reduce(function (t, b) { return t + priceOf(b); }, 0);
		var owing = bs.filter(function (b) { return b.paymentStatus === 'unpaid'; }).reduce(function (t, b) { return t + priceOf(b); }, 0);
		var rows = bs.map(function (b) {
			var inv = 'INV-' + b.id.replace('BK-', '');
			return '<tr><td><span class="cell-strong">' + inv + '</span><span class="cell-sub">' + esc(svcNames(b.serviceIds)) + '</span></td>' +
				'<td>' + DB.fmtDate(b.date) + '</td>' +
				'<td class="cell-strong">' + money(priceOf(b)) + '</td><td>' + UI.badge(b.paymentStatus) + '</td>' +
				'<td><div class="t-actions"><button class="dbtn dbtn--sm" data-receipt="' + b.id + '">' + I.receipt + ' Receipt</button>' + (b.paymentStatus === 'unpaid' ? '<button class="dbtn dbtn--sm dbtn--ok" data-pay="' + b.id + '">Pay</button>' : '') + '</div></td></tr>';
		}).join('');
		root.innerHTML = pageHead('Payments', 'Invoices, receipts and outstanding balances.') +
			'<div class="grid grid--stats" style="margin-bottom:1rem">' +
			statCard('Total paid', money(paid), I.card, { dir: 'up', text: 'Across all bookings' }, true) +
			statCard('Outstanding', money(owing), I.clock, { dir: owing ? 'down' : 'up', text: owing ? 'Due on completion' : 'All settled' }) +
			statCard('Invoices', bs.length, I.receipt, { dir: 'flat', text: 'Lifetime' }) +
			'</div>' +
			'<div class="panel">' + (rows ? '<div class="table-wrap"><table class="dtable"><thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : UI.empty({ icon: I.card, title: 'No invoices yet', text: 'Invoices appear once you book a service.' })) + '</div>';
		wireCommon(root);
		wireBookingActions(root);
		$$('[data-receipt]', root).forEach(function (b) { b.addEventListener('click', function () { openReceipt(DB.find('bookings', b.getAttribute('data-receipt'))); }); });
	}
	function openReceipt(b) {
		var v = veh(b.vehicleId);
		var lines = DB.services(b.serviceIds).map(function (s) { return '<div class="list-row"><span>' + esc(s.name) + '</span><span class="list-row__val">' + money(s.price) + '</span></div>'; }).join('');
		UI.modal({
			title: 'Receipt — INV-' + b.id.replace('BK-', ''), subtitle: 'STACKLY Auto Spa · ' + DB.settings().address,
			body: '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1rem"><div><span class="cell-sub">Billed to</span><span class="cell-strong">' + esc(user.name) + '</span><span class="cell-sub">' + esc(user.email) + '</span></div><div style="text-align:right"><span class="cell-sub">Date</span><span class="cell-strong">' + DB.fmtDate(b.date) + '</span><span class="cell-sub">' + esc(v.make + ' ' + v.model + ' · ' + v.reg) + '</span></div></div>' +
				'<div class="divider"></div>' + lines +
				'<div class="divider"></div><div style="display:flex;justify-content:space-between"><span class="cell-strong">Total</span><span class="cell-strong" style="color:var(--accent)">' + money(priceOf(b)) + '</span></div>' +
				'<p style="margin-top:.8rem">' + UI.badge(b.paymentStatus) + ' ' + UI.badge(b.status) + '</p>',
			footer: '<button class="dbtn" data-close>Close</button><button class="dbtn dbtn--accent" onclick="window.print()">Print</button>'
		});
	}

	/* ---------------- OFFERS ---------------- */
	function activeOffers() {
		return DB.list('offers').filter(function (o) { return o.active && (!o.expiry || o.expiry >= DB.today()); });
	}
	function renderOffers(root) {
		var offers = activeOffers();
		var cards = offers.map(function (o) {
			var val = o.type === 'percent' ? o.discount + '% OFF' : money(o.discount) + ' OFF';
			return '<article class="panel" style="position:relative;overflow:hidden"><div style="position:absolute;right:-30px;top:-30px;opacity:.06">' + I.gift + '</div>' +
				'<div class="stat__icon" style="margin-bottom:.8rem">' + I.gift + '</div>' +
				'<h3 style="color:#fff;font-size:1.1rem">' + val + '</h3>' +
				'<p style="color:#c9ccd4;margin:.35rem 0 .6rem">' + esc(o.title) + '</p>' +
				'<p class="hint">' + esc(o.description || '') + '</p>' +
				'<div class="divider"></div>' +
				'<div style="display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap"><span class="tag" style="font-size:.85rem;letter-spacing:.12em">' + esc(o.code) + '</span>' +
				(o.expiry ? '<span class="hint">Expires ' + DB.fmtShort(o.expiry) + '</span>' : '') + '</div>' +
				'<button class="dbtn dbtn--sm" data-copy="' + esc(o.code) + '" style="margin-top:.9rem">' + I.receipt + ' Copy code</button>' +
				'</article>';
		}).join('');
		root.innerHTML = pageHead('Offers', 'Promotions available on your account.') +
			(cards ? '<div class="grid grid--3">' + cards + '</div>' : UI.empty({ icon: I.gift, title: 'No active offers', text: 'Check back soon for seasonal promotions.' }));
		wireCommon(root);
		$$('[data-copy]', root).forEach(function (b) { b.addEventListener('click', function () {
			var code = b.getAttribute('data-copy');
			if (navigator.clipboard) navigator.clipboard.writeText(code).then(function () { UI.toast('success', 'Copied', code + ' copied to clipboard.'); }, function () { UI.toast('info', 'Offer code', code); });
			else UI.toast('info', 'Offer code', code);
		}); });
	}

	/* ---------------- REVIEWS ---------------- */
	function renderReviews(root) {
		var bookings = DB.sortBookings(myBookings().filter(function (b) { return b.status === 'completed'; }), 'desc');
		var mine = DB.list('reviews').filter(function (r) { return r.customerId === user.id; });
		var cards = bookings.map(function (b) {
			var r = reviewFor(b.id);
			return '<div class="panel" style="margin-bottom:1rem"><div class="panel__head" style="margin-bottom:.6rem"><div><span class="cell-strong">' + esc(svcNames(b.serviceIds)) + '</span><span class="cell-sub">' + DB.fmtDate(b.date) + ' · ' + esc(veh(b.vehicleId).reg) + '</span></div>' + (r ? UI.badge(r.status) : '') + '</div>' +
				(r ? UI.stars(r.rating) + '<p style="margin:.7rem 0;color:#c9ccd4">' + esc(r.text) + '</p>' +
					'<div class="panel__tools"><button class="dbtn dbtn--sm" data-review-edit="' + r.id + '">' + I.edit + ' Edit</button><button class="dbtn dbtn--sm dbtn--danger" data-review-del="' + r.id + '">' + I.trash + ' Delete</button></div>'
					: '<p class="hint" style="margin-bottom:.7rem">You have not reviewed this detail yet.</p><button class="dbtn dbtn--sm dbtn--accent" data-review="' + b.id + '">' + I.star + ' Leave a review</button>') +
				'</div>';
		}).join('');
		root.innerHTML = pageHead('My Reviews', 'Rate the work we have done for you.') +
			'<div class="grid grid--stats" style="margin-bottom:1rem">' +
			statCard('Reviews written', mine.length, I.star, { dir: 'up', text: 'Thank you' }, true) +
			statCard('Completed details', bookings.length, I.check, { dir: 'flat', text: 'Eligible to review' }) +
			'</div>' +
			(cards || UI.empty({ icon: I.star, title: 'Nothing to review yet', text: 'Once a detail is completed you can rate it here.' })) ;
		wireCommon(root);
		$$('[data-review]', root).forEach(function (b) { b.addEventListener('click', function () { openReviewForm(DB.find('bookings', b.getAttribute('data-review'))); }); });
		$$('[data-review-edit]', root).forEach(function (b) { b.addEventListener('click', function () { openReviewForm(DB.find('bookings', reviewById(b.getAttribute('data-review-edit')).bookingId), DB.find('reviews', b.getAttribute('data-review-edit'))); }); });
		$$('[data-review-del]', root).forEach(function (b) { b.addEventListener('click', function () { UI.confirm({ title: 'Delete review?', message: 'Your review will be removed permanently.' }).then(function (ok) { if (!ok) return; DB.remove('reviews', b.getAttribute('data-review-del')); UI.toast('warn', 'Review deleted'); refresh(); }); }); });
	}
	function reviewById(id) { return DB.find('reviews', id) || {}; }
	function openReviewForm(b, existing) {
		var rating = existing ? existing.rating : 5;
		var stars = '';
		for (var i = 1; i <= 5; i++) stars += '<button type="button" class="' + (i <= rating ? 'on' : '') + '" data-rating="' + i + '" aria-label="' + i + ' stars">' + I.star + '</button>';
		var node = UI.modal({
			title: existing ? 'Edit your review' : 'Review your detail', subtitle: (b && b.serviceIds ? svcNames(b.serviceIds) : '') + (b && b.date ? ' · ' + DB.fmtDate(b.date) : ''),
			body: '<div class="dash-field"><label>Your rating</label><div class="star-input" id="rvStars">' + stars + '</div></div>' +
				'<div class="dash-field"><label>Comments</label><textarea class="dash-input" id="rvText" placeholder="Tell us about the finish, the service and the studio…">' + esc(existing ? existing.text : '') + '</textarea></div>',
			footer: '<button class="dbtn" data-close>Cancel</button><button class="dbtn dbtn--accent" id="rvSave">' + (existing ? 'Save review' : 'Submit review') + '</button>'
		});
		var chosen = rating;
		node.querySelectorAll('#rvStars [data-rating]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				chosen = Number(btn.getAttribute('data-rating'));
				node.querySelectorAll('#rvStars [data-rating]').forEach(function (x) { x.classList.toggle('on', Number(x.getAttribute('data-rating')) <= chosen); });
			});
		});
		node.querySelector('#rvSave').addEventListener('click', function () {
			var text = node.querySelector('#rvText').value.trim();
			if (text.length < 4) { UI.toast('error', 'Add a comment', 'Please write a short review.'); return; }
			if (existing) { DB.update('reviews', existing.id, { rating: chosen, text: text, status: 'pending' }); UI.toast('success', 'Review updated', 'Thanks — we will publish it shortly.'); }
			else { DB.insert('reviews', { bookingId: b.id, customerId: user.id, rating: chosen, text: text, status: 'pending', createdAt: DB.today() }); UI.toast('success', 'Review submitted', 'Thanks for the feedback!'); }
			node._close(); refresh();
		});
	}

	/* ---------------- PROFILE ---------------- */
	function renderProfile(root) {
		var avatars = ['images/avatar-1.webp', 'images/avatar-2.webp', 'images/avatar-3.webp'];
		root.innerHTML = pageHead('Profile', 'Your contact details and password.') +
			'<div class="grid grid--2" style="align-items:start">' +
			'<div class="panel"><div class="panel__head"><div class="cell-user">' + UI.avatar(user, 'avatar-md') + '<div><span class="cell-strong">' + esc(user.name) + '</span><span class="cell-sub">Customer since ' + (user.createdAt ? DB.fmtDate(user.createdAt) : '—') + '</span></div></div></div>' +
			'<div class="dash-field"><label>Full name</label><input class="dash-input" id="pfName" value="' + esc(user.name) + '"></div>' +
			'<div class="dash-field"><label>Email</label><input class="dash-input" id="pfEmail" type="email" value="' + esc(user.email) + '"></div>' +
			'<div class="dash-field"><label>Phone</label><input class="dash-input" id="pfPhone" value="' + esc(user.phone || '') + '"></div>' +
			'<div class="dash-field"><label>New password</label><input class="dash-input" id="pfPass" type="password" placeholder="Leave blank to keep current"></div>' +
			'<button class="dbtn dbtn--accent" id="pfSave">Update profile</button></div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Avatar</h3><p>Choose a profile picture</p></div></div>' +
			'<div style="display:flex;gap:.8rem;flex-wrap:wrap">' + avatars.map(function (a) {
				return '<button type="button" class="pf-avatar" data-avatar="' + a + '" style="border:2px solid ' + (user.avatar === a ? 'var(--accent)' : 'var(--line)') + ';border-radius:50%;padding:3px;background:none;cursor:pointer"><img src="' + a + '" alt="' + esc(user.name) + '" data-name="' + esc(user.name) + '" onerror="UI.avatarError(this)" style="width:64px;height:64px;border-radius:50%;object-fit:cover;display:block"></button>';
			}).join('') + '</div>' +
			'<div class="divider"></div>' +
			'<div class="list-rows">' +
			'<div class="list-row"><div class="list-row__icon">' + I.shield + '</div><div class="list-row__body"><strong>Account security</strong><span>Your data is stored locally in this browser</span></div></div>' +
			'<div class="list-row"><div class="list-row__icon">' + I.logout + '</div><div class="list-row__body"><strong>Sign out</strong><span>End your session on this device</span></div><button class="dbtn dbtn--sm dbtn--danger" data-logout>Sign out</button></div>' +
			'</div></div>' +
			'</div>';
		wireCommon(root);
		root.querySelectorAll('[data-avatar]').forEach(function (b) {
			b.addEventListener('click', function () {
				DB.updateProfile(user.id, { avatar: b.getAttribute('data-avatar') });
				user = DB.currentUser(); Auth.mountChrome(user);
				UI.toast('success', 'Avatar updated'); renderProfile(root);
			});
		});
		document.querySelectorAll('[data-logout]').forEach(function (b) { b.addEventListener('click', Auth.logout); });
		root.querySelector('#pfSave').addEventListener('click', function () {
			var patch = { name: root.querySelector('#pfName').value.trim(), email: root.querySelector('#pfEmail').value.trim(), phone: root.querySelector('#pfPhone').value.trim() };
			var pass = root.querySelector('#pfPass').value; if (pass) patch.password = pass;
			if (!patch.name || !patch.email) { UI.toast('error', 'Missing fields', 'Name and email are required.'); return; }
			DB.updateProfile(user.id, patch); user = DB.currentUser(); Auth.mountChrome(user);
			UI.toast('success', 'Profile updated', 'Your details have been saved.');
		});
	}

	/* ---------------- notifier ---------------- */
	function updateBadges() {
		var up = upcomingBookings().length;
		var rev = reviewableBookings().length;
		var nu = document.getElementById('navUpcoming'), nr = document.getElementById('navReviewable');
		if (nu) { nu.textContent = up; nu.hidden = !up; }
		if (nr) { nr.textContent = rev; nr.hidden = !rev; }
		var dot = document.getElementById('notifDot'); if (dot) dot.hidden = !(up + rev);
	}
	document.getElementById('notifBtn').addEventListener('click', function () {
		var upcoming = DB.sortBookings(upcomingBookings(), 'asc');
		var reviewable = reviewableBookings();
		if (!upcoming.length && !reviewable.length) { UI.toast('success', 'All caught up', 'No upcoming bookings or reviews.'); return; }
		var body = '';
		if (upcoming.length) body += '<h4 style="color:#fff;margin-bottom:.5rem">Upcoming bookings</h4><div class="list-rows">' + upcoming.map(function (b) {
			return '<div class="list-row"><div class="list-row__icon">' + I.calendar + '</div><div class="list-row__body"><strong>' + esc(svcNames(b.serviceIds)) + '</strong><span>' + DB.fmtDate(b.date) + ' · ' + DB.fmtTime(b.time) + '</span></div>' + UI.badge(b.status) + '</div>';
		}).join('') + '</div>';
		if (reviewable.length) body += '<h4 style="color:#fff;margin:1rem 0 .5rem">Ready to review</h4><div class="list-rows">' + reviewable.map(function (b) {
			return '<div class="list-row"><div class="list-row__icon">' + I.star + '</div><div class="list-row__body"><strong>' + esc(svcNames(b.serviceIds)) + '</strong><span>' + DB.fmtDate(b.date) + '</span></div><button class="dbtn dbtn--sm" data-review="' + b.id + '">Review</button></div>';
		}).join('') + '</div>';
		var node = UI.modal({ title: 'Notifications', subtitle: upcoming.length + ' upcoming · ' + reviewable.length + ' to review', body: body, footer: '<button class="dbtn" data-close>Close</button>' });
		node.querySelectorAll('[data-review]').forEach(function (b) { b.addEventListener('click', function () { node._close(); openReviewForm(DB.find('bookings', b.getAttribute('data-review'))); }); });
	});

	/* ---------------- common wiring ---------------- */
	function wireCommon(root) {
		$$('[data-goto]', root).forEach(function (b) { b.addEventListener('click', function () { location.hash = b.getAttribute('data-goto'); }); });
		$$('[data-vadd]', root).forEach(function (b) { b.addEventListener('click', function () { openVehicleForm(); }); });
	}
	// data-logout is wired by Auth.mountChrome on load; re-bind any added later via profile render

	/* ---------------- router ---------------- */
	var RENDER = { overview: renderOverview, book: renderBook, bookings: renderBookings, tracking: renderTracking, vehicles: renderVehicles, payments: renderPayments, offers: renderOffers, reviews: renderReviews, profile: renderProfile };
	function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
	function render() {
		var v = currentView();
		$$('.dash-view').forEach(function (s) { s.classList.remove('is-active'); });
		var sec = document.getElementById('view-' + v); if (!sec) return;
		sec.classList.add('is-active');
		document.getElementById('pageTitle').innerHTML = sec.getAttribute('data-title');
		document.getElementById('pageSub').textContent = sec.getAttribute('data-sub');
		$$('.dash-link').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + v); });
		RENDER[v](sec.querySelector('[data-body]'));
		updateBadges();
		closeSidebar();
	}
	function refresh() { render(); }
	function navigate() { location.hash = location.hash || '#overview'; render(); scrollTop(); }
	window.addEventListener('hashchange', navigate);

	// mobile / desktop sidebar
	var app = document.getElementById('dashApp'), sidebar = document.getElementById('sidebar'), overlay = document.getElementById('overlay');
	function closeSidebar() { sidebar.classList.remove('is-open'); overlay.classList.remove('is-open'); }
	document.getElementById('burger').addEventListener('click', function () {
		if (window.innerWidth <= 860) { sidebar.classList.toggle('is-open'); overlay.classList.toggle('is-open'); }
		else app.classList.toggle('is-collapsed');
	});
	overlay.addEventListener('click', closeSidebar);

	// global search
	var search = document.getElementById('globalSearch');
	if (search) search.addEventListener('input', function (e) { state.q = e.target.value; render(); });

	// cross-tab sync
	window.addEventListener('storage', function (e) { if (e.key && e.key.indexOf('stackly_') === 0) render(); });

	// bootstrap
	if (!location.hash) location.hash = '#overview';
	navigate();
})();
