document.addEventListener('DOMContentLoaded', function() {
  console.log('Homepage loaded, initializing...');
  try {
    initLoader();
    initNavigation();
    initAnimations();
    initCounters();
    initWelcomeMessages();
    console.log('Homepage initialization complete');
  } catch (error) {
    console.error('Homepage initialization error:', error);
  }
});

// Loader functionality
function initLoader() {
  window.addEventListener('load', () => {
    const loader = document.getElementById('loader-wrapper');
    if (loader) {
      setTimeout(() => {
        loader.classList.add('fade-out');
        setTimeout(() => {
          loader.classList.add('hidden');
        }, 500);
      }, 1000);
    }
  });
}

// Navigation functionality
function initNavigation() {
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      navToggle.classList.toggle('active');
    });
  }
  
  // Close mobile menu when clicking on links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      navToggle.classList.remove('active');
    });
  });
  
  // Smooth scrolling for anchor links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });
}

// Animation functionality
function initAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);
  
  const animateElements = document.querySelectorAll('.feature-card, .step, .stat-card');
  animateElements.forEach(el => {
    observer.observe(el);
  });
}

// Counter animation
function initCounters() {
  const counters = document.querySelectorAll('.stat-number');
  
  const animateCounter = (counter) => {
    const target = parseInt(counter.textContent.replace(/[^\d]/g, ''));
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      
      const suffix = counter.textContent.replace(/[\d]/g, '');
      counter.textContent = Math.floor(current) + suffix;
    }, 16);
  };
  
  // Intersection Observer for counters
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  counters.forEach(counter => {
    counterObserver.observe(counter);
  });
}

// welcome messages from EJS template
function initWelcomeMessages() {
  const welcomeMessages = document.querySelectorAll('.welcome-message');
  
  welcomeMessages.forEach(message => {
    const closeBtn = message.querySelector('.close-message');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        message.classList.add('slide-out-right');
        setTimeout(() => message.remove(), 300);
      });
    }
    
    // Auto remove after 10 seconds
    setTimeout(() => {
      if (message.parentElement) {
        message.classList.add('slide-out-right');
        setTimeout(() => message.remove(), 300);
      }
    }, 10000);
  });
}