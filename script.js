// Initialize Lenis Smooth Scroll
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Scroll Reveal Observer
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
    observer.observe(el);
});

// Interactive Shadow Cursor (Mouse Tracker)
document.addEventListener('mousemove', (e) => {
    const backgroundSystem = document.getElementById('background-system');
    if (backgroundSystem) {
        // High-performance variable update
        backgroundSystem.style.setProperty('--mouse-x', `${e.clientX}px`);
        backgroundSystem.style.setProperty('--mouse-y', `${e.clientY}px`);
    }
});

console.log("SYSTEMS ACTIVE: Background Interaction Driver Loaded.");
