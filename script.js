// ==========================================
// CONFIGURATION
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxU784rItV2QAx4-_NAKDyQz8ozfSGP4Cdhm5im7EC_Dh3MabUGn1C1RTUMxRknEzemA/exec"; 
const RAZORPAY_KEY_ID = "rzp_test_1a2b3c4d5e6f7g"; // Replace with your Razorpay Test Key

let userData = {};

// ==========================================
// STEP 1: SIGNUP & OTP REQUEST
// ==========================================
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  userData = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    seats: Number(document.getElementById("seats").value),
    pricePerSeat: 200
  };

  userData.amount = userData.seats * userData.pricePerSeat;

  const btn = document.getElementById("sendOtpBtn");
  btn.disabled = true;
  btn.textContent = "Sending OTP...";
  showStatus("Sending verification code to your email...", "info");

  try {
    const response = await callBackend({ action: "send_otp", email: userData.email });

    if (response.status === "success") {
      hideStatus();
      switchStep("signupForm", "otpForm");
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Send Verification OTP";
  }
});

// ==========================================
// STEP 2: VERIFY OTP
// ==========================================
document.getElementById("otpForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const otp = document.getElementById("otpInput").value.trim();
  const btn = document.getElementById("verifyOtpBtn");

  btn.disabled = true;
  btn.textContent = "Verifying...";

  try {
    const response = await callBackend({ 
      action: "verify_otp", 
      email: userData.email, 
      otp: otp 
    });

    if (response.status === "success") {
      hideStatus();
      
      document.getElementById("summarySeats").textContent = userData.seats;
      document.getElementById("summaryAmount").textContent = `₹${userData.amount}`;
      
      switchStep("otpForm", "stepPayment");
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Verify OTP & Proceed";
  }
});

// ==========================================
// STEP 3: RAZORPAY PAYMENT TRIGGER
// ==========================================
document.getElementById("payNowBtn").addEventListener("click", () => {
  const options = {
    key: RAZORPAY_KEY_ID,
    amount: userData.amount * 100, // Amount in paise
    currency: "INR",
    name: "Ticket Desk",
    description: `Event Entry Pass (${userData.seats} Seats)`,
    handler: async function (paymentResponse) {
      showStatus("Payment successful! Saving data & emailing pass...", "info");

      const payload = {
        action: "process_successful_payment",
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        seats: userData.seats,
        amount: userData.amount,
        paymentId: paymentResponse.razorpay_payment_id
      };

      try {
        const backendResult = await callBackend(payload);
        if (backendResult.status === "success") {
          hideStatus();
          switchStep("stepPayment", "stepSuccess");
        } else {
          throw new Error(backendResult.message);
        }
      } catch (err) {
        showStatus("Payment recorded, but data storage failed: " + err.message, "error");
      }
    },
    prefill: {
      name: userData.name,
      email: userData.email,
      contact: userData.phone
    },
    theme: { color: "#2563eb" },
    modal: {
      ondismiss: function () {
        showStatus("Payment process was cancelled by user.", "error");
      }
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================
async function callBackend(data) {
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data)
  });
  return await response.json();
}

function switchStep(hideId, showId) {
  document.getElementById(hideId).classList.add("hidden");
  document.getElementById(showId).classList.remove("hidden");
}

function showStatus(message, type) {
  const box = document.getElementById("statusBox");
  box.textContent = message;
  box.className = `status-box ${type}`;
  box.classList.remove("hidden");
  box.style.display = "block";
}

function hideStatus() {
  const box = document.getElementById("statusBox");
  box.classList.add("hidden");
  box.style.display = "none";
}

function testEmailPermission() {
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Test", "Permission Test");
}