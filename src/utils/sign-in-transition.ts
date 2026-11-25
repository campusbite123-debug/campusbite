// Native navigation uses the stack's screen transition.
export function openWithSignInTransition(
  navigate: () => void,
  _destination: 'login' | 'welcome' | 'register' = 'login',
  _source?: 'login' | 'welcome' | 'register',
) {
  navigate();
}
export function signInLayoutReady() {}
