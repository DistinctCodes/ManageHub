import type { Metadata } from "next";
import EventsClient from "./EventsClient";

export const metadata: Metadata = {
  title: "Events | ManageHub",
  description:
    "Discover upcoming community events, member meetups, and workspace sessions at ManageHub. RSVP and join the community.",
  openGraph: {
    title: "Events | ManageHub",
    description:
      "Discover upcoming community events, member meetups, and workspace sessions at ManageHub.",
    type: "website",
  },
};

export default function EventsPage() {
  return <EventsClient />;
}
