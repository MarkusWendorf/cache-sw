export async function hash(data: ArrayBuffer) {
  const buffer = await crypto.subtle.digest("SHA-1", data);
  return bufferToHex(buffer);
}

function bufferToHex(buffer: ArrayBuffer) {
  const array = Array.from(new Uint8Array(buffer));
  return array.map((b) => b.toString(16).padStart(2, "0")).join("");
}
