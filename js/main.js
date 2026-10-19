(() => {
  "use strict";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const menu = document.querySelector(".header__nav");
  const toggle = document.querySelector(".header__toggle");
  const setMenu = (open) => {
    menu.classList.toggle("header__nav--open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () =>
    setMenu(toggle.getAttribute("aria-expanded") !== "true"),
  );
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".header")) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      setMenu(false);
      toggle.focus();
    }
  });
  matchMedia("(min-width: 1101px)").addEventListener("change", (event) => {
    if (event.matches) setMenu(false);
  });

  // Reveal once; disconnect observed elements after their first entrance.
  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((element) => {
      element.classList.add("reveal-ready");
      observer.observe(element);
    });
    reducedMotion.addEventListener("change", (event) => {
      if (event.matches) {
        observer.disconnect();
        document
          .querySelectorAll(".reveal-ready")
          .forEach((el) => el.classList.add("is-visible"));
      }
    });
  }

  const intro = document.querySelector(".intro");
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    intro.addEventListener(
      "pointermove",
      (event) => {
        if (reducedMotion.matches) return;
        const rect = intro.getBoundingClientRect();
        intro.style.setProperty(
          "--pointer-x",
          `${((event.clientX - rect.left) / rect.width - 0.5) * 16}px`,
        );
        intro.style.setProperty(
          "--pointer-y",
          `${((event.clientY - rect.top) / rect.height - 0.5) * 10}px`,
        );
      },
      { passive: true },
    );
    intro.addEventListener("pointerleave", () => {
      intro.style.setProperty("--pointer-x", "0px");
      intro.style.setProperty("--pointer-y", "0px");
    });
  }

  const services = [...document.querySelectorAll(".service")];
  function setService(service, open) {
    service.classList.toggle("service--open", open);
    service
      .querySelector(".service__toggle")
      .setAttribute("aria-expanded", String(open));
    service.querySelector(".service__body").inert = !open;
  }
  services.forEach((service) =>
    service.querySelector(".service__toggle").addEventListener("click", () => {
      const open = !service.classList.contains("service--open");
      services.forEach((item) => setService(item, item === service && open));
    }),
  );

  const dialog = document.querySelector(".case-dialog");
  let previousOverflow = "";
  document.querySelectorAll("[data-case]").forEach((button) =>
    button.addEventListener("click", () => {
      const source = button.querySelector(".project__visual img");
      dialog.querySelector("h2").textContent = button.querySelector(
        ".project__caption span",
      ).textContent;
      const preview = dialog.querySelector(".case-dialog__image");
      preview.src = source.src;
      preview.alt = source.alt;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();
    }),
  );
  dialog
    .querySelector(".case-dialog__close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
  dialog.querySelector("a").addEventListener("click", () => dialog.close());

  const portraits = document.querySelector(".review__people");
  const prev = document.querySelector(".review__previous");
  const next = document.querySelector(".review__next");
  const updatePortraits = () => {
    prev.disabled = portraits.scrollLeft < 2;
    next.disabled =
      portraits.scrollLeft + portraits.clientWidth >= portraits.scrollWidth - 2;
  };
  const movePortraits = (direction) => {
    portraits.scrollBy({
      left:
        direction *
        (portraits.firstElementChild.getBoundingClientRect().width + 20),
      behavior: reducedMotion.matches ? "instant" : "smooth",
    });
  };
  prev.addEventListener("click", () => movePortraits(-1));
  next.addEventListener("click", () => movePortraits(1));
  portraits.addEventListener("scroll", updatePortraits, { passive: true });
  new ResizeObserver(updatePortraits).observe(portraits);
  updatePortraits();

  const contact = document.querySelector("#contact-form");
  document.querySelectorAll("[data-service]").forEach((link) =>
    link.addEventListener("click", () => {
      const message = contact.elements.message;
      if (!message.value.trim())
        message.value = `I'm interested in ${link.dataset.service.toLowerCase()}.\n\nProject details: `;
    }),
  );
  document.querySelector("#custom-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    if (!contact.elements.email.value)
      contact.elements.email.value = fields.get("email");
    if (!contact.elements.message.value.trim())
      contact.elements.message.value = `Hello! My name is ${fields.get("name")}. I'd like to discuss a custom project.\n\nProject details: `;
    document
      .querySelector("#contact")
      .scrollIntoView({
        behavior: reducedMotion.matches ? "instant" : "smooth",
      });
    contact.elements.message.focus({ preventScroll: true });
  });
  contact.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(contact);
    const body = `Email: ${data.get("email")}\nPhone: ${data.get("phone") || "Not provided"}\nBudget: ${data.get("budget")}\n\n${data.get("message")}`;
    const mailto = `mailto:support@webisen.com?subject=${encodeURIComponent("New WEBISEN project inquiry")}&body=${encodeURIComponent(body)}`;
    const status = contact.querySelector(".contact__feedback");
    status.textContent =
      "Your inquiry is prepared. Complete sending in your email app. If it did not open, email support@webisen.com directly.";
    window.location.href = mailto;
  });

  const topLink = document.querySelector(".back-top");
  const topObserver = new IntersectionObserver((entries) =>
    topLink.classList.toggle("back-top--visible", !entries[0].isIntersecting),
  );
  topObserver.observe(intro);
})();
