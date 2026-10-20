/* =========================================================
   WEBISEN MOTION UPGRADE
   Дополнение к существующему main.js — старый код не удалять
   ========================================================= */

(() => {
  "use strict";

  const motionPreference = matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  const mobileWidth = matchMedia("(max-width: 1100px)");
  const menu = document.querySelector(".header__nav");
  const toggle = document.querySelector(".header__toggle");
  const dialog = document.querySelector(".case-dialog");

  if (!menu || !toggle) return;

  let lenis = null;

  /* ---------- Полноэкранное меню ---------- */

  /*
    Ставим метку на исходное место nav.
    На телефоне переносим ТОТ ЖЕ nav в body.
    На десктопе возвращаем точно на прежнее место.
  */
  const menuMarker = document.createComment("WEBISEN menu position");
  menu.parentNode.insertBefore(menuMarker, menu);

  /*
    Дополнительная кнопка закрытия создаётся JS.
    В исходном HTML ничего менять не нужно.
  */
  const closeButton = document.createElement("button");

  closeButton.type = "button";
  closeButton.className = "header__menu-close";
  closeButton.setAttribute("aria-label", "Закрити меню");

  closeButton.innerHTML =
    '<span aria-hidden="true"></span>' +
    '<span aria-hidden="true"></span>';

  menu.prepend(closeButton);

  /*
    Когда меню находится вне .header, старый обработчик
    document.click воспринимал бы любое нажатие внутри него
    как клик «снаружи». Не даём событию дойти до document.
    Старый обработчик ссылок на самом menu продолжает работать.
  */
  menu.addEventListener("click", (event) => {
    event.stopPropagation();

    if (event.target === menu) {
      toggle.click();
    }
  });

  closeButton.addEventListener("click", () => {
    if (toggle.getAttribute("aria-expanded") === "true") {
      toggle.click();
      toggle.focus({ preventScroll: true });
    }
  });

  function syncMenuPosition() {
    if (toggle.getAttribute("aria-expanded") === "true") {
      toggle.click();
    }

    if (mobileWidth.matches) {
      document.body.append(menu);
    } else {
      menuMarker.parentNode.insertBefore(menu, menuMarker.nextSibling);
    }

    updateMenuState();
  }

  function updateMenuState() {
    const open =
      mobileWidth.matches &&
      toggle.getAttribute("aria-expanded") === "true";

    document.documentElement.classList.toggle(
      "webisen-menu-open",
      open,
    );

    /*
      Меню можно прокручивать внутри себя, но страницу под ним —
      нельзя. После закрытия восстанавливаем доступность страницы.
    */
    const wrapper = document.querySelector(".wrapper");

    if (wrapper) {
      wrapper.inert = open;
    }

    menu.inert = mobileWidth.matches && !open;

    if (open) {
      closeButton.focus({ preventScroll: true });
    }

    updateLenisState();
  }

  syncMenuPosition();
  mobileWidth.addEventListener("change", syncMenuPosition);

  const menuStateObserver = new MutationObserver(updateMenuState);

  menuStateObserver.observe(toggle, {
    attributes: true,
    attributeFilter: ["aria-expanded"],
  });

  /* ---------- Lenis: необязательное улучшение прокрутки ---------- */

  function updateLenisState() {
    if (!lenis) return;

    const menuOpen =
      toggle.getAttribute("aria-expanded") === "true";

    const dialogOpen = Boolean(dialog?.open);

    if (menuOpen || dialogOpen) {
      lenis.stop();
    } else {
      lenis.start();
    }
  }

  /*
    Загружаем зафиксированную версию независимо от HTML.
    При ошибке сети ничего не ломается: остаётся обычный scroll.
  */
  if (!motionPreference.matches && !window.Lenis) {
    const script = document.createElement("script");

    script.src =
      "https://unpkg.com/lenis@1.3.27/dist/lenis.min.js";

    script.async = true;

    script.onload = initializeLenis;
    script.onerror = () => {
      console.info(
        "Lenis не загрузился; используется обычная прокрутка.",
      );
    };

    document.head.append(script);
  } else if (!motionPreference.matches && window.Lenis) {
    initializeLenis();
  }

  function initializeLenis() {
    if (lenis || !window.Lenis || motionPreference.matches) return;

    lenis = new window.Lenis({
      autoRaf: true,
      anchors: true,
      duration: 1.15,
      smoothWheel: true,

      /*
        Не вмешиваемся в прокрутку самого меню, диалога
        и горизонтальную галерею портретов.
      */
      prevent: (node) =>
        Boolean(
          node.closest(
            ".header__nav, .case-dialog, .review__people",
          ),
        ),
    });

    updateLenisState();

    /*
      В существующем коде форма вызывает scrollIntoView().
      Не перехватываем и не переписываем его: он остаётся рабочим.
    */
  }

  if (dialog) {
    const dialogObserver = new MutationObserver(updateLenisState);

    dialogObserver.observe(dialog, {
      attributes: true,
      attributeFilter: ["open"],
    });
  }

  /*
    В меню останавливаем всплытие клика до document, поэтому
    Lenis не увидит якорную ссылку сам. Обрабатываем только
    внутренние #ссылки; tel: и mailto: не трогаем.
  */
  menu.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');

    if (!link) return;

    const hash = link.getAttribute("href");
    const target = document.getElementById(hash.slice(1));

    if (!target) return;

    event.preventDefault();

    /*
      Старый обработчик menu уже убрал класс открытого меню.
      Даём DOM один кадр на закрытие и затем прокручиваем.
    */
    requestAnimationFrame(() => {
      if (location.hash !== hash) {
        history.pushState(null, "", hash);
      }

      if (lenis && !motionPreference.matches) {
        lenis.scrollTo(target, {
          offset: -24,
          duration: 1.1,
        });
      } else {
        target.scrollIntoView({
          behavior: motionPreference.matches ? "instant" : "smooth",
        });
      }
    });
  });

  /* ---------- Karaoke-анимация заголовков ---------- */

  const karaokeSelector = [
    ".mission h2",
    ".section-title",
    ".team__title",
    ".custom__copy h3",
  ].join(", ");

  const karaokeHeadings = [
    ...document.querySelectorAll(karaokeSelector),
  ];

  /*
    Не используем innerHTML для пользовательского текста.
    Оборачиваем только текстовые узлы: вложенные span и em,
    отвечающие за исходные цвета, сохраняются.
  */
  function wrapWords(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
    );

    const textNodes = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node.parentElement.closest(".karaoke-word")) {
        continue;
      }

      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }

    textNodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment();

      const pieces = textNode.textContent.split(/(\s+)/);

      pieces.forEach((piece) => {
        if (!piece) return;

        if (/^\s+$/.test(piece)) {
          fragment.append(document.createTextNode(piece));
          return;
        }

        const word = document.createElement("span");
        const ink = document.createElement("span");

        word.className = "karaoke-word";
        ink.className = "karaoke-ink";

        ink.textContent = piece;
        word.append(ink);
        fragment.append(word);
      });

      textNode.replaceWith(fragment);
    });

    root.classList.add("webisen-karaoke");
  }

  if (!motionPreference.matches) {
    karaokeHeadings.forEach(wrapWords);
  }

  /* ---------- Параллакс без конфликта с существующим pointermove ---------- */

  /*
    Не трогаем .intro__cards: в старом JS она уже двигается
    от указателя мыши. Для новых эффектов берём другие слои.
  */
  const parallaxItems = [
    {
      element: document.querySelector(".intro__glow"),
      strength: 15,
    },
    {
      element: document.querySelector(".team__photo"),
      strength: 24,
    },
    {
      element: document.querySelector(
        ".portfolio__art img:first-child",
      ),
      strength: 26,
    },
    {
      element: document.querySelector(
        ".portfolio__art img:last-child",
      ),
      strength: -18,
    },
    {
      element: document.querySelector(".custom__cards"),
      strength: 18,
    },
  ].filter((item) => item.element);

  parallaxItems.forEach(({ element }) => {
    element.classList.add("webisen-parallax");
  });

  let ticking = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateMotion() {
    ticking = false;

    if (motionPreference.matches) return;

    const viewportHeight = window.innerHeight;

    karaokeHeadings.forEach((heading) => {
      const rect = heading.getBoundingClientRect();

      /*
        Эффект начинается, когда заголовок входит снизу,
        и завершается ближе к верхней половине экрана.
      */
      const progress = clamp(
        (viewportHeight * 0.88 - rect.top) /
          (viewportHeight * 0.57),
        0,
        1,
      );

      const words = heading.querySelectorAll(".karaoke-ink");
      const total = words.length;

      words.forEach((word, index) => {
        const wordProgress = clamp(
          progress * (total + 1) - index,
          0,
          1,
        );

        word.style.setProperty(
          "--karaoke-progress",
          wordProgress.toFixed(3),
        );
      });
    });

    const allowParallax = matchMedia(
      "(min-width: 701px) and (pointer: fine)",
    ).matches;

    parallaxItems.forEach(({ element, strength }) => {
      if (!allowParallax) {
        element.style.removeProperty("--webisen-depth");
        return;
      }

      const rect = element.getBoundingClientRect();

      if (
        rect.bottom < -200 ||
        rect.top > viewportHeight + 200
      ) {
        return;
      }

      const center = rect.top + rect.height / 2;

      const distance = clamp(
        (viewportHeight / 2 - center) /
          (viewportHeight + rect.height),
        -0.5,
        0.5,
      );

      element.style.setProperty(
        "--webisen-depth",
        `${(distance * strength * 2).toFixed(1)}px`,
      );
    });
  }

  function requestMotionUpdate() {
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(updateMotion);
  }

  window.addEventListener("scroll", requestMotionUpdate, {
    passive: true,
  });

  window.addEventListener("resize", requestMotionUpdate, {
    passive: true,
  });

  motionPreference.addEventListener("change", () => {
    if (motionPreference.matches && lenis) {
      lenis.destroy();
      lenis = null;
    }

    requestMotionUpdate();
  });

  requestMotionUpdate();

  /* ---------- Подсчёт показателей и цен ---------- */

  /*
    Берём только показатели, сроки и цены.
    Номера телефонов, годы в кейсах и нумерацию интерфейса
    не анимируем: они должны оставаться стабильными.
  */
  const numberContainers = document.querySelectorAll(
    [
      ".stat__title",
      ".hero__about p",
      ".metrics strong",
      ".partners-card strong",
      ".sprints__heading > span",
      ".sprints__bar--active b",
      ".price-card__tags li",
      ".price-card__action strong",
      ".review__content blockquote",
      ".impact__card strong",
    ].join(", "),
  );

  const numberElements = [];

  numberContainers.forEach((container) => {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
    );

    const textNodes = [];

    while (walker.nextNode()) {
      if (/\d/.test(walker.currentNode.textContent)) {
        textNodes.push(walker.currentNode);
      }
    }

    textNodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment();

      const pieces = textNode.textContent.split(
        /(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?)/g,
      );

      pieces.forEach((piece) => {
        if (!piece) return;

        if (!/^\d/.test(piece)) {
          fragment.append(document.createTextNode(piece));
          return;
        }

        const number = document.createElement("span");

        number.className = "webisen-count";
        number.dataset.original = piece;
        number.textContent = piece;

        fragment.append(number);
        numberElements.push(number);
      });

      textNode.replaceWith(fragment);
    });
  });

  function animateNumber(element) {
    const original = element.dataset.original;
    const decimalSeparator = original.includes(",")
      ? ","
      : original.includes(".")
        ? "."
        : null;

    const decimals = decimalSeparator
      ? original.split(decimalSeparator)[1].length
      : 0;

    const thousandSeparator =
      /\d([ \u00a0])\d{3}/.exec(original)?.[1] || "";

    const target = Number(
      original.replace(/[ \u00a0]/g, "").replace(",", "."),
    );

    if (!Number.isFinite(target) || motionPreference.matches) {
      element.textContent = original;
      return;
    }

    const duration = 1100;
    const start = performance.now();

    function format(value) {
      const fixed = value.toFixed(decimals);
      let [whole, fraction] = fixed.split(".");

      if (thousandSeparator) {
        whole = whole.replace(
          /\B(?=(\d{3})+(?!\d))/g,
          thousandSeparator,
        );
      }

      return fraction === undefined
        ? whole
        : whole + decimalSeparator + fraction;
    }

    function frame(now) {
      const progress = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 4);

      element.textContent = format(target * eased);

      if (progress < 1 && !motionPreference.matches) {
        requestAnimationFrame(frame);
      } else {
        element.textContent = original;
      }
    }

    requestAnimationFrame(frame);
  }

  if (
    "IntersectionObserver" in window &&
    !motionPreference.matches
  ) {
    const countObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          animateNumber(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.3,
      },
    );

    numberElements.forEach((element) => {
      countObserver.observe(element);
    });
  }
})();
