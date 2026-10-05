document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const emailInput = document.getElementById('email');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const loader = document.getElementById('loader-wrapper');

  // Form validation
  signupForm.addEventListener('submit', function (event) {
    let hasError = false;

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailInput.value)) {
      emailError.textContent = 'Please enter a valid email address.';
      emailError.classList.remove('hidden');
      hasError = true;
    } else {
      emailError.textContent = '';
      emailError.classList.add('hidden');
    }

    // Password match validation
    if (passwordInput.value !== confirmPasswordInput.value) {
      passwordError.textContent = 'Passwords must match.';
      passwordError.classList.remove('hidden');
      hasError = true;
    } else {
      passwordError.textContent = '';
      passwordError.classList.add('hidden');
    }

    // Stop form if errors
    if (hasError) {
      event.preventDefault();
    } else {
      // Show loader if no errors
      if (loader) loader.classList.remove('hidden');
    }
  });

  // Loader hide on load
  window.addEventListener('load', () => {
    if (loader) {
      setTimeout(() => loader.classList.add('fade-out'), 500);
    }
  });
});
