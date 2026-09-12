const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character])
const safeUrl = value => (value ? escapeHtml(value) : '')

const LOGO_HEADER = `
  <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 24px;text-align:center">
    <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,0.12);padding:10px 22px;border-radius:50px;border:1px solid rgba(255,255,255,0.2)">
     <div style="width:32px;height:32px;background:white;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;overflow:hidden">
      <img src="${safeUrl(process.env.LOGO_URL)}" alt="DocNest" style="width:24px;height:24px;object-fit:contain" />
       </div>
      <span style="color:white;font-size:20px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.5px">DocNest</span>
    </div>
    <p style="color:#c7d2fe;margin:10px 0 0;font-size:12px;font-family:Arial,sans-serif;letter-spacing:0.3px">Your Health, Our Priority</p>
  </div>`

const FOOTER = `
  <div style="background:#f8fafc;padding:18px;text-align:center;border-top:1px solid #e2e8f0">
    <div style="display:inline-flex;align-items:center;gap:6px;margin-bottom:6px">
    <img src="${safeUrl(process.env.LOGO_URL)}" alt="DocNest" style="height:30px;object-fit:contain;vertical-align:middle" />
      <span style="color:#64748b;font-size:13px;font-weight:600;font-family:Arial,sans-serif">DocNest</span>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin:0;font-family:Arial,sans-serif">© ${new Date().getFullYear()} DocNest. All rights reserved.</p>
    <p style="color:#cbd5e1;font-size:10px;margin:4px 0 0;font-family:Arial,sans-serif">This is an automated email. Please do not reply.</p>
  </div>`

