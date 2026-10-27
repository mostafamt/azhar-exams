# Auth emails plan: verification & password reset

Status: **plan, waiting for review**. You chose **no cost**, so follow §2 and §2a. §3 and §4 are for later, once there is money for a domain.

Firebase Auth sends two emails for us: email verification (after sign-up) and password reset.
`docs/capture.png` shows what students get today. This plan fixes two problems:

1. **The email lands in spam**, and the spam filter disables the link.
2. **It looks unprofessional.**

## 1. What's wrong today

| What the student sees | Why |
| --- | --- |
| Subject «إثبات ملكية البريد الإلكتروني لحسابك في project-852255410349» | The Firebase project has no **public-facing name**, so Firebase uses the project number. |
| Signature «فريق "project-852255410349"» | Same cause. |
| Sender «Azhar Exams Cd421 Firebaseapp Noreply» | No sender name is set. The address is `noreply@azhar-exams-cd421.firebaseapp.com`. |
| A long raw link with `apiKey=…` and `oobCode=…` | This is Firebase's default template, and its body can't be edited for these emails. |
| Plain text: no logo, no button, no RTL layout | Same: the default template. |
| **In spam, link disabled** | The mail comes from Firebase's shared `firebaseapp.com` domain. Thousands of projects use it, including spammers, so it has a poor reputation. There is no domain of ours behind it, so we have no SPF, DKIM or DMARC records of our own. The project number in the subject and the long raw link look like phishing. |

**Main point:** the wording can be fixed for free in the console. The spam problem is about the
**sending domain**, so it needs **a domain we own**.

## 2. Phase 1: console settings (free, about 10 minutes, no code)

This fixes the names and wording, but not spam on its own.

1. **Firebase console → Project settings → General → Public-facing name:** set it to the app's name.
   - ⚠️ We use two names: `app.json` says «امتحانات الأزهر» and the welcome screen says «نوابغ الأزهر». Pick one for both.
   - Also set **Support email** on the same page.
2. **Authentication → Templates → Email address verification → ✏️ edit:**
   - **Sender name:** «نوابغ الأزهر».
   - **Subject:** «أكّد بريدك الإلكتروني في نوابغ الأزهر».
   - **Reply-to:** a real inbox you read, if you have one.
   - **Template language:** Arabic. The app already sends `auth.languageCode = 'ar'`.
3. Make the same edits on **Password reset**. Subject: «إعادة تعيين كلمة المرور في نوابغ الأزهر».
4. Send yourself a test (sign up again, or use «إعادة الإرسال» on the home banner) and check the subject and signature.

Result: a clean Arabic subject, sender and signature. The body stays Firebase's plain text, and it
still comes from `firebaseapp.com`, so it will probably still go to spam.

## 2a. Free fix for spam: send through a Gmail account (SMTP)

Firebase can send its auth emails through **any SMTP server** instead of its own. If we use a
Gmail account, Gmail signs each email for its own domain, so it passes the spam checks
(SPF, DKIM and DMARC). The sender is a normal `@gmail.com` address with a good reputation instead
of the shared `firebaseapp.com`. **Cost: free.**

1. **Create a dedicated Gmail account** for the app, for example `nawabegh.alazhar@gmail.com`.
   Don't use your personal one: students will see this address and may reply to it.
2. In that account, turn on **2-Step Verification**: Google Account → Security.
3. Create an **App password**: Google Account → Security → App passwords → name it "Firebase".
   Copy the 16-character password. Only paste it into the Firebase console, never into the app or the repo.
4. **Firebase console → Authentication → Templates → SMTP settings → Enable**:
   - Sender address: the new Gmail address
   - SMTP server host: `smtp.gmail.com`
   - Port: `465`, Security mode: **SSL**
   - Username: the Gmail address; Password: the app password
5. Send a test (sign up again, or «إعادة الإرسال» on the home banner). In Gmail, open
   *Show original*: SPF, DKIM and DMARC should all show **PASS**.

**Limits:**
- Gmail allows about **500 emails per day**, which is plenty for now.
- If Google ever blocks the account for volume, switch the SMTP settings back off and Firebase sends as before.
- The **email body is still Firebase's plain text**, now with our name instead of the project number.
- Even with all checks passing, the first few emails may still land in spam until the address builds a reputation.
  Ask early testers to mark them **«ليس رسالة غير مرغوب فيها» / Not spam**. That helps.

**Also free, in the app:**
- Add the spam hint to the forgot-password «تحقّق من بريدك» screen. The home banner already has it.
- The link domain can be the free `azhar-exams-cd421.web.app` (Firebase Hosting) instead of
  `firebaseapp.com`. That's cosmetic, so leave it for later.

**Later, still free:** designed HTML emails (§4) can also be sent through this Gmail account
(Nodemailer in a Cloud Function), with no paid provider. The Functions free tier covers it. Build
this only if the plain text still looks too basic after §2.

