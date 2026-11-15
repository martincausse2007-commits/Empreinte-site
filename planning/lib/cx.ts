/** Assemble des classes CSS en ignorant les valeurs vides. */
export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
