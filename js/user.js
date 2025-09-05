// --- ROLE CHECK ---
(async function checkUserAccess() {
  try {
    const user = await apiRequest("/auth/me");
    if (user.role === "admin") {
      window.location.href = "admin.html"; // redirect admins
    }
  } catch (err) {
    alert("Session expired. Please login again.");
    localStorage.removeItem("token");
    window.location.href = "index.html";
  }
})();

// --- LOAD AVAILABLE BOOKS ---
async function loadBooks() {
  const books = await apiRequest("/books");
  const bookList = document.getElementById("bookList");
  bookList.innerHTML = books.map(b => `
    <div class="book-card">
      <h4>${b.title} - ${b.author}</h4>
      <p>Total: ${b.total_copies} | Available: ${b.available_copies}</p>
      <button onclick="borrowBook(${b.id})" ${b.available_copies <= 0 ? "disabled" : ""}>
        Borrow
      </button>
    </div>
  `).join("");
}

// --- BORROW BOOK ---
async function borrowBook(bookId) {
  try {
    await apiRequest(`/borrow/${bookId}`, "POST");
    alert("Book borrowed!");
    loadBooks();
    loadMyBorrows();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// --- LOAD MY BORROWS ---
async function loadMyBorrows() {
  const borrows = await apiRequest("/borrow/my-borrows");
  const container = document.getElementById("myBorrows");

  if (borrows.length === 0) {
    container.innerHTML = "<p>You have no borrowed books.</p>";
    return;
  }

  container.innerHTML = borrows.map(b => `
    <div class="borrow-card">
      <h4>Book ID: ${b.book_id}</h4>
      <p>Borrowed at: ${new Date(b.borrowed_at).toLocaleString()}</p>
      <p>${b.returned_at ? "Returned at: " + new Date(b.returned_at).toLocaleString() : "Not returned"}</p>
      ${!b.returned_at ? `<button onclick="returnBook('${b.id}')">Return</button>` : ""}
    </div>
  `).join("");
}

// --- RETURN BOOK ---
async function returnBook(borrowId) {
  try {
    await apiRequest(`/borrow/${borrowId}/return`, "PATCH");
    alert("Book returned!");
    loadBooks();
    loadMyBorrows();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// --- LOGOUT ---
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "index.html";
});

// Initial load
loadBooks();
loadMyBorrows();