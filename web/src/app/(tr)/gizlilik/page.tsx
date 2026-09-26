import { privacyMetadata, PrivacyView } from "@/views/PrivacyView";

export const metadata = privacyMetadata("tr");

export default function Page() {
  return <PrivacyView locale="tr" />;
}
