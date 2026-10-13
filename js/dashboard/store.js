/* =========================================================
   STACKLY AUTO SPA — Dashboard data layer
   localStorage-backed "database" + auth + availability.
   Exposes window.DB (plain script, works over file://)
   ========================================================= */
window.DB = (function () {
	'use strict';

	var NS = 'stackly_';
	var SCHEMA = 3; // bump to reseed demo data
	var K = {
		users: NS + 'users',
		services: NS + 'services',
		vehicles: NS + 'vehicles',
		staff: NS + 'staff',
		bookings: NS + 'bookings',
		reviews: NS + 'reviews',
		offers: NS + 'offers',
		settings: NS + 'settings',
		session: NS + 'session',
		meta: NS + 'meta'
	};

	/* ---------------- low level ---------------- */
	function read(key, fb) {
		try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; }
		catch (e) { return fb; }
	}
	function write(key, val) {
		try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
	}
	function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
	function seq(key) {
		var m = read(K.meta, {});
		m[key] = (m[key] || 1000) + 1;
		write(K.meta, m);
		return m[key];
	}

	/* ---------------- date helpers ---------------- */
	function pad(n) { return n < 10 ? '0' + n : '' + n; }
	function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
	function today() { return toISO(new Date()); }
	function addDays(offset) { var d = new Date(); d.setDate(d.getDate() + offset); return toISO(d); }
	function fmtDate(iso) {
		if (!iso) return '—';
		var d = new Date(iso + 'T00:00:00');
		if (isNaN(d)) return iso;
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
	}
	function fmtShort(iso) {
		if (!iso) return '—';
		var d = new Date(iso + 'T00:00:00');
		if (isNaN(d)) return iso;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
	function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString('en-US'); }
	function fmtTime(t) { // "14:30" -> "2:30 PM"
		if (!t) return '—';
		var p = t.split(':'), h = +p[0], m = p[1] || '00', ap = h >= 12 ? 'PM' : 'AM';
		h = h % 12; if (h === 0) h = 12;
		return h + ':' + m + ' ' + ap;
	}

	/* ---------------- seed ---------------- */
	function seed() {
		var users = [
			{ id: 'U_ADMIN', role: 'admin', name: 'Marcus Reed', email: 'admin@stacklyautospa.com', phone: '+1 408 555 0142', password: 'admin123', avatar: 'images/avatar-1.webp', title: 'Studio Manager', createdAt: addDays(-320) },
			{ id: 'U_C1', role: 'customer', name: 'Priya Nair', email: 'priya@example.com', phone: '+1 415 555 0117', password: 'demo123', avatar: 'images/avatar-2.webp', createdAt: addDays(-120) },
			{ id: 'U_C2', role: 'customer', name: 'Daniel Okoye', email: 'daniel@example.com', phone: '+1 408 555 0193', password: 'demo123', avatar: 'images/avatar-3.webp', createdAt: addDays(-86) },
			{ id: 'U_C3', role: 'customer', name: 'Aisha Rahman', email: 'aisha@example.com', phone: '+1 650 555 0164', password: 'demo123', avatar: 'images/avatar-1.webp', createdAt: addDays(-54) },
			{ id: 'U_C4', role: 'customer', name: 'Tom Becker', email: 'tom@example.com', phone: '+1 510 555 0178', password: 'demo123', avatar: 'images/avatar-2.webp', createdAt: addDays(-21) }
		];

		var services = [
			{ id: 'S_WASH', name: 'Exterior Hand Wash', category: 'Washing', price: 89, duration: '2 hours', description: 'pH-neutral foam bath, two-bucket contact wash, wheels and barrels, touchless air dry.', image: 'images/svc-wash.webp', active: true },
			{ id: 'S_CORR', name: 'Paint Correction', category: 'Exterior', price: 349, duration: '1–3 days', description: 'Single to three-stage machine polishing under 6000K inspection lighting.', image: 'images/svc-correction.webp', active: true },
			{ id: 'S_CERAMIC', name: 'Ceramic Coating', category: 'Protection', price: 699, duration: '2–4 days', description: 'Graphene-infused 9H hydrophobic coating, applied in a filtered bay.', image: 'images/svc-ceramic.webp', active: true },
			{ id: 'S_INTERIOR', name: 'Interior Detailing', category: 'Interior', price: 149, duration: '1 day', description: 'Hot-water extraction, steam sanitising, leather rehydration and ozone odour removal.', image: 'images/svc-interior.webp', active: true },
			{ id: 'S_PPF', name: 'Paint Protection Film', category: 'Protection', price: 899, duration: '2–5 days', description: 'Self-healing urethane film, computer-cut, wrapped edges over high-impact zones.', image: 'images/svc-ppf.webp', active: true },
			{ id: 'S_ENGINE', name: 'Engine Bay Detail', category: 'Exterior', price: 119, duration: '3 hours', description: 'Degrease, dress and protect — a factory-fresh bay, safely.', image: 'images/svc-engine.webp', active: true },
			{ id: 'S_HEADLIGHT', name: 'Headlight Restoration', category: 'Exterior', price: 79, duration: '2 hours', description: 'Wet-sand and polish clouded lenses, then seal against UV.', image: 'images/svc-headlight.webp', active: true },
			{ id: 'S_FULL', name: 'Signature Full Detail', category: 'Package', price: 499, duration: '2 days', description: 'Exterior decontamination, interior deep clean, engine bay and sealed finish.', image: 'images/svc-wash.webp', active: true }
		];

		var staff = [
			{ id: 'ST_1', name: 'Jordan Ellis', role: 'Senior Detailer', phone: '+1 408 555 0210', status: 'available', avatar: 'images/team-1.webp' },
			{ id: 'ST_2', name: 'Mei Tanaka', role: 'Coating Specialist', phone: '+1 408 555 0211', status: 'busy', avatar: 'images/team-2.webp' },
			{ id: 'ST_3', name: 'Carlos Mendes', role: 'PPF Installer', phone: '+1 408 555 0212', status: 'available', avatar: 'images/team-3.webp' },
			{ id: 'ST_4', name: 'Sam Whitfield', role: 'Interior Specialist', phone: '+1 408 555 0213', status: 'off', avatar: 'images/team-4.webp' }
		];

		var vehicles = [
			{ id: 'V_1', customerId: 'U_C1', make: 'Tesla', model: 'Model 3 Long Range', reg: '8KLM214', type: 'Sedan', color: 'Pearl White', year: 2023 },
			{ id: 'V_2', customerId: 'U_C1', make: 'Porsche', model: 'Macan S', reg: '7RXP889', type: 'SUV', color: 'Jet Black', year: 2021 },
			{ id: 'V_3', customerId: 'U_C2', make: 'BMW', model: 'M4 Competition', reg: '5BMR402', type: 'Coupe', color: 'Isle of Man Green', year: 2022 },
			{ id: 'V_4', customerId: 'U_C3', make: 'Mercedes-Benz', model: 'GLE 450', reg: '9AMG771', type: 'SUV', color: 'Obsidian Black', year: 2020 },
			{ id: 'V_5', customerId: 'U_C4', make: 'Audi', model: 'A4 Quattro', reg: '4AUD118', type: 'Sedan', color: 'Daytona Grey', year: 2019 },
			{ id: 'V_6', customerId: 'U_C4', make: 'Ford', model: 'F-150 Lariat', reg: '6TRK540', type: 'Truck', color: 'Antimatter Blue', year: 2022 }
		];

		var bookings = [
			{ id: 'BK-1001', customerId: 'U_C1', vehicleId: 'V_1', serviceIds: ['S_CERAMIC'], date: addDays(2), time: '09:00', mode: 'dropoff', status: 'confirmed', staffId: 'ST_2', price: 699, paymentStatus: 'paid', notes: 'Please pay attention to the front bumper.', createdAt: addDays(-6) },
			{ id: 'BK-1002', customerId: 'U_C2', vehicleId: 'V_3', serviceIds: ['S_CORR', 'S_CERAMIC'], date: 'TODAY0', time: '11:00', mode: 'dropoff', status: 'in-progress', staffId: 'ST_1', price: 1048, paymentStatus: 'unpaid', notes: '', createdAt: addDays(-9) },
			{ id: 'BK-1003', customerId: 'U_C3', vehicleId: 'V_4', serviceIds: ['S_INTERIOR'], date: addDays(0), time: '14:00', mode: 'pickup', status: 'pending', staffId: 'ST_4', price: 149, paymentStatus: 'unpaid', notes: 'Dog hair in the rear seats.', createdAt: addDays(-1) },
			{ id: 'BK-1004', customerId: 'U_C4', vehicleId: 'V_6', serviceIds: ['S_WASH', 'S_ENGINE'], date: addDays(-8), time: '10:00', mode: 'dropoff', status: 'completed', staffId: 'ST_1', price: 208, paymentStatus: 'paid', notes: '', createdAt: addDays(-14) },
			{ id: 'BK-1005', customerId: 'U_C1', vehicleId: 'V_2', serviceIds: ['S_PPF'], date: addDays(-3), time: '08:00', mode: 'dropoff', status: 'completed', staffId: 'ST_3', price: 899, paymentStatus: 'paid', notes: 'Full front end.', createdAt: addDays(-19) },
			{ id: 'BK-1006', customerId: 'U_C3', vehicleId: 'V_4', serviceIds: ['S_HEADLIGHT'], date: addDays(-15), time: '15:00', mode: 'dropoff', status: 'cancelled', staffId: 'ST_1', price: 79, paymentStatus: 'refunded', notes: 'Customer rescheduling.', createdAt: addDays(-20) },
			{ id: 'BK-1007', customerId: 'U_C2', vehicleId: 'V_3', serviceIds: ['S_WASH'], date: addDays(1), time: '13:00', mode: 'dropoff', status: 'pending', staffId: null, price: 89, paymentStatus: 'unpaid', notes: '', createdAt: addDays(0) },
			{ id: 'BK-1008', customerId: 'U_C4', vehicleId: 'V_5', serviceIds: ['S_FULL'], date: addDays(4), time: '09:00', mode: 'pickup', status: 'confirmed', staffId: 'ST_1', price: 499, paymentStatus: 'paid', notes: 'Collect from office on Friday.', createdAt: addDays(-2) }
		];
		// resolve TODAY0 sentinel
		bookings.forEach(function (b) { if (b.date === 'TODAY0') b.date = today(); });

		var reviews = [
			{ id: 'RV_1', bookingId: 'BK_1005', customerId: 'U_C1', rating: 5, text: 'Depth of gloss I did not know paint could have. Six months on, water still beads instantly.', status: 'published', createdAt: addDays(-2) },
			{ id: 'RV_2', bookingId: 'BK_1004', customerId: 'U_C4', rating: 5, text: 'Engine bay looks factory-fresh and the wash left zero water spots.', status: 'published', createdAt: addDays(-6) },
			{ id: 'RV_3', bookingId: 'BK_1006', customerId: 'U_C3', rating: 3, text: 'Booking was easy but I had to reschedule due to work.', status: 'pending', createdAt: addDays(-1) }
		];

		var offers = [
			{ id: 'OF_1', code: 'WASH10', title: '10% off Exterior Hand Wash', discount: 10, type: 'percent', description: 'Valid on weekday bookings.', active: true, expiry: addDays(45) },
			{ id: 'OF_2', code: 'COAT15', title: '15% off Ceramic Coating', discount: 15, type: 'percent', description: 'Includes free maintenance wash at 30 days.', active: true, expiry: addDays(20) },
			{ id: 'OF_3', code: 'FIRST25', title: '$25 off your first detail', discount: 25, type: 'fixed', description: 'New customers only.', active: true, expiry: addDays(90) },
			{ id: 'OF_4', code: 'PPF50', title: '$50 off Paint Protection Film', discount: 50, type: 'fixed', description: 'Full front-end coverage only.', active: false, expiry: addDays(-3) }
		];

		var settings = {
			shopName: 'STACKLY Auto Spa',
			email: 'studio@stacklyautospa.com',
			phone: '+1 408 555 0142',
			address: '1420 Meridian Ave, San Jose, CA 95126',
			openTime: '08:00',
			closeTime: '18:00',
			slotMinutes: 60,
			pickup: true,
			hours: [
				{ day: 'Monday', open: '08:00', close: '18:00' },
				{ day: 'Tuesday', open: '08:00', close: '18:00' },
				{ day: 'Wednesday', open: '08:00', close: '18:00' },
				{ day: 'Thursday', open: '08:00', close: '18:00' },
				{ day: 'Friday', open: '08:00', close: '18:00' },
				{ day: 'Saturday', open: '09:00', close: '16:00' },
				{ day: 'Sunday', open: '', close: '' }
			]
		};

		write(K.users, users);
		write(K.services, services);
		write(K.staff, staff);
		write(K.vehicles, vehicles);
		write(K.bookings, bookings);
		write(K.reviews, reviews);
		write(K.offers, offers);
		write(K.settings, settings);
		write(K.meta, { bookingSeq: 1008, invoiceSeq: 2000, schema: SCHEMA });
		write(K.session, null);
	}

	function init() {
		var meta = read(K.meta, null);
		if (!meta || meta.schema !== SCHEMA || !read(K.users, null)) seed();
	}

	/* ---------------- collections ---------------- */
	function all(name) { return read(K[name], []); }
	function setAll(name, val) { write(K[name], val); }

	function list(collection) { return all(collection); }
	function find(collection, id) {
		return all(collection).filter(function (x) { return x.id === id; })[0] || null;
	}
	function insert(collection, item) {
		var arr = all(collection);
		item.id = item.id || uid(collection.slice(0, 2));
		arr.push(item);
		setAll(collection, arr);
		return item;
	}
	function update(collection, id, patch) {
		var arr = all(collection), found = null;
		arr = arr.map(function (x) { if (x.id === id) { found = Object.assign({}, x, patch); return found; } return x; });
		setAll(collection, arr);
		return found;
	}
	function remove(collection, id) {
		setAll(collection, all(collection).filter(function (x) { return x.id !== id; }));
	}

	/* ---------------- relationships ---------------- */
	function customerBookings(customerId) {
		return all('bookings').filter(function (b) { return b.customerId === customerId; });
	}
	function customerVehicles(customerId) {
		return all('vehicles').filter(function (v) { return v.customerId === customerId; });
	}
	function usersByRole(role) { return all('users').filter(function (u) { return u.role === role; }); }
	function service(id) { return find('services', id); }
	function services(ids) { return (ids || []).map(function (i) { return service(i); }).filter(Boolean); }
	function staffMember(id) { return find('staff', id); }
	function vehicle(id) { return find('vehicles', id); }
	function customer(id) { return find('users', id); }

	function sortBookings(arr, dir) {
		arr = arr.slice();
		arr.sort(function (a, b) {
			var ka = a.date + ' ' + a.time, kb = b.date + ' ' + b.time;
			return dir === 'asc' ? (ka < kb ? -1 : ka > kb ? 1 : 0) : (ka > kb ? -1 : ka < kb ? 1 : 0);
		});
		return arr;
	}

	/* ---------------- availability ---------------- */
	function settings() { return read(K.settings, {}); }
	function slotsFor(dateStr) {
		var s = settings();
		var out = [];
		var open = s.openTime || '08:00', close = s.closeTime || '18:00';
		var step = s.slotMinutes || 60;
		function mins(t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
		var start = mins(open), end = mins(close);
		for (var m = start; m < end; m += step) {
			out.push(pad(Math.floor(m / 60)) + ':' + pad(m % 60));
		}
		// drop past slots today
		if (dateStr === today()) {
			var now = new Date(); var nowM = now.getHours() * 60 + now.getMinutes();
			out = out.filter(function (t) { return mins(t) > nowM + 30; });
		}
		return out;
	}
	function takenSlots(dateStr, excludeBookingId) {
		return all('bookings').filter(function (b) {
			return b.date === dateStr && b.status !== 'cancelled' && b.id !== excludeBookingId;
		}).map(function (b) { return b.time; });
	}
	function availableSlots(dateStr, excludeBookingId) {
		var taken = takenSlots(dateStr, excludeBookingId);
		return slotsFor(dateStr).filter(function (t) { return taken.indexOf(t) === -1; });
	}
	function isSlotTaken(dateStr, time, excludeBookingId) {
		return takenSlots(dateStr, excludeBookingId).indexOf(time) !== -1;
	}

	/* ---------------- bookings ---------------- */
	function computePrice(serviceIds) {
		return services(serviceIds).reduce(function (sum, s) { return sum + (+s.price || 0); }, 0);
	}
	function createBooking(data) {
		if (!data.date || !data.time) return { ok: false, error: 'Please choose a date and time slot.' };
		if (isSlotTaken(data.date, data.time)) return { ok: false, error: 'That time slot is already booked. Please pick another.' };
		var id = 'BK-' + seq('bookingSeq');
		var booking = {
			id: id,
			customerId: data.customerId,
			vehicleId: data.vehicleId,
			serviceIds: data.serviceIds || [],
			date: data.date,
			time: data.time,
			mode: data.mode || 'dropoff',
			status: 'pending',
			staffId: null,
			price: computePrice(data.serviceIds),
			paymentStatus: 'unpaid',
			notes: data.notes || '',
			createdAt: today()
		};
		insert('bookings', booking);
		return { ok: true, booking: booking };
	}
	function setBookingStatus(id, status, extra) {
		var log = { status: status, at: new Date().toISOString() };
		var b = find('bookings', id);
		if (!b) return null;
		var statusLog = (b.statusLog || []).concat([log]);
		return update('bookings', id, Object.assign({ status: status, statusLog: statusLog }, extra || {}));
	}
	function rescheduleBooking(id, date, time) {
		if (isSlotTaken(date, time, id)) return { ok: false, error: 'That slot is taken. Please choose another.' };
		update('bookings', id, { date: date, time: time, status: 'pending' });
		return { ok: true };
	}
	function cancelBooking(id) {
		return update('bookings', id, { status: 'cancelled' });
	}

	/* ---------------- stats ---------------- */
	function stats() {
		var bs = all('bookings'), us = usersByRole('customer');
		var t = today();
		var revenue = bs.filter(function (b) { return b.paymentStatus === 'paid' && b.status !== 'cancelled'; })
			.reduce(function (s, b) { return s + (+b.price || 0); }, 0);
		return {
			customers: us.length,
			bookings: bs.length,
			today: bs.filter(function (b) { return b.date === t && b.status !== 'cancelled'; }).length,
			revenue: revenue,
			pending: bs.filter(function (b) { return b.status === 'pending'; }).length,
			inProgress: bs.filter(function (b) { return b.status === 'in-progress'; }).length,
			completed: bs.filter(function (b) { return b.status === 'completed'; }).length,
			cancelled: bs.filter(function (b) { return b.status === 'cancelled'; }).length
		};
	}
	function revenueLast7() {
		var out = [];
		for (var i = 6; i >= 0; i--) {
			var d = addDays(-i);
			var total = all('bookings').filter(function (b) { return b.date === d && b.status !== 'cancelled'; })
				.reduce(function (s, b) { return s + (+b.price || 0); }, 0);
			out.push({ label: new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }), value: total, date: d });
		}
		return out;
	}
	function bookingsByWeek() {
		// last 8 weeks count
		var out = [];
		for (var w = 7; w >= 0; w--) {
			var start = addDays(-(w * 7) - 6), end = addDays(-(w * 7));
			var count = all('bookings').filter(function (b) { return b.date >= start && b.date <= end && b.status !== 'cancelled'; }).length;
			out.push({ label: 'W' + (8 - w), value: count });
		}
		return out;
	}
	function popularServices() {
		var counts = {};
		all('bookings').forEach(function (b) {
			if (b.status === 'cancelled') return;
			(b.serviceIds || []).forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
		});
		return all('services').map(function (s) { return { id: s.id, name: s.name, value: counts[s.id] || 0, price: s.price }; })
			.sort(function (a, b) { return b.value - a.value; });
	}

	/* ---------------- auth ---------------- */
	function login(email, password, role) {
		email = (email || '').trim().toLowerCase();
		var u = all('users').filter(function (x) {
			return x.email.toLowerCase() === email && x.password === password && (!role || x.role === role);
		})[0];
		if (!u) return { ok: false, error: 'Invalid email or password for the selected role.' };
		write(K.session, { userId: u.id, role: u.role, at: Date.now() });
		return { ok: true, user: publicUser(u) };
	}
	function register(data) {
		var email = (data.email || '').trim().toLowerCase();
		if (all('users').some(function (u) { return u.email.toLowerCase() === email; })) {
			return { ok: false, error: 'An account with that email already exists.' };
		}
		var role = data.role === 'admin' ? 'admin' : 'customer';
		var u = {
			id: uid('U'), role: role, name: data.name, email: email, phone: data.phone || '',
			password: data.password, avatar: 'images/avatar-' + (1 + (all('users').length % 3)) + '.webp',
			title: role === 'admin' ? 'Administrator' : '', createdAt: today()
		};
		insert('users', u);
		write(K.session, { userId: u.id, role: role, at: Date.now() });
		return { ok: true, user: publicUser(u) };
	}
	function logout() { write(K.session, null); }
	function session() { return read(K.session, null); }
	function currentUser() {
		var s = session();
		if (!s) return null;
		return find('users', s.userId);
	}
	function publicUser(u) { if (!u) return null; return { id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone, avatar: u.avatar, title: u.title }; }
	function updateProfile(id, patch) {
		var allowed = ['name', 'email', 'phone', 'avatar', 'password', 'title'];
		var safe = {};
		allowed.forEach(function (k) { if (patch[k] !== undefined && patch[k] !== '') safe[k] = patch[k]; });
		return update('users', id, safe);
	}

	/* ---------------- init ---------------- */
	init();

	return {
		K: K,
		list: list, find: find, insert: insert, update: update, remove: remove,
		customerBookings: customerBookings, customerVehicles: customerVehicles, usersByRole: usersByRole,
		service: service, services: services, staffMember: staffMember, vehicle: vehicle, customer: customer,
		sortBookings: sortBookings,
		settings: settings,
		saveSettings: function (patch) { var s = Object.assign(read(K.settings, {}), patch); write(K.settings, s); return s; },
		slotsFor: slotsFor, availableSlots: availableSlots, takenSlots: takenSlots, isSlotTaken: isSlotTaken,
		computePrice: computePrice, createBooking: createBooking, setBookingStatus: setBookingStatus,
		rescheduleBooking: rescheduleBooking, cancelBooking: cancelBooking,
		stats: stats, revenueLast7: revenueLast7, bookingsByWeek: bookingsByWeek, popularServices: popularServices,
		login: login, register: register, logout: logout, session: session, currentUser: currentUser,
		publicUser: publicUser, updateProfile: updateProfile,
		reset: function () { seed(); },
		uid: uid, today: today, addDays: addDays, toISO: toISO,
		fmtDate: fmtDate, fmtShort: fmtShort, fmtMoney: fmtMoney, fmtTime: fmtTime
	};
})();
