    const cursor = document.querySelector('.cursor');

    window.addEventListener('mousemove', (e) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
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