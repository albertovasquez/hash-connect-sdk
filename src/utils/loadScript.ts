export function loadScript(url: string, callback: () => void, retries: number = 3): void {
  const attemptLoad = (attemptsLeft: number) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = url;

    const entry = document.getElementsByTagName("script")[0];
    if (!entry || !entry.parentNode) {
      console.error("No script tags found in document");
      return;
    }
    entry.parentNode.insertBefore(script, entry);

    script.onload = function () {
      callback();
      // Detach the event handlers to avoid memory leaks
      script.onload = null;
      script.onerror = null;
    };

    script.onerror = function (error) {
      console.error(`Failed to load script: ${url}`, error);
      // Detach the event handlers
      script.onload = null;
      script.onerror = null;
      // Remove the failed script tag
      script.remove();
      
      if (attemptsLeft > 0) {
        console.log(`Retrying... (${attemptsLeft} attempts left)`);
        setTimeout(() => attemptLoad(attemptsLeft - 1), 1000);
      } else {
        console.error(`Failed to load script after ${retries} attempts: ${url}`);
      }
    };
  };

  attemptLoad(retries - 1);
}
