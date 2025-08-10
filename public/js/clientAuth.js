function login() {
   var e = document.getElementById("username").value,
      t = document.getElementById("password").value;
   const s = document.getElementById("errorMessage"),
      n = document.querySelector(".lds-spinner");
   n.style.display = "block", fetch("/api/auth/login", {
      method: "POST",
      headers: {
         "Content-Type": "application/json"
      },
      credentials: "include", // <-- Important: send cookies!
      body: JSON.stringify({
         username: e,
         password: t
      })
   }).then(e => (n.style.display = "none", e.ok ? e.json() : e.json().then(e => {
      throw new Error(e.message)
   }))).then(e => {
      if (!(e.userID && e.userName)) throw new Error("Invalid response format");
      // Only store user info, NOT the token
      sessionStorage.setItem("userID", e.userID);
      sessionStorage.setItem("username", e.userName);
      window.location.href = "/dashboard";
   }).catch(e => {
      "Failed to fetch" === e.message ? s.textContent = "Failed to login. Please try again later." : s.textContent = e.message, s.style.display = "block", n.style.display = "none"
   })
}

function register() {
   var e = document.getElementById("email").value,
      t = document.getElementById("username").value,
      s = document.getElementById("password").value;
   const n = document.getElementById("errorMessage"),
      o = document.querySelector(".lds-spinner");
   o.style.display = "block", fetch("/api/auth/register", {
      method: "POST",
      headers: {
         "Content-Type": "application/json"
      },
      credentials: "include", // <-- Important: send cookies!
      body: JSON.stringify({
         email: e,
         username: t,
         password: s
      })
   }).then(e => (o.style.display = "none", e.ok ? e.json() : e.json().then(e => {
      throw new Error(e.message)
   }))).then(e => {
      if (!(e.userID && e.userName)) throw new Error("Invalid response format");
      // Only store user info, NOT the token
      sessionStorage.setItem("userID", e.userID);
      sessionStorage.setItem("username", e.userName);
      window.location.href = "/dashboard";
   }).catch(e => {
      "Failed to fetch" === e.message ? n.textContent = "Failed to register. Please try again later." : n.textContent = e.message, n.style.display = "block", o.style.display = "none"
   })
}