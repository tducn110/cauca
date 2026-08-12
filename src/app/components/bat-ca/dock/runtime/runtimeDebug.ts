export const DOCK_DEBUG =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has("dockDebug");
