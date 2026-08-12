import { redirect } from "next/navigation";

// Shop was renamed to Gear. Keep this route so old links/bookmarks still work.
export default function ShopRedirect() {
  redirect("/gear");
}
