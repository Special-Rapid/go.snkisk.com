(() => {
  const checkbox = document.querySelector("#open_when_unlocked"),
    status = document.querySelector("#open_when_unlocked_status");
  if (!(checkbox instanceof HTMLInputElement) || !status) return;
  const unlockAtMs = Number(checkbox.dataset.unlockAtMs);
  let timer: number | undefined;
  const schedule = () => {
    clearTimeout(timer);
    if (!checkbox.checked) {
      status.textContent = "";
      return;
    }
    const remaining = unlockAtMs - Date.now();
    if (!Number.isFinite(remaining)) {
      status.textContent = "公開時刻を確認できません。";
      return;
    }
    if (remaining <= 0) {
      window.location.replace(window.location.href);
      return;
    }
    status.textContent = "公開時刻になったら自動的に開きます。";
    timer = window.setTimeout(schedule, Math.min(remaining, 60000));
  };
  checkbox.addEventListener("change", schedule);
})();
