const BASE_URL = "http://localhost:8080/api/v1";

const inputs      = document.querySelectorAll('.otp-input');
const verifyBtn   = document.getElementById('verifyBtn');
const errorMsg    = document.getElementById('errorMsg');
const resendBtn   = document.getElementById('resendBtn');
const resendTimer = document.getElementById('resendTimer');

function parseErrorMessage(data, fallback = 'Something went wrong. Please try again.') {
  if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map(e => e.error).join(', ');
  }
  if (typeof data.message === 'string' && data.message) {
    return data.message;
  }
  return fallback;
}

async function sendCode() {
  const email = localStorage.getItem("pending_email");
  if (!email) return;
  try {
    await fetch(`${BASE_URL}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch (err) {
    console.error("Failed to send code:", err);
  }
}
sendCode();

inputs.forEach((input, i) => {
  input.addEventListener('input', (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    input.value = val;

    if (val) {
      input.classList.add('filled');
      input.classList.remove('error');
      if (i < inputs.length - 1) inputs[i + 1].focus();
    } else {
      input.classList.remove('filled');
    }

    checkComplete();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && i > 0) {
      inputs[i - 1].focus();
      inputs[i - 1].value = '';
      inputs[i - 1].classList.remove('filled');
    }
    if (e.key === 'ArrowLeft'  && i > 0)                  inputs[i - 1].focus();
    if (e.key === 'ArrowRight' && i < inputs.length - 1)  inputs[i + 1].focus();
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    paste.split('').forEach((char, idx) => {
      if (inputs[idx]) {
        inputs[idx].value = char;
        inputs[idx].classList.add('filled');
      }
    });
    const nextEmpty = [...inputs].findIndex(inp => !inp.value);
    if (nextEmpty !== -1) inputs[nextEmpty].focus();
    else inputs[inputs.length - 1].focus();
    checkComplete();
  });
});

function checkComplete() {
  const allFilled = [...inputs].every(inp => inp.value);
  verifyBtn.disabled = !allFilled;
}

function getOTPCode() {
  return [...inputs].map(inp => inp.value).join('');
}

function setError(msg) {
  errorMsg.style.color   = '#ff4d4d';
  errorMsg.textContent   = msg;
  inputs.forEach(inp => inp.classList.add('error'));
  setTimeout(() => inputs.forEach(inp => inp.classList.remove('error')), 600);
}

function clearError() {
  errorMsg.textContent = '';
}

verifyBtn.addEventListener('click', async () => {
  const code  = getOTPCode();
  const email = localStorage.getItem('pending_email') || '';

  if (code.length < 6) {
    setError('Please enter all 6 digits.');
    return;
  }

  verifyBtn.disabled    = true;
  verifyBtn.textContent = 'VERIFYING...';
  clearError();

  try {
    const res  = await fetch(`${BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();

    if (res.ok) {
      verifyBtn.textContent        = '✓ VERIFIED';
      verifyBtn.style.background   = '#50c878';
      verifyBtn.style.color        = '#fff';
      localStorage.removeItem('pending_email');
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 1200);
    } else {
      const msg = parseErrorMessage(data, 'Invalid code. Please try again.');
      setError(msg);
      verifyBtn.disabled    = false;
      verifyBtn.textContent = 'VERIFY EMAIL';
    }
  } catch (err) {
    console.error('Verify error:', err);
    setError('Connection error. Please try again.');
    verifyBtn.disabled    = false;
    verifyBtn.textContent = 'VERIFY EMAIL';
  }
});

let resendCooldown = 0;
let resendInterval = null;

function startResendTimer(seconds) {
  resendCooldown          = seconds;
  resendBtn.disabled      = true;
  resendTimer.textContent = `(${resendCooldown}s)`;

  resendInterval = setInterval(() => {
    resendCooldown--;
    resendTimer.textContent = `(${resendCooldown}s)`;
    if (resendCooldown <= 0) {
      clearInterval(resendInterval);
      resendBtn.disabled      = false;
      resendTimer.textContent = '';
    }
  }, 1000);
}

resendBtn.addEventListener('click', async () => {
  const email = localStorage.getItem('pending_email') || '';
  if (!email) {
    setError('Email not found. Please register again.');
    return;
  }

  resendBtn.disabled = true;
  clearError();

  try {
    const res = await fetch(`${BASE_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      errorMsg.style.color = '#50c878';
      errorMsg.textContent = 'Code resent successfully!';
      setTimeout(() => clearError(), 3000);
      startResendTimer(60);
    } else {
      const data = await res.json();
      const msg  = parseErrorMessage(data, 'Failed to resend. Try again.');
      setError(msg);
      resendBtn.disabled = false;
    }
  } catch (err) {
    console.error('Resend error:', err);
    setError('Connection error. Please try again.');
    resendBtn.disabled = false;
  }
});

verifyBtn.disabled = true;
inputs[0].focus();
startResendTimer(60);