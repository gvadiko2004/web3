(() => {
  "use strict";

  function init() {
    // Защита от повторного подключения этого файла.
    if (window.__webisenInitialized) return;
    window.__webisenInitialized = true;

    const root = document.documentElement;
    const $ = (selector, parent = document) =>
      parent.querySelector(selector);
    const $$ = (selector, parent = document) =>
      [...parent.querySelectorAll(selector)];

    const reducedMotion = matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const mobile = matchMedia("(max-width: 1100px)");
    const finePointer = matchMedia(
      "(min-width: 701px) and (pointer: fine)"
    );

    const clamp = (value, min = 0, max = 1) =>
      Math.min(max, Math.max(min, value));

    const scrollBehavior = () =>
      reducedMotion.matches ? "instant" : "smooth";

    function watchMedia(query, callback) {
      if (query.addEventListener) {
        query.addEventListener("change", callback);
      } else {
        query.addListener(callback);
      }
    }

    // Ошибка необязательного эффекта не отключает другие секции.
    function run(name, callback) {
      try {
        callback();
      } catch (error) {
        console.error(`[WEBISEN: ${name}]`, error);
      }
    }

    /* ---------------- Прелоадер ---------------- */

    const hidePreloader = () => {
      root.classList.remove("has-preloader");
    };

    if (document.readyState === "complete") {
      hidePreloader();
    } else {
      window.addEventListener("load", hidePreloader, {
        once: true,
      });
    }

    setTimeout(hidePreloader, 4500);

    /* ---------------- Блокировка прокрутки ---------------- */

    const scrollLocks = new Set();
    let savedOverflow = null;

    function lockScroll(key, locked) {
      if (locked) {
        scrollLocks.add(key);
      } else {
        scrollLocks.delete(key);
      }

      if (scrollLocks.size && !savedOverflow) {
        savedOverflow = [root, document.body].map((element) => ({
          element,
          value: element.style.getPropertyValue("overflow"),
          priority: element.style.getPropertyPriority("overflow"),
        }));

        savedOverflow.forEach(({ element }) => {
          element.style.setProperty("overflow", "hidden");
        });
      } else if (!scrollLocks.size && savedOverflow) {
        savedOverflow.forEach(({ element, value, priority }) => {
          if (value) {
            element.style.setProperty("overflow", value, priority);
          } else {
            element.style.removeProperty("overflow");
          }
        });

        savedOverflow = null;
      }
    }

    /* ---------------- Мобильное меню ---------------- */

    let closeMenu = () => {};

    run("menu", () => {
      const menu = $(".header__nav");
      const toggle = $(".header__toggle");

      if (!menu || !toggle) return;

      const marker = document.createComment("menu position");
      menu.before(marker);

      let closeButton = $(".header__menu-close", menu);

      if (!closeButton) {
        closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "header__menu-close";
        closeButton.setAttribute("aria-label", "Закрити меню");

        for (let i = 0; i < 2; i++) {
          const line = document.createElement("span");
          line.setAttribute("aria-hidden", "true");
          closeButton.append(line);
        }

        menu.prepend(closeButton);
      }

      let opened = false;
      const inertBackup = new Map();

      function isolateMenu(active) {
        if (active) {
          for (const element of document.body.children) {
            if (
              element === menu ||
              /^(SCRIPT|STYLE|LINK)$/.test(element.tagName)
            ) {
              continue;
            }

            inertBackup.set(element, element.inert);
            element.inert = true;
          }
        } else {
          inertBackup.forEach((value, element) => {
            element.inert = value;
          });

          inertBackup.clear();
        }
      }

      function setMenu(open, restoreFocus = true) {
        const next = Boolean(open && mobile.matches);
        const changed = next !== opened;
        opened = next;

        menu.classList.toggle("header__nav--open", opened);
        root.classList.toggle("webisen-menu-open", opened);

        toggle.setAttribute("aria-expanded", String(opened));
        toggle.setAttribute(
          "aria-label",
          opened ? "Закрити меню" : "Відкрити меню"
        );

        menu.inert = mobile.matches && !opened;

        if (mobile.matches) {
          menu.setAttribute("aria-hidden", String(!opened));
        } else {
          menu.removeAttribute("aria-hidden");
        }

        lockScroll("menu", opened);

        if (changed) {
          if (opened) {
            closeButton.focus({ preventScroll: true });
            isolateMenu(true);
          } else {
            isolateMenu(false);

            if (restoreFocus) {
              toggle.focus({ preventScroll: true });
            }
          }
        }
      }

      closeMenu = (restoreFocus = true) =>
        setMenu(false, restoreFocus);

      function syncPosition() {
        const focusWasInside = menu.contains(document.activeElement);

        setMenu(false, false);

        if (mobile.matches) {
          document.body.append(menu);
        } else {
          marker.after(menu);
        }

        closeButton.hidden = !mobile.matches;
        setMenu(false, false);

        if (focusWasInside) {
          const target = mobile.matches ? toggle : $("a", menu);
          target?.focus({ preventScroll: true });
        }
      }

      toggle.addEventListener("click", () => setMenu(!opened));
      closeButton.addEventListener("click", () => closeMenu());

      menu.addEventListener("click", (event) => {
        if (event.target === menu) closeMenu();

        const link = event.target.closest("a");

        if (link && !link.getAttribute("href")?.startsWith("#")) {
          closeMenu();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (!opened) return;

        if (event.key === "Escape") {
          event.preventDefault();
          closeMenu();
          return;
        }

        if (event.key !== "Tab") return;

        const focusable = $$(
          'a[href], button:not([disabled]), [tabindex="0"]',
          menu
        ).filter((element) => element.getClientRects().length);

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!first) {
          event.preventDefault();
          return;
        }

        const active = document.activeElement;

        if (event.shiftKey && (active === first || !menu.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (active === last || !menu.contains(active))
        ) {
          event.preventDefault();
          first.focus();
        }
      });

      watchMedia(mobile, syncPosition);
      syncPosition();
    });

    /* ---------------- Портфолио ---------------- */

    const dialog = $(".case-dialog");
    let projectTrigger = null;

    function closeProject() {
      if (dialog?.open) dialog.close();
      lockScroll("dialog", false);
    }

    run("portfolio", () => {
      if (!dialog || typeof dialog.showModal !== "function") return;

      const title = $("#case-title", dialog);
      const image = $(".case-dialog__image", dialog);

      if (!title || !image) return;

      $$("[data-case]").forEach((button) => {
        button.addEventListener("click", () => {
          const source = $(".project__visual img", button);
          if (!source) return;

          closeMenu(false);
          projectTrigger = button;

          title.textContent =
            $(".project__caption > span", button)?.textContent.trim() ||
            button.getAttribute("aria-label") ||
            "Проєкт";

          image.src = source.currentSrc || source.src;
          image.alt = source.alt || title.textContent;

          if (!dialog.open) dialog.showModal();
          lockScroll("dialog", true);
        });
      });

      $(".case-dialog__close", dialog)?.addEventListener(
        "click",
        closeProject
      );

      // Нажатие на фон, а не на содержимое диалога.
      let backdropPointerDown = false;

      function outsideDialog(event) {
        const rect = dialog.getBoundingClientRect();

        return (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        );
      }

      dialog.addEventListener("pointerdown", (event) => {
        backdropPointerDown =
          event.target === dialog && outsideDialog(event);
      });

      dialog.addEventListener("click", (event) => {
        if (
          backdropPointerDown &&
          event.target === dialog &&
          outsideDialog(event)
        ) {
          closeProject();
        }

        backdropPointerDown = false;
      });

      dialog.addEventListener("close", () => {
        lockScroll("dialog", false);

        if (
          projectTrigger?.isConnected &&
          (document.activeElement === document.body ||
            dialog.contains(document.activeElement))
        ) {
          projectTrigger.focus({ preventScroll: true });
        }
      });
    });

    /* ---------------- Услуги ---------------- */

    run("services", () => {
      const services = $$(".service");

      function setService(service, open) {
        service.classList.toggle("service--open", open);

        $(".service__toggle", service)?.setAttribute(
          "aria-expanded",
          String(open)
        );

        const body = $(".service__body", service);

        if (body) {
          body.inert = !open;
          body.setAttribute("aria-hidden", String(!open));
        }
      }

      services.forEach((service) => {
        const button = $(".service__toggle", service);
        if (!button) return;

        button.type = "button";

        setService(
          service,
          service.classList.contains("service--open")
        );

        button.addEventListener("click", () => {
          const shouldOpen =
            !service.classList.contains("service--open");

          services.forEach((item) => {
            setService(item, item === service && shouldOpen);
          });
        });
      });
    });

    /* ---------------- FAQ ---------------- */

    run("faq", () => {
      // Открытие и закрытие выполняет нативный <details>.
      // JS обеспечивает один открытый ответ одновременно.
      const items = $$(".faq__item");

      items.forEach((item) => {
        item.addEventListener("toggle", () => {
          if (!item.open) return;

          items.forEach((other) => {
            if (other !== item) other.open = false;
          });
        });
      });
    });

    /* ---------------- Якоря и выбор услуги ---------------- */

    const contactForm = $("#contact-form");
    let selectedService = "";
    let contactName = "";

    function setServiceChoice(service) {
      if (!contactForm || !service) return;

      selectedService = service;

      let field = $('input[name="service"]', contactForm);

      if (!field) {
        field = document.createElement("input");
        field.type = "hidden";
        field.name = "service";
        contactForm.append(field);
      }

      field.value = service;

      const feedback = $(".contact__feedback", contactForm);
      if (feedback) feedback.textContent = `Послуга: ${service}`;
    }

    function scrollToSection(target) {
      const top = Math.max(
        0,
        target.getBoundingClientRect().top + window.scrollY - 24
      );

      window.scrollTo({
        top,
        behavior: scrollBehavior(),
      });

      const hadTabindex = target.hasAttribute("tabindex");

      if (!hadTabindex) {
        target.setAttribute("tabindex", "-1");

        target.addEventListener(
          "blur",
          () => target.removeAttribute("tabindex"),
          { once: true }
        );
      }

      target.focus({ preventScroll: true });
    }

    document.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const link = event.target.closest('a[href^="#"]');
      if (!link || link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;

      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      let id;

      try {
        id = decodeURIComponent(hash.slice(1));
      } catch {
        return;
      }

      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();

      if (link.dataset.service) {
        setServiceChoice(link.dataset.service);
      }

      closeMenu(false);
      closeProject();

      try {
        if (location.hash !== hash) {
          history.pushState(null, "", hash);
        }
      } catch {
        // Прокрутка работает и при ограничении History API.
      }

      requestAnimationFrame(() => scrollToSection(target));
    });

    /* ---------------- Портреты клиентов ---------------- */

    run("reviews", () => {
      const people = $(".review__people");
      const previous = $(".review__previous");
      const next = $(".review__next");
      const status = $("#review-status");

      if (!people || !previous || !next) return;

      const figures = $$("figure", people);
      if (!figures.length) return;

      function updateControls() {
        const max = Math.max(
          0,
          people.scrollWidth - people.clientWidth
        );

        previous.disabled = people.scrollLeft <= 2;
        next.disabled = people.scrollLeft >= max - 2;

        previous.setAttribute(
          "aria-disabled",
          String(previous.disabled)
        );

        next.setAttribute(
          "aria-disabled",
          String(next.disabled)
        );
      }

      function move(direction) {
        const gap = parseFloat(getComputedStyle(people).columnGap) || 0;
        const step = figures[0].getBoundingClientRect().width + gap;

        people.scrollBy({
          left: direction * step,
          behavior: scrollBehavior(),
        });
      }

      previous.addEventListener("click", () => move(-1));
      next.addEventListener("click", () => move(1));

      let statusTimer;

      people.addEventListener(
        "scroll",
        () => {
          updateControls();
          clearTimeout(statusTimer);

          statusTimer = setTimeout(() => {
            if (!status) return;

            const left = people.getBoundingClientRect().left;
            let nearest = 0;
            let distance = Infinity;

            figures.forEach((figure, index) => {
              const current = Math.abs(
                figure.getBoundingClientRect().left - left
              );

              if (current < distance) {
                distance = current;
                nearest = index;
              }
            });

            status.textContent =
              `Портрет ${nearest + 1} із ${figures.length}`;
          }, 180);
        },
        { passive: true }
      );

      window.addEventListener("resize", updateControls);

      if ("ResizeObserver" in window) {
        const observer = new ResizeObserver(updateControls);
        observer.observe(people);
      }

      updateControls();
    });

    /* ---------------- Формы ---------------- */

    run("forms", () => {
      const customForm = $("#custom-form");

      customForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!customForm.reportValidity() || !contactForm) return;

        const data = new FormData(customForm);
        contactName = String(data.get("name") || "").trim();

        const email = $('input[name="email"]', contactForm);
        if (email) email.value = String(data.get("email") || "").trim();

        setServiceChoice("Індивідуальна розробка");

        const message = $('textarea[name="message"]', contactForm);

        if (message && !message.value.trim()) {
          message.value =
            `Вітаю! Мене звати ${contactName}. ` +
            "Хочу обговорити індивідуальну розробку.\n\n";
        }

        scrollToSection($("#contact") || contactForm);
        message?.focus({ preventScroll: true });
      });

      contactForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!contactForm.reportValidity()) return;

        const data = new FormData(contactForm);
        const email = String(data.get("email") || "").trim();
        const phone = String(data.get("phone") || "").trim();
        const message = String(data.get("message") || "").trim();
        const budget = String(data.get("budget") || "");

        const messageField = $('textarea[name="message"]', contactForm);

        if (!message) {
          messageField?.setCustomValidity("Опишіть ваш проєкт.");
          messageField?.reportValidity();
          return;
        }

        const subject = selectedService
          ? `WEBISEN — ${selectedService}`
          : "WEBISEN — новий проєкт";

        const body = [
          contactName ? `Ім’я: ${contactName}` : "",
          `Email: ${email}`,
          phone ? `Телефон: ${phone}` : "",
          selectedService ? `Послуга: ${selectedService}` : "",
          budget ? `Бюджет: ${budget}` : "",
          "",
          message,
        ]
          .filter((line) => line !== "")
          .join("\n");

        const feedback = $(".contact__feedback", contactForm);

        if (feedback) {
          feedback.textContent =
            "Лист підготовлено. Надішліть його у своїй поштовій " +
            "програмі. Якщо вона не відкрилася, напишіть на " +
            "webisen.office@gmail.com.";
        }

        window.location.href =
          "mailto:webisen.office@gmail.com" +
          `?subject=${encodeURIComponent(subject)}` +
          `&body=${encodeURIComponent(body)}`;
      });

      $('textarea[name="message"]', contactForm || document)
        ?.addEventListener("input", (event) => {
          event.target.setCustomValidity("");
        });
    });

    /* ---------------- Появление блоков ---------------- */

    run("reveal", () => {
      const elements = $$("[data-reveal]");

      function showAll() {
        elements.forEach((element) => {
          element.classList.add("is-visible");
        });
      }

      if (
        reducedMotion.matches ||
        !("IntersectionObserver" in window)
      ) {
        showAll();
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0,
          rootMargin: "0px 0px -24px 0px",
        }
      );

      elements.forEach((element) => {
        element.classList.add("reveal-ready");
        observer.observe(element);
      });

      watchMedia(reducedMotion, () => {
        if (!reducedMotion.matches) return;
        observer.disconnect();
        showAll();
      });
    });

    /* ---------------- Анимация чисел ---------------- */

    run("counters", () => {
      if (
        reducedMotion.matches ||
        !("IntersectionObserver" in window)
      ) {
        return;
      }

      const containers = $$([
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
      ].join(","));

      function animateText(node) {
        const original = node.nodeValue;
        const pattern = /\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?/g;
        const matches = [...original.matchAll(pattern)];

        if (!matches.length) return;

        const started = performance.now();

        function frame(now) {
          if (!node.isConnected) return;

          const progress = reducedMotion.matches
            ? 1
            : clamp((now - started) / 1100);

          if (progress >= 1) {
            node.nodeValue = original;
            return;
          }

          const eased = 1 - Math.pow(1 - progress, 4);

          node.nodeValue = original.replace(pattern, (raw) => {
            const separator = raw.includes(",")
              ? ","
              : raw.includes(".")
                ? "."
                : null;

            const decimals = separator
              ? raw.split(separator)[1].length
              : 0;

            const grouping = raw.match(/[ \u00a0]/)?.[0] || "";
            const value = Number(
              raw.replace(/[ \u00a0]/g, "").replace(",", ".")
            );

            if (!Number.isFinite(value)) return raw;

            let [whole, fraction] =
              (value * eased).toFixed(decimals).split(".");

            if (grouping) {
              whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, grouping);
            }

            return fraction === undefined
              ? whole
              : `${whole}${separator}${fraction}`;
          });

          requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            observer.unobserve(entry.target);

            const walker = document.createTreeWalker(
              entry.target,
              NodeFilter.SHOW_TEXT
            );

            const nodes = [];

            while (walker.nextNode()) {
              if (/\d/.test(walker.currentNode.nodeValue)) {
                nodes.push(walker.currentNode);
              }
            }

            nodes.forEach(animateText);
          });
        },
        { threshold: 0.15 }
      );

      containers.forEach((element) => observer.observe(element));
    });

    /* ---------------- Karaoke-заголовки ---------------- */

    const headings = [];

    run("karaoke", () => {
      $$(".mission h2, .section-title, .team__title, .custom__copy h3")
        .forEach((heading) => {
          const walker = document.createTreeWalker(
            heading,
            NodeFilter.SHOW_TEXT
          );

          const nodes = [];

          while (walker.nextNode()) {
            const node = walker.currentNode;

            if (
              node.nodeValue.trim() &&
              !node.parentElement.closest(".karaoke-word")
            ) {
              nodes.push(node);
            }
          }

          nodes.forEach((node) => {
            const fragment = document.createDocumentFragment();

            node.nodeValue.split(/(\s+)/).forEach((part) => {
              if (!part) return;

              if (/^\s+$/.test(part)) {
                fragment.append(document.createTextNode(part));
                return;
              }

              const word = document.createElement("span");
              const ink = document.createElement("span");

              word.className = "karaoke-word";
              ink.className = "karaoke-ink";
              ink.textContent = part;

              word.append(ink);
              fragment.append(word);
            });

            node.replaceWith(fragment);
          });

          heading.classList.add("webisen-karaoke");

          headings.push({
            element: heading,
            words: $$(".karaoke-ink", heading),
          });
        });
    });

    /* ---------------- Параллакс и кнопка вверх ---------------- */

    const parallax = [
      [".intro__glow", 15],
      [".team__photo", 24],
      [".portfolio__art img:first-child", 26],
      [".portfolio__art img:last-child", -18],
      [".custom__cards", 18],
    ]
      .map(([selector, strength]) => ({
        element: $(selector),
        strength,
      }))
      .filter(({ element }) => element);

    parallax.forEach(({ element }) => {
      element.classList.add("webisen-parallax");
    });

    const backTop = $(".back-top");
    let motionFrame = 0;

    function updateMotion() {
      motionFrame = 0;

      const height = window.innerHeight;
      const reduced = reducedMotion.matches;

      backTop?.classList.toggle(
        "back-top--visible",
        window.scrollY > 500
      );

      headings.forEach(({ element, words }) => {
        const rect = element.getBoundingClientRect();

        const progress = reduced
          ? 1
          : clamp((height * 0.88 - rect.top) / (height * 0.57));

        words.forEach((word, index) => {
          const value = reduced
            ? 1
            : clamp(progress * (words.length + 1) - index);

          word.style.setProperty(
            "--karaoke-progress",
            value.toFixed(3)
          );
        });
      });

      parallax.forEach(({ element, strength }) => {
        if (reduced || !finePointer.matches) {
          element.style.setProperty("--webisen-depth", "0px");
          return;
        }

        const rect = element.getBoundingClientRect();
        const previous =
          parseFloat(element.style.getPropertyValue("--webisen-depth")) ||
          0;

        // Вычитаем применённое смещение, чтобы не было обратной связи.
        const center = rect.top - previous + rect.height / 2;
        const distance = clamp(
          (height / 2 - center) / (height + rect.height),
          -0.5,
          0.5
        );

        element.style.setProperty(
          "--webisen-depth",
          `${(distance * strength * 2).toFixed(1)}px`
        );
      });
    }

    function requestMotion() {
      if (motionFrame) return;
      motionFrame = requestAnimationFrame(updateMotion);
    }

    window.addEventListener("scroll", requestMotion, { passive: true });
    window.addEventListener("resize", requestMotion, { passive: true });
    window.addEventListener("load", requestMotion, { once: true });

    watchMedia(reducedMotion, requestMotion);
    watchMedia(finePointer, requestMotion);

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(requestMotion);
      observer.observe(document.body);
    }

    document.fonts?.ready.then(requestMotion);
    requestMotion();

    /* ---------------- Карточки первого экрана ---------------- */

    run("hero pointer", () => {
      const intro = $(".intro");
      const cards = $(".intro__cards");
      if (!intro || !cards) return;

      let frame = 0;
      let x = 0;
      let y = 0;

      function render() {
        frame = 0;

        // translate не перезаписывает исходный transform из CSS.
        cards.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      }

      function schedule() {
        if (!frame) frame = requestAnimationFrame(render);
      }

      function reset() {
        x = 0;
        y = 0;
        schedule();
      }

      intro.addEventListener("pointermove", (event) => {
        if (reducedMotion.matches || !finePointer.matches) return;

        const rect = intro.getBoundingClientRect();

        x = (clamp((event.clientX - rect.left) / rect.width) - 0.5) * 18;
        y = (clamp((event.clientY - rect.top) / rect.height) - 0.5) * 14;

        schedule();
      });

      intro.addEventListener("pointerleave", reset);
      watchMedia(reducedMotion, reset);
      watchMedia(finePointer, reset);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();