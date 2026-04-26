const cursor = document.querySelector('.cursor');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let isCursorTicking = false;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  if (!isCursorTicking) {
    requestAnimationFrame(() => {
      // 1. Move exactly to the mouse X/Y
      // 2. Shift back by 50% of its own dynamic width/height to perfectly center
      cursor.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      isCursorTicking = false;
    });
    isCursorTicking = true;
  }
});

// When hovering over links
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('mouseenter', () => {
    cursor.classList.add('link-hover');
  });
  link.addEventListener('mouseleave', () => {
    cursor.classList.remove('link-hover');
  });
});