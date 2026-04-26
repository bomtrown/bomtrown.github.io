const cursor = document.querySelector('.cursor');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let isCursorTicking = false;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  if (!isCursorTicking) {
    requestAnimationFrame(() => {
      // Move exactly to the mouse X/Y and center the custom cursor
      cursor.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      isCursorTicking = false;
    });
    isCursorTicking = true;
  }
});

// ==========================================
// EVENT DELEGATION HOVER LOGIC
// ==========================================

// Instead of looping through static elements on load, we listen to the entire document.
// This perfectly catches dynamically created elements like your fetched .vibe-node items!
document.addEventListener('mouseover', (e) => {
  // Check if the element we just entered is (or is inside of) a link, button, or vibe node
  if (e.target.closest('a, button, .vibe-node')) {
    cursor.classList.add('link-hover');
  }
});

document.addEventListener('mouseout', (e) => {
  // Check if the element we just left matches the same list
  if (e.target.closest('a, button, .vibe-node')) {
    cursor.classList.remove('link-hover');
  }
});