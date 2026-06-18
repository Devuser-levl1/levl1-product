import { redirect } from 'next/navigation'

// The demo gallery now lives at /interviews (Build 05 revision). Keep /demo as a
// permanent redirect so any existing links still land in the right place.
export default function DemoRedirect() {
  redirect('/interviews')
}
