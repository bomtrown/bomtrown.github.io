const cursor = document.querySelector('.cursor');

window.addEventListener('mousemove', (e) => {
  // 1. Move exactly to the mouse X/Y
  // 2. Shift back by 50% of its own dynamic width/height to perfectly center
  cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
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