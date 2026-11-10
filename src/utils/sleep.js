export function sleep(ms, signal) {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    let timer;

    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };

    timer = setTimeout(finish, ms);
    signal?.addEventListener("abort", finish, { once: true });
  });
}
