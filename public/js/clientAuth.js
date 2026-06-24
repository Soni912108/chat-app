function login() {
   var e = document.getElementById("username").value,
      t = document.getElementById("password").value;
   const n = document.querySelector(".lds-spinner");
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
      if (!e.userName) throw new Error("Invalid response format");
      window.location.href = "/dashboard";
   }).catch(e => {
      showToast("Failed to fetch" === e.message ? "Failed to login. Please try again later." : e.message, "error");
      n.style.display = "none";
   })
}

function register() {
   var e = document.getElementById("email").value,
      t = document.getElementById("username").value,
      s = document.getElementById("password").value;
   const o = document.querySelector(".lds-spinner");
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
      if (!e.userName) throw new Error("Invalid response format");
      window.location.href = "/dashboard";
   }).catch(e => {
      showToast("Failed to fetch" === e.message ? "Failed to register. Please try again later." : e.message, "error");
      o.style.display = "none";
   })
}
