import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const ADMIN_EMAIL = 'kevcameron@gmail.com'

serve(async (req) => {
  const { email, full_name } = await req.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'OLM Football <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: 'New Access Request – OLM Football App',
      html: `
        <h2>New Access Request</h2>
        <p><strong>${full_name}</strong> (${email}) has requested access to the OLM Football Pitch Fee Tracker.</p>
        <p>Open the app and go to <strong>Settings → Pending Approvals</strong> to approve or reject their request.</p>
      `,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status: res.status,
  })
})
