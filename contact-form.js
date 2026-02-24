/**
 * Contact Form Handler
 * Posts to your local Express server at /api/contact
 */

function validateForm(fields) {
  let valid = true;

  const fnameErr = document.getElementById("fnameErr");
  if (!fields.fname.trim()) {
    fnameErr.classList.add("visible");
    document.getElementById("fname").setAttribute("aria-invalid", "true");
    valid = false;
  } else {
    fnameErr.classList.remove("visible");
    document.getElementById("fname").removeAttribute("aria-invalid");
  }

  const emailErr = document.getElementById("emailErr");
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email);
  if (!emailOk) {
    emailErr.classList.add("visible");
    document.getElementById("email").setAttribute("aria-invalid", "true");
    valid = false;
  } else {
    emailErr.classList.remove("visible");
    document.getElementById("email").removeAttribute("aria-invalid");
  }

  const messageErr = document.getElementById("messageErr");
  if (!fields.message.trim()) {
    messageErr.classList.add("visible");
    document.getElementById("message").setAttribute("aria-invalid", "true");
    valid = false;
  } else {
    messageErr.classList.remove("visible");
    document.getElementById("message").removeAttribute("aria-invalid");
  }

  return valid;
}

function setSubmitState(btn, state) {
  const states = {
    idle:    { text: "Send Message",       disabled: false, cls: "" },
    loading: { text: "Sending…",           disabled: true,  cls: "loading" },
    success: { text: "Message Sent ✓",     disabled: true,  cls: "success" },
    error:   { text: "Failed – Try Again", disabled: false, cls: "error" },
  };
  const s = states[state];
  btn.querySelector(".btn-text").textContent = s.text;
  btn.disabled = s.disabled;
  btn.className = "form-submit " + s.cls;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const submitBtn = document.getElementById("submitBtn");

  if (!submitBtn.querySelector(".btn-text")) {
    submitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" aria-hidden="true">
        <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
      </svg>
      <span class="btn-text">Send Message</span>
    `;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (form.elements["website"].value) return;

    const fields = {
      fname:   form.elements["fname"].value,
      lname:   form.elements["lname"].value,
      email:   form.elements["email"].value,
      subject: form.elements["subject"].value,
      message: form.elements["message"].value,
      website: form.elements["website"].value,
    };

    if (!validateForm(fields)) return;

    setSubmitState(submitBtn, "loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) throw new Error(data.errors?.join(" ") || "Server error");

      setSubmitState(submitBtn, "success");
      form.reset();
      setTimeout(() => setSubmitState(submitBtn, "idle"), 4000);
    } catch (err) {
      console.error("Submission error:", err);
      setSubmitState(submitBtn, "error");
      setTimeout(() => setSubmitState(submitBtn, "idle"), 4000);
    }
  });
});
