const SESSION_KEY = 'winterPactSession';
const MEMBER_USERNAME = 'WinterPact';
const MEMBER_PASSWORD = 'winterpact132';

const getSession = () => {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
        return null;
    }
};

const setSession = (role) => localStorage.setItem(SESSION_KEY, JSON.stringify({ role }));
const clearSession = () => localStorage.removeItem(SESSION_KEY);
const isLoginPage = window.location.pathname.endsWith('login.html');

const redirectToLogin = () => {
    if (!isLoginPage) window.location.replace('login.html');
};

const addMemberNavigation = (session) => {
    const nav = document.querySelector('.nav-links');
    if (!nav || !session) return;
    let noticeTimeout;

    const accessRequestLinks = document.querySelectorAll('[data-access-request]');
    accessRequestLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            if (session.role !== 'member') return;

            event.preventDefault();
            const notice = document.querySelector('#member-notice');
            if (!notice) return;

            notice.hidden = false;
            notice.classList.remove('member-notice-show');
            requestAnimationFrame(() => notice.classList.add('member-notice-show'));
            clearTimeout(noticeTimeout);
            noticeTimeout = setTimeout(() => {
                notice.hidden = true;
                notice.classList.remove('member-notice-show');
            }, 3000);
        });
    });

    if (session.role === 'member' && !nav.querySelector('[data-member-link]')) {
        const galleryLink = document.createElement('a');
        galleryLink.href = 'galeria.html';
        galleryLink.dataset.memberLink = 'true';
        galleryLink.textContent = 'Galería';
        nav.append(galleryLink);
    }

};

const session = getSession();
if (!isLoginPage && (!session || (window.location.pathname.endsWith('galeria.html') && session.role !== 'member'))) {
    redirectToLogin();
} else if (!isLoginPage) {
    addMemberNavigation(session);
}

if (isLoginPage) {
    const choice = document.querySelector('#access-choice');
    const memberForm = document.querySelector('#member-login-form');
    const status = document.querySelector('#login-status');
    const loginHelp = document.querySelector('#login-help');
    let failedAttempts = 0;

    document.querySelector('#visitor-access')?.addEventListener('click', () => {
        setSession('visitor');
        window.location.replace('index.html');
    });

    document.querySelector('#member-access')?.addEventListener('click', () => {
        choice.hidden = true;
        memberForm.hidden = false;
        document.querySelector('#member-user').focus();
    });

    document.querySelector('#back-to-choice')?.addEventListener('click', () => {
        memberForm.hidden = true;
        choice.hidden = false;
        status.textContent = '';
        failedAttempts = 0;
        loginHelp.hidden = true;
        loginHelp.classList.remove('login-help-show');
    });

    memberForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(memberForm);
        const username = formData.get('username').trim();
        const password = formData.get('password');

        if (username !== MEMBER_USERNAME || password !== MEMBER_PASSWORD) {
            failedAttempts += 1;
            status.textContent = 'Usuario o contraseña incorrectos.';
            if (failedAttempts >= 3) {
                loginHelp.hidden = false;
                loginHelp.classList.remove('login-help-show');
                requestAnimationFrame(() => loginHelp.classList.add('login-help-show'));
            }
            return;
        }

        failedAttempts = 0;
        setSession('member');
        window.location.replace('index.html');
    });
}