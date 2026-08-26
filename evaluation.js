// ==========================================================
// evaluation.js — RRU Repair Evaluation System
// ==========================================================
const LIFF_ID = "2007495650-QYp0MBBk";
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx6BZKTTBGM_9hQDdnVOLoGG6tWo9fhIdRZV57kVoAmg9kdzbwjC7jA3kn-j3N5iJz9/exec";

function getParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  let val = urlParams.get(param);
  if (!val && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    val = hashParams.get(param);
  }
  return val || '';
}

const ticketId = getParam('ticketId');

function closeAppWindow() {
  if (typeof liff !== 'undefined' && liff.isInClient && liff.isInClient()) {
    liff.closeWindow();
  } else {
    window.close();
  }
}

function showError(msg) {
  const loading = document.getElementById('loadingState') || document.getElementById('loading');
  const form = document.getElementById('evaluationForm');
  const thankYou = document.getElementById('thankYouState') || document.getElementById('thankYouMessage');
  const errState = document.getElementById('errorState');
  const errMsg = document.getElementById('errorMessage');

  if (loading) loading.classList.add('hidden');
  if (form) form.classList.add('hidden');
  if (thankYou) thankYou.classList.add('hidden');
  if (errState) {
    errState.classList.remove('hidden');
    if (errMsg) errMsg.textContent = msg;
  } else if (loading) {
    loading.innerHTML = `<p class="text-red-500 font-bold text-center">เกิดข้อผิดพลาด: ${msg}</p>`;
    loading.classList.remove('hidden');
  }
}

async function loadTicketData() {
  if (!ticketId) {
    showError('ไม่พบรหัสใบแจ้งซ่อม (Ticket ID)');
    return;
  }

  const ticketIdEl = document.getElementById('ticketIdText') || document.getElementById('info-ticketId');
  if (ticketIdEl) ticketIdEl.textContent = ticketId;

  try {
    const res = await fetch(`${SCRIPT_URL}?action=getEvaluationData&ticketId=${encodeURIComponent(ticketId)}`);
    const json = await res.json();

    if (json.error) {
      showError(json.error);
      return;
    }

    const loading = document.getElementById('loadingState') || document.getElementById('loading');
    const form = document.getElementById('evaluationForm');
    const alreadyEval = document.getElementById('alreadyEvaluatedState');
    const thankYou = document.getElementById('thankYouState') || document.getElementById('thankYouMessage');

    if (json.alreadyEvaluated) {
      if (loading) loading.classList.add('hidden');
      if (alreadyEval) alreadyEval.classList.remove('hidden');
      else if (thankYou) thankYou.classList.remove('hidden');
      return;
    }

    if (json.repairData) {
      const r = json.repairData;
      const equipEl = document.getElementById('equipmentNameText') || document.getElementById('info-equipmentName');
      const opEl = document.getElementById('technicianNameText') || document.getElementById('info-operator');
      if (equipEl) equipEl.textContent = r['ชื่อครุภัณฑ์'] || r.equipmentName || '-';
      if (opEl) opEl.textContent = r['ผู้ปฏิบัติงาน'] || r.operator || 'เจ้าหน้าที่ IT';
    }

    if (loading) loading.classList.add('hidden');
    if (form) form.classList.remove('hidden');

  } catch (e) {
    console.warn('Cannot fetch evaluation data:', e);
    const loading = document.getElementById('loadingState') || document.getElementById('loading');
    const form = document.getElementById('evaluationForm');
    if (loading) loading.classList.add('hidden');
    if (form) form.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof liff !== 'undefined') {
    liff.init({ liffId: LIFF_ID })
      .then(() => loadTicketData())
      .catch(err => {
        console.warn('LIFF init warning:', err);
        loadTicketData();
      });
  } else {
    loadTicketData();
  }

  const form = document.getElementById('evaluationForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const scoreRadio = this.querySelector('input[name="overall"]:checked');
      const score = scoreRadio ? scoreRadio.value : '';

      if (!score) {
        Swal.fire({
          icon: 'warning',
          title: 'กรุณาเลือกคะแนน',
          text: 'โปรดเลือกดาวระดับความพึงพอใจก่อนส่งแบบประเมิน',
          confirmButtonColor: '#2c7744'
        });
        return;
      }

      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> กำลังบันทึก...';
      }

      const commentEl = document.getElementById('comments') || document.getElementById('feedback-comments') || this.elements['comments'];
      const payload = {
        action: 'submitEvaluation',
        ticketId: ticketId,
        overallScore: parseInt(score),
        comments: (commentEl ? commentEl.value : '').trim()
      };

      try {
        const res = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (result.success) {
          form.classList.add('hidden');
          const thankYou = document.getElementById('thankYouState') || document.getElementById('thankYouMessage');
          if (thankYou) thankYou.classList.remove('hidden');

          setTimeout(() => {
            closeAppWindow();
          }, 2500);
        } else {
          throw new Error(result.message || 'บันทึกไม่สำเร็จ');
        }
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err.message,
          confirmButtonColor: '#2c7744'
        });
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>ส่งแบบประเมิน</span>';
        }
      }
    });
  }
});
