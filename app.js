// Логика приложения «Помощник в Китае».
// Чистый JavaScript без фреймворков — просто и понятно.

(function () {
  "use strict";

  // ===== Ссылки на элементы экранов =====
  var screenHome = document.getElementById("screen-home");
  var screenSection = document.getElementById("screen-section");
  var sectionsGrid = document.getElementById("sections-grid");
  var phrasesList = document.getElementById("phrases-list");
  var sectionTitle = document.getElementById("section-title");
  var btnBack = document.getElementById("btn-back");
  var offlineBadge = document.getElementById("offline-badge");

  var SECTIONS = window.SECTIONS || [];

  // ===== Экран 1: рисуем плитки разделов =====
  function renderHome() {
    sectionsGrid.innerHTML = "";
    SECTIONS.forEach(function (section) {
      var card = document.createElement("button");
      card.className = "section-card";
      card.innerHTML =
        '<span class="sc-icon">' + section.icon + "</span>" +
        '<span class="sc-title">' + section.title + "</span>" +
        '<span class="sc-hint">' + section.hint + "</span>";
      card.addEventListener("click", function () {
        openSection(section);
      });
      sectionsGrid.appendChild(card);
    });
  }

  // ===== Экран 2: открываем раздел со фразами =====
  function openSection(section) {
    sectionTitle.textContent = section.title;
    phrasesList.innerHTML = "";

    section.phrases.forEach(function (p) {
      var card = document.createElement("div");
      card.className = "phrase-card";

      // строка «озвучить» показываем только если есть пиньинь (т.е. это фраза, а не справка)
      var hasAudio = !!p.pinyin;

      var html =
        '<p class="phrase-ru">' + escapeHtml(p.ru) + "</p>" +
        '<p class="phrase-zh">' + escapeHtml(p.zh) + "</p>" +
        '<div class="phrase-meta">' +
          '<div>' +
            '<div class="phrase-read">' + escapeHtml(p.read) + "</div>" +
            (p.pinyin ? '<div class="phrase-pinyin">' + escapeHtml(p.pinyin) + "</div>" : "") +
          "</div>";

      if (hasAudio) {
        html += '<button class="btn-play" data-id="' + p.id + '" data-zh="' +
          escapeAttr(p.zh) + '" aria-label="Озвучить">🔊</button>';
      }
      html += "</div>";

      card.innerHTML = html;
      phrasesList.appendChild(card);
    });

    // вешаем озвучку на кнопки
    var buttons = phrasesList.querySelectorAll(".btn-play");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        playPhrase(btn);
      });
    });

    showScreen(screenSection);
    window.scrollTo(0, 0);
  }

  // ===== Озвучка фразы =====
  // Этап 8: пробуем готовый mp3 (audio/<id>.mp3), которого пока нет —
  // поэтому временно подстраховываемся встроенным голосом iOS (Web Speech API).
  // На Этапе 10 положим настоящие mp3 китайским голосом.
  function playPhrase(btn) {
    var id = btn.getAttribute("data-id");
    var zh = btn.getAttribute("data-zh");

    btn.classList.add("is-playing");
    var done = function () { btn.classList.remove("is-playing"); };

    var audio = new Audio("audio/" + id + ".mp3");
    audio.addEventListener("ended", done);
    audio.addEventListener("error", function () {
      // mp3 ещё нет — пробуем системный синтезатор речи
      speak(zh, done);
    });
    audio.play().catch(function () {
      speak(zh, done);
    });
  }

  // Временный фоллбек: системный синтез речи (если доступен китайский голос)
  function speak(text, done) {
    if (!("speechSynthesis" in window)) { done(); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 0.85;
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    } catch (e) {
      done();
    }
  }

  // ===== Навигация между экранами =====
  function showScreen(target) {
    [screenHome, screenSection].forEach(function (s) {
      s.classList.remove("is-active");
    });
    target.classList.add("is-active");
  }

  btnBack.addEventListener("click", function () {
    showScreen(screenHome);
    window.scrollTo(0, 0);
  });

  // ===== Защита от ошибочного HTML в данных =====
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  // ===== Индикатор оффлайн-готовности =====
  function updateOfflineBadge() {
    if (navigator.onLine) {
      offlineBadge.textContent = "● Онлайн — приложение сохранено для оффлайна";
    } else {
      offlineBadge.textContent = "● Работает оффлайн";
      offlineBadge.classList.add("is-on");
    }
  }
  window.addEventListener("online", updateOfflineBadge);
  window.addEventListener("offline", updateOfflineBadge);

  // ===== Регистрация service worker (оффлайн-режим) =====
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function () {
        offlineBadge.classList.add("is-on");
      }).catch(function () {
        // не критично — без SW приложение просто не будет работать оффлайн
      });
    });
  }

  // ===== Старт =====
  renderHome();
  updateOfflineBadge();
})();
