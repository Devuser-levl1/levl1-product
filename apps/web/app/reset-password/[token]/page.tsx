import { NoPasswordNotice } from '@/components/screen/auth/NoPasswordNotice'

// Old Screen password-reset links land here; passwords are retired (OTP sign-in).
export default function ScreenResetPasswordPage() {
  return <NoPasswordNotice title="This link is no longer needed" />
}
