/**
 * Utility to instantly reset scroll position of the calculation workspace and viewport.
 * Ensures that whenever a user opens or navigates to another screen, module, or sub-tab,
 * it always starts fresh from the very top for effortless data entry.
 */
export function scrollWorkspaceToTop(): void {
  if (typeof window === 'undefined') return;

  const workspace = document.getElementById('calculation-workspace');
  if (workspace) {
    workspace.scrollTop = 0;
    try {
      workspace.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      workspace.scrollTop = 0;
    }
  }

  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  } catch {
    window.scrollTo(0, 0);
  }

  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
  }
  if (document.body) {
    document.body.scrollTop = 0;
  }
}
