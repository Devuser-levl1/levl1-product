import { NoPasswordNotice } from '@/components/screen/auth/NoPasswordNotice'

// Screen: password sign-in is retired (email + one-time code). Hire has its own
// password flow at /hire/... and /reset-password?token= — untouched.
export default function ForgotPasswordPage() {
  return <NoPasswordNotice title="No password needed" />
}