## 3. Phase 2 (later, paid): our own domain (fixes spam, about $10/year)

We need a domain, for example `nawabegh-alazhar.com`, from any registrar such as Namecheap, Cloudflare or GoDaddy.

1. **Authentication → Templates → Customize domain** (the link under the template): enter the domain.
   - Firebase shows DNS records: a TXT record for ownership and SPF, and CNAME records for DKIM.
   - Add them at the registrar and wait for Firebase to show *Verified* (minutes to 48 hours).
   - The sender becomes `noreply@nawabegh-alazhar.com`.
2. **Add a DMARC record** yourself (Firebase doesn't): TXT at `_dmarc` with
   `v=DMARC1; p=none; rua=mailto:<your inbox>`.
   - Once mail passes for a few weeks, change it to `p=quarantine`.
   - Gmail and Yahoo now expect DMARC from senders.
3. **Make the link use our domain** (optional but recommended): connect the domain to
   **Firebase Hosting** (e.g. `auth.nawabegh-alazhar.com`). Then set it as the **Action URL** in the
   templates and add it to **Authentication → Settings → Authorized domains**. Links then point to our
   domain instead of `azhar-exams-cd421.firebaseapp.com`, which matches the sender and looks less like phishing.
4. **Check:** send to Gmail, Yahoo and Outlook, open *Show original*, and confirm
   **SPF: PASS, DKIM: PASS, DMARC: PASS**. A [mail-tester.com](https://www.mail-tester.com) score of 8/10 or higher is good.

Result: much better delivery to the inbox. The body is still Firebase's plain template.

## 4. Phase 3 (later): fully branded HTML emails (optional, needs code)

Firebase won't let us change the body of these two emails. For a designed email (logo, dark/brand
colours, big «تأكيد البريد» button, RTL layout), we send the emails ourselves:

1. **Email provider:** Resend, Brevo, Postmark or SendGrid. All have free tiers that are enough for us. We verify the
   same domain with them (their own SPF/DKIM records).
2. **Cloud Function in `../azhar-exams-dashboard/functions`** (functions already exist there, so the project
   is on the Blaze plan):
   - `sendVerificationEmail` (callable, signed-in user): `getAuth().generateEmailVerificationLink(email, actionCodeSettings)`,
     then send our HTML template through the provider.
   - `sendPasswordResetEmail` (callable, no sign-in): `generatePasswordResetLink(email)` and send.
     It must stay silent for unknown emails and be rate limited, like Firebase is.
   - The provider's API key goes in Functions secrets (`firebase functions:secrets:set`), never in the app.
3. **App changes:**
   - `src/lib/auth-actions.ts`: `signUp`, `resendVerification` and `sendPasswordReset` call these functions
     via `httpsCallable` instead of `sendEmailVerification` / `sendPasswordResetEmail`.
   - Error messages stay in `auth-errors.ts`.
4. **Branded landing page (optional):** a custom action handler page on our Hosting domain shows
   «تم تأكيد بريدك ✓» in our design instead of Firebase's grey page. It uses `applyActionCode` for
   verify and `confirmPasswordReset` for reset.
5. **Template:** one Arabic RTL HTML email with inline styles (email clients ignore most CSS):
   - logo, title, one sentence, button, and the fallback link in small text
   - a "didn't request this?" line
   - a plain-text version too, which also helps spam scores

Cost: a domain, plus a provider free tier (e.g. Resend: 3,000 emails/month free) and very small
Functions usage.

## 5. Recommendation

| Step | Fixes | Cost | Effort |
| --- | --- | --- | --- |
| Phase 1 | Names, subject, signature | Free | 10 min, console only |
| §2a Gmail SMTP | Spam (mostly) | **Free** | 15 min, console only |
| Phase 2 | **Spam** (main problem) | Domain ≈ $10/yr | 1 hour + DNS wait |
| Phase 3 | Fully designed email and landing page | Free tier | 1–2 days of code |

**Free path (chosen):** do **Phase 1 + §2a now**. That gives a clean Arabic subject, sender and
signature, sent from a Gmail address that passes the spam checks, at no cost. Phase 2 (a domain) is the
long-term fix once the app has users. Phase 3 is cosmetic.

Until Phase 2: the home banner already tells students to check spam (`verify-email-banner.tsx`).
The «تحقّق من بريدك» screen on forgot-password could say the same.

## 6. Questions for you

1. **App name for emails:** «نوابغ الأزهر» or «امتحانات الأزهر»? Should `app.json` change to match?
2. **Gmail address** for the app (§2a): which name?
3. **Phase 3:** do you want designed HTML emails later, sent through the same Gmail account?
4. **Reply-to:** the new Gmail account can be the support inbox too. OK?

## 7. Housekeeping

`docs/capture.png` is untracked and shows a real verification link and your name. Delete it, or
don't commit it, once this plan is done.
