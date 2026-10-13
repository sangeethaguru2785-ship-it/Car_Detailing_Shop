/* =========================================================
   STACKLY AUTO SPA — Admin dashboard controller
   ========================================================= */
(function () {
	'use strict';
	var user = Auth.guard('admin');
	if (!user) return;

	/* ---------------- helpers ---------------- */
	function $(s, c) { return (c || document).querySelector(s); }
	function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
	function esc(s) { return UI.escape(s); }
	function money(n) { return DB.fmtMoney(n); }
	function svcNames(ids) { var names = DB.services(ids).map(function (s) { return s.name; }); return names.length ? names.join(' + ') : '—'; }
	function cust(id) { return DB.customer(id) || { name: 'Unknown', email: '', avatar: 'images/avatar-1.webp' }; }
	function veh(id) { return DB.vehicle(id) || { make: '—', model: '', reg: '—', type: '—' }; }
	function staff(id) { return DB.staffMember(id); }
	function priceOf(booking) { return booking.price || DB.computePrice(booking.serviceIds); }
	var I = UI.icons;

	var NAV_ICONS = { overview: I.grid, bookings: I.calendar, customers: I.users, vehicles: I.car, staff: I.staff, services: I.wrench, pricing: I.tag, payments: I.card, reviews: I.star, reports: I.chart, settings: I.settings };
	Object.keys(NAV_ICONS).forEach(function (k) {
		var el = document.querySelector('.dash-nav [href="#' + k + '"] .ico'); if (el) el.innerHTML = NAV_ICONS[k];
	});
	$('#burger').innerHTML = I.menu;

	Auth.mountChrome(user);

	/* ---------------- view state ---------------- */
	var state = { q: '', bookingStatus: 'all', bookingDate: '', payStatus: 'all', reviewStatus: 'all', reportDays: 14 };
	var VIEWS = ['overview', 'bookings', 'customers', 'vehicles', 'staff', 'services', 'pricing', 'payments', 'reviews', 'reports', 'settings'];
	function currentView() { var h = location.hash.replace('#', ''); return VIEWS.indexOf(h) >= 0 ? h : 'overview'; }

	/* ---------------- shared bits ---------------- */
	function pageHead(title, sub, actions) {
		return '<div class="page-head"><div><h2>' + esc(title) + '</h2><p>' + esc(sub) + '</p></div>' +
			(actions ? '<div class="page-head__actions">' + actions + '</div>' : '') + '</div>';
	}
	function statCard(label, value, icon, delta, accent) {
		return '<article class="stat' + (accent ? ' stat--accent' : '') + '"><div class="stat__top">' +
			'<div><div class="stat__label">' + esc(label) + '</div><div class="stat__value">' + value + '</div>' +
			(delta ? '<span class="stat__delta ' + delta.dir + '">' + (delta.dir === 'up' ? I.up : delta.dir === 'down' ? I.down : '') + ' ' + esc(delta.text) + '</span>' : '') +
			'</div><div class="stat__icon">' + icon + '</div></div></article>';
	}
	function bookingCountFor(date) { return DB.list('bookings').filter(function (b) { return b.date === date && b.status !== 'cancelled'; }).length; }

	/* ---------------- OVERVIEW ---------------- */
	function renderOverview(root) {
		var s = DB.stats();
		var rev = DB.revenueLast7();
		var wk = DB.bookingsByWeek();
		var pop = DB.popularServices().filter(function (p) { return p.value > 0; }).slice(0, 5);
		var todayList = DB.sortBookings(DB.list('bookings').filter(function (b) { return b.date === DB.today() && b.status !== 'cancelled'; }), 'asc');
		var recent = DB.list('bookings').slice().sort(function (a, b) { return (b.createdAt || '') < (a.createdAt || '') ? -1 : 1; }).slice(0, 5);
		var outstanding = DB.list('bookings').filter(function (b) { return b.paymentStatus !== 'paid' && b.status !== 'cancelled'; }).reduce(function (t, b) { return t + priceOf(b); }, 0);

		root.innerHTML =
			pageHead('Good day, ' + (user.name.split(' ')[0]) + ' 👋', 'Here is what is happening at the studio.', '<button class="dbtn dbtn--accent" data-new-booking>' + I.plus + ' New booking</button>') +
			'<div class="grid grid--stats" style="margin-bottom:1rem">' +
			statCard('Total customers', s.customers, I.users, { dir: 'up', text: 'Active accounts' }) +
			statCard('Total bookings', s.bookings, I.calendar, { dir: 'up', text: 'All time' }) +
			statCard("Today's appointments", s.today, I.clock, { dir: s.today ? 'up' : 'flat', text: s.today + ' scheduled' }) +
			statCard('Total revenue', money(s.revenue), I.card, { dir: 'up', text: 'Collected' }, true) +
			statCard('Pending bookings', s.pending, I.clock, { dir: s.pending ? 'down' : 'up', text: 'Awaiting confirmation' }) +
			'</div>' +
			'<div class="grid grid--2" style="margin-bottom:1rem">' +
			'<div class="panel"><div class="panel__head"><div><h3>Revenue — last 7 days</h3><p>Collected and scheduled value</p></div></div>' + UI.lineChart(rev, { money: true }) + '</div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Bookings per week</h3><p>Last 8 weeks</p></div></div>' + UI.barChart(wk) + '</div>' +
			'</div>' +
			'<div class="grid grid--2">' +
			'<div class="panel"><div class="panel__head"><div><h3>Popular services</h3><p>By bookings</p></div></div>' + (pop.length ? UI.donut(pop.map(function (p) { return { label: p.name, value: p.value }; }), { centerValue: pop.reduce(function (t, p) { return t + p.value; }, 0), centerLabel: 'bookings' }) : UI.empty({ title: 'No data yet', text: 'Popular services will appear once bookings exist.' })) + '</div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Today\'s schedule</h3><p>' + todayList.length + ' appointment(s)</p></div></div>' +
			(todayList.length ? '<div class="list-rows">' + todayList.map(function (b) {
				var c = cust(b.customerId);
				return '<div class="list-row"><div class="list-row__icon">' + I.clock + '</div><div class="list-row__body"><strong>' + esc(DB.fmtTime(b.time)) + ' · ' + esc(c.name) + '</strong><span>' + esc(svcNames(b.serviceIds)) + ' · ' + esc(veh(b.vehicleId).reg) + '</span></div>' + UI.badge(b.status) + '</div>';
			}).join('') + '</div>' : UI.empty({ icon: I.calendar, title: 'No appointments today', text: 'Enjoy the quiet bay.' })) + '</div>' +
			'</div>' +
			'<div class="panel" style="margin-top:1rem"><div class="panel__head"><div><h3>Recent bookings</h3><p>Newest requests</p></div><button class="dbtn dbtn--sm" data-goto="#bookings">View all</button></div>' +
			(recent.length ? bookingsTable(recent, true) : UI.empty({ title: 'No bookings yet' })) + '</div>' +
			'<p class="hint" style="margin-top:1rem">Outstanding balance across active bookings: <strong style="color:var(--accent)">' + money(outstanding) + '</strong></p>';
		wireCommon(root);
	}

	/* ---------------- BOOKINGS ---------------- */
	function filteredBookings() {
		var q = state.q.toLowerCase();
		return DB.list('bookings').filter(function (b) {
			if (state.bookingStatus !== 'all' && b.status !== state.bookingStatus) return false;
			if (state.bookingDate && b.date !== state.bookingDate) return false;
			if (q) {
				var c = cust(b.customerId), v = veh(b.vehicleId);
				var hay = (b.id + ' ' + c.name + ' ' + c.email + ' ' + v.reg + ' ' + v.make + ' ' + v.model + ' ' + svcNames(b.serviceIds)).toLowerCase();
				if (hay.indexOf(q) === -1) return false;
			}
			return true;
		});
	}
	function bookingsTable(list, compact) {
		if (!list.length) return UI.empty({ icon: I.calendar, title: 'No bookings found', text: 'Try a different filter, or create a new booking.', action: '<button class="dbtn dbtn--accent" data-new-booking>' + I.plus + ' New booking</button>' });
		var rows = DB.sortBookings(list, 'desc').map(function (b) {
			var c = cust(b.customerId), v = veh(b.vehicleId), st = staff(b.staffId);
			return '<tr>' +
				'<td><span class="cell-strong">' + esc(b.id) + '</span><span class="cell-sub">' + DB.fmtDate(b.date) + ' · ' + DB.fmtTime(b.time) + '</span></td>' +
				'<td><div class="cell-user">' + UI.avatar(c) + '<div><span class="cell-strong">' + esc(c.name) + '</span><span class="cell-sub">' + esc(c.email) + '</span></div></div></td>' +
				'<td>' + esc(svcNames(b.serviceIds)) + '<span class="cell-sub">' + esc(v.make + ' ' + v.model) + ' · ' + esc(v.reg) + '</span></td>' +
				'<td>' + (st ? '<span class="cell-user">' + UI.avatar(st) + esc(st.name) + '</span>' : '<span class="cell-sub">Unassigned</span>') + '</td>' +
				'<td>' + UI.badge(b.status) + '</td>' +
				'<td>' + money(priceOf(b)) + ' ' + UI.badge(b.paymentStatus) + '</td>' +
				(compact ? '' : '<td><div class="t-actions">' + bookingActions(b) + '</div></td>') +
				'</tr>';
		}).join('');
		return '<div class="table-wrap"><table class="dtable"><thead><tr>' +
			'<th>Booking</th><th>Customer</th><th>Service / Vehicle</th><th>Staff</th><th>Status</th><th>Payment</th>' + (compact ? '' : '<th>Actions</th>') +
			'</tr></thead><tbody>' + rows + '</tbody></table></div>';
	}
	function bookingActions(b) {
		var out = '';
		if (b.status === 'pending') out += '<button class="dbtn dbtn--sm dbtn--ok" data-act="confirm" data-id="' + b.id + '">' + I.check + ' Confirm</button>';
		if (b.status === 'confirmed') out += '<button class="dbtn dbtn--sm" data-act="start" data-id="' + b.id + '">' + I.play + ' Start</button>';
		if (b.status === 'in-progress') out += '<button class="dbtn dbtn--sm dbtn--ok" data-act="complete" data-id="' + b.id + '">' + I.check + ' Complete</button>';
		if (b.status !== 'cancelled' && b.status !== 'completed') out += '<button class="dbtn dbtn--sm" data-act="reschedule" data-id="' + b.id + '">' + I.refresh + ' Reschedule</button>';
		out += '<button class="dbtn dbtn--sm" data-act="view" data-id="' + b.id + '">' + I.eye + '</button>';
		if (b.status !== 'cancelled' && b.status !== 'completed') out += '<button class="dbtn dbtn--sm dbtn--danger" data-act="cancel" data-id="' + b.id + '">' + I.x + '</button>';
		if (b.paymentStatus === 'unpaid') out += '<button class="dbtn dbtn--sm dbtn--ok" data-act="pay" data-id="' + b.id + '">Pay</button>';
		return out;
	}
	function renderBookings(root) {
		var chips = ['all', 'pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
		root.innerHTML = pageHead('Booking Management', 'Confirm, reschedule, assign and cancel appointments.',
			'<button class="dbtn" data-goto="#reports">' + I.chart + ' Reports</button><button class="dbtn dbtn--accent" data-new-booking>' + I.plus + ' New booking</button>') +
			'<div class="panel"><div class="panel__head"><div class="panel__tools">' +
			chips.map(function (c) { return '<button class="chip' + (state.bookingStatus === c ? ' is-active' : '') + '" data-bfilter="' + c + '">' + (c === 'all' ? 'All' : UI.STATUS_LABEL[c]) + '</button>'; }).join('') +
			'</div><div class="panel__tools"><input type="date" class="dash-input" style="width:auto" id="bkDate" value="' + state.bookingDate + '"><button class="dbtn dbtn--sm" data-bfilter-clear>Clear</button></div></div>' +
			'<div id="bkTable">' + bookingsTable(filteredBookings()) + '</div></div>';
		wireCommon(root);
		$$('[data-bfilter]', root).forEach(function (c) { c.addEventListener('click', function () { state.bookingStatus = c.getAttribute('data-bfilter'); renderBookings(root); }); });
		var d = $('#bkDate', root); if (d) d.addEventListener('change', function () { state.bookingDate = d.value; renderBookings(root); });
		var clr = $('[data-bfilter-clear]', root); if (clr) clr.addEventListener('click', function () { state.bookingDate = ''; state.bookingStatus = 'all'; renderBookings(root); });
		wireBookingActions(root);
	}

	/* booking action handlers (shared by tables) */
	function wireBookingActions(root) {
		$$('[data-act]', root).forEach(function (btn) {
			btn.addEventListener('click', function () {
				var id = btn.getAttribute('data-id'), act = btn.getAttribute('data-act');
				var b = DB.find('bookings', id); if (!b) return;
				if (act === 'confirm') { DB.setBookingStatus(id, 'confirmed'); UI.toast('success', 'Booking confirmed', id + ' is now confirmed.'); refresh(); }
				if (act === 'start') { DB.setBookingStatus(id, 'in-progress'); UI.toast('info', 'Job started', id + ' is in progress.'); refresh(); }
				if (act === 'complete') {
					DB.setBookingStatus(id, 'completed', { paymentStatus: b.paymentStatus === 'refunded' ? 'refunded' : 'paid' });
					UI.toast('success', 'Booking completed', id + ' marked completed & paid.'); refresh();
				}
				if (act === 'cancel') {
					UI.confirm({ title: 'Cancel this booking?', message: 'Cancelling ' + id + ' will free the ' + DB.fmtTime(b.time) + ' slot on ' + DB.fmtDate(b.date) + '.', confirmText: 'Cancel booking', cancelText: 'Keep it' }).then(function (ok) {
						if (!ok) return; DB.cancelBooking(id); UI.toast('warn', 'Booking cancelled', id + ' was cancelled.'); refresh();
					});
				}
				if (act === 'reschedule') openReschedule(b);
				if (act === 'pay') { DB.update('bookings', id, { paymentStatus: 'paid' }); UI.toast('success', 'Payment recorded', money(priceOf(b)) + ' collected for ' + id + '.'); refresh(); }
				if (act === 'view') openBookingDetail(b);
			});
		});
	}

	function openReschedule(b) {
		var node = UI.modal({
			title: 'Reschedule ' + b.id, subtitle: 'Pick a new date and an available time slot.',
			body: '<div class="form-grid"><div class="dash-field"><label>Date <span class="req">*</span></label><input type="date" class="dash-input" id="rsDate" value="' + (b.date < DB.today() ? DB.today() : b.date) + '"></div>' +
				'<div class="dash-field"><label>Time slot <span class="req">*</span></label><select class="dash-input" id="rsTime"></select></div></div>' +
				'<p class="form-note" id="rsNote">Slots already booked are hidden.</p>',
			footer: '<button class="dbtn" data-close>Cancel</button><button class="dbtn dbtn--accent" id="rsSave">Save changes</button>'
		});
		var dateEl = node.querySelector('#rsDate'), timeEl = node.querySelector('#rsTime');
		function fill() {
			var slots = DB.availableSlots(dateEl.value, b.id);
			timeEl.innerHTML = slots.length ? slots.map(function (t) { return '<option value="' + t + '"' + (t === b.time && dateEl.value === b.date ? ' selected' : '') + '>' + DB.fmtTime(t) + '</option>'; }).join('') : '<option value="">No slots available</option>';
		}
		fill();
		dateEl.addEventListener('change', fill);
		node.querySelector('#rsSave').addEventListener('click', function () {
			if (!dateEl.value || !timeEl.value) { UI.toast('error', 'Missing details', 'Choose a date with an available slot.'); return; }
			var res = DB.rescheduleBooking(b.id, dateEl.value, timeEl.value);
			if (!res.ok) { UI.toast('error', 'Slot unavailable', res.error); return; }
			node._close(); UI.toast('success', 'Rescheduled', b.id + ' moved to ' + DB.fmtDate(dateEl.value) + ' ' + DB.fmtTime(timeEl.value) + '.'); refresh();
		});
	}

	function openBookingDetail(b) {
		var c = cust(b.customerId), v = veh(b.vehicleId), st = staff(b.staffId);
		var log = (b.statusLog || []).map(function (l) { return '<div class="timeline__item"><strong>' + UI.STATUS_LABEL[l.status] + '</strong><span>' + new Date(l.at).toLocaleString() + '</span></div>'; }).join('');
		UI.modal({
			title: 'Booking ' + b.id, subtitle: DB.fmtDate(b.date) + ' at ' + DB.fmtTime(b.time),
			body: '<div class="grid grid--2" style="gap:1rem">' +
				'<div><h4 style="color:#fff;margin-bottom:.6rem">Customer</h4><div class="cell-user">' + UI.avatar(c, 'avatar-md') + '<div><span class="cell-strong">' + esc(c.name) + '</span><span class="cell-sub">' + esc(c.email) + '</span><span class="cell-sub">' + esc(c.phone) + '</span></div></div></div>' +
				'<div><h4 style="color:#fff;margin-bottom:.6rem">Vehicle</h4><span class="cell-strong">' + esc(v.make + ' ' + v.model) + '</span><span class="cell-sub">' + esc(v.reg) + ' · ' + esc(v.type) + ' · ' + esc(v.color || '') + '</span></div>' +
				'</div><div class="divider"></div>' +
				'<p style="margin-bottom:.6rem"><strong style="color:#fff">Services:</strong> ' + esc(svcNames(b.serviceIds)) + '</p>' +
				'<p style="margin-bottom:.6rem"><strong style="color:#fff">Handover:</strong> ' + (b.mode === 'pickup' ? 'Pickup &amp; delivery' : 'Customer drop-off') + '</p>' +
				'<p style="margin-bottom:.6rem"><strong style="color:#fff">Assigned staff:</strong> ' + (st ? esc(st.name) : 'Unassigned') + '</p>' +
				'<p style="margin-bottom:.6rem"><strong style="color:#fff">Total:</strong> ' + money(priceOf(b)) + ' · ' + UI.badge(b.paymentStatus) + ' · ' + UI.badge(b.status) + '</p>' +
				(b.notes ? '<p style="margin-bottom:.6rem"><strong style="color:#fff">Notes:</strong> ' + esc(b.notes) + '</p>' : '') +
				(log ? '<div class="divider"></div><h4 style="color:#fff;margin-bottom:.6rem">Status history</h4><div class="timeline">' + log + '</div>' : ''),
			footer: '<button class="dbtn" data-close>Close</button>'
		});
	}

	function openNewBooking() {
		var customers = DB.usersByRole('customer');
		var services = DB.list('services').filter(function (s) { return s.active; });
		var node = UI.modal({
			title: 'New booking', subtitle: 'Create an appointment on a customer\'s behalf.', wide: true,
			body: '<div class="form-grid">' +
				'<div class="dash-field"><label>Customer <span class="req">*</span></label><select class="dash-input" id="nbCustomer">' + customers.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
				'<div class="dash-field"><label>Vehicle <span class="req">*</span></label><select class="dash-input" id="nbVehicle"></select></div>' +
				'<div class="dash-field"><label>Date <span class="req">*</span></label><input type="date" class="dash-input" id="nbDate" value="' + DB.today() + '"></div>' +
				'<div class="dash-field"><label>Time slot <span class="req">*</span></label><select class="dash-input" id="nbTime"></select></div>' +
				'<div class="dash-field"><label>Handover</label><select class="dash-input" id="nbMode"><option value="dropoff">Drop-off at studio</option><option value="pickup">Pickup &amp; delivery</option></select></div>' +
				'</div>' +
				'<div class="dash-field"><label>Services <span class="req">*</span></label><div class="grid grid--3" style="gap:.5rem">' +
				services.map(function (s) { return '<label class="checkline"><input type="checkbox" value="' + s.id + '" data-svc> <span>' + esc(s.name) + ' <b style="color:var(--accent)">' + money(s.price) + '</b></span></label>'; }).join('') +
				'</div></div>' +
				'<div class="dash-field"><label>Notes</label><textarea class="dash-input" id="nbNotes" placeholder="Anything the detailer should know…"></textarea></div>' +
				'<p class="form-note" id="nbTotal">Select services to see the total.</p>',
			footer: '<button class="dbtn" data-close>Cancel</button><button class="dbtn dbtn--accent" id="nbSave">Create booking</button>'
		});
		var vSel = node.querySelector('#nbVehicle'), cSel = node.querySelector('#nbCustomer'), dateEl = node.querySelector('#nbDate'), timeEl = node.querySelector('#nbTime');
		function vehicles() {
			var vs = DB.customerVehicles(cSel.value);
			vSel.innerHTML = vs.length ? vs.map(function (v) { return '<option value="' + v.id + '">' + esc(v.make + ' ' + v.model + ' · ' + v.reg) + '</option>'; }).join('') : '<option value="">No vehicles — add one first</option>';
		}
		function slots() {
			var s = DB.availableSlots(dateEl.value);
			timeEl.innerHTML = s.length ? s.map(function (t) { return '<option value="' + t + '">' + DB.fmtTime(t) + '</option>'; }).join('') : '<option value="">No slots available</option>';
		}
		function total() {
			var ids = $$('[data-svc]:checked', node).map(function (x) { return x.value; });
			node.querySelector('#nbTotal').textContent = 'Estimated total: ' + money(DB.computePrice(ids));
		}
		vehicles(); slots(); total();
		cSel.addEventListener('change', vehicles);
		dateEl.addEventListener('change', slots);
		$$('[data-svc]', node).forEach(function (x) { x.addEventListener('change', total); });
		node.querySelector('#nbSave').addEventListener('click', function () {
			var ids = $$('[data-svc]:checked', node).map(function (x) { return x.value; });
			if (!ids.length) { UI.toast('error', 'No services', 'Select at least one service.'); return; }
			if (!vSel.value) { UI.toast('error', 'No vehicle', 'This customer needs a vehicle first.'); return; }
			if (!timeEl.value) { UI.toast('error', 'No slot', 'Pick a date with an available slot.'); return; }
			var res = DB.createBooking({ customerId: cSel.value, vehicleId: vSel.value, serviceIds: ids, date: dateEl.value, time: timeEl.value, mode: node.querySelector('#nbMode').value, notes: node.querySelector('#nbNotes').value });
			if (!res.ok) { UI.toast('error', 'Booking failed', res.error); return; }
			node._close(); UI.toast('success', 'Booking created', res.booking.id + ' added as pending.'); DB.setBookingStatus(res.booking.id, 'confirmed'); refresh();
		});
	}

	/* ---------------- CUSTOMERS ---------------- */
	function renderCustomers(root) {
		var q = state.q.toLowerCase();
		var rows = DB.usersByRole('customer').filter(function (c) {
			if (!q) return true;
			return (c.name + ' ' + c.email + ' ' + (c.phone || '')).toLowerCase().indexOf(q) !== -1;
		}).map(function (c) {
			var bs = DB.customerBookings(c.id);
			var spent = bs.filter(function (b) { return b.paymentStatus === 'paid'; }).reduce(function (t, b) { return t + priceOf(b); }, 0);
			return '<tr>' +
				'<td><div class="cell-user">' + UI.avatar(c) + '<div><span class="cell-strong">' + esc(c.name) + '</span><span class="cell-sub">' + esc(c.email) + '</span></div></div></td>' +
				'<td>' + esc(c.phone || '—') + '</td>' +
				'<td>' + bs.length + ' booking(s)<span class="cell-sub">' + DB.customerVehicles(c.id).length + ' vehicle(s)</span></td>' +
				'<td class="cell-strong">' + money(spent) + '</td>' +
				'<td>' + (c.createdAt ? DB.fmtDate(c.createdAt) : '—') + '</td>' +
				'<td><div class="t-actions"><button class="dbtn dbtn--sm" data-cview="' + c.id + '">' + I.eye + ' View</button></div></td></tr>';
		}).join('');
		root.innerHTML = pageHead('Customer Management', 'Contact details, vehicles and booking history.',
			'<button class="dbtn" data-goto="#vehicles">' + I.car + ' Vehicles</button>') +
			'<div class="panel">' + (rows ? '<div class="table-wrap"><table class="dtable"><thead><tr><th>Customer</th><th>Phone</th><th>Activity</th><th>Total spent</th><th>Joined</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : UI.empty({ icon: I.users, title: 'No customers found', text: 'Adjust your search or add a customer via a booking.' })) + '</div>';
		wireCommon(root);
		$$('[data-cview]', root).forEach(function (b) { b.addEventListener('click', function () { openCustomer(b.getAttribute('data-cview')); }); });
	}
	function openCustomer(id) {
		var c = DB.customer(id); if (!c) return;
		var bs = DB.sortBookings(DB.customerBookings(id), 'desc');
		var vs = DB.customerVehicles(id);
		var spent = bs.filter(function (b) { return b.paymentStatus === 'paid'; }).reduce(function (t, b) { return t + priceOf(b); }, 0);
		UI.modal({
			title: c.name, subtitle: c.email + ' · ' + (c.phone || 'no phone'), wide: true,
			body: '<div class="grid grid--2" style="gap:1.2rem"><div>' +
				'<div class="cell-user" style="margin-bottom:.8rem">' + UI.avatar(c, 'avatar-md') + '<div><span class="cell-strong">' + esc(c.name) + '</span><span class="cell-sub">Customer since ' + (c.createdAt ? DB.fmtDate(c.createdAt) : '—') + '</span></div></div>' +
				'<p class="cell-sub">Lifetime value</p><p class="cell-strong" style="font-size:1.3rem;color:var(--accent)">' + money(spent) + '</p>' +
				'<div class="divider"></div><h4 style="color:#fff;margin-bottom:.5rem">Vehicles</h4>' +
				(vs.length ? vs.map(function (v) { return '<div class="list-row"><div class="list-row__icon">' + I.car + '</div><div class="list-row__body"><strong>' + esc(v.make + ' ' + v.model) + '</strong><span>' + esc(v.reg) + ' · ' + esc(v.type) + '</span></div></div>'; }).join('') : '<p class="hint">No vehicles on file.</p>') +
				'</div><div><h4 style="color:#fff;margin-bottom:.5rem">Booking history</h4>' +
				(bs.length ? '<div class="list-rows">' + bs.map(function (b) {
					return '<div class="list-row"><div class="list-row__body"><strong>' + esc(svcNames(b.serviceIds)) + '</strong><span>' + DB.fmtDate(b.date) + ' · ' + DB.fmtTime(b.time) + ' · ' + money(priceOf(b)) + '</span></div>' + UI.badge(b.status) + '</div>';
				}).join('') + '</div>' : '<p class="hint">No bookings yet.</p>') +
				'</div></div>',
			footer: '<button class="dbtn" data-close>Close</button>'
		});
	}

	/* ---------------- VEHICLES ---------------- */
	function renderVehicles(root) {
		var q = state.q.toLowerCase();
		var rows = DB.list('vehicles').filter(function (v) {
			if (!q) return true;
			var c = cust(v.customerId);
			return (v.reg + ' ' + v.make + ' ' + v.model + ' ' + v.type + ' ' + c.name).toLowerCase().indexOf(q) !== -1;
		}).map(function (v) {
			var c = cust(v.customerId);
			return '<tr><td><span class="cell-strong">' + esc(v.reg) + '</span><span class="cell-sub">' + esc(v.type) + '</span></td>' +
				'<td>' + esc(v.make + ' ' + v.model) + '<span class="cell-sub">' + esc(v.color || '') + ' · ' + esc(v.year || '') + '</span></td>' +
				'<td><div class="cell-user">' + UI.avatar(c) + esc(c.name) + '</div></td>' +
				'<td><div class="t-actions"><button class="dbtn dbtn--sm" data-vedit="' + v.id + '">' + I.edit + '</button><button class="dbtn dbtn--sm dbtn--danger" data-vdel="' + v.id + '">' + I.trash + '</button></div></td></tr>';
		}).join('');
		root.innerHTML = pageHead('Vehicle Management', 'Registration number, model and vehicle type.', '<button class="dbtn dbtn--accent" data-vadd>' + I.plus + ' Add vehicle</button>') +
			'<div class="panel">' + (rows ? '<div class="table-wrap"><table class="dtable"><thead><tr><th>Registration</th><th>Vehicle</th><th>Owner</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : UI.empty({ icon: I.car, title: 'No vehicles found', text: 'Add a vehicle to get started.' })) + '</div>';
		wireCommon(root);
		$$('[data-vadd]', root).forEach(function (b) { b.addEventListener('click', function () { openVehicleForm(); }); });
		$$('[data-vedit]', root).forEach(function (b) { b.addEventListener('click', function () { openVehicleForm(DB.vehicle(b.getAttribute('data-vedit'))); }); });
		$$('[data-vdel]', root).forEach(function (b) { b.addEventListener('click', function () {
			var v = DB.vehicle(b.getAttribute('data-vdel'));
			UI.confirm({ title: 'Delete vehicle?', message: 'Remove ' + v.reg + ' (' + v.make + ' ' + v.model + ') from the system.' }).then(function (ok) { if (!ok) return; DB.remove('vehicles', v.id); UI.toast('warn', 'Vehicle removed', v.reg + ' deleted.'); refresh(); });
		}); });
	}
	function openVehicleForm(v) {
		var customers = DB.usersByRole('customer');
		var node = UI.modal({
			title: v ? 'Edit vehicle' : 'Add vehicle', subtitle: v ? v.reg : 'Register a customer vehicle.',
			body: '<div class="form-grid">' +
				'<div class="dash-field"><label>Owner <span class="req">*</span></label><select class="dash-input" id="vfOwner"' + (v ? ' disabled' : '') + '>' + customers.map(function (c) { return '<option value="' + c.id + '"' + (v && v.customerId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
				'<div class="dash-field"><label>Registration <span class="req">*</span></label><input class="dash-input" id="vfReg" value="' + (v ? esc(v.reg) : '') + '" placeholder="8KLM214"></div>' +
				'<div class="dash-field"><label>Make <span class="req">*</span></label><input class="dash-input" id="vfMake" value="' + (v ? esc(v.make) : '') + '" placeholder="Tesla"></div>' +
				'<div class="dash-field"><label>Model <span class="req">*</span></label><input class="dash-input" id="vfModel" value="' + (v ? esc(v.model) : '') + '" placeholder="Model 3"></div>' +
				'<div class="dash-field"><label>Type</label><select class="dash-input" id="vfType">' + ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Truck', 'Van', 'Convertible'].map(function (t) { return '<option' + (v && v.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
				'<div class="dash-field"><label>Colour</label><input class="dash-input" id="vfColor" value="' + (v ? esc(v.color || '') : '') + '" placeholder="Pearl White"></div>' +
				'<div class="dash-field"><label>Year</label><input class="dash-input" id="vfYear" type="number" min="1950" max="2030" value="' + (v ? esc(v.year || '') : '') + '"></div>' +
				'</div>',
			footer: '<button class="dbtn" data-close>Cancel</button><button class="dbtn dbtn--accent" id="vfSave">' + (v ? 'Save changes' : 'Add vehicle') + '</button>'
		});
		node.querySelector('#vfSave').addEventListener('click', function () {
			var data = { reg: node.querySelector('#vfReg').value.trim(), make: node.querySelector('#vfMake').value.trim(), model: node.querySelector('#vfModel').value.trim(), type: node.querySelector('#vfType').value, color: node.querySelector('#vfColor').value.trim(), year: node.querySelector('#vfYear').value };
			if (!data.reg || !data.make || !data.model) { UI.toast('error', 'Missing fields', 'Registration, make and model are required.'); return; }
			if (v) { DB.update('vehicles', v.id, data); UI.toast('success', 'Vehicle updated', data.reg + ' saved.'); }
			else { DB.insert('vehicles', Object.assign({ customerId: node.querySelector('#vfOwner').value }, data)); UI.toast('success', 'Vehicle added', data.reg + ' registered.'); }
			node._close(); refresh();
		});
	}

	/* ---------------- STAFF ---------------- */
	function renderStaff(root) {
		var staffList = DB.list('staff');
		var cards = staffList.map(function (s) {
			var jobs = DB.list('bookings').filter(function (b) { return b.staffId === s.id && b.status !== 'cancelled' && b.status !== 'completed'; });
			return '<div class="panel"><div class="cell-user" style="margin-bottom:.8rem">' + UI.avatar(s, 'avatar-md') + '<div><span class="cell-strong">' + esc(s.name) + '</span><span class="cell-sub">' + esc(s.role) + '</span></div></div>' +
				'<p class="cell-sub" style="margin-bottom:.2rem">' + esc(s.phone) + '</p>' +
				'<p class="cell-sub" style="margin-bottom:.8rem">' + jobs.length + ' active assignment(s)</p>' +
				'<div class="panel__tools">' + ['available', 'busy', 'off'].map(function (st) { return '<button class="chip' + (s.status === st ? ' is-active' : '') + '" data-staff-status="' + s.id + '" data-status="' + st + '">' + UI.STATUS_LABEL[st] + '</button>'; }).join('') + '</div></div>';
		}).join('');
		var active = DB.list('bookings').filter(function (b) { return (b.status === 'confirmed' || b.status === 'in-progress') && b.staffId; });
		var rows = DB.sortBookings(active, 'asc').map(function (b) {
			var c = cust(b.customerId), st = staff(b.staffId);
			return '<tr><td><span class="cell-strong">' + esc(b.id) + '</span><span class="cell-sub">' + DB.fmtDate(b.date) + ' ' + DB.fmtTime(b.time) + '</span></td>' +
				'<td>' + esc(c.name) + '<span class="cell-sub">' + esc(svcNames(b.serviceIds)) + '</span></td>' +
				'<td>' + (st ? esc(st.name) : '—') + '</td><td>' + UI.badge(b.status) + '</td>' +
				'<td><div class="t-actions">' + (b.status === 'confirmed' ? '<button class="dbtn dbtn--sm" data-act="start" data-id="' + b.id + '">Start</button>' : '') + (b.status === 'in-progress' ? '<button class="dbtn dbtn--sm dbtn--ok" data-act="complete" data-id="' + b.id + '">Complete</button>' : '') + '<button class="dbtn dbtn--sm" data-reassign="' + b.id + '">Reassign</button></div></td></tr>';
		}).join('');
		root.innerHTML = pageHead('Staff Management', 'Availability, assignments and job progress.') +
			'<div class="grid grid--3" style="margin-bottom:1rem">' + cards + '</div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Active assignments</h3><p>Confirmed and in-progress jobs</p></div></div>' +
			(rows ? '<div class="table-wrap"><table class="dtable"><thead><tr><th>Booking</th><th>Customer / Service</th><th>Staff</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : UI.empty({ icon: I.staff, title: 'No active assignments', text: 'Assign staff to confirmed bookings from the bookings tab.' })) + '</div>';
		wireCommon(root);
		wireBookingActions(root);
		$$('[data-staff-status]', root).forEach(function (b) { b.addEventListener('click', function () { DB.update('staff', b.getAttribute('data-staff-status'), { status: b.getAttribute('data-status') }); UI.toast('success', 'Availability updated'); renderStaff(root); }); });
		$$('[data-reassign]', root).forEach(function (b) { b.addEventListener('click', function () { openReassign(DB.find('bookings', b.getAttribute('data-reassign'))); }); });
	}
	function openReassign(b) {
		var node = UI.modal({
			title: 'Assign staff — ' + b.id, subtitle: svcNames(b.serviceIds),
			body: '<div class="dash-field"><label>Detailer</label><select class="dash-input" id="asSel"><option value="">Unassigned</option>' + DB.list('staff').map(function (s) { return '<option value="' + s.id + '"' + (b.staffId === s.id ? ' selected' : '') + '>' + esc(s.name) + ' — ' + esc(s.role) + ' (' + UI.STATUS_LABEL[s.status] + ')</option>'; }).join('') + '</select></div>',
			footer: '<button class="dbtn" data-close>Cancel</button><button class="dbtn dbtn--accent" id="asSave">Save</button>'
		});
		node.querySelector('#asSave').addEventListener('click', function () {
			var val = node.querySelector('#asSel').value;
			DB.update('bookings', b.id, { staffId: val || null });
			node._close(); UI.toast('success', 'Staff assigned', val ? staff(val).name + ' assigned to ' + b.id : b.id + ' unassigned.'); refresh();
		});
	}

	/* ---------------- SERVICES ---------------- */
	function renderServices(root) {
		var q = state.q.toLowerCase();
		var list = DB.list('services').filter(function (s) { return !q || (s.name + ' ' + s.category).toLowerCase().indexOf(q) !== -1; });
		var cards = list.map(function (s) {
			return '<article class="panel" style="padding:0;overflow:hidden">' +
				'<div style="height:128px;overflow:hidden;position:relative">' +
				'<img src="' + s.image + '" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'">' +
				'<span class="tag" style="position:absolute;top:.6rem;left:.6rem">' + esc(s.category) + '</span>' +
				'<span class="tag" style="position:absolute;top:.6rem;right:.6rem;background:' + (s.active ? 'rgba(47,191,122,.2)' : 'rgba(255,92,92,.2)') + ';border-color:transparent;color:' + (s.active ? 'var(--ok)' : 'var(--bad)') + '">' + (s.active ? 'Active' : 'Hidden') + '</span></div>' +
				'<div style="padding:1rem">' +
				'<h3 style="font-size:1rem;color:#fff">' + esc(s.name) + '</h3>' +
				'<p class="hint" style="margin:.35rem 0 .7rem;min-height:2.6em">' + esc(s.description || '') + '</p>' +
				'<p class="cell-strong" style="color:var(--accent)">' + money(s.price) + ' <span style="color:var(--muted);font-weight:400">· ' + esc(s.duration || '') + '</span></p>' +
				'<div class="panel__tools" style="margin-top:.8rem">' +
				'<button class="dbtn dbtn--sm" data-svc-edit="' + s.id + '">' + I.edit + ' Edit</button>' +
				'<button class="dbtn dbtn--sm" data-svc-toggle="' + s.id + '">' + (s.active ? 'Hide' : 'Show') + '</button>' +
				'<button class="dbtn dbtn--sm dbtn--danger" data-svc-del="' + s.id + '">' + I.trash + '</button>' +
				'</div></div></article>';
		}).join('');
		root.innerHTML = pageHead('Service Management', 'Create, edit and remove the detailing menu.', '<button class="dbtn dbtn--accent" data-svc-add>' + I.plus + ' Add service</button>') +
			(list.length ? '<div class="grid grid--3">' + cards + '</div>' : UI.empty({ icon: I.wrench, title: 'No services', text: 'Add your first detailing service.' }));
		wireCommon(root);
		$$('[data-svc-add]', root).forEach(function (b) { b.addEventListener('click', function () { openServiceForm(); }); });
		$$('[data-svc-edit]', root).forEach(function (b) { b.addEventListener('click', function () { openServiceForm(DB.service(b.getAttribute('data-svc-edit'))); }); });
		$$('[data-svc-toggle]', root).forEach(function (b) { b.addEventListener('click', function () { var s = DB.service(b.getAttribute('data-svc-toggle')); DB.update('services', s.id, { active: !s.active }); UI.toast('success', s.active ? 'Service hidden' : 'Service published', s.name); refresh(); }); });
		$$('[data-svc-del]', root).forEach(function (b) { b.addEventListener('click', function () {
			var s = DB.service(b.getAttribute('data-svc-del'));
			UI.confirm({ title: 'Delete service?', message: 'Permanently remove "' + s.name + '" from the menu.' }).then(function (ok) { if (!ok) return; DB.remove('services', s.id); UI.toast('warn', 'Service deleted', s.name); refresh(); });
		}); });
	}
	function openServiceForm(s) {
		s = s || {};
		var node = UI.modal({
			title: s.id ? 'Edit service' : 'Add service', subtitle: s.id ? s.name : 'Add to the detailing menu.',
			body: '<div class="form-grid">' +
				'<div class="dash-field"><label>Name <span class="req">*</span></label><input class="dash-input" id="sfName" value="' + esc(s.name || '') + '"></div>' +
				'<div class="dash-field"><label>Category</label><input class="dash-input" id="sfCat" value="' + esc(s.category || '') + '" placeholder="Protection"></div>' +
				'<div class="dash-field"><label>Price (USD) <span class="req">*</span></label><input class="dash-input" id="sfPrice" type="number" min="0" value="' + (s.price || '') + '"></div>' +
				'<div class="dash-field"><label>Duration</label><input class="dash-input" id="sfDur" value="' + esc(s.duration || '') + '" placeholder="2 hours"></div>' +
				'</div>' +
				'<div class="dash-field"><label>Description</label><textarea class="dash-input" id="sfDesc">' + esc(s.description || '') + '</textarea></div>' +
				'<div class="dash-field"><label>Image path</label><input class="dash-input" id="sfImg" value="' + esc(s.image || 'images/svc-wash.webp') + '"></div>' +
				'<label class="checkline"><input type="checkbox" id="sfActive"' + (s.active !== false ? ' checked' : '') + '> Visible to customers</label>',
			footer: '<button class="dbtn" data-close>Cancel</button><button class="dbtn dbtn--accent" id="sfSave">' + (s.id ? 'Save changes' : 'Add service') + '</button>'
		});
		node.querySelector('#sfSave').addEventListener('click', function () {
			var data = { name: node.querySelector('#sfName').value.trim(), category: node.querySelector('#sfCat').value.trim() || 'General', price: Number(node.querySelector('#sfPrice').value) || 0, duration: node.querySelector('#sfDur').value.trim(), description: node.querySelector('#sfDesc').value.trim(), image: node.querySelector('#sfImg').value.trim() || 'images/svc-wash.webp', active: node.querySelector('#sfActive').checked };
			if (!data.name || !data.price) { UI.toast('error', 'Missing fields', 'Name and price are required.'); return; }
			if (s.id) { DB.update('services', s.id, data); UI.toast('success', 'Service updated', data.name); }
			else { DB.insert('services', data); UI.toast('success', 'Service added', data.name); }
			node._close(); refresh();
		});
	}

	/* ---------------- PRICING & OFFERS ---------------- */
	function renderPricing(root) {
		var services = DB.list('services');
		var rows = services.map(function (s) {
			return '<tr><td><div class="cell-user"><img class="img-thumb" src="' + s.image + '" alt="" onerror="this.style.display=\'none\'"><div><span class="cell-strong">' + esc(s.name) + '</span><span class="cell-sub">' + esc(s.category) + '</span></div></div></td>' +
				'<td><input class="dash-input" style="width:120px" type="number" min="0" value="' + s.price + '" data-price="' + s.id + '"></td>' +
				'<td>' + esc(s.duration || '—') + '</td>' +
				'<td><button class="dbtn dbtn--sm" data-price-save="' + s.id + '">Save</button></td></tr>';
		}).join('');
		var offers = DB.list('offers').map(function (o) {
			return '<tr><td><span class="cell-strong">' + esc(o.code) + '</span><span class="cell-sub">' + esc(o.title) + '</span></td>' +
				'<td>' + (o.type === 'percent' ? o.discount + '% off' : money(o.discount) + ' off') + '</td>' +
				'<td>' + (o.expiry ? DB.fmtDate(o.expiry) : '—') + '</td>' +
				'<td>' + UI.badge(o.active ? 'published' : 'hidden') + '</td>' +
				'<td><div class="t-actions"><button class="dbtn dbtn--sm" data-offer-edit="' + o.id + '">' + I.edit + '</button><button class="dbtn dbtn--sm" data-offer-toggle="' + o.id + '">' + (o.active ? 'Disable' : 'Enable') + '</button><button class="dbtn dbtn--sm dbtn--danger" data-offer-del="' + o.id + '">' + I.trash + '</button></div></td></tr>';
		}).join('');
		root.innerHTML = pageHead('Pricing &amp; Offers', 'Adjust service prices and manage promotions.') +
			'<div class="panel" style="margin-bottom:1rem"><div class="panel__head"><div><h3>Service prices</h3><p>Update and save per service</p></div></div>' +
			'<div class="table-wrap"><table class="dtable"><thead><tr><th>Service</th><th>Price</th><th>Duration</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Offers &amp; discounts</h3><p>Promotions shown to customers</p></div><button class="dbtn dbtn--accent" data-offer-add>' + I.plus + ' New offer</button></div>' +
			(offers ? '<div class="table-wrap"><table class="dtable"><thead><tr><th>Offer</th><th>Value</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>' + offers + '</tbody></table></div>' : UI.empty({ icon: I.gift, title: 'No offers', text: 'Create a promotion to attract bookings.' })) + '</div>';
		wireCommon(root);
		$$('[data-price-save]', root).forEach(function (b) { b.addEventListener('click', function () {
			var id = b.getAttribute('data-price-save');
			var val = Number($('[data-price="' + id + '"]', root).value) || 0;
			DB.update('services', id, { price: val }); UI.toast('success', 'Price updated', DB.service(id).name + ' → ' + money(val));
		}); });
		$$('[data-offer-add]', root).forEach(function (b) { b.addEventListener('click', function () { openOfferForm(); }); });
		$$('[data-offer-edit]', root).forEach(function (b) { b.addEventListener('click', function () { openOfferForm(DB.find('offers', b.getAttribute('data-offer-edit'))); }); });
		$$('[data-offer-toggle]', root).forEach(function (o) { o.addEventListener('click', function () { var of = DB.find('offers', o.getAttribute('data-offer-toggle')); DB.update('offers', of.id, { active: !of.active }); UI.toast('success', of.active ? 'Offer disabled' : 'Offer enabled', of.code); refresh(); }); });
		$$('[data-offer-del]', root).forEach(function (b) { b.addEventListener('click', function () { var o = DB.find('offers', b.getAttribute('data-offer-del')); UI.confirm({ title: 'Delete offer?', message: 'Remove promotion ' + o.code + '.' }).then(function (ok) { if (!ok) return; DB.remove('offers', o.id); UI.toast('warn', 'Offer deleted', o.code); refresh(); }); }); });
	}
	function openOfferForm(o) {
		o = o || {};
		var node = UI.modal({
			title: o.id ? 'Edit offer' : 'New offer', subtitle: 'Promotion for the customer dashboard.',
			body: '<div class="form-grid">' +
				'<div class="dash-field"><label>Code <span class="req">*</span></label><input class="dash-input" id="ofCode" value="' + esc(o.code || '') + '" placeholder="WASH10"></div>' +
				'<div class="dash-field"><label>Title <span class="req">*</span></label><input class="dash-input" id="ofTitle" value="' + esc(o.title || '') + '" placeholder="10% off…"></div>' +
				'<div class="dash-field"><label>Type</label><select class="dash-input" id="ofType"><option value="percent"' + (o.type === 'percent' ? ' selected' : '') + '>Percentage (%)</option><option value="fixed"' + (o.type === 'fixed' ? ' selected' : '') + '>Fixed amount ($)</option></select></div>' +
				'<div class="dash-field"><label>Value <span class="req">*</span></label><input class="dash-input" id="ofValue" type="number" min="0" value="' + (o.discount || '') + '"></div>' +
				'<div class="dash-field"><label>Expires</label><input class="dash-input" id="ofExpiry" type="date" value="' + (o.expiry || DB.addDays(30)) + '"></div>' +
				'</div>' +
				'<div class="dash-field"><label>Description</label><input class="dash-input" id="ofDesc" value="' + esc(o.description || '') + '"></div>' +
				'<label class="checkline"><input type="checkbox" id="ofActive"' + (o.active !== false ? ' checked' : '') + '> Active</label>',
			footer: '<button class="dbtn" data-close>Cancel</button><button class="dbtn dbtn--accent" id="ofSave">' + (o.id ? 'Save changes' : 'Create offer') + '</button>'
		});
		node.querySelector('#ofSave').addEventListener('click', function () {
			var data = { code: node.querySelector('#ofCode').value.trim().toUpperCase(), title: node.querySelector('#ofTitle').value.trim(), type: node.querySelector('#ofType').value, discount: Number(node.querySelector('#ofValue').value) || 0, expiry: node.querySelector('#ofExpiry').value, description: node.querySelector('#ofDesc').value.trim(), active: node.querySelector('#ofActive').checked };
			if (!data.code || !data.title || !data.discount) { UI.toast('error', 'Missing fields', 'Code, title and value are required.'); return; }
			if (o.id) { DB.update('offers', o.id, data); UI.toast('success', 'Offer updated', data.code); }
			else { DB.insert('offers', data); UI.toast('success', 'Offer created', data.code); }
			node._close(); refresh();
		});
	}

	/* ---------------- PAYMENTS ---------------- */
	function renderPayments(root) {
		var q = state.q.toLowerCase();
		var all = DB.list('bookings').filter(function (b) { return b.status !== 'cancelled' || b.paymentStatus === 'refunded'; });
		var collected = all.filter(function (b) { return b.paymentStatus === 'paid'; }).reduce(function (t, b) { return t + priceOf(b); }, 0);
		var outstanding = all.filter(function (b) { return b.paymentStatus === 'unpaid'; }).reduce(function (t, b) { return t + priceOf(b); }, 0);
		var refunded = all.filter(function (b) { return b.paymentStatus === 'refunded'; }).reduce(function (t, b) { return t + priceOf(b); }, 0);
		var list = all.filter(function (b) {
			if (state.payStatus !== 'all' && b.paymentStatus !== state.payStatus) return false;
			if (q) { var c = cust(b.customerId); return (b.id + ' ' + c.name + ' ' + svcNames(b.serviceIds)).toLowerCase().indexOf(q) !== -1; }
			return true;
		});
		var rows = DB.sortBookings(list, 'desc').map(function (b) {
			var c = cust(b.customerId);
			var inv = 'INV-' + b.id.replace('BK-', '');
			return '<tr><td><span class="cell-strong">' + inv + '</span><span class="cell-sub">' + esc(b.id) + '</span></td>' +
				'<td>' + esc(c.name) + '</td><td>' + esc(svcNames(b.serviceIds)) + '</td>' +
				'<td>' + DB.fmtDate(b.date) + '</td>' +
				'<td class="cell-strong">' + money(priceOf(b)) + '</td><td>' + UI.badge(b.paymentStatus) + '</td>' +
				'<td><div class="t-actions">' + (b.paymentStatus === 'unpaid' ? '<button class="dbtn dbtn--sm dbtn--ok" data-act="pay" data-id="' + b.id + '">Mark paid</button>' : '') + (b.paymentStatus === 'paid' ? '<button class="dbtn dbtn--sm dbtn--danger" data-refund="' + b.id + '">Refund</button>' : '') + '<button class="dbtn dbtn--sm" data-receipt="' + b.id + '">' + I.receipt + '</button></div></td></tr>';
		}).join('');
		root.innerHTML = pageHead('Payment Management', 'Transactions, status and revenue.') +
			'<div class="grid grid--stats" style="margin-bottom:1rem">' +
			statCard('Collected', money(collected), I.card, { dir: 'up', text: 'Paid invoices' }, true) +
			statCard('Outstanding', money(outstanding), I.clock, { dir: outstanding ? 'down' : 'up', text: 'Awaiting payment' }) +
			statCard('Refunded', money(refunded), I.refresh, { dir: 'flat', text: 'Returned to customers' }) +
			'</div>' +
			'<div class="panel"><div class="panel__head"><div class="panel__tools">' + ['all', 'paid', 'unpaid', 'refunded'].map(function (p) { return '<button class="chip' + (state.payStatus === p ? ' is-active' : '') + '" data-payfilter="' + p + '">' + (p === 'all' ? 'All' : UI.STATUS_LABEL[p]) + '</button>'; }).join('') + '</div></div>' +
			(rows ? '<div class="table-wrap"><table class="dtable"><thead><tr><th>Invoice</th><th>Customer</th><th>Service</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : UI.empty({ icon: I.card, title: 'No transactions', text: 'Payments appear as bookings are created.' })) + '</div>';
		wireCommon(root);
		wireBookingActions(root);
		$$('[data-payfilter]', root).forEach(function (b) { b.addEventListener('click', function () { state.payStatus = b.getAttribute('data-payfilter'); renderPayments(root); }); });
		$$('[data-refund]', root).forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-refund'); UI.confirm({ title: 'Refund payment?', message: 'Mark invoice for ' + id + ' as refunded.', confirmText: 'Refund' }).then(function (ok) { if (!ok) return; DB.update('bookings', id, { paymentStatus: 'refunded' }); UI.toast('warn', 'Payment refunded', id); refresh(); }); }); });
		$$('[data-receipt]', root).forEach(function (b) { b.addEventListener('click', function () { openReceipt(DB.find('bookings', b.getAttribute('data-receipt'))); }); });
	}
	function openReceipt(b) {
		var c = cust(b.customerId), v = veh(b.vehicleId);
		var lines = DB.services(b.serviceIds).map(function (s) { return '<div class="list-row"><span>' + esc(s.name) + '</span><span class="list-row__val">' + money(s.price) + '</span></div>'; }).join('');
		UI.modal({
			title: 'Receipt — INV-' + b.id.replace('BK-', ''), subtitle: 'STACKLY Auto Spa · ' + DB.settings().address,
			body: '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1rem"><div><span class="cell-sub">Billed to</span><span class="cell-strong">' + esc(c.name) + '</span><span class="cell-sub">' + esc(c.email) + '</span></div><div style="text-align:right"><span class="cell-sub">Date</span><span class="cell-strong">' + DB.fmtDate(b.date) + '</span><span class="cell-sub">' + esc(v.make + ' ' + v.model + ' · ' + v.reg) + '</span></div></div>' +
				'<div class="divider"></div>' + lines +
				'<div class="divider"></div><div style="display:flex;justify-content:space-between"><span class="cell-strong">Total</span><span class="cell-strong" style="color:var(--accent)">' + money(priceOf(b)) + '</span></div>' +
				'<p style="margin-top:.8rem">' + UI.badge(b.paymentStatus) + ' ' + UI.badge(b.status) + '</p>',
			footer: '<button class="dbtn" data-close>Close</button><button class="dbtn dbtn--accent" onclick="window.print()">Print</button>'
		});
	}

	/* ---------------- REVIEWS ---------------- */
	function renderReviews(root) {
		var q = state.q.toLowerCase();
		var all = DB.list('reviews');
		var avg = all.length ? (all.reduce(function (t, r) { return t + r.rating; }, 0) / all.length).toFixed(1) : '0.0';
		var list = all.filter(function (r) {
			if (state.reviewStatus !== 'all' && r.status !== state.reviewStatus) return false;
			var c = cust(r.customerId); return !q || (c.name + ' ' + r.text).toLowerCase().indexOf(q) !== -1;
		});
		var cards = list.map(function (r) {
			var c = cust(r.customerId);
			return '<div class="panel" style="margin-bottom:1rem"><div class="panel__head" style="margin-bottom:.6rem"><div class="cell-user">' + UI.avatar(c, 'avatar-md') + '<div><span class="cell-strong">' + esc(c.name) + '</span><span class="cell-sub">' + (r.createdAt ? DB.fmtDate(r.createdAt) : '') + '</span></div></div>' + UI.badge(r.status) + '</div>' +
				UI.stars(r.rating) + '<p style="margin:.7rem 0;color:#c9ccd4">' + esc(r.text) + '</p>' +
				'<div class="panel__tools">' + (r.status !== 'published' ? '<button class="dbtn dbtn--sm dbtn--ok" data-rev-pub="' + r.id + '">Publish</button>' : '') + (r.status !== 'hidden' ? '<button class="dbtn dbtn--sm" data-rev-hide="' + r.id + '">Hide</button>' : '') + '<button class="dbtn dbtn--sm dbtn--danger" data-rev-del="' + r.id + '">' + I.trash + '</button></div></div>';
		}).join('');
		root.innerHTML = pageHead('Reviews &amp; Feedback', 'Moderate and publish customer reviews.') +
			'<div class="grid grid--stats" style="margin-bottom:1rem">' +
			statCard('Average rating', avg + ' / 5', I.star, { dir: 'flat', text: all.length + ' reviews' }, true) +
			statCard('Published', all.filter(function (r) { return r.status === 'published'; }).length, I.check, { dir: 'up', text: 'Live on site' }) +
			statCard('Pending', all.filter(function (r) { return r.status === 'pending'; }).length, I.clock, { dir: 'down', text: 'Need moderation' }) +
			'</div>' +
			'<div class="panel__tools" style="margin-bottom:1rem">' + ['all', 'pending', 'published', 'hidden'].map(function (s) { return '<button class="chip' + (state.reviewStatus === s ? ' is-active' : '') + '" data-revfilter="' + s + '">' + (s === 'all' ? 'All' : UI.STATUS_LABEL[s]) + '</button>'; }).join('') + '</div>' +
			(cards || UI.empty({ icon: I.star, title: 'No reviews', text: 'Reviews appear after completed services.' }));
		wireCommon(root);
		$$('[data-revfilter]', root).forEach(function (b) { b.addEventListener('click', function () { state.reviewStatus = b.getAttribute('data-revfilter'); renderReviews(root); }); });
		$$('[data-rev-pub]', root).forEach(function (b) { b.addEventListener('click', function () { DB.update('reviews', b.getAttribute('data-rev-pub'), { status: 'published' }); UI.toast('success', 'Review published'); refresh(); }); });
		$$('[data-rev-hide]', root).forEach(function (b) { b.addEventListener('click', function () { DB.update('reviews', b.getAttribute('data-rev-hide'), { status: 'hidden' }); UI.toast('warn', 'Review hidden'); refresh(); }); });
		$$('[data-rev-del]', root).forEach(function (b) { b.addEventListener('click', function () { UI.confirm({ title: 'Delete review?', message: 'This cannot be undone.' }).then(function (ok) { if (!ok) return; DB.remove('reviews', b.getAttribute('data-rev-del')); UI.toast('warn', 'Review deleted'); refresh(); }); }); });
	}

	/* ---------------- REPORTS ---------------- */
	function dailySeries(days) {
		var out = [];
		for (var i = days - 1; i >= 0; i--) {
			var d = DB.addDays(-i);
			var label = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			var count = 0, rev = 0;
			DB.list('bookings').forEach(function (b) { if (b.date === d && b.status !== 'cancelled') { count++; rev += priceOf(b); } });
			out.push({ label: label, value: count, rev: rev });
		}
		return out;
	}
	function renderReports(root) {
		var days = state.reportDays;
		var series = dailySeries(days);
		var revSeries = series.map(function (d) { return { label: d.label, value: d.rev }; });
		var pop = DB.popularServices();
		var topByBookings = pop.slice(0, 6);
		var topCustomers = DB.usersByRole('customer').map(function (c) {
			var spent = DB.customerBookings(c.id).filter(function (b) { return b.paymentStatus === 'paid'; }).reduce(function (t, b) { return t + priceOf(b); }, 0);
			return { name: c.name, spend: spent, count: DB.customerBookings(c.id).length };
		}).sort(function (a, b) { return b.spend - a.spend; }).slice(0, 5);
		var s = DB.stats();
		root.innerHTML = pageHead('Reports &amp; Analytics', 'Booking trends, revenue and popular services.',
			'<button class="dbtn" data-days="7">7 days</button><button class="dbtn" data-days="14">14 days</button><button class="dbtn" data-days="30">30 days</button>') +
			'<div class="grid grid--stats" style="margin-bottom:1rem">' +
			statCard('Bookings (all time)', s.bookings, I.calendar, { dir: 'up', text: s.completed + ' completed' }) +
			statCard('Revenue collected', money(s.revenue), I.card, { dir: 'up', text: 'Lifetime' }, true) +
			statCard('Completion rate', (s.bookings ? Math.round(s.completed / s.bookings * 100) : 0) + '%', I.check, { dir: 'up', text: s.cancelled + ' cancelled' }) +
			statCard('Customers', s.customers, I.users, { dir: 'up', text: 'Registered' }) +
			'</div>' +
			'<div class="grid grid--2" style="margin-bottom:1rem">' +
			'<div class="panel"><div class="panel__head"><div><h3>Booking trend</h3><p>Last ' + days + ' days</p></div></div>' + UI.lineChart(series) + '</div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Revenue</h3><p>Last ' + days + ' days</p></div></div>' + UI.barChart(revSeries, { money: true }) + '</div>' +
			'</div>' +
			'<div class="grid grid--2">' +
			'<div class="panel"><div class="panel__head"><div><h3>Popular services</h3><p>By number of bookings</p></div></div>' + (topByBookings.some(function (p) { return p.value; }) ? UI.barChart(topByBookings.map(function (p) { return { label: p.name.split(' ')[0], value: p.value }; })) : UI.empty({ title: 'No data yet' })) + '</div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Top customers</h3><p>By lifetime spend</p></div></div>' +
			(topCustomers.length ? '<div class="list-rows">' + topCustomers.map(function (c, i) { return '<div class="list-row"><div class="list-row__icon">' + (i + 1) + '</div><div class="list-row__body"><strong>' + esc(c.name) + '</strong><span>' + c.count + ' booking(s)</span></div><span class="list-row__val">' + money(c.spend) + '</span></div>'; }).join('') + '</div>' : UI.empty({ title: 'No customers yet' })) + '</div>' +
			'</div>';
		wireCommon(root);
		$$('[data-days]', root).forEach(function (b) { b.addEventListener('click', function () { state.reportDays = Number(b.getAttribute('data-days')); renderReports(root); }); });
	}

	/* ---------------- SETTINGS ---------------- */
	function renderSettings(root) {
		var s = DB.settings();
		var hours = (s.hours || []).map(function (h, i) {
			return '<tr><td>' + esc(h.day) + '</td><td><input class="dash-input" type="time" value="' + (h.open || '') + '" data-hopen="' + i + '"></td><td><input class="dash-input" type="time" value="' + (h.close || '') + '" data-hclose="' + i + '"></td></tr>';
		}).join('');
		root.innerHTML = pageHead('Settings', 'Shop information, opening hours and profile.') +
			'<div class="grid grid--2">' +
			'<div class="panel"><div class="panel__head"><div><h3>Shop information</h3><p>Shown across receipts and the site</p></div></div>' +
			'<div class="dash-field"><label>Shop name</label><input class="dash-input" id="setName" value="' + esc(s.shopName) + '"></div>' +
			'<div class="dash-field"><label>Email</label><input class="dash-input" id="setEmail" type="email" value="' + esc(s.email) + '"></div>' +
			'<div class="dash-field"><label>Phone</label><input class="dash-input" id="setPhone" value="' + esc(s.phone) + '"></div>' +
			'<div class="dash-field"><label>Address</label><input class="dash-input" id="setAddress" value="' + esc(s.address) + '"></div>' +
			'<button class="dbtn dbtn--accent" id="saveShop">Save shop info</button></div>' +
			'<div class="panel"><div class="panel__head"><div><h3>Booking preferences</h3><p>Hours and slot length</p></div></div>' +
			'<div class="dash-field"><label>Slot length</label><select class="dash-input" id="setSlot"><option value="30"' + (s.slotMinutes === 30 ? ' selected' : '') + '>30 minutes</option><option value="60"' + (s.slotMinutes === 60 ? ' selected' : '') + '>60 minutes</option><option value="90"' + (s.slotMinutes === 90 ? ' selected' : '') + '>90 minutes</option></select></div>' +
			'<label class="checkline" style="margin:.4rem 0 1rem"><input type="checkbox" id="setPickup"' + (s.pickup ? ' checked' : '') + '> Offer pickup &amp; delivery</label>' +
			'<h4 style="color:#fff;font-size:.9rem;margin-bottom:.5rem">Opening hours</h4>' +
			'<div class="table-wrap"><table class="dtable" style="min-width:0"><thead><tr><th>Day</th><th>Open</th><th>Close</th></tr></thead><tbody>' + hours + '</tbody></table></div>' +
			'<button class="dbtn dbtn--accent" id="saveHours" style="margin-top:1rem">Save hours</button></div>' +
			'</div>' +
			'<div class="panel" style="margin-top:1rem"><div class="panel__head"><div><h3>Profile</h3><p>Your admin account</p></div></div>' +
			'<div class="form-grid"><div class="dash-field"><label>Name</label><input class="dash-input" id="profName" value="' + esc(user.name) + '"></div>' +
			'<div class="dash-field"><label>Email</label><input class="dash-input" id="profEmail" value="' + esc(user.email) + '"></div>' +
			'<div class="dash-field"><label>Phone</label><input class="dash-input" id="profPhone" value="' + esc(user.phone || '') + '"></div>' +
			'<div class="dash-field"><label>New password</label><input class="dash-input" id="profPass" type="password" placeholder="Leave blank to keep"></div></div>' +
			'<button class="dbtn dbtn--accent" id="saveProfile">Update profile</button>' +
			'<div class="divider"></div><p class="hint">Demo data lives in your browser (localStorage). Resetting restores the original demo studio.</p>' +
			'<button class="dbtn dbtn--danger" id="resetData" style="margin-top:.6rem">' + I.refresh + ' Reset demo data</button></div>';
		wireCommon(root);
		root.querySelector('#saveShop').addEventListener('click', function () {
			DB.saveSettings({ shopName: root.querySelector('#setName').value, email: root.querySelector('#setEmail').value, phone: root.querySelector('#setPhone').value, address: root.querySelector('#setAddress').value });
			UI.toast('success', 'Settings saved', 'Shop information updated.');
		});
		root.querySelector('#saveHours').addEventListener('click', function () {
			var hrs = DB.settings().hours.slice();
			$$('[data-hopen]', root).forEach(function (i) { hrs[+i.getAttribute('data-hopen')].open = i.value; });
			$$('[data-hclose]', root).forEach(function (i) { hrs[+i.getAttribute('data-hclose')].close = i.value; });
			DB.saveSettings({ hours: hrs, slotMinutes: Number(root.querySelector('#setSlot').value), pickup: root.querySelector('#setPickup').checked });
			UI.toast('success', 'Hours saved', 'Booking preferences updated.');
		});
		root.querySelector('#saveProfile').addEventListener('click', function () {
			var patch = { name: root.querySelector('#profName').value.trim(), email: root.querySelector('#profEmail').value.trim(), phone: root.querySelector('#profPhone').value.trim() };
			var pass = root.querySelector('#profPass').value; if (pass) patch.password = pass;
			if (!patch.name || !patch.email) { UI.toast('error', 'Missing fields', 'Name and email are required.'); return; }
			DB.updateProfile(user.id, patch); user = DB.currentUser(); Auth.mountChrome(user);
			UI.toast('success', 'Profile updated', 'Your details have been saved.');
		});
		root.querySelector('#resetData').addEventListener('click', function () {
			UI.confirm({ title: 'Reset all demo data?', message: 'All bookings, edits and accounts will return to the original demo set.', confirmText: 'Reset everything' }).then(function (ok) {
				if (!ok) return; DB.reset(); UI.toast('warn', 'Demo data reset', 'Reloading…'); setTimeout(function () { location.hash = '#overview'; location.reload(); }, 700);
			});
		});
	}

	/* ---------------- notifier ---------------- */
	function updateBadges() {
		var pending = DB.list('bookings').filter(function (b) { return b.status === 'pending'; }).length;
		var reviews = DB.list('reviews').filter(function (r) { return r.status === 'pending'; }).length;
		var np = document.getElementById('navPending'), nr = document.getElementById('navReviews');
		if (np) { np.textContent = pending; np.hidden = !pending; }
		if (nr) { nr.textContent = reviews; nr.hidden = !reviews; }
		var dot = document.getElementById('notifDot'); if (dot) dot.hidden = !(pending + reviews);
	}
	var notifBtn = document.getElementById('notifBtn');
	if (notifBtn) notifBtn.addEventListener('click', function () {
		var pending = DB.list('bookings').filter(function (b) { return b.status === 'pending'; });
		var reviews = DB.list('reviews').filter(function (r) { return r.status === 'pending'; });
		if (!pending.length && !reviews.length) { UI.toast('success', 'All caught up', 'No pending bookings or reviews.'); return; }
		var body = '';
		if (pending.length) body += '<h4 style="color:#fff;margin-bottom:.5rem">Pending bookings</h4>' + '<div class="list-rows">' + pending.map(function (b) { var c = cust(b.customerId); return '<div class="list-row"><div class="list-row__icon">' + I.calendar + '</div><div class="list-row__body"><strong>' + esc(c.name) + '</strong><span>' + DB.fmtDate(b.date) + ' · ' + DB.fmtTime(b.time) + '</span></div>' + UI.badge(b.status) + '</div>'; }).join('') + '</div>';
		if (reviews.length) body += '<h4 style="color:#fff;margin:1rem 0 .5rem">Reviews to moderate</h4>' + '<div class="list-rows">' + reviews.map(function (r) { return '<div class="list-row"><div class="list-row__icon">' + I.star + '</div><div class="list-row__body"><strong>' + esc(cust(r.customerId).name) + '</strong><span>' + UI.stars(r.rating) + '</span></div></div>'; }).join('') + '</div>';
		UI.modal({ title: 'Notifications', subtitle: pending.length + ' booking(s) · ' + reviews.length + ' review(s)', body: body, footer: '<button class="dbtn" data-close>Close</button><button class="dbtn dbtn--accent" data-goto="#bookings" data-close>Go to bookings</button>' });
	});

	/* ---------------- common wiring ---------------- */
	function wireCommon(root) {
		$$('[data-new-booking]', root).forEach(function (b) { b.addEventListener('click', openNewBooking); });
		$$('[data-goto]', root).forEach(function (b) { b.addEventListener('click', function () { location.hash = b.getAttribute('data-goto'); }); });
	}

	/* ---------------- router ---------------- */
	var RENDER = { overview: renderOverview, bookings: renderBookings, customers: renderCustomers, vehicles: renderVehicles, staff: renderStaff, services: renderServices, pricing: renderPricing, payments: renderPayments, reviews: renderReviews, reports: renderReports, settings: renderSettings };
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

	// bootsrap
	if (!location.hash) location.hash = '#overview';
	navigate();
})();
