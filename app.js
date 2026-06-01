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
  var searchInput = document.getElementById("search-input");
  var searchResults = document.getElementById("search-results");
  var fullscreen = document.getElementById("fullscreen");
  var fsRu = document.getElementById("fs-ru");
  var fsZh = document.getElementById("fs-zh");
  var fsRead = document.getElementById("fs-read");
  var fsPinyin = document.getElementById("fs-pinyin");
  var fsPlay = document.getElementById("fs-play");
  var fsClose = document.getElementById("fs-close");

  var SECTIONS = window.SECTIONS || [];

  // плоский список всех фраз (для поиска), с названием раздела
  var ALL_PHRASES = [];
  SECTIONS.forEach(function (s) {
    s.phrases.forEach(function (p) {
      ALL_PHRASES.push({ p: p, section: s.title });
    });
  });

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

  // ===== Создание карточки фразы (используется и в разделе, и в поиске) =====
  function buildPhraseCard(p, sectionLabel) {
    var card = document.createElement("div");
    card.className = "phrase-card";

    // строка «озвучить» показываем только если есть пиньинь (т.е. это фраза, а не справка)
    var hasAudio = !!p.pinyin;

    // подстрока «русский · транскрипция» (транскрипция только если есть)
    var sub = '<span class="sub-ru">' + escapeHtml(p.ru) + "</span>" +
              (p.read ? ' · ' + escapeHtml(p.read) : "");

    var html = "";
    if (sectionLabel) {
      html += '<div class="result-section">' + escapeHtml(sectionLabel) + "</div>";
    }
    html +=
      '<div class="phrase-body">' +
        '<div class="phrase-zh">' + escapeHtml(p.zh) + "</div>" +
        '<div class="phrase-sub">' + sub + "</div>" +
      "</div>";
    if (hasAudio) {
      html += '<button class="btn-play" data-id="' + p.id + '" data-zh="' +
        escapeAttr(p.zh) + '" aria-label="Озвучить">🔊</button>';
    }

    card.innerHTML = html;
    var btn = card.querySelector(".btn-play");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation(); // не открывать полный экран при нажатии 🔊
        playPhrase(btn);
      });
    }
    // тап по карточке — показать фразу на весь экран
    card.addEventListener("click", function () { openFullscreen(p); });
    return card;
  }

  // ===== Полноэкранный показ фразы =====
  function openFullscreen(p) {
    fsRu.textContent = p.ru;
    fsZh.textContent = p.zh;
    fsZh.classList.toggle("short", p.zh.length <= 4);
    fsRead.textContent = p.read || "";
    fsPinyin.textContent = p.pinyin || "";
    if (p.pinyin) {
      fsPlay.style.display = "";
      fsPlay.setAttribute("data-id", p.id);
      fsPlay.setAttribute("data-zh", p.zh);
    } else {
      fsPlay.style.display = "none"; // справочные записи (адреса/номера) — без озвучки
    }
    fullscreen.hidden = false;
  }
  function closeFullscreen() { fullscreen.hidden = true; }

  fsClose.addEventListener("click", function (e) { e.stopPropagation(); closeFullscreen(); });
  fsPlay.addEventListener("click", function (e) { e.stopPropagation(); playPhrase(fsPlay); });
  // клик по пустому месту оверлея — закрыть
  fullscreen.addEventListener("click", closeFullscreen);

  // ===== Экран 2: открываем раздел со фразами =====
  function openSection(section) {
    sectionTitle.textContent = section.title;
    phrasesList.innerHTML = "";
    section.phrases.forEach(function (p) {
      phrasesList.appendChild(buildPhraseCard(p));
    });
    showScreen(screenSection);
    window.scrollTo(0, 0);
  }

  // совпадение с допуском к русским окончаниям (вода → найдёт «воду»)
  function matchText(text, q) {
    text = (text || "").toLowerCase();
    if (text.indexOf(q) >= 0) return true;
    // ищем по корню: запрос без последних 1-2 букв (окончание)
    if (q.length >= 4 && text.indexOf(q.slice(0, q.length - 1)) >= 0) return true;
    if (q.length >= 6 && text.indexOf(q.slice(0, q.length - 2)) >= 0) return true;
    return false;
  }

  // ===== Поиск по всем фразам =====
  function onSearch() {
    var q = searchInput.value.trim().toLowerCase();
    if (!q) {
      // пусто — показываем плитки разделов
      searchResults.hidden = true;
      searchResults.innerHTML = "";
      sectionsGrid.style.display = "";
      return;
    }
    sectionsGrid.style.display = "none";
    searchResults.hidden = false;
    searchResults.innerHTML = "";

    var found = ALL_PHRASES.filter(function (it) {
      return matchText(it.p.ru, q) || matchText(it.p.read, q);
    });

    if (found.length === 0) {
      var note = document.createElement("div");
      note.className = "search-note";
      note.textContent = "Ничего не найдено. Попробуйте другое слово.";
      searchResults.appendChild(note);
      return;
    }
    found.forEach(function (it) {
      searchResults.appendChild(buildPhraseCard(it.p, it.section));
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", onSearch);
  }

  // ===== Озвучка фразы =====
  // Проигрываем готовый mp3 (audio/<id>.mp3) — они китайским голосом и
  // сохраняются для оффлайна. Системный голос НЕ используем: он прочитал бы
  // иероглифы чужим голосом как мусор и сбил бы с толку. Нет mp3 → просто тишина.
  function playPhrase(btn) {
    var id = btn.getAttribute("data-id");

    btn.classList.add("is-playing");
    var done = function () { btn.classList.remove("is-playing"); };

    var audio = new Audio("audio/" + id + ".mp3");
    audio.addEventListener("ended", done);
    audio.addEventListener("error", done);
    audio.play().catch(done);
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
