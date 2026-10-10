/** Generate operator previews. No email is sent. Example links are not valid tokens. */
import { mkdir, writeFile } from "node:fs/promises";
import { renderCommunication } from "../../frontend/lib/communications";
import { BRAND } from "../../frontend/lib/brand";
const directory = new URL("../../var/communications/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const kind of ["verify-email", "reset-password", "draft-saved", "report-filed"] as const) {
  const path = kind === "verify-email" ? "/account/verified?preview=1" : kind === "reset-password" ? "/reset-password?preview=1" : "/";
  const message = renderCommunication(kind, BRAND.origin + path);
  await writeFile(new URL(`${kind}.html`, directory), message.html);
  await writeFile(new URL(`${kind}.txt`, directory), `${message.subject}\n\n${message.text}`);
}
console.log("Branded HTML/text previews written to ignored var/communications. No messages sent; preview links do not verify accounts.");
