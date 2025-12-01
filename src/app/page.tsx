import { redirect } from "next/navigation";

export default function Home() {
  // When someone visits "/", send them to "/map"
  redirect("/map");
}
