// Wipes every piece of AnderPark's local state (character, park, game
// progress, preferences) and reloads so all hooks re-initialize from a
// clean slate, landing back on onboarding.
export function restartApp(): void {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('anderpark-'))
    .forEach((key) => localStorage.removeItem(key));
  window.location.reload();
}
