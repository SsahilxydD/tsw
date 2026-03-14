let lockCount = 0;
export function lockScroll() { if (++lockCount === 1) document.body.style.overflow = 'hidden'; }
export function unlockScroll() { if (--lockCount === 0) document.body.style.overflow = ''; }
