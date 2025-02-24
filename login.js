loginBtn.addEventListener("click", (e) => {
  const username = document.querySelector("#usernameInput").value;
  const password = document.querySelector("#passwordInput").value;
  console.log("Username:", username, "Password:", password);
  if (username === "admin" && password === "X7m@9vY#qP2$L6dF") {
    localStorage.setItem("username", username);
    localStorage.setItem("password", password);
    loginModal.style.display = "none";
  } else {
    loginError.innerHTML = "Error! Wrong Username or Password";
    setTimeout(() => {
      loginError.innerHTML = "";
    }, 2500);
  }
});
if (
  localStorage.getItem("username") === "admin" &&
  localStorage.getItem("password") === "X7m@9vY#qP2$L6dF"
) {
  loginModal.style.display = "none";
}
