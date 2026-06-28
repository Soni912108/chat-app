(function () {
  function ensureModalRoot() {
    let root = document.getElementById("profile-modal-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "profile-modal-root";
      document.body.appendChild(root);
    }
    return root;
  }

  function closeModal(overlay) {
    if (overlay && overlay.__escapeHandler) {
      document.removeEventListener("keydown", overlay.__escapeHandler);
      overlay.__escapeHandler = null;
    }
    overlay.remove();
  }

  function buildModal(titleText) {
    const root = ensureModalRoot();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const modal = document.createElement("section");
    modal.className = "modal-panel profile-modal-panel";

    const heading = document.createElement("h2");
    heading.textContent = titleText;

    const body = document.createElement("div");
    body.className = "profile-modal-body";

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    modal.appendChild(heading);
    modal.appendChild(body);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    root.appendChild(overlay);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) {
        closeModal(overlay);
      }
    });

    const onKeydown = event => {
      if (event.key === "Escape" && document.body.contains(overlay)) {
        closeModal(overlay);
      }
    };
    overlay.__escapeHandler = onKeydown;
    document.addEventListener("keydown", onKeydown);

    return { overlay, modal, body, actions };
  }

  async function updateTheme(theme) {
    await withGlobalLoading(async () => {
      const response = await fetch("/api/users/me/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ theme })
      });

      if (response.status === 401) {
        handleAuthExpired();
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update theme");
      }

      applyTheme(data.settings || { theme });
      showToast("Theme updated", "success");
    }, "Updating theme...");
  }

  async function updateProfileData(username, email) {
    await withGlobalLoading(async () => {
      const response = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email })
      });

      if (response.status === 401) {
        handleAuthExpired();
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      showToast(data.message || "Profile updated successfully", "success");
      window.location.reload();
    }, "Updating profile...");
  }

  function openThemeModal() {
    const { overlay, body, actions } = buildModal("Choose theme");
    const currentTheme = document.body.classList.contains("dark-theme") ? "dark" : "light";

    const description = document.createElement("p");
    description.textContent = "Pick the theme you want to use.";
    body.appendChild(description);

    const choices = document.createElement("div");
    choices.className = "profile-theme-choices";

    const lightButton = document.createElement("button");
    lightButton.type = "button";
    lightButton.className = `nav-button ${currentTheme === "light" ? "is-active" : ""}`;
    lightButton.textContent = "Light";
    lightButton.addEventListener("click", async () => {
      closeModal(overlay);
      await updateTheme("light");
    });

    const darkButton = document.createElement("button");
    darkButton.type = "button";
    darkButton.className = `nav-button ${currentTheme === "dark" ? "is-active" : ""}`;
    darkButton.textContent = "Dark";
    darkButton.addEventListener("click", async () => {
      closeModal(overlay);
      await updateTheme("dark");
    });

    choices.appendChild(lightButton);
    choices.appendChild(darkButton);
    body.appendChild(choices);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "nav-button";
    cancelButton.textContent = "Close";
    cancelButton.addEventListener("click", () => closeModal(overlay));

    actions.appendChild(cancelButton);
  }

  function openEditProfileModal() {
    const { overlay, body, actions } = buildModal("Edit profile");
    const usernameSource = document.getElementById("profile-username");
    const emailSource = document.getElementById("email");
    const currentUsername = usernameSource ? usernameSource.textContent.trim() : "";
    const currentEmail = emailSource ? emailSource.textContent.replace(/^Email:\s*/i, "").trim() : "";

    const description = document.createElement("p");
    description.textContent = "Update your username and email.";
    body.appendChild(description);

    const form = document.createElement("form");
    form.className = "profile-modal-form";

    const fields = [
      { id: "profile-username-input", label: "Username", type: "text", value: currentUsername },
      { id: "profile-email-input", label: "Email", type: "email", value: currentEmail }
    ];

    fields.forEach(field => {
      const wrapper = document.createElement("div");
      wrapper.className = "modal-field";

      const label = document.createElement("label");
      label.setAttribute("for", field.id);
      label.textContent = field.label;

      const input = document.createElement("input");
      input.type = field.type;
      input.id = field.id;
      input.required = true;
      input.value = field.value;

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      form.appendChild(wrapper);
    });

    const error = document.createElement("p");
    error.className = "modal-error";
    form.appendChild(error);

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "nav-button";
    submitButton.textContent = "Save changes";
    form.appendChild(submitButton);

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const nextUsername = form.querySelector("#profile-username-input").value.trim();
      const nextEmail = form.querySelector("#profile-email-input").value.trim();

      error.textContent = "";
      if (!nextUsername || !nextEmail) {
        error.textContent = "Username and email are required.";
        return;
      }

      try {
        await updateProfileData(nextUsername, nextEmail);
        closeModal(overlay);
      } catch (err) {
        error.textContent = err.message || "Failed to update profile.";
      }
    });

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "nav-button";
    cancelButton.textContent = "Close";
    cancelButton.addEventListener("click", () => closeModal(overlay));

    body.appendChild(form);
    actions.appendChild(cancelButton);
  }

  async function openPasswordModal() {
    const { overlay, body, actions } = buildModal("Change password");

    const form = document.createElement("form");
    form.className = "profile-modal-form";

    const fields = [
      { id: "old-password", label: "Old password", type: "password" },
      { id: "new-password", label: "New password", type: "password" },
      { id: "repeat-password", label: "Repeat new password", type: "password" }
    ];

    fields.forEach(field => {
      const wrapper = document.createElement("div");
      wrapper.className = "modal-field";

      const label = document.createElement("label");
      label.setAttribute("for", field.id);
      label.textContent = field.label;

      const input = document.createElement("input");
      input.type = field.type;
      input.id = field.id;
      input.required = true;

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      form.appendChild(wrapper);
    });

    const error = document.createElement("p");
    error.className = "modal-error";
    form.appendChild(error);

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "nav-button";
    submitButton.textContent = "Change password";
    form.appendChild(submitButton);

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const oldPassword = form.querySelector("#old-password").value;
      const newPassword = form.querySelector("#new-password").value;
      const repeatPassword = form.querySelector("#repeat-password").value;

      error.textContent = "";

      if (newPassword !== repeatPassword) {
        error.textContent = "New passwords do not match.";
        return;
      }

      await withGlobalLoading(async () => {
        const response = await fetch("/api/auth/me/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ oldPassword, newPassword })
        });

        if (response.status === 401) {
          handleAuthExpired();
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          error.textContent = data.message || "Error changing password.";
          return;
        }

        closeModal(overlay);
        showToast("Password changed successfully", "success");
      }, "Changing password...");
    });

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "nav-button";
    cancelButton.textContent = "Close";
    cancelButton.addEventListener("click", () => closeModal(overlay));

    body.appendChild(form);
    actions.appendChild(cancelButton);

    const firstInput = form.querySelector("input");
    if (firstInput) {
      firstInput.focus();
    }
  }

  async function openAvatarModal() {
    const { overlay, body, actions } = buildModal("Update avatar");
    let selectedFile = null;

    const description = document.createElement("p");
    description.textContent = "Choose an image and upload it to update your avatar.";
    body.appendChild(description);

    const preview = document.createElement("img");
    preview.className = "profile-avatar-preview";
    preview.alt = "Avatar preview";
    preview.src = document.getElementById("profile-avatar")?.src || "/public/images/profile-circle.svg";
    body.appendChild(preview);

    const fileLabel = document.createElement("label");
    fileLabel.className = "nav-button profile-file-label";
    fileLabel.setAttribute("for", "profile-avatar-input");
    fileLabel.textContent = "Choose image";

    const fileName = document.createElement("p");
    fileName.className = "modal-file-name";
    fileName.textContent = "No image selected";

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.id = "profile-avatar-input";
    input.className = "profile-file-input";

    input.addEventListener("change", () => {
      selectedFile = input.files && input.files[0] ? input.files[0] : null;
      fileName.textContent = selectedFile ? selectedFile.name : "No image selected";

      if (selectedFile) {
        const objectUrl = URL.createObjectURL(selectedFile);
        preview.src = objectUrl;
        preview.onload = () => URL.revokeObjectURL(objectUrl);
      }
    });

    body.appendChild(fileLabel);
    body.appendChild(input);
    body.appendChild(fileName);

    const uploadButton = document.createElement("button");
    uploadButton.type = "button";
    uploadButton.className = "nav-button";
    uploadButton.textContent = "Upload avatar";
    uploadButton.disabled = true;

    input.addEventListener("change", () => {
      uploadButton.disabled = !selectedFile;
    });

    uploadButton.addEventListener("click", async () => {
      if (!selectedFile) {
        showToast("Choose an image first", "error");
        return;
      }

      const formData = new FormData();
      formData.append("avatar", selectedFile);

      await withGlobalLoading(async () => {
        const response = await fetch("/api/uploads/avatar", {
          method: "POST",
          credentials: "include",
          body: formData
        });

        if (response.status === 401) {
          handleAuthExpired();
          return;
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          showToast(data.message || "Error uploading avatar", "error");
          return;
        }

        closeModal(overlay);
        showToast("Avatar updated successfully", "success");
        window.location.reload();
      }, "Uploading avatar...");
    });

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "nav-button";
    cancelButton.textContent = "Close";
    cancelButton.addEventListener("click", () => closeModal(overlay));

    actions.appendChild(cancelButton);
    actions.appendChild(uploadButton);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const passwordButton = document.getElementById("changePasswordButton");
    const avatarButton = document.getElementById("updateAvatarButton");
    const themeButton = document.getElementById("themeButton");

    if (passwordButton) {
      passwordButton.addEventListener("click", openPasswordModal);
    }
    if (avatarButton) {
      avatarButton.addEventListener("click", openAvatarModal);
    }
    if (themeButton) {
      themeButton.addEventListener("click", openThemeModal);
    }

    const editProfileButton = document.getElementById("editProfileButton");
    if (editProfileButton) {
      editProfileButton.addEventListener("click", openEditProfileModal);
    }
  });
})();
