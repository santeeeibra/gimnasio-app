import { redirect } from "next/navigation";

export default async function RegistroRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const queryString = new URLSearchParams();

  for (const [key, val] of Object.entries(params)) {
    if (typeof val === "string") {
      queryString.set(key, val);
    } else if (Array.isArray(val)) {
      val.forEach((v) => queryString.append(key, v));
    }
  }

  const dest = queryString.toString()
    ? `/registro-gimnasio?${queryString.toString()}`
    : `/registro-gimnasio`;

  redirect(dest);
}
