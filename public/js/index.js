/* eslint-disable */
import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout, forgotPassword, resetPassword } from './login';
import { signup } from './signup';
import { updateUserIdentification, updateUserPassword } from './updateSettings';
import { bookTour } from './stripe';

// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('#loginForm');
const signupForm = document.querySelector('#signupForm');
const logOutBtn = document.querySelector('.nav__el--logout');
const updateForm = document.querySelector('#updateForm');
const passwordForm = document.querySelector('#passwordForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const bookBtn = document.getElementById('book-tour');

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await login(email, password);
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (signupForm) {
  signupForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    await signup(name, email, password, passwordConfirm);
  });
}

if (updateForm) {
  updateForm.addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    console.log(form);

    await updateUserIdentification(form);
  });
}

if (passwordForm) {
  passwordForm.addEventListener('submit', async e => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';

    const curPass = document.getElementById('password-current').value;
    const newPass = document.getElementById('password').value;
    const newPassConfirm = document.getElementById('password-confirm').value;

    await updateUserPassword(curPass, newPass, newPassConfirm);
    document.querySelector('.btn--save-password').textContent = 'Save password';

    // Clear current content
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    document.querySelector('.btn--forgot-password').textContent =
      'Sending email...';
    const email = document.getElementById('email').value;

    await forgotPassword(email);
    document.querySelector('.btn--forgot-password').textContent = 'Submit';
  });
}

if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    document.querySelector('.btn--reset-password').textContent =
      'Validating...';

    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    const resetToken = window.location.href.split('/')[4];

    await resetPassword(resetToken, password, passwordConfirm);
    document.querySelector('.btn--reset-password').textContent = 'Submit';
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', e => {
    console.log('click');
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}
