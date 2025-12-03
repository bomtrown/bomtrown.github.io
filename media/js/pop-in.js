const popIns = document.querySelectorAll('.pop-in');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;

  popIns.forEach(el => {
    const n1 = parseInt(el.dataset.n1);
    const n2 = parseInt(el.dataset.n2);

    if (scrollY < n1) {
      el.classList.remove('border-only', 'visible');
    } else if (scrollY >= n1 && scrollY < n2) {
      el.classList.add('border-only');
      el.classList.remove('visible');
    } else {
      el.classList.add('visible');
      el.classList.remove('border-only');
    }
  });
});