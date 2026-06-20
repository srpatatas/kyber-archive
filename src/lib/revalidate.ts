import { revalidatePath } from "next/cache";

export function revalidateAllData() {
  revalidatePath("/", "layout");
}
