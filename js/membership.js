const API_BASE_URL = "http://localhost:8080/api/v1";

const planCards = document.querySelectorAll(".plan-card");
const selectedPlanText = document.getElementById("selectedPlanText");
const startPlanBtn = document.getElementById("startPlanBtn");

let selectedPlan = null;

function getLoggedInUser() {
  const user = localStorage.getItem("stableUser");

  if (!user) {
    return null;
  }

  return JSON.parse(user);
}

planCards.forEach((card) => {
  card.addEventListener("click", () => {
    planCards.forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");

    selectedPlan = card.dataset.plan;

    selectedPlanText.textContent =
      `Kamu memilih paket ${selectedPlan}. Free trial akan memakai fitur paket 1 bulan.`;

    startPlanBtn.textContent = "Claim Free Trial";
  });
});

startPlanBtn.addEventListener("click", async () => {
  const user = getLoggedInUser();

  if (!user) {
    selectedPlanText.textContent =
      "Silakan login terlebih dahulu untuk claim free trial.";
    return;
  }

  try {
    startPlanBtn.disabled = true;
    startPlanBtn.textContent = "Claiming...";

    const response = await fetch(`${API_BASE_URL}/membership/trial`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.id,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      selectedPlanText.textContent = result.message || "Free trial gagal diklaim.";
      return;
    }

    selectedPlanText.textContent =
      "Free trial berhasil diklaim. Kamu mendapatkan akses trial fitur 1 bulan.";

    startPlanBtn.textContent = "Trial Claimed";
  } catch (error) {
    selectedPlanText.textContent =
      "Tidak bisa terhubung ke server. Pastikan backend sedang berjalan.";
  } finally {
    startPlanBtn.disabled = false;
  }
});