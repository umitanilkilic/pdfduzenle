import { privacyMetadata, PrivacyView } from "@/views/PrivacyView";

export const metadata = privacyMetadata("en");

export default function Page() {
  return <PrivacyView locale="en" />;
}
