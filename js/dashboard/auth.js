/* =========================================================
   STACKLY AUTO SPA — Dashboard auth + page guards
   Exposes window.Auth (plain script)
   ========================================================= */
window.Auth = (function () {
	'use strict';

	function home(role) { return role === 'admin' ? 'admin.html' : 'customer.html'; }

	/* Guard a dashboard page. Redirects if not authorised. */
	function guard(role) {
		var user = DB.currentUser();
		if (!user) { location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop())); return null; }
		if (role && user.role !== role) { location.replace(home(user.role)); return null; }
		return user;
	}

	/* Guard the login page — send signed-in users to their dashboard. */
	function guardLogin() {
		var user = DB.currentUser();
		if (user) { location.replace(home(user.role)); return null; }
		return true;
	}

	function logout() {
		DB.logout();
		location.href = 'login.html';
	}

	/* Populate topbar + sidebar user card, wire profile menu + logout. */
	function mountChrome(user) {
		function txt(id, v) { var n = document.getElementById(id); if (n) n.textContent = v; }
		var first = (user.name || '').split(' ')[0];
		txt('sideUserName', user.name);
		txt('sideUserRole', user.title || (user.role === 'admin' ? 'Administrator' : 'Customer'));
		txt('topUserName', user.name);
		txt('topUserRole', user.role === 'admin' ? 'Administrator' : 'Customer');
		txt('menuName', user.name);
		txt('menuEmail', user.email);
		var av = document.getElementById('topAvatar'); if (av) av.src = user.avatar || 'images/avatar-1.webp';
		var sav = document.getElementById('sideAvatar'); if (sav) sav.src = user.avatar || 'images/avatar-1.webp';
		var greet = document.getElementById('greetName'); if (greet) greet.textContent = first;

		var btn = document.getElementById('profileBtn');
		var menu = document.getElementById('profileMenu');
		if (btn && menu) {
			btn.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('is-open'); });
			document.addEventListener('click', function () { menu.classList.remove('is-open'); });
		}
		document.querySelectorAll('[data-logout]').forEach(function (b) { b.addEventListener('click', function () { logout(); }); });

		// global quick links
		document.querySelectorAll('[data-goto]').forEach(function (b) {
			b.addEventListener('click', function () { location.hash = b.getAttribute('data-goto'); });
		});
	}

	/* ---------------- login page ---------------- */
	function initLogin() {
		if (!guardLogin()) return;
		var role = 'customer';
		var err = document.getElementById('authError');
		function showError(msg) { if (!err) return; err.querySelector('[data-msg]').textContent = msg; err.classList.add('is-visible'); }
		function clearError() { if (err) err.classList.remove('is-visible'); }
		function setRole(r) {
			role = r;
			document.querySelectorAll('[data-role]').forEach(function (x) { x.classList.toggle('is-active', x.getAttribute('data-role') === r); });
		}

		document.querySelectorAll('[data-role]').forEach(function (b) {
			b.addEventListener('click', function () { setRole(b.getAttribute('data-role')); clearError(); });
		});

		document.querySelectorAll('[data-demo]').forEach(function (b) {
			b.addEventListener('click', function () {
				var r = b.getAttribute('data-demo');
				setRole(r);
				document.getElementById('email').value = r === 'admin' ? 'admin@stacklyautospa.com' : 'priya@example.com';
				document.getElementById('password').value = r === 'admin' ? 'admin123' : 'demo123';
				clearError();
			});
		});

		var loginForm = document.getElementById('loginForm');
		if (loginForm) loginForm.addEventListener('submit', function (e) {
			e.preventDefault();
			clearError();
			var email = document.getElementById('email'), pass = document.getElementById('password');
			var bad = false;
			if (!/.+@.+\..+/.test(email.value.trim())) { email.classList.add('is-invalid'); bad = true; } else email.classList.remove('is-invalid');
			if (pass.value.length < 4) { pass.classList.add('is-invalid'); bad = true; } else pass.classList.remove('is-invalid');
			if (bad) { showError('Please enter a valid email and password.'); return; }
			var btn = loginForm.querySelector('[type="submit"]');
			btn.disabled = true; btn.textContent = 'Signing in…';
			setTimeout(function () {
				var res = DB.login(email.value, pass.value, role);
				if (!res.ok) { btn.disabled = false; btn.textContent = 'Sign in'; showError(res.error); return; }
				UI.toast('success', 'Welcome back, ' + res.user.name.split(' ')[0] + '!', 'Redirecting to your dashboard…');
				setTimeout(function () { location.href = home(res.user.role); }, 500);
			}, 450);
		});
	}

	/* ---------------- signup page ---------------- */
	function initSignup() {
		if (!guardLogin()) return;
		var role = 'customer';
		var err = document.getElementById('authError');
		function showError(msg) { if (!err) return; err.querySelector('[data-msg]').textContent = msg; err.classList.add('is-visible'); }
		function clearError() { if (err) err.classList.remove('is-visible'); }

		document.querySelectorAll('[data-role]').forEach(function (b) {
			b.addEventListener('click', function () {
				role = b.getAttribute('data-role');
				document.querySelectorAll('[data-role]').forEach(function (x) { x.classList.toggle('is-active', x.getAttribute('data-role') === role); });
				clearError();
			});
		});

		var form = document.getElementById('signupForm');
		if (!form) return;
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			clearError();
			var name = document.getElementById('regName'), email = document.getElementById('regEmail'),
				phone = document.getElementById('regPhone'), pass = document.getElementById('regPassword'),
				confirm = document.getElementById('regConfirm');
			[name, email, phone, pass, confirm].forEach(function (f) { if (f) f.classList.remove('is-invalid'); });
			var bad = false;
			if (!name.value.trim() || name.value.trim().length < 2) { name.classList.add('is-invalid'); bad = true; }
			if (!/.+@.+\..+/.test(email.value.trim())) { email.classList.add('is-invalid'); bad = true; }
			if (pass.value.length < 6) { pass.classList.add('is-invalid'); bad = true; }
			if (confirm.value !== pass.value) { confirm.classList.add('is-invalid'); bad = true; }
			if (bad) { showError('Please fix the highlighted fields. Password needs 6+ characters.'); return; }
			var btn = form.querySelector('[type="submit"]');
			btn.disabled = true; btn.textContent = 'Creating account…';
			setTimeout(function () {
				var res = DB.register({ name: name.value.trim(), email: email.value, phone: phone.value.trim(), password: pass.value, role: role });
				if (!res.ok) { btn.disabled = false; btn.textContent = 'Create account'; showError(res.error); return; }
				UI.toast('success', 'Account created', 'Welcome to STACKLY, ' + res.user.name.split(' ')[0] + '!');
				setTimeout(function () { location.href = home(res.user.role); }, 600);
			}, 500);
		});
	}

	return { guard: guard, guardLogin: guardLogin, mountChrome: mountChrome, logout: logout, home: home, initLogin: initLogin, initSignup: initSignup };
})();
