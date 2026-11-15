import { useEffect, useRef } from 'react';

export default function Reveal({ as: Element = 'div', children, ...props }) {
  const target = useRef(null);
  useEffect(() => {
    const node = target.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    node.dataset.revealState = 'waiting';
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.dataset.revealState = 'entered';
        observer.disconnect();
      },
      { rootMargin: '0px 0px -9% 0px', threshold: 0 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      delete node.dataset.revealState;
    };
  }, []);

  return (
    <Element ref={target} {...props}>
      {children}
    </Element>
  );
}
