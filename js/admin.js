(async function checkAdminAccess() {
  try {
    const user = await apiRequest("/auth/me");
    if (user.role !== "admin") {
      alert("Access denied. Redirecting to user page...");
      window.location.href = "user.html";
    }
  } catch (err) {
    alert("Session expired. Please login again.");
    localStorage.removeItem("token");
    window.location.href = "index.html";
  }
})();
