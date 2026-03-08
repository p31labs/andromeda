import { useState, useEffect } from 'react';

const Navbar = () => {
  const [isDyslexic, setIsDyslexic] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dyslexia-mode') === 'true';
    if (saved) {
      setIsDyslexic(true);
      document.body.classList.add('dyslexia-mode');
    }
  }, []);

  const toggleDyslexia = () => {
    const next = !isDyslexic;
    setIsDyslexic(next);
    localStorage.setItem('dyslexia-mode', String(next));
    if (next) {
      document.body.classList.add('dyslexia-mode');
    } else {
      document.body.classList.remove('dyslexia-mode');
    }
  };

  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isActive = (href) => href === '/' ? path === '/' : path.startsWith(href);

  const navLink = (href, label) => (
    <a
      href={href}
      className={`hover:text-teal-600 transition-colors ${isActive(href) ? 'text-teal-600 font-bold' : ''}`}
      style={{ textDecoration: 'none' }}
    >
      {label}
    </a>
  );

  return (
    <header className="sticky top-0 z-50 glass-box transition-all">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <a href="/" className="flex items-center gap-4 cursor-pointer group" style={{ textDecoration: 'none' }} title="Return Home">
          <div className="w-12 h-12">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
              <rect width="512" height="512" rx="112" fill="#2A9D8F" />
              <circle cx="390" cy="120" r="48" fill="#E76F51" />
              <text x="256" y="340" fontFamily="'Lato', system-ui, sans-serif" fontWeight="900" fontSize="220" fill="#F0EEE9" textAnchor="middle">P31</text>
              <rect x="156" y="380" width="200" height="16" rx="8" fill="#E9C46A" />
            </svg>
          </div>
          <div>
            <div className="font-heading font-bold text-espresso text-lg leading-none">Labs</div>
            <div className="text-teal-600 text-xs font-medium tracking-wide">501(c)(3) Nonprofit</div>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-espresso/80">
          {navLink('/', 'Home')}
          {navLink('/products', 'Products')}
          {navLink('/about', 'About')}
          {navLink('/transparency', 'Transparency')}
          {navLink('/donate', 'Donate')}
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleDyslexia}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${isDyslexic ? 'bg-lavender border-lavender text-espresso' : 'border-espresso/20 text-espresso/60 hover:bg-espresso/5'}`}
            title="Toggle Dyslexia & ADHD Reading Accommodations"
          >
            {isDyslexic ? 'Aa (Enhanced)' : 'Aa (Standard)'}
          </button>
          <a
            href="https://bonding.p31ca.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block bg-coral-500 hover:bg-coral-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-transform hover:-translate-y-0.5"
            style={{ textDecoration: 'none' }}
          >
            Launch BONDING ↗
          </a>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
