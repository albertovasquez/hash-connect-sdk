export function loadScript(url: string, callback: () => void): void {
  const script = document.createElement("script");
  script.async = true;
  script.src = url;

  const entry = document.getElementsByTagName("script")[0];
  if (!entry || !entry.parentNode) {
    throw new Error("No script tags found in document");
  }
  entry.parentNode.insertBefore(script, entry);

  script.onload = function () {
    callback();

    // Detach the event handler to avoid memory leaks
    script.onload = null;
  };
}
