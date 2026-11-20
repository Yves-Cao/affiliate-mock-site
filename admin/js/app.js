/* 管理端入口 */
(function () {
  const ADM = window.ADM;
  document.addEventListener("DOMContentLoaded", () => ADM.boot());
  window.addEventListener("offline", () => { const b = document.getElementById("offlineBar"); if (b) b.classList.add("show"); });
})();
