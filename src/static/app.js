document.addEventListener("DOMContentLoaded", () => {
  const AUTH_TOKEN_KEY = "teacherAuthToken";
  const AUTH_USER_KEY = "teacherUsername";

  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const teacherAuthButton = document.getElementById("teacher-auth-button");
  const authStatus = document.getElementById("auth-status");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.getElementById("close-login-modal");

  function getTeacherToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  function getTeacherUsername() {
    return localStorage.getItem(AUTH_USER_KEY);
  }

  function setMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUi() {
    const teacherToken = getTeacherToken();
    const teacherUsername = getTeacherUsername();
    const isTeacherLoggedIn = Boolean(teacherToken);

    teacherAuthButton.textContent = isTeacherLoggedIn ? "👤 Logout" : "👤 Login";
    authStatus.textContent = isTeacherLoggedIn
      ? `Teacher mode: ${teacherUsername}`
      : "Student view";
    signupForm.querySelector("button[type='submit']").disabled = !isTeacherLoggedIn;
    signupForm.classList.toggle("disabled-form", !isTeacherLoggedIn);
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.setAttribute("aria-hidden", "false");
  }

  function closeLoginDialog() {
    loginModal.classList.add("hidden");
    loginModal.setAttribute("aria-hidden", "true");
    loginForm.reset();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      const isTeacherLoggedIn = Boolean(getTeacherToken());

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const deleteButton = isTeacherLoggedIn
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}" title="Unregister student">❌</button>`
                      : "";
                    return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    const teacherToken = getTeacherToken();

    if (!teacherToken) {
      setMessage("Only logged-in teachers can unregister students.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "X-Teacher-Token": teacherToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    const teacherToken = getTeacherToken();

    if (!teacherToken) {
      setMessage("Only logged-in teachers can register students.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "X-Teacher-Token": teacherToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("teacher-username").value;
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem(AUTH_TOKEN_KEY, result.token);
        localStorage.setItem(AUTH_USER_KEY, result.username);
        updateAuthUi();
        closeLoginDialog();
        fetchActivities();
        setMessage(`Logged in as ${result.username}.`, "success");
      } else {
        setMessage(result.detail || "Login failed.", "error");
      }
    } catch (error) {
      setMessage("Failed to login. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  closeLoginModal.addEventListener("click", closeLoginDialog);

  teacherAuthButton.addEventListener("click", () => {
    if (getTeacherToken()) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      updateAuthUi();
      fetchActivities();
      setMessage("Logged out of teacher mode.", "info");
      return;
    }

    openLoginModal();
  });

  // Initialize app
  updateAuthUi();
  fetchActivities();
});
