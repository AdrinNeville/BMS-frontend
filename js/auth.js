const API_URL = "http://localhost:8000";

// ====================== LOGIN ======================
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const loginButton = document.getElementById("loginButton");

  loginButton.disabled = true;
  loginButton.querySelector(".button-text").classList.add("hidden");
  loginButton.querySelector(".loading-spinner").classList.remove("hidden");

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error("Invalid credentials");

    const data = await res.json();
    const token = data.access_token;
    localStorage.setItem("token", token);

    const userRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) throw new Error("Failed to fetch user profile");

    const user = await userRes.json();
    localStorage.setItem("user", JSON.stringify(user));

    if (user.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "user.html";
    }
  } catch (err) {
    alert(err.message || "Login failed");
  } finally {
    loginButton.disabled = false;
    loginButton.querySelector(".button-text").classList.remove("hidden");
    loginButton.querySelector(".loading-spinner").classList.add("hidden");
  }
});

// ====================== REGISTER ======================
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();
  const agreeTerms = document.getElementById("agreeTerms").checked;
  const registerButton = document.getElementById("registerButton");

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  if (!agreeTerms) {
    alert("You must agree to the Terms & Privacy Policy");
    return;
  }

  registerButton.disabled = true;
  registerButton.querySelector(".button-text").classList.add("hidden");
  registerButton.querySelector(".loading-spinner").classList.remove("hidden");

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) throw new Error("Registration failed");

    alert("Registration successful! Logging you in...");

    // Auto-login after registration
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) throw new Error("Auto-login failed");

    const data = await loginRes.json();
    const token = data.access_token;
    localStorage.setItem("token", token);

    const userRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userRes.ok) throw new Error("Failed to fetch user profile");

    const user = await userRes.json();
    localStorage.setItem("user", JSON.stringify(user));

    if (user.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "user.html";
    }
  } catch (err) {
    alert(err.message || "Registration failed");
  } finally {
    registerButton.disabled = false;
    registerButton.querySelector(".button-text").classList.remove("hidden");
    registerButton.querySelector(".loading-spinner").classList.add("hidden");
  }
});

// ====================== AUTO-REDIRECT ======================
window.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const user = await res.json();
      if (user.role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "user.html";
      }
    }
  } catch (err) {
    console.warn("Auto login failed:", err);
  }
});