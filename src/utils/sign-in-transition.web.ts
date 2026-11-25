import './sign-in-transition.css';

let layoutReady: (() => void) | undefined;

export function signInLayoutReady() {
  layoutReady?.();
}

export function openWithSignInTransition(
  navigate: () => void,
  destination: 'login' | 'welcome' | 'register' = 'login',
  source: 'login' | 'welcome' | 'register' = destination === 'welcome' ? 'login' : 'welcome',
) {
  const root = document.documentElement;
  if (root.dataset.signInTransition) return;
  if (
    !document.startViewTransition ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    navigate();
    return;
  }

  root.dataset.signInDirection =
    source === 'register' || (source === 'login' && destination === 'register')
      ? destination === 'register'
        ? 'register'
        : 'login'
      : destination === 'welcome'
        ? 'back'
        : 'forward';
  root.dataset.signInTransition = source;
  const transition = document.startViewTransition(async () => {
    root.dataset.signInTransition = destination;
    // Expo Router commits the destination after push returns. Capture the new
    // frame once its layout is mounted, with a bound for redirects or slow loads.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const mounted = new Promise<void>((resolve) => {
        layoutReady = resolve;
        timeout = setTimeout(() => {
          transition.skipTransition();
          resolve();
        }, 900);
      });
      navigate();
      await mounted;
    } finally {
      clearTimeout(timeout);
      layoutReady = undefined;
    }
  });
  void transition.finished.finally(() => {
    delete root.dataset.signInTransition;
    delete root.dataset.signInDirection;
  });
}