export const appointmentBookedTemplate = ({ userName, doctorName, slotDate, slotTime, fees, currency = '₹' }) => ({
  subject: ' Appointment Booked — DocNest',
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">
      ${LOGO_HEADER}
      <div style="padding:32px 28px">
        <div style="display:inline-block;background:#dcfce7;border-radius:50px;padding:6px 14px;margin-bottom:16px">
          <span style="color:#16a34a;font-size:12px;font-weight:600"> Confirmed</span>
        </div>
        <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;font-weight:700">Appointment Booked!</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6">Hi <strong>${escapeHtml(userName)}</strong>, your appointment has been booked successfully. Here are your booking details:</p>
        
        <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #e2e8f0">
          <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
            <tr>
              <td style="padding:10px 0;color:#94a3b8;width:40%;border-bottom:1px solid #f1f5f9"> Doctor</td>
              <td style="padding:10px 0;font-weight:600;border-bottom:1px solid #f1f5f9">${escapeHtml(doctorName)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#94a3b8;border-bottom:1px solid #f1f5f9">
               <img src="${safeUrl(process.env.CAL_ICON)}" style="width:14px;height:14px;vertical-align:middle;margin-right:4px" /> Date
              </td>
              <td style="padding:10px 0;font-weight:600;border-bottom:1px solid #f1f5f9">${escapeHtml(slotDate)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#94a3b8;border-bottom:1px solid #f1f5f9">
               <img src="${safeUrl(process.env.CLOCK_ICON)}" style="width:14px;height:14px;vertical-align:middle;margin-right:4px" /> Time
              </td>
              <td style="padding:10px 0;font-weight:600;border-bottom:1px solid #f1f5f9">${escapeHtml(slotTime)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#94a3b8">
               <img src="${safeUrl(process.env.MONEY_ICON)}" style="width:14px;height:14px;vertical-align:middle;margin-right:4px" /> Fees
              </td>
              <td style="padding:10px 0;font-weight:700;color:#4F46E5">${escapeHtml(currency)}${escapeHtml(fees)}</td>
            </tr>
          </table>
        </div>

        <a href="${escapeHtml(process.env.FRONTEND_URL)}/my-appointments"
          style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;padding:13px 28px;border-radius:50px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px">
          View My Appointments →
        </a>
      </div>
      ${FOOTER}
    </div>`
})

export const appointmentCancelledTemplate = ({ userName, doctorName, slotDate, slotTime }) => ({
  subject: ' Appointment Cancelled — DocNest',
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">
      ${LOGO_HEADER}
      <div style="padding:32px 28px">
        <div style="display:inline-block;background:#fee2e2;border-radius:50px;padding:6px 14px;margin-bottom:16px">
          <span style="color:#dc2626;font-size:12px;font-weight:600"> Cancelled</span>
        </div>
        <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;font-weight:700">Appointment Cancelled</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6">Hi <strong>${escapeHtml(userName)}</strong>, your appointment has been cancelled. Here are the details of the cancelled booking:</p>

        <div style="background:#fef2f2;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #fecaca;border-left:4px solid #dc2626">
          <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
            <tr>
              <td style="padding:10px 0;color:#94a3b8;border-bottom:1px solid #f1f5f9">
              <img src="${safeUrl(process.env.DOC_ICON)}" style="width:14px;height:14px;vertical-align:middle;margin-right:4px" /> Doctor
              </td>
              <td style="padding:10px 0;font-weight:600;border-bottom:1px solid #fee2e2">${escapeHtml(doctorName)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#94a3b8;border-bottom:1px solid #f1f5f9">
              <img src="${safeUrl(process.env.CAL_ICON)}" style="width:14px;height:14px;vertical-align:middle;margin-right:4px" /> Date
              </td>
              <td style="padding:10px 0;font-weight:600;border-bottom:1px solid #fee2e2">${escapeHtml(slotDate)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#94a3b8;border-bottom:1px solid #f1f5f9">
              <img src="${safeUrl(process.env.CLOCK_ICON)}" style="width:14px;height:14px;vertical-align:middle;margin-right:4px" /> Time
              </td>
              <td style="padding:10px 0;font-weight:600">${escapeHtml(slotTime)}</td>
            </tr>
          </table>
        </div>

        <p style="color:#64748b;font-size:13px;margin:0 0 20px;line-height:1.6">Need to book a new appointment? We have many doctors available for you.</p>

        <a href="${escapeHtml(process.env.FRONTEND_URL)}/doctors"
          style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;padding:13px 28px;border-radius:50px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px">
          Book New Appointment →
        </a>
      </div>
      ${FOOTER}
    </div>`
})

export const paymentSuccessTemplate = ({ userName, doctorName, slotDate, slotTime, amount, currency = '₹', paymentId }) => ({
  subject: ' Payment Successful — DocNest',
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">
      ${LOGO_HEADER}
      <div style="padding:32px 28px">
        <div style="display:inline-block;background:#dcfce7;border-radius:50px;padding:6px 14px;margin-bottom:16px">
          <span style="color:#16a34a;font-size:12px;font-weight:600"> Payment Received</span>
        </div>
        <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;font-weight:700">Payment Successful!</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6">Hi <strong>${escapeHtml(userName)}</strong>, your payment has been received. Your appointment is confirmed!</p>

        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #bbf7d0;border-left:4px solid #16a34a">
          <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
            <tr>
              <td style="padding:10px 0;color:#94a3b8;width:40%;border-bottom:1px solid #dcfce7">🩺 Doctor</td>
              <td style="padding:10px 0;font-weight:600;border-bottom:1px solid #dcfce7">${escapeHtml(doctorName)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#94a3b8;border-bottom:1px solid #f1f5f9">
             <img src="${safeUrl(process.env.CAL_ICON)}" style="width:14px;height:14px;vertical-align:middle;margin-right:4px" /> Date
             </td>
              <td style="padding:10px 0;font-weight:600;border-bottom:1px solid #dcfce7">${escapeHtml(slotDate)}</td>
            </tr>
            <tr>
             <td style="padding:10px 0;color:#94a3b8;border-bottom:1px solid #f1f5f9">
             <img src="${safeUrl(process.env.CLOCK_ICON)}" style="width:14px;height:14px;vertical-align:middle;margin-right:4px" /> Time
              </td>
              <td style="padding:10px 0;font-weight:600;border-bottom:1px solid #dcfce7">${escapeHtml(slotTime)}</td>
            </tr>
            <tr>
             <td style="padding:10px 0;color:#94a3b8">
             <img src="${safeUrl(process.env.MONEY_ICON)}" style="width:14px;height:14px;vertical-align:middle;margin-right:4px" /> Fees
              </td>
              <td style="padding:10px 0;font-weight:700;color:#16a34a;border-bottom:1px solid #dcfce7">${escapeHtml(currency)}${escapeHtml(amount)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#94a3b8">🔖 Payment ID</td>
              <td style="padding:10px 0;font-size:11px;color:#64748b;word-break:break-all">${escapeHtml(paymentId)}</td>
            </tr>
          </table>
        </div>

        <a href="${escapeHtml(process.env.FRONTEND_URL)}/my-appointments"
          style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;padding:13px 28px;border-radius:50px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px">
          View My Appointments →
        </a>
      </div>
      ${FOOTER}
    </div>`
})