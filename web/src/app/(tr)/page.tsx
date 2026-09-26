import { homeMetadata, HomeView } from "@/views/HomeView";

export const metadata = homeMetadata("tr");

export default function Page() {
  return <HomeView locale="tr" />;
}
