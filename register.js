import { db } from "./firebase.js";

import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document
  .getElementById("registerBtn")
  .addEventListener("click", async () => {

    const name =
      document.getElementById("name").value.trim();

    const mobile =
      document.getElementById("mobile").value.trim();

    const password =
      document.getElementById("password").value.trim();

    if (!name || !mobile || !password) {
      alert("Fill all fields");
      return;
    }

    try {

      await addDoc(collection(db, "users"), {
        name,
        mobile,
        password,
        balance: 0,
        winning: 0,
        status: "Active",
        createdAt: Date.now(),
        fcmToken: ""
      });

      alert("Registration Successful");

    } catch (error) {

      console.error(error);
      alert("Registration Failed");

    }

});